import type { DiscardState } from './types';

/**
 * The copy of the local drafts' offer: U16 `7362:54543` (one draft) and `7362:54614` (several),
 * cosmetic 4 and FR-029 (S5, W5). The discard dialog keeps 005-S4's copy
 */
export const LOCAL_DRAFTS_COPY = {
  /** One draft: its name in the heading (FR-029d) */
  titleOne: (name: string) => `Unsaved changes in “${name}”`,
  titleSeveral: (count: number) => `Unsaved changes in ${count} connections`,
  /** One draft: the sub-line carries the date, as no item line shows it */
  textOne: (date: string) =>
    `Saved only on this device on ${date}, when the page closed. Nobody else can see them.`,
  textSeveral: 'Saved only on this device when the page closed. Nobody else can see them.',
  /** The item line of a stored draft's local changes */
  edited: (date: string) => `Edited · ${date}`,
  /** The item line of a connection never saved */
  neverSaved: (date: string) => `New, never saved · ${date}`,
  /** Also for a connection never saved (FR-029e) */
  resume: 'Resume editing',
  /** The button's text as drawn; its accessible name adds `discardHidden` */
  discard: 'Discard',
  /** Hidden after "Discard": "Discard changes in <name>", the layer's name with the connection */
  discardHidden: (name: string) => `changes in ${name}`,
  cancel: 'Cancel',
  discardTitle: 'Discard unsaved work?',
  discardText: (name: string) =>
    `The unsaved changes to ${name} will be deleted from this device. This can’t be undone.`,
  /** Added to `discardText` for a stored draft (S4) */
  draftStays: 'The saved draft stays as it is.',
  /** The dialog's danger button (005-S4.9) */
  confirmDiscard: 'Discard',
  discarded: 'Unsaved work discarded.',
};

/**
 * The date of the last change as the design writes dates and times (cosmetic 3): "06.11.2026,
 * 14:20", 24-hour, in the browser's time zone. Defined here, so the shared component doesn't
 * depend on a page
 */
export const CHANGED_AT_FORMAT = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** The item line's divider: a raw value in Figma (U16 `7362:54625`), no variable */
export const ITEM_DIVIDER = 'border-[#d9dee8]';

/** `body/small/regular` 14/24 */
export const SMALL_TEXT =
  'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

export const INITIAL_DISCARD_STATE: DiscardState = {
  pending: null,
  focus: null,
  discards: 0,
  announced: false,
};
