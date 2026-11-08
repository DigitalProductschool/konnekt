/** The three statuses the pill shows; "scheduled" is not built (F1). */
export type ConnectionStatus = 'active' | 'draft' | 'deactivated';

export interface ConnectionStatusBadgeProps {
  isActive: boolean;
  /** A saved draft that isn't live yet: shows "Draft" in place of the active state. */
  draft?: boolean;
}

/** The classes of one status: the pill's tint, the dot and the label's colour. */
export interface StatusPillTone {
  pill: string;
  dot: string;
  label: string;
}
