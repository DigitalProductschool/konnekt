import type { ReactNode } from 'react';

import type { UserMenuProps } from '../UserMenu/types';

/**
 * `steps`: the wizard's page L3, with the step header and the 1120px column. `details`: the
 * details' frame L4, with no step line (FR-025) and the 832px column (U07 #5; used by T078)
 */
export type WizardLayoutVariant = 'steps' | 'details';

export interface WizardLayoutProps {
  /** Shown in the header after the logo: the connection's name, or what is being made */
  title?: string;
  /** Renders the title as the page's h1, where the screen has no page title of its own */
  titleAsHeading?: boolean;
  /** Shown in the header after the title: the connection's status */
  badge?: ReactNode;
  /** Shown in the header before the user's menu, in muted text */
  meta?: ReactNode;
  /**
   * The step header (Figma "Shell/Step header · compact"): the step line and the page title,
   * 16px apart. It stays under the header pills while the page scrolls, where the window has
   * room for it. The details variant has none
   */
  head?: ReactNode;
  /** The actions of Figma "Shell/Footer"; null for none */
  footer: ReactNode;
  /** Outside the page's flow: a modal dialog, or a toast fixed to the window */
  overlay?: ReactNode;
  /** The page L3 (`steps`, the default) or the details' frame L4 (`details`) */
  variant?: WizardLayoutVariant;
  /**
   * In a flow (FR-026, T048): the product name and "Your connections" call this instead of
   * going home (TopBar)
   */
  onLeave?: () => void;
  /** In a flow (FR-026, T048): "Log out" asks first (UserMenu) */
  onLogOut?: UserMenuProps['onLogOut'];
  /** The step's content. The column fills the height, so that a state can centre in it */
  children: ReactNode;
}
