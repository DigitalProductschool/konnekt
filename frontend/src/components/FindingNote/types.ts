import type { ItemFindingKind } from '../../utils/rules/checks/types';

/**
 * A rule's or group's finding as the rules step shows it: its kind and the note's text from
 * `noteOf()` (FR-012). `RuleRow` and `GroupFrame` take it as their `finding`
 */
export interface ShownFinding {
  kind: ItemFindingKind;
  /** Starts with the kind ("Conflicting.", "Redundant.", "Always met.") and names the items */
  text: string;
}

export interface FindingNoteProps extends ShownFinding {
  /** Its id, which the rule row or group frame points to as its description */
  id?: string;
}

/** The classes of one kind's look (F4) */
export interface FindingLook {
  /** The note's text colour */
  text: string;
  /** KERN's icon and its colour */
  icon: string;
  /** The colour of the outline round the rule row or group frame */
  outline: string;
}
