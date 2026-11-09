import type { ReactNode } from 'react';

export interface TopBarProps {
  /**
   * Inside a connection: its name, in the second pill "Your connections / <name>" (U17
   * 7173:52658), which grows out of the Konnekt pill when it appears (U03 #40)
   */
  title?: string;
  /** Renders the name as the page's h1, on a screen whose header names it */
  titleAsHeading?: boolean;
  /** Shown 8px after the name in the second pill: the connection's status pill */
  badge?: ReactNode;
  /**
   * Shown after the second pill in muted text, such as the connection's description (W10);
   * one line, cut with '…'
   */
  meta?: ReactNode;
  /** Makes the product name a link to this route, as on the signed-in screens */
  logoTo?: string;
  /** The sign-in screens: the Konnekt pill is white on the light blue page (U03 #33) */
  signedOut?: boolean;
  /**
   * In a flow (FR-026, T048): the product name and "Your connections" call this instead of
   * going home, and the editor asks before leaving. Without it they go home (001-S0.6)
   */
  onLeave?: () => void;
  /** Shown at the right end: the account pill (UserMenu) */
  children?: ReactNode;
}
