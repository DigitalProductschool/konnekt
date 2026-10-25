import type { ToastContent } from '../../../components/Toast/types';
import type { BranchInput, NumberingBase, RuleItem } from '../../../types/form-connections';
import type { OptionSet } from '../../../types/option-sets';
import type {
  DeletedItem,
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
  /** The rule as saved in the step, which "Cancel" and "Discard" keep; null for a new rule */
  original: RuleItem | null;
  /** The rule as edited so far */
  draft: RuleItem;
}

/** What the team member did that closes the rule editor, which happens after its question */
export type LeaveEditorAction =
  | { type: 'cancel' }
  | { type: 'edit'; branchKey: string; ruleId: string }
  | { type: 'add'; branchKey: string }
  | { type: 'documents' }
  | { type: 'publish' };

export type RulesDialog =
  /** "Delete Rule 03?" (U14) */
  | { type: 'deleteRule'; branchKey: string; ruleId: string }
  /** "Save changes to Rule 01?" (U28, F10), then `next` */
  | { type: 'saveChanges'; next: LeaveEditorAction };

/** What the toast's Undo puts back: a deleted rule, in its place */
export interface RulesUndo {
  branchKey: string;
  deleted: DeletedItem;
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
}

export type RulesAction =
  | { type: 'addRule'; branchKey: string }
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
  | { type: 'confirmDelete' }
  | { type: 'askSaveChanges'; next: LeaveEditorAction }
  | { type: 'closeDialog' }
  | { type: 'undo' }
  | { type: 'dismissToast' }
  | { type: 'showProblem'; problem: RulesProblem }
  | { type: 'clearProblem' }
  | { type: 'selectBranch'; branchKey: string };

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
  /** Opens the rule editor for a new rule or a saved one, asking first if one is open */
  onAddRule: (branchKey: string) => void;
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

export interface RuleListItemProps {
  rule: RuleItem;
  branch: RulesBranch;
  context: RuleContext;
  /** The element id the focus moves to after a refused Publish or Save */
  elementId: string;
  /** The rule's problem to point out: the refusal, or data no longer requested (F11) */
  flag: string | null;
  renaming: boolean;
  dispatch: (action: RulesAction) => void;
  onEdit: () => void;
  onDuplicate: () => void;
}

export interface RuleMenuProps {
  ruleName: string;
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export interface RuleMenuItemProps {
  label: string;
  /** A KERN icon class, such as 'kern-icon--edit', or an image */
  icon: { kern: string } | { src: string };
  danger?: boolean;
  onSelect: () => void;
}

export interface RuleNameProps {
  rule: RuleItem;
  branch: RulesBranch;
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
