import type { ErrorNotice } from '@connection-portal/api-types/api';
import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';
import type { Ref, RefObject } from 'react';

import type { Homepage } from '../../hooks/types';

export type ListState =
  | { status: 'loading'; attempt: number }
  | { status: 'failed'; attempt: number; notice: ErrorNotice }
  | { status: 'loaded'; attempt: number; formConnections: FormConnectionSummary[] };

export type ListAction =
  | { type: 'loaded'; formConnections: FormConnectionSummary[] }
  | { type: 'failed'; notice: ErrorNotice }
  | { type: 'retry' }
  /** A row was deleted: it leaves the loaded list, which may become empty (the welcome page) */
  | { type: 'removed'; id: string }
  /**
   * "Undo" brought rows back (spec 010, FR-034): they return to the loaded list in the overview's
   * order, without a reload; a list not loaded yet (or failed) loads again
   */
  | { type: 'restored'; items: FormConnectionSummary[] };

export interface FormConnectionRowProps {
  formConnection: FormConnectionSummary;
  /** The row's "Delete": opens the one delete dialog for it */
  onDelete: (formConnection: FormConnectionSummary) => void;
  /** A published connection's "Edit": asks "Edit “<name>”?" first (F48, T083) */
  onEdit: (formConnection: FormConnectionSummary) => void;
}

export interface RowDescriptionProps {
  /** The description as written; cut to one line, the tooltip shows it in full */
  text: string;
  ref?: Ref<RowDescriptionHandle>;
}

/** What the row tells its description: the name link took or lost the keyboard focus */
export interface RowDescriptionHandle {
  nameFocus: (focused: boolean) => void;
}

/**
 * What a row's date is made of (FR-017, FR-019): the summary's state, the date that state names
 * (`published_at`, `start_date`, `deactivated_at`), the last change, and the step a draft was
 * saved in (null when none is recorded: the row then reads "Edited <date>" alone)
 */
export type RowMetaSource = Pick<
  FormConnectionSummary,
  'state' | 'updated_at' | 'published_at' | 'start_date' | 'deactivated_at' | 'step'
>;

/**
 * The row delete (FR-028, FR-029c): which connection the dialog asks about (kept while it closes,
 * so that its text stays during the fade), whether it is open, the working state, the last
 * failure, and whether that failure found the row gone or changed meanwhile (`404`, `409`), so
 * that closing the dialog loads the list again
 */
export interface RowDeleteState {
  target: FormConnectionSummary | null;
  open: boolean;
  deleting: boolean;
  error: ErrorNotice | null;
  stale: boolean;
}

export type RowDeleteAction =
  | { type: 'open'; target: FormConnectionSummary }
  | { type: 'close' }
  | { type: 'start' }
  | { type: 'failed'; error: ErrorNotice; stale: boolean }
  | { type: 'done' };

/** Why a row delete failed: the notice the dialog shows, and whether the list is out of date */
export interface RowDeleteFailure {
  error: ErrorNotice;
  stale: boolean;
}

/**
 * What "/" renders: the welcome page or the overview (`homepageOf`), or, while the list loads and
 * the device remembers nothing, the loading page (U10 6401:28567)
 */
export type HomepageView = Homepage | 'loading';

export interface WelcomePageProps {
  /** The page's h1, which takes the focus when the local-drafts offer above it empties */
  titleRef: RefObject<HTMLHeadingElement | null>;
}

/** One step of the welcome page's illustration: its label and its 24 px ink glyph */
export interface WelcomeStep {
  label: string;
  glyph: string;
}

export interface WelcomeStepItemProps {
  step: WelcomeStep;
  /** Whether a line joins it to the step before: every step but the first */
  joined: boolean;
}

export interface SearchToolbarProps {
  /** The search as typed */
  query: string;
  onQueryChange: (query: string) => void;
  /** How many rows the search shows, and how many the list holds */
  shown: number;
  total: number;
  /** The search field, which takes the focus back after "Clear search" */
  inputRef: RefObject<HTMLInputElement | null>;
  /** The count's id: it names the list */
  countId: string;
  /** The list the field filters */
  listId: string;
}

export interface NoMatchesProps {
  /** The search as typed, quoted in the message */
  query: string;
  onClear: () => void;
}

/**
 * What the toast of the overview's last deletion says (spec 010, S4 "After a deletion", "Undo"):
 * "“<name>” deleted." with "Undo" (`danger`), "“<name>” restored." (`success`), "“<name>” can no
 * longer be restored." (`neutral`) or "Couldn’t restore. Try again." with "Undo" again (`neutral`)
 */
export type DeletionOutcome = 'deleted' | 'restored' | 'notRestorable' | 'failed';

/** The overview's last deletion and its toast (spec 010, FR-033 to FR-037) */
export interface CurrentDeletion {
  /** The deletion's id, which "Undo" sends; null when nothing can restore it (no "Undo") */
  id: string | null;
  /** The deleted connections' names; the toast names the first */
  names: string[];
  outcome: DeletionOutcome;
  /** Whether "Undo" waits for the server's answer; a second "Undo" meanwhile does nothing */
  restoring: boolean;
  /**
   * Whether its toast shows. A toast that closed (its 6 seconds, Escape) or was replaced leaves
   * the deletion standing: "Undo" is gone with it (FR-036)
   */
  shown: boolean;
  /** The error ID of a restore that failed with a 5xx, under "Couldn’t restore. Try again." */
  errorId: string | null;
}

/**
 * The deletion reducer's state: the id of its last toast, which changes with every new toast so
 * that each one is shown, timed and announced anew, and the last deletion, null before any
 */
export interface DeletionState {
  toastId: number;
  current: CurrentDeletion | null;
}

export type DeletionAction =
  /** A deletion was made, here or on the details: its toast replaces the one shown */
  | { type: 'deleted'; deletionId: string | null; names: string[] }
  /** "Undo" sent the restore */
  | { type: 'restoring'; deletionId: string }
  /** The restore brought the rows back */
  | { type: 'restored'; deletionId: string }
  /** The restore answered `409 not_restorable`: nothing changed */
  | { type: 'notRestorable'; deletionId: string }
  /** The restore got no answer or a server failure: "Undo" is offered again */
  | { type: 'failed'; deletionId: string; errorId: string | null }
  /** The toast closed: after its 6 seconds or with Escape */
  | { type: 'dismissed' };

/** How a failed restore ends: refused for good, or worth another "Undo" */
export type RestoreFailure = { type: 'notRestorable' } | { type: 'failed'; errorId: string | null };
