export interface ConnectionStatusBadgeProps {
  isActive: boolean;
  /** A saved draft that isn't live yet: shows "Draft" in place of the active state. */
  draft?: boolean;
}
