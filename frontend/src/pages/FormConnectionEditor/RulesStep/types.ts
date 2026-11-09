import type {
  BranchInput,
  Combinator,
  GroupItem,
  NumberingBase,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type {
  BannerPart,
  BranchCheck,
  FindingTone,
  ItemNames,
  ItemReference,
} from '@connection-portal/rules/checks/types';
import type { RuleContext, RuleDocument, RulesProblem } from '@connection-portal/rules/types';
import type { KeyboardEvent, ReactNode } from 'react';

import type { BranchFindings } from '../../../components/BranchName/types';
import type { ShownFinding } from '../../../components/FindingNote/types';
import type { ToastContent } from '../../../components/Toast/types';
import type { PopupPlacement } from '../../../utils/popupPlacement';

/**
 * A branch in the rules step. `key` is its id (spec 007, research R10): a stored branch's, or the
 * one it got when it was added or, without one, when the step loaded it; a save sends it as the
 * branch's id. `id` is the id the step loaded it with, null for a branch added in the step
 */
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
  | { type: 'publish' }
  /** "Test rules" (spec 004, S2): the pre-checks of publishing, then the test step */
  | { type: 'test' }
  /** "Save and exit" closes the rule editor through "Save changes to Rule 01?" first (FR-012) */
  | { type: 'saveAndExit' };

export type RulesDialog =
  /** "Delete Rule 03?" (U14; in Standard with variants, U23 and F14) */
  | { type: 'deleteRule'; branchKey: string; ruleId: string }
  /** "Delete Group 01?" (W8) */
  | { type: 'deleteGroup'; branchKey: string; groupId: string }
  /** "Save changes to Rule 01?" (U28, F10), then `next` */
  | { type: 'saveChanges'; next: LeaveEditorAction }
  /** "Add variant" (U17 6139:32693) */
  | { type: 'addVariant' }
  /** "Edit variant", from a tab's "Rename" (W3) */
  | { type: 'editVariant'; branchKey: string }
  /** "Delete Ambulance?" (W3) */
  | { type: 'deleteVariant'; branchKey: string }
  /** "Copy to variant" (U20) */
  | { type: 'copyRule'; branchKey: string; ruleId: string };

/**
 * What the toast's Undo puts back: every branch as it was before the last deletion, grouping or
 * ungrouping, since a change of the main branch reaches the branches based on it. Any other
 * change of the rules drops it
 */
export interface RulesUndo {
  branches: RulesBranch[];
  /** Where the focus goes once undone: the branch and the item the undo brings back */
  branchKey: string;
  itemId: string;
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
  /** The branch the toast's "Show" opens, after copying a rule to it (F29) */
  showBranch: string | null;
  /** The problem that refused the last Publish or Save, shown until the rules change */
  problem: RulesProblem | null;
  selection: RulesSelection | null;
  switched: SwitchedLevel | null;
  /**
   * The keys of the variants whose findings banner is expanded while the editor is open, never
   * stored (design-notes.md §3.3; FR-019)
   */
  expandedFindings: string[];
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
  /** A toast without an action that changes nothing, such as "Link copied." (S4) */
  | { type: 'showToast'; message: string }
  | { type: 'showProblem'; problem: RulesProblem }
  | { type: 'clearProblem' }
  | { type: 'selectBranch'; branchKey: string }
  | { type: 'switchOperator'; branchKey: string; parentId: string | null; operator: Combinator }
  /** "Group with other rules": select mode, with this rule chosen */
  | { type: 'startSelect'; branchKey: string; itemId: string }
  | { type: 'toggleSelect'; itemId: string }
  | { type: 'cancelSelect' }
  /** Opens or closes a variant's findings banner (A1) */
  | { type: 'toggleFindings'; branchKey: string }
  /** "Group rules": the chosen rules become a group or sub-group */
  | { type: 'groupSelected' }
  | { type: 'ungroup'; branchKey: string; groupId: string }
  /** Adds (with ''), changes or removes (with null) a group's own message */
  | { type: 'setGroupMessage'; branchKey: string; groupId: string; message: string | null }
  | { type: 'askAddVariant' }
  /**
   * `id` is the new variant's, which the Add variant dialog makes, so that it can move the focus
   * to its tab; a new one without it
   */
  | { type: 'addVariant'; variant: VariantFields; origin: 'based' | 'empty'; id?: string }
  | { type: 'askEditVariant'; branchKey: string }
  | { type: 'editVariant'; branchKey: string; variant: VariantFields }
  | { type: 'askDeleteVariant'; branchKey: string }
  /** An inherited rule or group removed in a based branch, and restored (FR-023, FR-024) */
  | { type: 'removeItem'; branchKey: string; itemId: string }
  | { type: 'restoreItem'; branchKey: string; itemId: string }
  /** "Reset to Standard": a changed item follows the main branch again (FR-024) */
  | { type: 'resetItem'; branchKey: string; itemId: string }
  /** The top level's AND/OR follows the main branch again (FR-024) */
  | { type: 'resetOperator'; branchKey: string }
  | { type: 'askCopyRule'; branchKey: string; ruleId: string }
  /** Copies the rule the dialog names to these branches (FR-022) */
  | { type: 'copyRule'; targets: string[] };

/** A variant's name and description, as the Add variant and Edit variant dialogs give them */
export interface VariantFields {
  name: string;
  description: string | null;
}

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
  /**
   * The rule checks' result per branch key, from `useRuleChecks()` (spec 003): null while a
   * branch hasn't been checked yet. The previous result stays until the next one arrives
   */
  checks: Record<string, BranchCheck | null>;
  /** Whether the connection is being edited, which some wording follows */
  editing: boolean;
  /**
   * The stored draft's or the published connection's id, which its links name (spec 007, S4;
   * FR-028); null for a new, unsaved connection, whose menus then don't offer "Copy link"
   */
  connectionId: string | null;
  /**
   * The notice of a link to a variant, rule or group that no longer exists (S5; FR-031), from
   * opening the link, until it is dismissed; null without one
   */
  linkNotice: LinkNoticeKind | null;
  onDismissLinkNotice: () => void;
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
  /** Whether the branch is based on the main branch, whose items carry marks */
  based: boolean;
  state: RulesState;
  /** For the statements: the whole catalog, so that a rule on data no longer requested reads */
  context: RuleContext;
  /** The requested documents, which tell the rules on data no longer requested (F11) */
  documents: RuleDocument[];
  /** The open rule editor, shown in its rule's place or at the end of a new rule's level */
  ruleEditor: ReactNode;
  /**
   * The open branch's findings by item id, with their notes in the current names (spec 003,
   * FR-011, FR-012). Removed, dissolved and faded items show none
   */
  findings: ReadonlyMap<string, ShownFinding>;
  dispatch: (action: RulesAction) => void;
  onAddRule: (parentId: string | null) => void;
  onEditRule: (ruleId: string) => void;
  onDuplicateRule: (ruleId: string) => void;
  /** "Group with other rules": select mode, with the focus on the rule's box */
  onStartSelect: (ruleId: string) => void;
  onUngroup: (groupId: string) => void;
  /** "Add error message": the message card, with the focus in it */
  onAddGroupMessage: (groupId: string) => void;
  /** "Copy to variant" (U20), from the rule's ⋯ */
  onCopyRule: (ruleId: string) => void;
  /** "Remove from this variant", "Restore" and "Reset to Standard", keeping the focus there */
  onRemove: (itemId: string) => void;
  onRestore: (itemId: string) => void;
  onReset: (itemId: string) => void;
  /**
   * "Copy link" (S4; FR-028): copies the link of a rule or group of the open branch; null for a
   * new, unsaved connection, whose menus don't offer it
   */
  onCopyLink: ((itemId: string) => void) | null;
}

export interface TreeItemProps {
  view: RulesTreeView;
  item: RuleTreeItem;
  parentId: string | null;
  /** 0 at the top level, 1 in a group, 2 in a sub-group */
  depth: number;
  /** An inherited group dissolved in the based branch, shown as removed (F13) */
  dissolved?: boolean;
  /** In a removed or dissolved group: faded with it, and read-only */
  faded?: boolean;
}

export interface GroupListItemProps {
  view: RulesTreeView;
  group: GroupItem;
  /** 0 for a group, 1 for a sub-group */
  depth: number;
  dissolved: boolean;
  faded: boolean;
}

export interface RuleListItemProps {
  rule: RuleItem;
  view: RulesTreeView;
  /** The element id the focus moves to after a refused Publish or Save */
  elementId: string;
  /** The rule's problem to point out: the refusal, or data no longer requested (F11) */
  flag: string | null;
  /** Its finding of spec 003, or null; `flag` wins over it (W11) */
  finding: ShownFinding | null;
  /** In a removed or dissolved group: faded with it, without a menu */
  faded: boolean;
  /** Its box in select mode (`SelectBox`), passed to the row's `selectBox` slot */
  selectBox?: ReactNode;
}

/**
 * What a rule or group is to its branch, which decides its menu: the branch's own (in the main
 * branch, a branch that started empty, or added in a based branch), inherited from the main
 * branch in a based branch, or removed there (also a group dissolved there)
 */
export type ItemStanding = 'own' | 'inherited' | 'removed';

/** What a ⋯ menu's entries do, by entry; an entry without one isn't offered */
export type MenuHandlers = Partial<Record<MenuEntryId, () => void>>;

export interface RuleMenuProps {
  ruleName: string;
  /** What it offers, in order: `menuEntriesOf()` (FR-036) */
  entries: MenuEntry[];
  /** The open branch's name, which "Remove from <variant>" names */
  branchName: string;
  /** The main branch's name, which "Reset to Standard" names */
  mainName: string;
  /** What each entry does; "Group with other rules" starts select mode with the rule chosen */
  handlers: MenuHandlers;
}

export interface GroupMenuProps {
  groupName: string;
  /** Shown as a sub-group: its labels say "sub-group" (build note U54 6522:33107 #13) */
  subGroup: boolean;
  /** What it offers, in order: `menuEntriesOf()` (FR-036) */
  entries: MenuEntry[];
  /** The open branch's name, which "Remove from <variant>" names */
  branchName: string;
  mainName: string;
  handlers: MenuHandlers;
}

/**
 * An entry of a rule's, group's, sub-group's or variant tab's ⋯ menu, from `menuEntriesOf()`
 * (FR-036; data-model "The rules step's menus"). The menu gives each its label: `rename` is
 * inline for rules and groups and opens "Edit variant" for a variant (Q21); `restore` reads
 * "Restore rule", "Restore group" or "Restore sub-group"; `remove` ("Remove from <variant>") and
 * `delete` ("Delete rule", "Delete group", "Delete sub-group", "Delete variant") are the
 * destructive ones, after the divider
 */
export type MenuEntryId =
  | 'edit'
  | 'rename'
  | 'addMessage'
  | 'removeMessage'
  | 'duplicate'
  | 'copyToVariant'
  | 'group'
  | 'ungroup'
  | 'reset'
  | 'restore'
  | 'copyLink'
  | 'remove'
  | 'delete';

/**
 * Where "Group with other rules" starts select mode (FR-036; CLAR #60, #61): the top level, where
 * rules and groups can be chosen, or the id of a top-level group, where only the rules directly in
 * it can be
 */
export type SelectScope = 'top' | string;

/** A menu entry; "Group with other rules" carries the scope of the select mode it starts */
export type MenuEntry = { id: 'group'; scope: SelectScope } | { id: Exclude<MenuEntryId, 'group'> };

/** Where a rule sits in its branch: at the top level, directly in a group, or in a sub-group */
export type MenuRuleLevel =
  { level: 'top' } | { level: 'group'; groupId: string } | { level: 'sub-group' };

/** What a rule's or group's place in its branch says about its menu */
export interface MenuTreeItemState {
  /** In a variant, linked to Standard: inherited, changed there or not (CLAR #53) */
  linked: boolean;
  /** Changed in its variant ("Changed here"), which "Reset to Standard" takes back */
  changed: boolean;
  /** Removed in its variant, or an inherited group dissolved there (F13): restored only */
  removed: boolean;
  /**
   * Whether another item of its level can be grouped with it (FR-036; CLAR #48, #60, #61): at the
   * top level another rule or group, in a group another rule directly in it, never a sub-group
   */
  neighbours: boolean;
}

/** What a ⋯ menu belongs to, from `menuItemOf()` for a rule or group (FR-036) */
export type MenuItem =
  | ({
      kind: 'rule';
      /** Whether some other variant could still receive a copy ("Copy to variant", CLAR #53) */
      receivable: boolean;
    } & MenuRuleLevel &
      MenuTreeItemState)
  | ({
      kind: 'group' | 'sub-group';
      /** Whether the group has a message of its own ("Remove message", CLAR #54) */
      hasMessage: boolean;
      /** A group holding a sub-group offers no grouping (FR-036; 002-S2.10) */
      holdsSubGroup: boolean;
    } & MenuTreeItemState)
  | { kind: 'variant' };

/** What every menu of a branch shares (FR-036) */
export interface MenuContext {
  /** The branch the item is in, for a tab's ⋯ that variant: Standard or a variant */
  branchKind: 'standard' | 'variant';
  /**
   * Whether the menus offer "Copy link": a stored draft or a published connection, not a new,
   * unsaved one (spec 007, S4.6)
   */
  linkable: boolean;
}

export interface LinkStripProps {
  /** The based variant it heads, whose removals it counts (FR-051 (38)) */
  branch: RulesBranch;
  /** The main branch's name */
  mainName: string;
}

/** The type sizes of names: label/small for a rule, title/default and title/small for groups */
export type ItemNameSize = 'rule' | 'group' | 'sub-group';

export interface ItemNameProps {
  item: RuleTreeItem;
  branch: RulesBranch;
  /** Every branch, main branch first: a rename in the main branch must fit the based ones */
  branches: RulesBranch[];
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

/** How the findings banner shows (design-notes.md §3.3; A1, W17) */
export type BannerState = 'single' | 'collapsed' | 'expanded';

/** One item of the expanded findings banner: a line, the notice or FR-010's sentence */
export interface BannerItem {
  key: string;
  /** Its icon */
  tone: FindingTone;
  /** Its icon's visually hidden kind text ("Conflicting:"), null for the notice and FR-010's */
  kindText: string | null;
  /** Its text, the names as references to link */
  parts: BannerPart[];
}

/** What the findings banner draws, from `bannerViewOf()` */
export interface BannerView {
  state: BannerState;
  /** The summary row: the line and what follows it, or the counts row */
  summary: BannerItem;
  /** The expanded banner's items, empty otherwise */
  items: BannerItem[];
}

export interface FindingsBannerProps {
  /** The shown branch's result, from `useRuleChecks()`; null while it hasn't been checked */
  check: BranchCheck | null;
  /** The shown branch, which the banner names */
  branch: RulesBranch;
  /** Its items' current names in display order, from `namesOf()` */
  names: ItemNames;
  /** Whether the banner is expanded, kept per variant in the step's state */
  expanded: boolean;
  dispatch: (action: RulesAction) => void;
  /** The rule open in the rule editor, which has no row and isn't a link */
  plainItemId: string | null;
}

export interface FindingsBannerLineProps {
  item: BannerItem;
  branchKey: string;
  plainItemId: string | null;
  /** After the text: the chevron of the summary row */
  children?: ReactNode;
}

export interface FindingLinkProps {
  reference: ItemReference;
  branchKey: string;
}

/** A rule that checks data no longer requested, as the banner names it (F11, F58) */
export interface UnrequestedRule {
  /** Its branch's key and its id, unique across the branches */
  key: string;
  /** The banner's sentence, naming the rule, its variant and, if it is gone, the document */
  text: string;
}

export interface UnrequestedBannerProps {
  /** The rules that check data no longer requested, in every branch */
  rules: UnrequestedRule[];
  /** "Add it in Documents": the documents step, asking first if a rule is open (FR-023f) */
  onAddData: () => void;
}

export interface UnrequestedRuleLineProps {
  text: string;
}

export interface AddRuleButtonProps {
  id: string;
  onAddRule: () => void;
}

export interface SelectionBarProps {
  selection: RulesSelection;
  branch: RulesBranch;
  /** Standard's name, which the bar names in a based variant (U64 6616:44355) */
  mainName: string;
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
  /** Whether the connection is being edited: deleting a variant then ends its result link */
  editing: boolean;
  /**
   * Whether the edited connection is active (the default): a deactivated one's delete-variant body
   * doesn't say "The connection is active" (T068's note)
   */
  active?: boolean;
  dispatch: (action: RulesAction) => void;
  /** Closes the dialog: the rule stays, and so does the editor */
  onCancel: () => void;
  onConfirmDelete: () => void;
  /** "Save changes": keeps the rule as it is, complete or not (F10) */
  onSaveChanges: () => void;
  /** "Discard": drops the changes */
  onDiscardChanges: () => void;
}

export interface BranchTabsProps {
  state: RulesState;
  /** The rule checks' result per branch key, as `RulesStepProps.checks`, for the tab icons */
  checks: Record<string, BranchCheck | null>;
  dispatch: (action: RulesAction) => void;
  /** "Copy link" of a variant, by its key (S4); null for a new, unsaved connection */
  onCopyLink: ((branchKey: string) => void) | null;
  /**
   * A spec 002 problem per branch key, such as a rule on data no longer requested (U50
   * 7375:101551): the red icon, which wins over the findings' (error > warning > info)
   */
  problems?: Readonly<Record<string, BranchFindings>>;
}

export interface BranchTabProps {
  branch: RulesBranch;
  selected: boolean;
  /** Whether the branch can be deleted: every branch but the main branch */
  deletable: boolean;
  /** Its findings for the tab's icon and tooltip, from `tabFindingsOf()`; null without (W13) */
  findings: BranchFindings | null;
  /**
   * Its spec 002 problem (the `error` kind), such as a rule on data no longer requested: its red
   * icon wins, its tooltip says the problem, then the findings (FR-041a); null without
   */
  problem: BranchFindings | null;
  onSelect: () => void;
  /** Arrow keys, Home and End move between the tabs */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onRename: () => void;
  onDelete: () => void;
  /** "Copy link" of the variant (S4); null for a new, unsaved connection */
  onCopyLink: (() => void) | null;
}

export interface BranchMenuProps {
  branchName: string;
  deletable: boolean;
  onRename: () => void;
  onDelete: () => void;
  /** "Copy link" (S4); null hides it: a new, unsaved connection has no link */
  onCopyLink: (() => void) | null;
}

/** The Add variant and Edit variant dialogs' fields, and why the name was refused */
export interface VariantForm {
  name: string;
  description: string;
  origin: 'based' | 'empty';
  error: string | null;
}

export type VariantFormAction =
  | { type: 'reset'; form: VariantForm }
  | { type: 'change'; changes: Partial<Omit<VariantForm, 'error'>> }
  | { type: 'refuse'; error: string };

export interface VariantDialogProps {
  state: RulesState;
  dispatch: (action: RulesAction) => void;
}

export interface StartWithOptionProps {
  /** The radio group's name */
  name: string;
  value: 'based' | 'empty';
  label: string;
  help: string;
  checked: boolean;
  onSelect: () => void;
}

export interface CopyPopoverProps {
  state: RulesState;
  /** The rule's branch and the rule */
  branchKey: string;
  ruleName: string;
  /** Where it opens from the rule's ⋯ (utils/popupPlacement.ts) */
  placement: PopupPlacement;
  /** Copies the rule to these branches, by key */
  onCopy: (targets: string[]) => void;
  /** Cancel, Escape or a click elsewhere */
  onClose: () => void;
  /** The focus left it another way than Tab, which stays inside: it closes, the focus stays */
  onDismiss: () => void;
}

/**
 * What a link names that isn't there (S5; FR-031): its variant, so that the first variant is
 * shown, or its rule or group in the variant, which is shown
 */
export type LinkNoticeKind = 'variant' | 'item';

export interface LinkNoticeProps {
  kind: LinkNoticeKind;
  /** "Dismiss" */
  onDismiss: () => void;
}

export interface CopyTargetItemProps {
  id: string;
  label: string;
  checked: boolean;
  /** A variant based on Standard while Standard is chosen: included, not chosen on its own */
  included: boolean;
  /** The id of the help text "Variants linked to Standard get it too.", where it applies */
  describedBy?: string;
  onToggle: () => void;
}
