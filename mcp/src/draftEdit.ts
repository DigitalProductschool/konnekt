// The read-apply-save loop of every draft-changing tool (contracts/mcp-tools.md "The read-apply-
// save loop"; research R8; FR-015 to FR-018): read the connection, refuse a published one, apply
// the change to the draft as stored, and save the whole content with the version read. When
// another save came in between (`409 draft_changed`), the change is applied again to the newer
// draft, never over it. Nothing is kept between calls
import type {
  DraftUpdate,
  FormConnectionDraft,
  FormConnectionOrDraft,
  RequestedDocument,
} from '@connection-portal/api-types/form-connections';
import type { EditRefusal, EditResult, EditState } from '@connection-portal/rules/types';
import type { CallToolResult } from '@modelcontextprotocol/server';

import { type Caller, insufficientAccessError, levelAllows } from './auth';
import { type BackendClient, Conflict, NotFound, Refused } from './backend';
import { resolveConnectionId } from './resolve';
import { PUBLISHED_READ_ONLY_MESSAGE, toolError } from './tools/registry';
import {
  ruleContextOf,
  stepOf,
  type ToolRuleContext,
  type VariantRef,
  variantRefOf,
} from './views';

/** What the loop needs of the management API: the real client, or a stub in the unit tests. */
export type DraftBackend = Pick<BackendClient, 'get' | 'put' | 'documentTypes' | 'optionSets'>;

/** How many times the loop reads, applies and saves before it gives up (FR-015). */
export const MAX_ATTEMPTS = 3;

export const DRAFT_EDIT_MESSAGES = {
  deleted: 'This draft has been deleted.',
  conflict: 'The draft keeps changing while this change is applied. Try again.',
} as const;

/**
 * A draft's whole content as a save sends it: its name and description, the requested documents
 * by their keys, and the variants with the counters the editor's actions number from
 * (`EditState`).
 */
export interface DraftContent extends EditState {
  name: string;
  /** '' when there is none */
  description: string;
  documents: RequestedDocument[];
}

/** A change applied: the draft's new content, and what the tool answers about it. */
export interface ApplyChange<R> {
  ok: true;
  content: DraftContent;
  result: R;
}

/**
 * A change refused: the editor's refusal (an `EditResult`'s, or one in its words), answered as
 * `validation`, as `not_allowed` for an action that doesn't apply (the main variant deleted), or
 * as `not_found` for something the draft doesn't hold (a document `move_document` names).
 */
export interface ApplyRefusal {
  ok: false;
  refusal: EditRefusal;
  code?: 'validation' | 'not_allowed' | 'not_found';
}

export type ApplyOutcome<R> = ApplyChange<R> | ApplyRefusal;

/**
 * Applies the tool's change to the draft as read, with the rules modules' context built from its
 * documents and the catalog. Pure and synchronous: it may run up to three times, each time on a
 * newer draft. It may throw a `ReferenceRefusal` (a variant or item it can't resolve), which the
 * tool registry answers.
 */
export type ApplyChangeFn<R> = (
  draft: FormConnectionDraft,
  context: ToolRuleContext
) => ApplyOutcome<R>;

/** The change stored: the draft as saved, as read before the change, and what changed. */
export interface DraftEdited<R> {
  ok: true;
  /** The draft as the backend answered the save */
  draft: FormConnectionDraft;
  /** The draft the change was applied to: the last one read */
  read: FormConnectionDraft;
  result: R;
  /** The context the change was applied with (the read draft's documents) */
  context: ToolRuleContext;
}

/** The change not stored: the tool error to answer. */
export interface DraftNotEdited {
  ok: false;
  error: CallToolResult;
}

export type EditDraftOutcome<R> = DraftEdited<R> | DraftNotEdited;

/** A refusal in the editor's words that names no variant or item. */
export function refusalOf(
  message: string,
  code: ApplyRefusal['code'] = 'validation'
): ApplyRefusal {
  return { ok: false, refusal: { message, branchIndex: null, itemId: null }, code };
}

/** The content of a draft as read, ready for an `edits.ts` action. */
export function draftContentOf(draft: FormConnectionDraft): DraftContent {
  return {
    name: draft.name,
    description: draft.description,
    documents: draft.documents.map((document) => ({
      document_type: document.document_type,
      fields: document.fields.map((field) => field.key),
    })),
    branches: draft.branches,
    counters: { rule: draft.next_rule_number, group: draft.next_group_number },
  };
}

/** The content with an `edits.ts` action's new state. */
export function withEditState(content: DraftContent, state: EditState): DraftContent {
  return { ...content, branches: state.branches, counters: state.counters };
}

/** An action's refusal, or the content with its new state and what the tool answers. */
export function applied<T extends object, R>(
  content: DraftContent,
  result: EditResult<T>,
  answer: (edited: { ok: true; state: EditState } & T) => R
): ApplyOutcome<R> {
  if (!result.ok) {
    return result;
  }
  return { ok: true, content: withEditState(content, result.state), result: answer(result) };
}

/** A variant of the draft as saved, by its id. */
export function savedVariantRef(draft: FormConnectionDraft, id: string): VariantRef {
  const branch = draft.branches.find((entry) => entry.id === id);
  return branch ? variantRefOf(branch, draft.id) : variantRefOf({ id, name: '' }, draft.id);
}

/** The save of `content` over the draft `read`: the whole content, the version read (R8). */
function saveBodyOf(read: FormConnectionDraft, content: DraftContent): DraftUpdate {
  return {
    name: content.name,
    description: content.description,
    documents: content.documents,
    rules: {
      branches: content.branches,
      // The counters the change started from: the server numbers identifiers at or above them
      // as new (spec 005, research R4)
      numbering_base: { rule: read.next_rule_number, group: read.next_group_number },
    },
    step: stepOf(content),
    version: read.version,
    replace: false,
  };
}

/** The connection as stored, or why there is nothing to change. */
async function readDraft(
  backend: DraftBackend,
  id: string
): Promise<FormConnectionDraft | DraftNotEdited> {
  let fc: FormConnectionOrDraft;
  try {
    fc = await backend.get<FormConnectionOrDraft>(`/api/form-connections/${id}`);
  } catch (error) {
    if (error instanceof NotFound) {
      return { ok: false, error: toolError('not_found', DRAFT_EDIT_MESSAGES.deleted) };
    }
    throw error;
  }
  if (fc.status !== 'draft') {
    return { ok: false, error: toolError('published_read_only', PUBLISHED_READ_ONLY_MESSAGE) };
  }
  return fc;
}

/** The context of a draft's rules: its documents, the catalog and the value sets (cached). */
async function contextOf(
  backend: DraftBackend,
  draft: FormConnectionDraft
): Promise<ToolRuleContext> {
  const [documentTypes, optionSets] = await Promise.all([
    backend.documentTypes(),
    backend.optionSets(),
  ]);
  return ruleContextOf(draft.documents, documentTypes, optionSets);
}

/**
 * Applies one change to a draft and stores it (contracts/mcp-tools.md "The read-apply-save
 * loop"): reads the connection `connectionRef` names (a published one is `published_read_only`,
 * a missing one `not_found`), applies `apply` to it, and saves the whole content with the version
 * read and the furthest step the content reaches (`stepOf()`). `409 draft_changed` reads and
 * applies again, at most three attempts in all, then `conflict`; `409 draft_published` is
 * `published_read_only`; the server's `400` is `validation` with its message. `apply`'s refusal
 * is `validation` (or `not_allowed`) in the editor's words, and nothing is saved. Other backend
 * failures and references `apply` can't resolve are thrown, for the tool registry to answer.
 */
export async function editDraft<R>(
  backend: DraftBackend,
  caller: Caller,
  connectionRef: string,
  apply: ApplyChangeFn<R>
): Promise<EditDraftOutcome<R>> {
  // The tools are registered at `drafts`; the loop refuses a lower caller all the same
  if (!levelAllows(caller, 'drafts')) {
    const { code, message, needs_access_level } = insufficientAccessError(caller, 'drafts');
    return { ok: false, error: toolError(code, message, { needs_access_level }) };
  }
  const id = resolveConnectionId(connectionRef);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const read = await readDraft(backend, id);
    if ('ok' in read) {
      return read;
    }
    const context = await contextOf(backend, read);
    const outcome = apply(read, context);
    if (!outcome.ok) {
      return {
        ok: false,
        error: toolError(outcome.code ?? 'validation', outcome.refusal.message),
      };
    }
    try {
      const draft = await backend.put<FormConnectionDraft>(
        `/api/form-connections/${read.id}/draft`,
        saveBodyOf(read, outcome.content)
      );
      return { ok: true, draft, read, result: outcome.result, context };
    } catch (error) {
      if (error instanceof Conflict && error.code === 'draft_changed') {
        continue;
      }
      if (error instanceof Conflict && error.code === 'draft_published') {
        return { ok: false, error: toolError('published_read_only', PUBLISHED_READ_ONLY_MESSAGE) };
      }
      if (error instanceof NotFound) {
        return { ok: false, error: toolError('not_found', DRAFT_EDIT_MESSAGES.deleted) };
      }
      if (error instanceof Refused) {
        return { ok: false, error: toolError('validation', error.message) };
      }
      throw error;
    }
  }
  return { ok: false, error: toolError('conflict', DRAFT_EDIT_MESSAGES.conflict) };
}

/** The text block's line on a draft as saved: its save number and its step (FR-017). */
export function draftLineOf(draft: Pick<FormConnectionDraft, 'version' | 'step'>): string {
  return `Saved as save ${draft.version} of the draft, at the ${draft.step} step.`;
}
