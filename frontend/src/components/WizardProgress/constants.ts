import { defineTexts } from '@konnekt/rules/language';

/**
 * The step line's texts (FR-025; G§2 "wizard steps", "cancel/back/next/save"): the name of the
 * edit flow's navigation landmark (F25), "Step n of 4" before the segments, "Next: <step>" after
 * them and, on the last step, "Last step" in its place
 */
export const WIZARD_PROGRESS_COPY = defineTexts(
  {
    progressLabel: 'Steps',
    stepCount: (step: number, total: number) => `Step ${step} of ${total}`,
    next: (step: string) => `Next: ${step}`,
    lastStep: 'Last step',
  },
  {
    progressLabel: 'Schritte',
    stepCount: (step: number, total: number) => `Schritt ${step} von ${total}`,
    next: (step: string) => `Weiter: ${step}`,
    lastStep: 'Letzter Schritt',
  }
);

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
