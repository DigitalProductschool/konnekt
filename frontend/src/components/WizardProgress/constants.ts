// The edit flow's step line is a navigation landmark of this name (F25)
export const PROGRESS_LABEL = 'Steps';

// After the last step's segment, in place of "Next: <step>" (FR-025)
export const LAST_STEP = 'Last step';

// Figma "body/small/regular" in `layout-text-muted`: "Step n of 4" and "Next: <step>"
export const LINE_TEXT_CLASSES =
  'text-kern-static-small text-kern-layout-text-muted shrink-0 leading-(--kern-typography-line-height-medium-static) whitespace-nowrap';

// A segment: 4 px tall, radius 2 (Figma; KERN's small radius is 4 in the Revamp overlay)
export const SEGMENT_CLASSES = 'h-4 w-full rounded-[2px]';

// Figma "label/small" (14/24, 600): the edit flow's step names
export const STEP_NAME_CLASSES =
  'text-kern-static-small max-w-full font-semibold leading-(--kern-typography-line-height-medium-static) wrap-break-word';

// The edit flow's steps share the width equally (277 px at 1120), but never get narrower than
// their name's longest word: at 320 px "Connection" and "Documents" keep theirs, the others
// give way
export const LINK_STEP_CLASSES = 'min-w-min flex-1';

// The colour changes of "Shell/Step link" on hover (150 ms, design-notes §4)
export const COLOUR_TRANSITION = 'motion transition-colors duration-(--duration-colour)';
