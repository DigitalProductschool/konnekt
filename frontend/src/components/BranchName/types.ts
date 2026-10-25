import type { ReactNode } from 'react';

export interface BranchNameProps {
  /** The branch's name, as written */
  name: string;
  /** The branch's description; without one, no (i) shows */
  description: string | null;
  /** The element that shows the name, such as a tab; a plain text by default */
  children?: ReactNode;
}
