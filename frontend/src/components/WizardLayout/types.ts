import type { ReactNode } from 'react';

export interface WizardLayoutProps {
  /** Shown in the header after the logo: the connection's name, or what is being made */
  title: string;
  /** Above the step's content, and still while it scrolls: progress and page title */
  head: ReactNode;
  /** The actions of Figma "App/Footer" */
  footer: ReactNode;
  /** Outside the scrolling area: a modal dialog, or a toast fixed to the window */
  overlay?: ReactNode;
  /** The step's content */
  children: ReactNode;
}
