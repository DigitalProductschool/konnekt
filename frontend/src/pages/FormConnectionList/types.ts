import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  EditorStep,
  FormConnectionSummary,
} from '@connection-portal/api-types/form-connections';
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
  | { type: 'removed'; id: string };

export interface FormConnectionRowProps {
  formConnection: FormConnectionSummary;
  /** The row's "Delete": opens the one delete dialog for it */
  onDelete: (formConnection: FormConnectionSummary) => void;
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
 * What a row's meta line is made of: the summary's state and last change, and the step a draft
 * was saved in. The overview's list doesn't send the step yet (`FormConnectionSummary` has none),
 * so it is optional here: without it a draft reads "Edited <date>" alone
 */
export type RowMetaSource = Pick<FormConnectionSummary, 'status' | 'updated_at'> & {
  step?: EditorStep | null;
};

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
