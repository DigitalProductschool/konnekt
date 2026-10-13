import type { ReactNode } from 'react';

export interface WizardLayoutProps {
  /** Shown in the header after the logo: the connection's name, or what is being made */
  title?: string;
  /** Renders the title as the page's h1, where the screen has no page title of its own */
  titleAsHeading?: boolean;
  /** Shown in the header after the title: the connection's status */
  badge?: ReactNode;
  /** Shown in the header before the user's menu, in muted text */
  meta?: ReactNode;
  /** Above the step's content, and still while it scrolls: progress and page title */
  head?: ReactNode;
  /** The actions of Figma "App/Footer" */
  footer: ReactNode;
  /** Outside the scrolling area: a modal dialog, or a toast fixed to the window */
  overlay?: ReactNode;
  /** The step's content. The column fills the height, so that a state can centre in it */
  children: ReactNode;
}
