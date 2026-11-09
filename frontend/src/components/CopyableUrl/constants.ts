import type { CopyableUrlVariant, CopyState, CopyTexts } from './types';

/**
 * The texts of each variant. The link's are the design's ("Copy link", "Copied", U80 6396:47721,
 * U81 6396:47841); the field's are generic, and a caller names what it copies (the account
 * page's token: "Token copied")
 */
export const COPY_TEXTS: Record<CopyableUrlVariant, CopyTexts> = {
  link: {
    copy: 'Copy link',
    copied: 'Copied',
    announced: 'Link copied',
    failed: 'Copying didn’t work. The link is selected, so you can copy it yourself.',
  },
  field: {
    copy: 'Copy',
    copied: 'Copied',
    announced: 'Copied',
    failed: 'Copying didn’t work. The text is selected, so you can copy it yourself.',
  },
};

/**
 * Why the copy button is off while the connection is deactivated (FR-046, W21; U89 6417:31309):
 * the design draws the button at 40 % without its explanation (FR-052b), so the text follows the
 * other explanations' pattern ("Save the rule first")
 */
export const DEACTIVATED_EXPLANATION = 'Activate the connection first';

/** How long the button reads "✓ Copied" after copying (FR-048) */
export const COPIED_RESET_MS = 2000;

export const INITIAL_COPY_STATE: CopyState = { status: 'idle', attempt: 0 };

/**
 * The URL box and the read-only field (U80 6396:47719): `layout-background-hued` #f2f5fb, radius
 * 8, 48 high, padding 8 16, `body/default/regular` 16/24 in `layout-text-default`, one line cut
 * with "…" (U07 note 33: "Every URL is one line, cut with … (text-overflow: ellipsis)")
 */
export const URL_BOX =
  'rounded-kern-default bg-kern-layout-background-hued text-kern-static-medium text-kern-layout-text-default block h-48 w-full min-w-0 truncate px-16 py-8 leading-(--kern-typography-line-height-medium-static) font-normal';

/** The copy button: KERN's primary button (U80 6396:47721), its width its label's */
export const COPY_BUTTON = 'kern-btn kern-btn--primary';

/** The bubble with the full URL, as wide as the tooltip's, breaking anywhere */
export const FULL_URL_WIDTH = 280;
