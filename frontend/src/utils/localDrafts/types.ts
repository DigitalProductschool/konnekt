// The local draft's shapes (specs/005-connection-drafts/contracts/local-drafts.md "Pure modules";
// data-model.md, section 6). A record lives in the browser only and never leaves the device by
// itself (FR-020)
import type {
  BranchInput,
  EditorStep,
  NumberingBase,
  RequestedDocument,
} from '@konnekt/api-types/form-connections';

/** The part of the Web Storage API the store uses: local storage or an in-memory fake */
export interface StorageLike {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  /** May throw (quota, blocked) */
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** One local draft, stored as JSON under `konnekt:local-draft:v1:<username>:<flowKey>` */
export interface LocalDraftRecord {
  /** The record's format (`LOCAL_DRAFT_FORMAT`) */
  format: 2;
  /** Repeated, so a record is self-describing */
  flowKey: string;
  /** The stored draft it belongs to; null for a new connection */
  draftId: string | null;
  /** The draft version the flow loaded (FR-015, FR-022) */
  draftVersion: number | null;
  /** ISO 8601, the last change (FR-016) */
  changedAt: string;
  /** The step the flow was in */
  step: EditorStep;
  content: LocalDraftContent;
}

/**
 * What "Save and exit" would send at that moment, apart from the version (FR-015). Never personas,
 * findings, the open tab, the rule editor's position or citizen data
 */
export interface LocalDraftContent {
  /** May be empty: shown as "Untitled connection" */
  name: string;
  description: string;
  documents: RequestedDocument[];
  /** As the rules step holds them, the open rule kept (R9) */
  branches: BranchInput[];
  /** What the flow numbers from (sent as numbering_base) */
  numberingBase: NumberingBase;
  /** The next numbers the flow gives */
  counters: NumberingBase;
}
