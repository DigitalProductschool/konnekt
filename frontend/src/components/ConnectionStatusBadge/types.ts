import type { ConnectionState } from '@konnekt/api-types/form-connections';

export interface ConnectionStatusBadgeProps {
  /** The API's `state` (spec 010, data-model §1.2) */
  state: ConnectionState;
  /**
   * The header pill's start date (`YYYY-MM-DD`, a day in Germany): with it a scheduled
   * connection reads "Scheduled · 01.12.2026". The overview's row passes none
   */
  startDate?: string | null;
}

/** The classes of one status: the pill's tint, the dot and the label's colour. */
export interface StatusPillTone {
  pill: string;
  dot: string;
  label: string;
}

/** The pill's words: one label per state, and the scheduled label with its start date */
export interface StatusPillCopy extends Record<ConnectionState, string> {
  scheduledOn: (date: string) => string;
}
