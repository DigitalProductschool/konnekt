import type { ItemFindingKind } from '@konnekt/rules/checks/types';

/**
 * A rule's or group's finding as the rules step shows it: its kind and the note's text from
 * `noteOf()` (FR-012). `RuleRow` and `GroupFrame` take it as their `finding`
 */
export interface ShownFinding {
  kind: ItemFindingKind;
  /**
   * Names the items, without the kind ("Can’t be met together with Rule 02."): the note's icon
   * carries the kind as hidden text (A3, W19)
   */
  text: string;
}

export interface FindingNoteProps extends ShownFinding {
  /** Its id, which the rule row or group frame points to as its description */
  id?: string;
}

/** The classes of one kind's look (A3, A4) */
export interface FindingLook {
  /** KERN's icon and its colour */
  icon: string;
  /** The colour of the outline round the rule row or group frame */
  outline: string;
}
