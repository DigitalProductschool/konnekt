import type { ToastKind } from './types';

/**
 * How long a toast without an action stays: Figma "Rules/Toast" (6369:25433), "6 s". A toast
 * with an action stays until it is used or dismissed (research R8)
 */
export const TOAST_DURATION_MS = 6000;

/**
 * Where the toast sits, centred: 24px above the 72px footer bar (build note U05 #25, U51
 * 6197:11098, U17 6699:48002), or 24px above the window's edge on a page without one (U10
 * 7128:74220). It floats and never pushes content (U06 #96). In the wizard the footer's height
 * is `--wizard-sticky-bottom` (WizardLayout, T033): more where its actions wrap into rows (320px,
 * 200 % zoom), 0 where it isn't sticky
 */
export const TOAST_POSITION = {
  aboveFooter: 'bottom-[calc(var(--wizard-sticky-bottom,72px)+24px)]',
  noFooter: 'bottom-24',
  /*
   * Under 320 CSS px (T096) it sticks to the window's bottom edge while the part of the page it
   * belongs to is in view, and keeps a place of its own there: at the end of the page it covers
   * nothing (a fixed toast with an action, which stays until it is used, would hide the page's
   * last controls, such as the footer's, which doesn't stick in such a window)
   */
  narrow: 'narrow:sticky narrow:bottom-8',
};

/**
 * The fill of each kind (Figma "Rules/Toast" type=neutral 6113:3743, type=success 6369:25428):
 * `color/layout/text/default` ink and `color/feedback/success` green, white text on both
 * (18.7:1 and 5.42:1, design-notes §1.5)
 */
export const TOAST_KIND_FILL: Record<ToastKind, string> = {
  neutral: 'bg-kern-layout-text-default',
  success: 'bg-kern-feedback-success',
};
