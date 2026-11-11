import type { AriaRole, ReactNode, Ref } from 'react';

/** "Now" or "On a date" (FR-001, FR-002) */
export type ActiveFrom = 'now' | 'date';

/**
 * What `startDateOf()` makes of the date field's text: the day as the API writes it
 * (`YYYY-MM-DD`), or the field's error, named by the server's code for the same refusal
 * (`400 invalid_start_date`), so that both show the field's one error (C2, W1)
 */
export type StartDateResult =
  { ok: true; date: string } | { ok: false; error: 'invalid_start_date' };

/**
 * The group holds no state of its own: the choice, the text and the error are the dialog's, so
 * that its reducer keeps them through a failure and "Try again" repeats them (FR-014)
 */
export interface ActiveFromChoiceProps {
  /** The chosen radio; a dialog opens with 'now' (FR-001), or 'date' for a scheduled connection */
  choice: ActiveFrom;
  /** The date field's text as typed, shown while `choice` is 'date' */
  text: string;
  /** The field's error state with "Enter a date after today." under it (C2, W1) */
  error: boolean;
  /** "alert" to announce the error as it appears, as when the dialog's button is pressed */
  errorRole?: AriaRole;
  /** The hint line for the current choice, under the radios and the field; none when empty */
  hint?: ReactNode;
  /** Another label for "Now", such as "Now (active since <date>, <time>)" (S15, T026) */
  nowLabel?: string;
  /** Greys the radios and the field out while the dialog is busy */
  disabled?: boolean;
  /** The date field, for a caller that moves the focus to it */
  fieldRef?: Ref<HTMLInputElement>;
  onChoiceChange: (choice: ActiveFrom) => void;
  onTextChange: (text: string) => void;
}

export interface ActiveFromRadioProps {
  name: string;
  value: ActiveFrom;
  label: string;
  checked: boolean;
  disabled: boolean;
  onSelect: () => void;
}
