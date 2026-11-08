// The editor's autosave into a local draft (specs/005-connection-drafts, contracts/local-drafts.md
// "useLocalDraft"; research R9, R16; FR-014, FR-015, FR-018, SC-004). The decisions are the pure
// helpers of `./utils.ts`; this hook adds the clock, the throttle's timer and the page's events.
// Nothing about the record is logged or sent anywhere (FR-020)
import type { EditorStep } from '@connection-portal/api-types/form-connections';
import { type RefObject, useCallback, useEffect, useMemo, useRef } from 'react';

import { LOCAL_DRAFT_FORMAT, LOCAL_DRAFT_WRITE_INTERVAL_MS } from '../utils/localDrafts/constants';
import { storageKeyOf } from '../utils/localDrafts/keys';
import { type LocalDraftStore, registerFlush } from '../utils/localDrafts/store';
import type { LocalDraftContent, LocalDraftRecord } from '../utils/localDrafts/types';
import { useLocalDraftStore } from './useLocalDraftStore';
import {
  isLocalDraftChange,
  localDraftActionOf,
  type LocalDraftSnapshot,
  writeDelayOf,
} from './utils';

export interface UseLocalDraftOptions {
  /** The flow's key, `new-<uuid>` or `draft-<id>`; a new key starts a new flow */
  flowKey: string;
  /** Carried into the record as passed */
  draftId: string | null;
  /** Carried into the record as passed */
  draftVersion: number | null;
  /**
   * What is already safe elsewhere, so the record holds only unsaved work; null when the flow
   * doesn't know it (a stored draft's record resumed through `?local=`). Never the record's own
   * content (data-model.md, section 6)
   */
  baseline: LocalDraftContent | null;
  /** What "Save and exit" would send now: `localContentOf(state, rules)`, memoised */
  content: LocalDraftContent;
  step: EditorStep;
  /** False for a published connection's flow (FR-014): the hook then writes nothing */
  enabled: boolean;
}

export interface LocalDraftControls {
  /** Writes the pending record now, if there is one */
  flush(): void;
  /** Cancels pending writes, removes the record, and writes nothing until `flowKey` changes */
  forget(): void;
}

/** The latest props the timer and the listeners act on */
interface Target {
  store: LocalDraftStore;
  username: string | null;
  enabled: boolean;
  flowKey: string;
}

/** The autosave's state for the current flow key */
interface Autosave {
  /** The content and step of the last render; null until the flow's first render */
  previous: LocalDraftSnapshot | null;
  /** The record waiting for the throttle */
  pending: LocalDraftRecord | null;
  timer: number | null;
  /** When the flow last wrote, for the throttle; null before its first write */
  lastWriteAt: number | null;
  /** The record last written, while the flow holds unsaved work; null once removed or forgotten */
  written: LocalDraftRecord | null;
  forgotten: boolean;
}

function freshAutosave(): Autosave {
  return {
    previous: null,
    pending: null,
    timer: null,
    lastWriteAt: null,
    written: null,
    forgotten: false,
  };
}

function cancelPending(autosave: Autosave): void {
  if (autosave.timer !== null) {
    window.clearTimeout(autosave.timer);
  }
  autosave.timer = null;
  autosave.pending = null;
}

/** Writes `record` unless the flow is disabled, signed out or forgotten */
function writeRecord(autosave: Autosave, target: Target, record: LocalDraftRecord): void {
  if (!target.enabled || target.username === null || autosave.forgotten) {
    return;
  }
  autosave.lastWriteAt = Date.now();
  // A failed write (full or blocked storage, a closed account) leaves things as they were (FR-021)
  if (target.store.write(target.username, record)) {
    autosave.written = record;
  }
}

function writePending(autosave: Autosave, target: Target): void {
  const record = autosave.pending;
  cancelPending(autosave);
  if (record !== null) {
    writeRecord(autosave, target, record);
  }
}

/** The first write goes at once, later ones at most once per interval, the last one always */
function scheduleWrite(
  autosave: Autosave,
  target: RefObject<Target>,
  record: LocalDraftRecord
): void {
  autosave.pending = record;
  if (autosave.timer !== null) {
    // The running timer writes the latest pending record
    return;
  }
  const delay = writeDelayOf(autosave.lastWriteAt, Date.now(), LOCAL_DRAFT_WRITE_INTERVAL_MS);
  if (delay === 0) {
    writePending(autosave, target.current);
  } else {
    autosave.timer = window.setTimeout(() => writePending(autosave, target.current), delay);
  }
}

function removeRecord(autosave: Autosave, target: Target): void {
  cancelPending(autosave);
  autosave.written = null;
  if (target.username !== null) {
    target.store.remove(target.username, target.flowKey);
  }
}

/**
 * Keeps the editor's unsaved work in a local draft of the signed-in account (contracts/
 * local-drafts.md "useLocalDraft").
 *
 * - **Writing.** A change after mount, of the content (compared structurally) or of the step,
 *   writes the record while the content differs from `baseline`, or on every change when
 *   `baseline` is null. The first write goes at once, later ones at most once per
 *   `LOCAL_DRAFT_WRITE_INTERVAL_MS`, and the last change is always written. `changedAt` is the
 *   time of the change. Mounting writes nothing, so a resumed record keeps its time.
 * - **Removing.** A change that brings the content back to `baseline` removes the record. Without
 *   a baseline, only `forget()` removes it. Mounting never removes a record.
 * - **Flushing.** A pending write is written on `pagehide` (which, unlike `unload`, also fires
 *   for Firefox's back-forward cache), when the page becomes hidden, on unmount and on a change
 *   of `flowKey`, and through `flushPendingLocalDrafts()` before the sign-out warning. The record
 *   stays on unmount (FR-018).
 * - **Another tab removed the record.** While the flow holds unsaved work (it has written the
 *   record and not called `forget()`), it writes the record again at once.
 *
 * Nothing happens while `enabled` is false or nobody is signed in.
 */
export function useLocalDraft({
  flowKey,
  draftId,
  draftVersion,
  baseline,
  content,
  step,
  enabled,
}: UseLocalDraftOptions): LocalDraftControls {
  const { store, username } = useLocalDraftStore();
  const target = useRef<Target>({ store, username, enabled, flowKey });
  const autosave = useRef<Autosave>(freshAutosave());

  // Declared first, so the effects below and every later timer or event see this render's props
  useEffect(() => {
    target.current = { store, username, enabled, flowKey };
  });

  // A flow key starts a flow: as at mount, nothing is written before its first change. Leaving
  // it, by unmounting or for another key, writes what is pending under the old key
  useEffect(() => {
    const state = autosave.current;
    Object.assign(state, freshAutosave());
    return () => writePending(state, target.current);
  }, [flowKey]);

  useEffect(() => {
    const state = autosave.current;
    const next: LocalDraftSnapshot = { content, step };
    const previous = state.previous;
    state.previous = next;
    // The flow's first render is its starting point, not a change. A new identity of the same
    // content isn't one either, nor is a change of the baseline or the draft version alone
    if (previous === null || !isLocalDraftChange(previous, next)) {
      return;
    }
    if (!enabled || username === null || state.forgotten) {
      return;
    }
    if (localDraftActionOf(content, baseline) === 'remove') {
      removeRecord(state, target.current);
      return;
    }
    scheduleWrite(state, target, {
      format: LOCAL_DRAFT_FORMAT,
      flowKey,
      draftId,
      draftVersion,
      changedAt: new Date().toISOString(),
      step,
      content,
    });
  }, [baseline, content, draftId, draftVersion, enabled, flowKey, step, username]);

  const flush = useCallback(() => writePending(autosave.current, target.current), []);

  const forget = useCallback(() => {
    const state = autosave.current;
    state.forgotten = true;
    removeRecord(state, target.current);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      const state = autosave.current;
      const current = target.current;
      if (state.written === null || state.forgotten || current.username === null) {
        return;
      }
      // `key` is null after another tab's clear(), of either storage: the read tells which
      const removed =
        event.key === null ||
        (event.key === storageKeyOf(current.username, current.flowKey) && event.newValue === null);
      if (!removed || current.store.read(current.username, current.flowKey) !== null) {
        return;
      }
      // The pending record, if any, is newer than the one written
      const record = state.pending ?? state.written;
      cancelPending(state);
      writeRecord(state, current, record);
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorage);
    const unregister = registerFlush(flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      unregister();
    };
  }, [flush]);

  return useMemo(() => ({ flush, forget }), [flush, forget]);
}
