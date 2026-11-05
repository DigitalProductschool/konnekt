import type { ReactNode } from 'react';

export interface TopBarProps {
  /** Shown after the logo, behind a separator, as in Figma "App/Header" */
  title?: string;
  /** Renders the title as the page's h1, on a screen whose header names it */
  titleAsHeading?: boolean;
  /** Shown after the title, such as the connection's status badge */
  badge?: ReactNode;
  /**
   * Shown before the user's menu in muted text, such as the connection's description; one line,
   * cut with '…'
   */
  meta?: ReactNode;
  /** Makes the logo a link to this route, as on the signed-in screens */
  logoTo?: string;
  /** Shown at the right end, such as the signed-in user's menu */
  children?: ReactNode;
}
