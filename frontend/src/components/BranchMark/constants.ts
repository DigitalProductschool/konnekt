import type { Mark } from '../../types/form-connections';

// Figma "Rules/Variant status" (U17 6134:9009, 6134:9064; U18 6163:5856): the mark's text, so
// that it never rests on colour alone (FR-023)
export const BRANCH_MARK_COPY: Record<Mark, string> = {
  changed: 'Changed here',
  added: 'New addition',
  removed: 'Removed',
};

// The tag's colours (design-notes.md §9, "The variant marks and group frames"): a white tag in
// the mark's colour, or KERN's neutral feedback colours for "Removed"
export const BRANCH_MARK_COLOURS: Record<Mark, string> = {
  changed: 'bg-kern-layout-background-default text-variant-changed',
  added: 'bg-kern-layout-background-default text-variant-new',
  removed: 'bg-(--kern-color-feedback-default-background) text-(--kern-color-feedback-default)',
};

// The tint of a changed or added rule row and group frame; a removed one has none
export const BRANCH_MARK_TINTS: Record<Mark, string> = {
  changed: 'bg-variant-changed-background',
  added: 'bg-variant-new-background',
  removed: '',
};

// What a removed rule or group, and a group dissolved in its variant, fade to
// (`action-state-opacity-disabled`)
export const INACTIVE_OPACITY = 'opacity-(--kern-color-action-state-opacity-disabled)';
