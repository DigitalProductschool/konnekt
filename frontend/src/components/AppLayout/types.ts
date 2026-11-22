import type { ReactNode } from 'react';

export interface AppLayoutProps {
  /** The page: it starts with its main heading (PageTitle) */
  children: ReactNode;
}

export interface PageMainProps {
  /** The page in the 1120px column */
  children: ReactNode;
}
