import type { WizardLayoutVariant } from './types';

/**
 * The custom properties through which the wizard tells the page how much of the window its
 * sticky parts cover, in px, set on the root element while a wizard is open (research R4, T033):
 * the top, from the window's top to the bottom of the header pills, or of the step header where
 * it is pinned; the bottom, the footer's height where it is sticky, otherwise 0. `index.css`
 * keeps what scrolls into view clear of them (`scroll-padding`), and the steps size and pin
 * their exceptions to them: the rules step's selection bar, the documents step's list and the
 * test step's panel (U01 #16–#19, F43), the toast above the footer, and the menus' edges
 * (`placementFrom()`)
 */
export const STICKY_TOP_PROPERTY = '--wizard-sticky-top';
export const STICKY_BOTTOM_PROPERTY = '--wizard-sticky-bottom';

/**
 * The step header (Figma "Shell/Step header · compact", U03 #42–#43): white, so that the page
 * scrolls under it, and pinned under the header pills (64px, TopBar) where the window has room
 * for it (`wizard-pinned:`, index.css), above the step's content and below the popups (z-20 and
 * up) and the header (z-30). Elsewhere it scrolls away with the page, as the head did before.
 */
export const STEP_HEADER_CLASSES =
  'bg-kern-layout-background-default z-15 px-16 wizard-pinned:sticky wizard-pinned:top-64';

/**
 * Figma "Shell/Footer" (6262:12701; U19 6699:45349, U17 6408:72735): white with a 1px top line
 * drawn inside, so that it stays 72px (16 + the 40px buttons + 16, build note U01 #20), sticky at
 * the window's bottom. In windows under 480px tall (200 % zoom of a 960px window, 400 % of a
 * 1024px one at 1280 × 1024) it stays at the page's end instead, where its rows would leave
 * the step no room (WCAG 1.4.10, spec 005 FR-028). `wizard-footer` makes KERN's buttons in it
 * 40px tall (index.css, build note 5, option b)
 */
export const FOOTER_CLASSES =
  'wizard-footer bg-kern-layout-background-default z-15 px-16 py-16 shadow-[inset_0_1px_0_var(--kern-color-decorative-border-default)] [@media(height>=30rem)]:sticky [@media(height>=30rem)]:bottom-0';

/**
 * The content column: the steps' 1120px (U19 6699:45325), the details' 832px (L4, U07 #5). The
 * footer keeps the 1120px column on both (Figma "Shell/Footer": 160px from the sides at 1440)
 */
export const COLUMN_CLASSES: Record<WizardLayoutVariant, string> = {
  steps: 'max-w-1120',
  details: 'max-w-832',
};

/**
 * For a step that fills the visible part of the window and scrolls inside, where the step header
 * is pinned (the test step's panel, F43; T073): the window's height less the sticky parts and
 * the content's 40px bottom padding
 */
export const VISIBLE_HEIGHT_CLASSES =
  'wizard-pinned:h-[calc(100dvh-var(--wizard-sticky-top)-var(--wizard-sticky-bottom)-40px)]';
