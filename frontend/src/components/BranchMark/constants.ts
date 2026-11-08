import type { Mark } from '@connection-portal/api-types/form-connections';

// Figma "Rules/Variant status" on the screens (U57 I6522:32701;6118:3685,
// U58 I6522:33021;6118:3685, U47 I6185:8570;6118:3685): the mark's text, so that it never rests
// on colour alone (FR-023); the design's wording (report cosmetic 8: "Added here", "Removed here")
export const BRANCH_MARK_COPY: Record<Mark, string> = {
  changed: 'Changed here',
  added: 'Added here',
  removed: 'Removed here',
};

// The tag's colours ("Rules/Variant status" 6118:3681; design-notes §1.3): a white tag in the
// mark's purple, or KERN's neutral feedback colours for a removed item. The tag keeps its full
// colour on a removed or faded item: only the item's content fades (U47 6185:8570)
export const BRANCH_MARK_COLOURS: Record<Mark, string> = {
  changed: 'bg-kern-layout-background-default text-variant-changed',
  added: 'bg-kern-layout-background-default text-variant-new',
  removed: 'bg-(--kern-color-feedback-default-background) text-(--kern-color-feedback-default)',
};

// The tint of a changed or added rule row and group frame (both purple, design-notes §1.3); a
// removed one has none
export const BRANCH_MARK_TINTS: Record<Mark, string> = {
  changed: 'bg-variant-changed-background',
  added: 'bg-variant-new-background',
  removed: '',
};

// What a removed rule or group, and a group dissolved in its variant, fade to
// (`action-state-opacity-disabled`)
export const INACTIVE_OPACITY = 'opacity-(--kern-color-action-state-opacity-disabled)';
