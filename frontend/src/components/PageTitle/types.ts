import type { Ref } from 'react';

/**
 * The kit's heading style of the page's h1 (P31 Text): `display` 40/48 (weight 500),
 * `x-large` 32/40 (weight 500, "Your connections" on U11 6699:44244), `large` 24/32 (weight 600,
 * the compact step header's title, U74 7062:50965)
 */
export type PageTitleSize = 'display' | 'x-large' | 'large';

export interface PageTitleProps {
  title: string;
  /** One line of explanation under the title */
  hint?: string;
  /** The heading's text style; `display` without it */
  size?: PageTitleSize;
  /** The heading, so that a page can move the focus to it after its content changed */
  ref?: Ref<HTMLHeadingElement>;
}
