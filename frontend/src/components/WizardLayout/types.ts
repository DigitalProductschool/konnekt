import type { ReactNode } from 'react';

export interface WizardLayoutProps {
  /** Shown in the header after the logo: the connection's name, or what is being made */
  title: string;
  /** The actions of Figma "App/Footer" */
  footer: ReactNode;
  /** The step: progress, page title and content */
  children: ReactNode;
}
