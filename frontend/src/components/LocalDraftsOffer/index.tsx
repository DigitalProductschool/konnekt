import { useCallback, useEffect, useId, useReducer, useRef } from 'react';

import { LIVE_REGION_DELAY_MS } from '../../constants';
import { useLocalDrafts } from '../../hooks/useLocalDrafts';
import { displayNameOf } from '../../utils/localDrafts/content';
import type { LocalDraftRecord } from '../../utils/localDrafts/types';
import ConfirmDialog from '../ConfirmDialog';
import { INITIAL_DISCARD_STATE, LOCAL_DRAFTS_COPY } from './constants';
import LocalDraftItem from './LocalDraftItem';
import type { LocalDraftsOfferProps } from './types';
import { discardReducer, discardTextOf, focusAfterDiscard } from './utils';

/**
 * The offer of the account's unsaved work on this device (S4, W5; FR-016, FR-018, FR-021), on
 * the overview and the first-connection screen: one item per local draft, newest first, to
 * resume or discard. It renders nothing while there is none, or without a storage, and follows
 * the writes and discards of other tabs (`useLocalDrafts`).
 *
 * "Discard" asks first, in a `ConfirmDialog`. Afterwards the item goes, a polite status says
 * "Unsaved work discarded." (the region is there before its text, so it is announced), and the
 * focus moves to the next item's "Resume", or else to the section's heading; after the last
 * item, whose discard removes the section, to `emptyFocusRef` (the page's h1). Nothing about a
 * local draft is logged or sent (FR-020).
 */
export default function LocalDraftsOffer({ exceptFlowKey, emptyFocusRef }: LocalDraftsOfferProps) {
  const { drafts, discard } = useLocalDrafts(exceptFlowKey);
  const [state, dispatch] = useReducer(discardReducer, INITIAL_DISCARD_STATE);
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resumeRefs = useRef(new Map<string, HTMLAnchorElement>());

  const resumeRefOf = useCallback(
    (flowKey: string) => (element: HTMLAnchorElement | null) => {
      if (element) {
        resumeRefs.current.set(flowKey, element);
      } else {
        resumeRefs.current.delete(flowKey);
      }
    },
    []
  );

  // Runs after ConfirmDialog's own effect has closed the dialog, so this focus wins
  useEffect(() => {
    if (state.focus === null) return;
    const target =
      state.focus.kind === 'resume'
        ? resumeRefs.current.get(state.focus.flowKey)
        : headingRef.current;
    // Without the next item (another tab removed it), the heading. After the last item the
    // section has gone, heading included, so `emptyFocusRef` (the page's h1) takes the focus
    // rather than the page's body (FR-028, WCAG 2.4.3)
    (target ?? headingRef.current ?? emptyFocusRef?.current)?.focus();
    dispatch({ type: 'focused' });
  }, [state.focus, emptyFocusRef]);

  // The region empties at each discard and its text follows a moment later, so screen readers
  // announce every discard
  useEffect(() => {
    if (state.discards === 0) return;
    const timer = window.setTimeout(() => dispatch({ type: 'announce' }), LIVE_REGION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.discards]);

  const handleDiscard = useCallback(
    (record: LocalDraftRecord) => dispatch({ type: 'ask', record }),
    []
  );

  function handleConfirm() {
    const record = state.pending;
    if (record === null) return;
    const focus = focusAfterDiscard(drafts, record.flowKey);
    discard(record.flowKey);
    dispatch({ type: 'discarded', focus });
  }

  if (drafts.length === 0 && state.pending === null && state.discards === 0) {
    return null;
  }

  const pendingName = state.pending ? displayNameOf(state.pending.content) : '';

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {state.announced && LOCAL_DRAFTS_COPY.discarded}
      </p>
      {drafts.length > 0 && (
        <section aria-labelledby={headingId} className="flex flex-col gap-16">
          <div className="flex flex-col gap-8">
            <h2
              id={headingId}
              ref={headingRef}
              tabIndex={-1}
              className="text-kern-adaptive-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-adaptive) font-semibold outline-none"
            >
              {LOCAL_DRAFTS_COPY.localTitle}
            </h2>
            <p className="text-kern-static-medium text-kern-layout-text-muted">
              {LOCAL_DRAFTS_COPY.localText}
            </p>
          </div>
          <ul className="flex flex-col gap-8">
            {drafts.map((record) => (
              <LocalDraftItem
                key={record.flowKey}
                record={record}
                resumeRef={resumeRefOf(record.flowKey)}
                onDiscard={handleDiscard}
              />
            ))}
          </ul>
        </section>
      )}
      <ConfirmDialog
        open={state.pending !== null}
        title={LOCAL_DRAFTS_COPY.discardTitle}
        text={state.pending ? discardTextOf(state.pending, pendingName) : ''}
        confirmLabel={LOCAL_DRAFTS_COPY.discard}
        cancelLabel={LOCAL_DRAFTS_COPY.cancel}
        danger
        onCancel={() => dispatch({ type: 'cancel' })}
        onConfirm={handleConfirm}
      />
    </>
  );
}
