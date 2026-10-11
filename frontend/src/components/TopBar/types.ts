import type { ReactNode } from 'react';

export interface TopBarProps {
  /** Shown after the logo, behind a separator, as in Figma "App/Header" */
  title?: string;
  /** "column" lines the content up with the wizard's 1120 px column ("App/Header") */
  width?: 'full' | 'column';
  /** Makes the logo a link to this route, as on the signed-in screens */
  logoTo?: string;
  /** Shown at the right end, such as the signed-in user's menu */
  children?: ReactNode;
}
