import type { ReactNode } from 'react';

import type { TabFindings } from '../../utils/rules/checks/types';

export interface BranchNameProps {
  /** The branch's name, as written */
  name: string;
  /** The branch's description; without one and without findings, no (i) shows */
  description: string | null;
  /**
   * The branch's findings, from `tabFindingsOf()`: the icon's kind and the tooltip's segment
   * (spec 003, A6). Only the rules step's tabs pass them; the details never do (S6; FR-020)
   */
  findings?: TabFindings | null;
  /** The element that shows the name, such as a tab; a plain text by default */
  children?: ReactNode;
}

export interface FindingsSegmentProps {
  findings: TabFindings;
  /** Whether a description is above it, which the divider separates it from */
  divided: boolean;
}
