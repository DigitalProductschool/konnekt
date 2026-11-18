import type { FindingTone } from '@connection-portal/rules/checks/types';
import type { KeyboardEvent, ReactNode } from 'react';

/**
 * The icon after a variant's name by severity (build note 26, U06 6760:48852; FR-041): the
 * findings' tones of spec 003 (`warning` for a contradiction, `info` for duplicates or an
 * always-met item only), and `error` for a spec 002 problem, such as a rule that checks data
 * that's no longer requested (U50 7375:101551)
 */
export type BranchIconKind = FindingTone | 'error';

/**
 * What the icon after a variant's name shows: its kind and the text of its tooltip's segment.
 * `tabFindingsOf()`'s `TabFindings` is one
 */
export interface BranchFindings {
  /** Its icon */
  kind: BranchIconKind;
  /** "1 conflict: Rule 01 and Rule 02 contradict each other, so no citizen …" */
  text: string;
  /**
   * A second segment under this one, below a divider: under a problem, the variant's findings,
   * which the problem's red icon stands for too (FR-041, U06 note 8: "then the finding")
   */
  more?: BranchFindings | null;
}

/** The tab a variant's name is when `BranchName` renders the tab itself */
export interface BranchTabControl {
  /** The tab's element id, which its panel's `aria-labelledby` names */
  id: string;
  /** The panel the tab controls */
  panelId: string;
  /** The open tab: bold and black, with the black indicator, and the one in the tab order */
  selected: boolean;
  onSelect: () => void;
  /** The tab list's keys (arrow keys, Home, End), which the tab row handles */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

export interface BranchNameProps {
  /** The branch's name, as written */
  name: string;
  /** The branch's description; without one and without findings, no (i) shows */
  description: string | null;
  /**
   * The branch's findings, from `tabFindingsOf()`, or its problem: the icon's kind and the
   * tooltip's segment (FR-041). The rules step's tabs pass them, the test step's tabs only the
   * "no citizen can meet" finding (F38)
   */
  findings?: BranchFindings | null;
  /**
   * Renders the variant tab itself (Figma "Rules/Variant tab · fixes" 6529:39174): the tab
   * button with the name, the icon, `actions`, and the 2px indicator under the row. Without it,
   * `children` (or a plain text) show the name
   */
  tab?: BranchTabControl;
  /** Controls after the icon in the tab's label row, such as the active tab's ⋯ (F28) */
  actions?: ReactNode;
  /** The element that shows the name, such as a heading; a plain text by default */
  children?: ReactNode;
}

export interface FindingsSegmentProps {
  /** What the segment says; its `more`, if any, follows below a divider */
  findings: BranchFindings;
  /** Whether a description is above it, which the divider separates it from */
  divided: boolean;
}

export interface SegmentLineProps {
  kind: BranchIconKind;
  text: string;
}

export interface BranchIconProps {
  /** The branch's name, trimmed, for the icon's accessible name */
  label: string;
  /** The description, trimmed; empty when there is none */
  description: string;
  findings?: BranchFindings | null;
}

export type BranchTabButtonProps = BranchTabControl & {
  name: string;
  /** The tab's accessible name when it differs from the name: "Ambulance has findings" (W13) */
  label?: string;
};
