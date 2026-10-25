import type { ReactNode } from 'react';

import type { ToastContent } from '../../../components/Toast/types';
import type {
  BranchInput,
  Combinator,
  GroupItem,
  NumberingBase,
  RuleItem,
  RuleTreeItem,
} from '../../../types/form-connections';
import type { OptionSet } from '../../../types/option-sets';
import type {
  LevelChange,
  RuleContext,
  RuleDocument,
  RulesProblem,
} from '../../../utils/rules/types';

/** A branch in the rules step. `key` stays the same while the branch has no id yet */
export interface RulesBranch extends BranchInput {
  key: string;
}

/** The rule open in the rule editor (S3) */
export interface RuleEditing {
  branchKey: string;
  /** Where a new rule goes: at the end of this group, or of the top level for null */
  parentId: string | null;
  /** The rule as saved in the step, which "Cancel" and "Discard" keep; null for a new rule */
  original: RuleItem | null;
  /** The rule as edited so far */
  draft: RuleItem;
}

/** What the team member did that closes the rule editor, which happens after its question */
export type LeaveEditorAction =
  | { type: 'cancel' }
  | { type: 'edit'; branchKey: string; ruleId: string }
  | { type: 'add'; branchKey: string; parentId: string | null }
  | { type: 'documents' }
  | { type: 'publish' };

export type RulesDialog =
  /** "Delete Rule 03?" (U14) */
  | { type: 'deleteRule'; branchKey: string; ruleId: string }
  /** "Delete Group 01?" (W8) */
  | { type: 'deleteGroup'; branchKey: string; groupId: string }
  /** "Save changes to Rule 01?" (U28, F10), then `next` */
  | { type: 'saveChanges'; next: LeaveEditorAction };

/**
 * What the toast's Undo puts back: the range of a level that the last deletion, grouping or
 * ungrouping changed. Any other change of the rules drops it
 */
export interface RulesUndo {
  branchKey: string;
  change: LevelChange;
  /** The number of the group a grouping made, which the undo gives back */
  groupNumber?: number;
}

/** Select mode (U16): the rules of one level chosen to form a group */
export interface RulesSelection {
  branchKey: string;
  /** The level: a group's identifier, or null for the top level */
  parentId: string | null;
  /** The chosen rules, in the order they were chosen */
  ids: string[];
}

/** The level whose AND or OR was just switched, which the note under it names (U14 6329:19219) */
export interface SwitchedLevel {
  branchKey: string;
  parentId: string | null;
  operator: Combinator;
}

/** An item being renamed inline (U15) */
export interface RenamingItem {
  branchKey: string;
  itemId: string;
}

export interface RulesState {
  /** Main branch first, in tab order */
  branches: RulesBranch[];
  /** The key of the branch whose rules are shown */
  openBranch: string;
  /** The numbers the next new rule and group get (research R5) */
  counters: NumberingBase;
  /** The counters the step started from, which a save names as its numbering base */
  numberingBase: NumberingBase;
  /** The rule set the step loaded, null for a new connection */
  ruleSetVersion: number | null;
  editing: RuleEditing | null;
  renaming: RenamingItem | null;
  dialog: RulesDialog | null;
  toast: ToastContent | null;
  undo: RulesUndo | null;
  /** The problem that refused the last Publish or Save, shown until the rules change */
  problem: RulesProblem | null;
  selection: RulesSelection | null;
  switched: SwitchedLevel | null;
}

export type RulesAction =
  | { type: 'addRule'; branchKey: string; parentId: string | null }
  | { type: 'editRule'; branchKey: string; ruleId: string }
  | { type: 'changeDraft'; draft: RuleItem }
  /** Puts the edited rule into its branch, complete or not, and closes the editor */
  | { type: 'saveRule' }
  /** Closes the editor and drops its changes */
  | { type: 'closeEditor' }
  | { type: 'startRename'; branchKey: string; itemId: string }
  | { type: 'rename'; name: string }
  | { type: 'cancelRename' }
  | { type: 'duplicateRule'; branchKey: string; ruleId: string }
  | { type: 'askDelete'; branchKey: string; ruleId: string }
  | { type: 'askDeleteGroup'; branchKey: string; groupId: string }
  /** Deletes the rule or group the dialog asks about */
  | { type: 'confirmDelete' }
  | { type: 'askSaveChanges'; next: LeaveEditorAction }
  | { type: 'closeDialog' }
  | { type: 'undo' }
  | { type: 'dismissToast' }
  | { type: 'showProblem'; problem: RulesProblem }
  | { type: 'clearProblem' }
  | { type: 'selectBranch'; branchKey: string }
  | { type: 'switchOperator'; branchKey: string; parentId: string | null; operator: Combinator }
  /** "Group with other rules": select mode, with this rule chosen */
  | { type: 'startSelect'; branchKey: string; itemId: string }
  | { type: 'toggleSelect'; itemId: string }
  | { type: 'cancelSelect' }
  /** "Group rules": the chosen rules become a group or sub-group */
  | { type: 'groupSelected' }
  | { type: 'ungroup'; branchKey: string; groupId: string }
  /** Adds (with ''), changes or removes (with null) a group's own message */
  | { type: 'setGroupMessage'; branchKey: string; groupId: string; message: string | null };

/** The catalog data the step's statements, menus and checks read */
export interface RulesCatalog {
  /** The requested documents with only their requested fields, for menus and checks */
  documents: RuleDocument[];
  /** Every document of the catalog, so that a rule on data no longer requested still reads */
  allDocuments: RuleDocument[];
  optionSets: OptionSet[];
}

export interface RulesStepProps {
  /** Whether the catalog and the value sets are loaded, which statements and menus need */
  status: 'loading' | 'loaded' | 'failed';
  onRetry: () => void;
  state: RulesState;
  catalog: RulesCatalog;
  /** Whether the connection is being edited, which some wording follows */
  editing: boolean;
  dispatch: (action: RulesAction) => void;
  /**
   * Opens the rule editor for a new rule, at the end of a group or of the top level (null), or
   * for a saved one, asking first if one is open
   */
  onAddRule: (branchKey: string, parentId: string | null) => void;
  onEditRule: (branchKey: string, ruleId: string) => void;
  /** "Need other data? Add it in Documents" */
  onAddData: () => void;
  /** "Save rule": the rule is complete */
  onSaveRule: () => void;
  /** "Cancel": asks first when the rule has unsaved changes */
  onCancelEditor: () => void;
}

export interface RulesEmptyStateProps {
  /** The id of its "Add rule", where the focus goes when the last rule is deleted */
  addRuleId: string;
  onAddRule: () => void;
}

/** What every item of the open branch's tree needs, passed down the levels */
export interface RulesTreeView {
  branch: RulesBranch;
  state: RulesState;
  /** For the statements: the whole catalog, so that a rule on data no longer requested reads */
  context: RuleContext;
  /** The requested documents, which tell the rules on data no longer requested (F11) */
  documents: RuleDocument[];
  /** The open rule editor, shown in its rule's place or at the end of a new rule's level */
  ruleEditor: ReactNode;
  dispatch: (action: RulesAction) => void;
  onAddRule: (parentId: string | null) => void;
  onEditRule: (ruleId: string) => void;
  onDuplicateRule: (ruleId: string) => void;
  /** "Group with other rules": select mode, with the focus on the rule's box */
  onStartSelect: (ruleId: string) => void;
  onUngroup: (groupId: string) => void;
  /** "Add error message": the message card, with the focus in it */
  onAddGroupMessage: (groupId: string) => void;
}

export interface TreeItemProps {
  view: RulesTreeView;
  item: RuleTreeItem;
  /** Its level's items, itself included */
  level: RuleTreeItem[];
  parentId: string | null;
  /** 0 at the top level, 1 in a group, 2 in a sub-group */
  depth: number;
}

export interface GroupListItemProps {
  view: RulesTreeView;
  group: GroupItem;
  /** 0 for a group, 1 for a sub-group */
  depth: number;
}

export interface RuleListItemProps {
  rule: RuleItem;
  branch: RulesBranch;
  context: RuleContext;
  /** The element id the focus moves to after a refused Publish or Save */
  elementId: string;
  /** The rule's problem to point out: the refusal, or data no longer requested (F11) */
  flag: string | null;
  renaming: boolean;
  /** Whether its menu offers "Group with other rules": another rule shares its level */
  canGroup: boolean;
  dispatch: (action: RulesAction) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
}

export interface RuleMenuProps {
  ruleName: string;
  canGroup: boolean;
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onDelete: () => void;
}

export interface GroupMenuProps {
  groupName: string;
  hasMessage: boolean;
  onAddMessage: () => void;
  onRemoveMessage: () => void;
  onRename: () => void;
  onUngroup: () => void;
  onDelete: () => void;
}

export interface RuleMenuItemProps {
  label: string;
  /** A KERN icon class, such as 'kern-icon--edit', or an image */
  icon: { kern: string } | { src: string };
  danger?: boolean;
  onSelect: () => void;
}

/** An action of a ⋯ menu */
export interface MenuAction {
  label: string;
  icon: RuleMenuItemProps['icon'];
  danger?: boolean;
  /** Draws the menu's divider before it */
  separated?: boolean;
  onSelect: () => void;
}

export interface ActionMenuProps {
  /** The ⋯ button's name, such as "Actions for Rule 01" */
  label: string;
  actions: MenuAction[];
}

/** The type sizes of names: label/small for a rule, title/default and title/small for groups */
export type ItemNameSize = 'rule' | 'group' | 'sub-group';

export interface ItemNameProps {
  item: RuleTreeItem;
  branch: RulesBranch;
  size: ItemNameSize;
  renaming: boolean;
  dispatch: (action: RulesAction) => void;
}

/** The inline rename field's state */
export interface RenameField {
  value: string;
  /** Why the name was refused (F12), shown until it changes */
  error: string | null;
}

export type RenameAction =
  | { type: 'reset'; value: string }
  | { type: 'change'; value: string }
  | { type: 'refuse'; error: string };

export interface UnrequestedBannerProps {
  /** The rules that check data no longer requested, each with its branch's name */
  rules: { rule: RuleItem; branchName: string }[];
}

export interface UnrequestedRuleLineProps {
  ruleName: string;
  branchName: string;
}

export interface AddRuleButtonProps {
  id: string;
  onAddRule: () => void;
}

export interface SelectionBarProps {
  selection: RulesSelection;
  branch: RulesBranch;
  onCancel: () => void;
  onGroup: () => void;
}

export interface SelectBoxProps {
  id: string;
  ruleName: string;
  checked: boolean;
  onToggle: () => void;
}

export interface SwitchNoteProps {
  /** The note's text, or null while there is none */
  text: string | null;
  /** The top level's note keeps clear of the card's edges; a group's fills its width */
  topLevel?: boolean;
}

export interface RulesDialogsProps {
  state: RulesState;
  /** For the deleted rule's statement */
  context: RuleContext;
  /** Closes the dialog: the rule stays, and so does the editor */
  onCancel: () => void;
  onConfirmDelete: () => void;
  /** "Save changes": keeps the rule as it is, complete or not (F10) */
  onSaveChanges: () => void;
  /** "Discard": drops the changes */
  onDiscardChanges: () => void;
}
