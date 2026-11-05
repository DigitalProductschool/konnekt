import type { DiscardState } from './types';

/** The copy of contracts/ui-screens.md "Copy" for the local drafts' offer (S4, W5) */
export const LOCAL_DRAFTS_COPY = {
  localTitle: 'Unsaved work on this device',
  localText: 'These changes weren’t saved. Resume to go on, or discard them.',
  localNew: (date: string) => `New connection · Last change ${date}`,
  localDraft: (date: string) => `Draft · Last change ${date}`,
  resume: 'Resume',
  discard: 'Discard',
  cancel: 'Cancel',
  discardTitle: 'Discard unsaved work?',
  discardText: (name: string) =>
    `The unsaved changes to ${name} will be deleted from this device. This can’t be undone.`,
  /** Added to `discardText` for a stored draft (S4) */
  draftStays: 'The saved draft stays as it is.',
  discarded: 'Unsaved work discarded.',
  untitled: 'Untitled connection',
};

/**
 * The date of the last change: the overview's format ("4 Nov 2026", `EDITED_DATE_FORMAT` in
 * `pages/FormConnectionList/constants.ts`) with the 24-hour time, in the browser's time zone:
 * "4 Nov 2026, 14:32". Defined here, so the shared component doesn't depend on a page
 */
export const CHANGED_AT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export const INITIAL_DISCARD_STATE: DiscardState = {
  pending: null,
  focus: null,
  discards: 0,
  announced: false,
};
