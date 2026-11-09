// The Rules step's copy: design-notes.md §2, §4 and §5, the Figma frames named, and F29's toasts
import type { FindingTone } from '@connection-portal/rules/checks/types';

import copyToIcon from '../../../assets/icons/copy-to-variant.svg';
import groupIcon from '../../../assets/icons/group-brackets.svg';
import linkIcon from '../../../assets/icons/link-ink.svg';
import messageIcon from '../../../assets/icons/message-alert.svg';
import removeIcon from '../../../assets/icons/remove-circle-danger.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import resetIcon from '../../../assets/icons/reset-restore.svg';
import ungroupIcon from '../../../assets/icons/ungroup-brackets.svg';
import type { MenuAction } from '../../../components/ActionMenu/types';
import type { PopupPlacement } from '../../../utils/popupPlacement';
import type { ItemNameSize, MenuEntryId } from './types';

/** The main branch of a new connection, before it is saved (FR-018) */
export const MAIN_BRANCH_NAME = 'Standard';

/** The type of names (U14): label/small for a rule, title/default and title/small for groups */
export const NAME_SIZES: Record<ItemNameSize, string> = {
  rule: 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)',
  group: 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)',
  'sub-group': 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)',
};

/**
 * The order of the ⋯ menus' entries (FR-036; build note U54 6522:33107 #2): change (Edit, Rename,
 * then a group's "Add message" and "Remove message", CLAR #54), copy (Duplicate, Copy to variant),
 * structure (Group with other rules, Ungroup), Reset to Standard, Restore, then "Copy link" as the
 * last entry before the destructive ones (spec 007, S4.1, S4.2), and "Remove from <variant>" or
 * "Delete …" after the divider. A menu shows only the entries `menuEntriesOf()` gives it
 */
export const MENU_ENTRY_ORDER: readonly MenuEntryId[] = [
  'edit',
  'rename',
  'addMessage',
  'removeMessage',
  'duplicate',
  'copyToVariant',
  'group',
  'ungroup',
  'reset',
  'restore',
  'copyLink',
  'remove',
  'delete',
];

/**
 * How each ⋯ menu entry looks (U55 6530:40192, 6522:32424; U56 6522:32540, 6522:32644; build note
 * U54 6522:33107 #8, #11, #12): its 20px icon, Figma's ("Icon/Error message · speech bubble",
 * "Icon/Ungroup · brackets apart", "Icon/Remove from this variant · minus circle"; "Remove
 * message", "Rename", "Copy to variant", "Reset to Standard" and "Copy link" aren't drawn and keep
 * theirs); red with the divider before it only for "Remove from <variant>" and "Delete …".
 * "Restore …" has no icon, nor has the "Copy link" beside it, so that the two labels line up
 */
export const MENU_ENTRY_LOOKS: Record<
  MenuEntryId,
  Pick<MenuAction, 'icon' | 'danger' | 'separated'>
> = {
  edit: { icon: { kern: 'kern-icon--edit' } },
  rename: { icon: { src: renameIcon } },
  addMessage: { icon: { src: messageIcon } },
  removeMessage: { icon: { kern: 'kern-icon--close' } },
  duplicate: { icon: { kern: 'kern-icon--content-copy' } },
  copyToVariant: { icon: { src: copyToIcon } },
  group: { icon: { src: groupIcon } },
  ungroup: { icon: { src: ungroupIcon } },
  reset: { icon: { src: resetIcon } },
  restore: {},
  copyLink: { icon: { src: linkIcon } },
  remove: { icon: { src: removeIcon }, danger: true, separated: true },
  delete: { icon: { kern: 'kern-icon--delete' }, danger: true, separated: true },
};

/** The width of the "Copy to variant" popover (U20) */
export const COPY_POPOVER_WIDTH = 300;

/**
 * Where the copy popover opens from its ⋯ (utils/popupPlacement.ts), as a ⋯ menu does
 * (components/ActionMenu): below it, opening to the side that fits, or across the rules card when
 * neither does
 */
export const COPY_POPOVER_PLACEMENTS: Record<PopupPlacement, string> = {
  start: 'absolute top-full left-0 w-300',
  end: 'absolute top-full right-0 w-300',
  full: 'absolute inset-x-16',
};

/**
 * The selection bar's corners (U36 6616:44187, U64 6616:44355): at rest at the top of the rules
 * card, its top corners follow the card's 12px radius inside its 1px border; below the link strip
 * of a based variant (U64 6524:38500) and pinned under the tabs (U64 6616:44355, drawn at the
 * card's full width with no line under it) they are square
 */
export const SELECTION_BAR_STATES = {
  resting: 'rounded-t-[11px]',
  belowStrip: '',
  pinned: '',
};

/**
 * The custom property that carries the pinned tab row's height in px (U01 #18), set on the step's
 * root while the row is pinned (`wizard-pinned:`) and 0 otherwise. The classes below and the
 * step's pins use it: what scrolls into view stops below the tab row, and the selection bar pins
 * under it (U01 #19)
 */
export const TABS_HEIGHT_PROPERTY = '--rules-tabs-height';

/**
 * The variant tab row pinned with the step header (U01 #18; T033: the step header is pinned at
 * `wizard-pinned:`, ≥ 768 × 640): right under it, at `--wizard-sticky-top`, white so that the
 * rules scroll under it, above the rules card's rows and its selection bar (z-1) and below the
 * step header and the footer (z-15) and the popups (z-20 and up)
 */
export const PINNED_TABS_CLASSES =
  'bg-kern-layout-background-default wizard-pinned:sticky wizard-pinned:top-(--wizard-sticky-top) wizard-pinned:z-10';

/**
 * Where the rules step's pins start: under the step header and the pinned tab row. The rules card
 * hands it to the selection bar as its `--wizard-sticky-top` (SelectionBar pins at that), so that
 * the bar pins right under the tabs (U01 #19)
 */
export const PINNED_TOP_CLASSES = {
  root: '[--rules-pinned-top:calc(var(--wizard-sticky-top,0px)+var(--rules-tabs-height,0px))]',
  card: '[--wizard-sticky-top:var(--rules-pinned-top)]',
};

/**
 * The space every element under the tab row keeps above it when the focus scrolls it into view,
 * so that it doesn't land under the pinned tabs (WCAG 2.4.11): the page's `scroll-padding-top`
 * keeps it clear of the step header, this adds the tab row
 */
export const TABS_SCROLL_MARGIN =
  '**:scroll-mt-(--rules-tabs-height) scroll-mt-(--rules-tabs-height)';

/**
 * In select mode, the space every element of the rules card keeps above it when the focus scrolls
 * it into view, so that it doesn't land under the pinned tab row and selection bar: the tab row,
 * the bar's 56px (8 + 40 + 8) and 8px to spare. Below 640px the buttons wrap under the text,
 * which takes up to three lines with a long rule name: 8 + 72 + 8 + 40 + 8 = 136px, and 8px to
 * spare
 */
export const SELECTION_SCROLL_MARGIN =
  '**:scroll-mt-[calc(var(--rules-tabs-height,0px)+64px)] max-sm:**:scroll-mt-[calc(var(--rules-tabs-height,0px)+144px)]';

/**
 * The rule editor's wrap (U30 "Editor wrap" 6348:40743, 6350:41175; U29 6348:40227): 16 above
 * and at the sides, 24 below, alone in the card and after other items alike
 */
export const EDITOR_WRAP_CLASSES = 'px-16 pt-16 pb-24';

/**
 * The extra 8px under a list's first rule, before its first connector: U43 6168:7017, U36, U44
 * draw the first row 110 high (16 under its content), the others 102 (T024: it belongs to the
 * list, not to the row)
 */
export const FIRST_RULE_SPACING = 'pb-8';

export const RULES_COPY = {
  // The step header, U29 6702:39345, U43 6702:41083 (C1, C2)
  title: 'Set eligibility rules for citizens',
  hint: 'A rule is a condition the citizen’s data has to meet. Konnekt checks each rule and tells your service whether it’s met.',
  loading: 'Loading the documents and their values…',
  loadErrorTitle: 'Couldn’t load the documents and their values',
  loadErrorText: 'Check your connection and try again.',
  retry: 'Try again',
  // U29 6504:43841 (W5; C1)
  emptyTitle: 'No rules yet',
  emptyText:
    'Without rules, Konnekt still passes the verified data to your service. Your team decides who can apply.',
  addRule: 'Add rule',
  // The rule menu, U14 6113:28988
  menuLabel: (rule: string) => `Actions for ${rule}`,
  editRule: 'Edit rule',
  rename: 'Rename',
  duplicate: 'Duplicate',
  deleteRule: 'Delete rule',
  // Renaming inline, U15 6344:53317–6344:53481
  renameLabel: (rule: string) => `Name of ${rule}`,
  renameHint: 'Enter saves · Esc cancels',
  // "Delete Rule 03?", U14 6113:29056 (design-notes §4, "Deleting a rule")
  deleteTitle: (rule: string) => `Delete ${rule}?`,
  deleteText: (statement: string | null) =>
    statement
      ? `Citizens will no longer be checked for “${statement}”. You can undo this right after.`
      : 'You can undo this right after.',
  cancel: 'Cancel',
  // "Save changes to Rule 01?", U28 6197:10989 (F10); the body and "Discard changes" as U50 8.5
  // (6197:10989) words them (FR-002, cosmetic 8)
  saveChangesTitle: (rule: string) => `Save changes to ${rule}?`,
  saveChangesText: 'If you leave without saving, your changes are lost.',
  discard: 'Discard changes',
  saveChanges: 'Save changes',
  undo: 'Undo',
  // F29: toasts name the rule with its branch; the save toast as U30 #37 words it, "Rule 01
  // saved." (report cosmetic 8)
  ruleSaved: (rule: string, _branch: string) => `${rule} saved.`,
  // "Rule 03 deleted.", as U35 6113:29469 words it (report cosmetic 8)
  ruleDeleted: (rule: string, _branch: string) => `${rule} deleted.`,
  // Grouping (U14 6344:53529, U16), with the toast as U36 6344:53623 words it: "Rule 02 and Rule
  // 03 are now in Group 01." (report cosmetic 8, T057)
  groupWithOthers: 'Group with other rules',
  grouped: (rules: string, _branch: string, group: string) => `${rules} are now in ${group}.`,
  // F29, U19 6344:53873: grouping in a variant based on Standard
  groupedInVariant: (rules: string, branch: string, group: string, main: string) =>
    `${rules} in ${branch} are now ${group}. ${main} stays the same.`,
  // F29, U20 6344:54042: the copy toast, whose "Show" opens the variant
  copied: (rule: string, branches: string) => `${rule} copied to ${branches}.`,
  show: 'Show',
  and: 'and',
  // The selection bar (U36 6616:44187, 6616:44214, 6616:44240); the one for no rule chosen has
  // no frame and takes the drawn verb
  selectOneMore: (rule: string) => `Choose at least one more rule to group with ${rule}.`,
  selectTwo: 'Choose two or more rules to group.',
  selected: (count: number) => `${count} rules selected`,
  selectedSubGroup: (count: number, group: string) =>
    `${count} rules selected. They become a sub-group of ${group}.`,
  // U64 6616:44355: two or more rules chosen at the top level of a variant based on Standard
  selectedInVariant: (count: number, branch: string, main: string) =>
    `${count} rules selected. The group is added in ${branch} only. ${main} stays the same.`,
  groupRules: 'Group rules',
  selectRule: (rule: string) => `Select ${rule}`,
  // The note after switching a level, as U34 6329:19219 words it (FR-051 (32)); the one for AND
  // has no frame and says the same of all rules
  switchedToOr: (level: string) => `${level} now needs only one rule to be true.`,
  switchedToAnd: (level: string) => `${level} now needs all its rules to be true.`,
  // A group's and a sub-group's menu (U55 6522:32424, U56 6522:32540; W22; report cosmetic 8)
  groupMenuLabel: (group: string) => `Actions for ${group}`,
  addMessage: 'Add message',
  removeMessage: 'Remove message',
  ungroup: 'Ungroup',
  deleteGroup: 'Delete group',
  deleteSubGroup: 'Delete sub-group',
  // "Delete Group 01?" and the toasts (design-notes §5)
  deleteGroupText: (group: string, subGroups: number) =>
    subGroups === 0
      ? `${group} and the rules in it will be deleted. You can undo this right after.`
      : `${group} and the rules and ${subGroups === 1 ? 'sub-group' : 'sub-groups'} in it will be deleted. You can undo this right after.`,
  // Deleting in Standard while variants are based on it (F14, W8; design-notes §4 and §5)
  removedFromVariants: (main: string) =>
    `This rule will be removed from ${main} and from the variants that follow it.`,
  groupRemovedFromVariants: (noun: string, main: string) =>
    `This ${noun} and the rules in it will be removed from ${main} and from the variants that follow them.`,
  // `variants` are the variants' names as `joinNames` lists them, `count` how many
  keptByVariants: (variants: string, count: number) =>
    count === 1
      ? `${variants} changed it and keeps its own version.`
      : `${variants} changed it and keep their own versions.`,
  itemKeptByVariants: (variants: string, count: number, item: string) =>
    count === 1
      ? `${variants} changed ${item} and keeps its own version.`
      : `${variants} changed ${item} and keep their own versions.`,
  ungroupedEverywhere: (group: string, main: string) =>
    `${group} is left with one rule, so it’s ungrouped in ${main} and its variants.`,
  possessive: (variant: string) => `${variant}’s`,
  changesGo: (variants: string, group: string) => `${variants} changes to ${group} go with it.`,
  undoRightAfter: 'You can undo this right after.',
  ungrouped: (group: string, branch: string) => `${group} in ${branch} ungrouped.`,
  // Ungrouping a group with its own message, as U35 6965:50849 words it: "Ungrouped. Rules 03 to
  // 05 use their own messages again." (report cosmetic 8, T057); `rules` are the names of the
  // rules it held, as `joinNames` lists them, `count` how many
  ungroupedOwnMessages: (rules: string, count: number) =>
    count === 1
      ? `Ungrouped. ${rules} uses its own message again.`
      : `Ungrouped. ${rules} use their own messages again.`,
  // A member's message line while a group it is in has its own message (F32, FR-037; U35
  // 6965:50822): the rule keeps its message, citizens read the group's
  notShownInGroup: (group: string) =>
    `Not shown while this rule is in ${group}. Citizens see the group message instead.`,
  // Worded as "Rule 03 deleted." is (U35 6113:29469; report cosmetic 8)
  groupDeleted: (group: string, _branch: string) => `${group} deleted.`,
  // A based variant's menus (U56 6522:32644; U23 6185:8802, 6185:41586; W8; report cosmetic 8):
  // in a variant, Delete becomes "Remove from School transport" for what follows Standard, and a
  // removed rule or group only offers "Restore"
  copyToVariant: 'Copy to variant',
  resetTo: (main: string) => `Reset to ${main}`,
  removeFrom: (variant: string) => `Remove from ${variant}`,
  restoreRule: 'Restore rule',
  restoreGroup: 'Restore group',
  restoreSubGroup: 'Restore sub-group',
  // The link strip at the top of a based variant's rules (U18 6344:60020)
  linkedTo: (main: string) => `Linked to ${main}`,
  linkedText: (main: string) => `Rules you don’t change here update with ${main}.`,
  // The variant tabs (U17 6134:9153; F16) and "+ Add variant" with its (i) while Standard is the
  // only variant (U17 6162:34206, tooltip 6151:33820)
  variants: 'Variants',
  addVariant: 'Add variant',
  aboutVariants: 'About variants',
  variantsInfo: 'A variant is a separate set of rules for some of your citizens.',
  // The Add variant and Edit variant dialogs (U17 6139:32693; W3; design-notes §4)
  addVariantTitle: 'Add variant',
  addVariantIntro:
    'A variant is a separate set of rules for some of your citizens. Your form decides which variant applies to each citizen.',
  editVariantTitle: 'Edit variant',
  variantName: 'Variant name',
  description: 'Description',
  optional: '- Optional',
  descriptionHint: 'Shown when someone hovers the (i) next to the variant name.',
  startWith: 'Start with',
  basedOn: (main: string) => `Based on ${main} (recommended)`,
  basedOnHelp: (main: string) =>
    `Starts with all ${main} rules. Rules you don’t change here update with ${main}.`,
  startEmpty: 'Start empty',
  startEmptyHelp: (main: string) => `Starts with no rules. Changes to ${main} don’t affect it.`,
  saveVariant: 'Save changes',
  // "Copy to variant" (U20 6344:53981)
  copyTitle: (rule: string) => `Copy ${rule} to`,
  copyHint: (main: string) => `Variants based on ${main} get it too.`,
  copy: 'Copy',
  // A tab's menu (W3), built like the rule menu
  variantMenuLabel: (variant: string) => `Actions for ${variant}`,
  renameVariant: 'Rename',
  deleteVariant: 'Delete',
  // "Delete Ambulance?" (W3; design-notes §4, "Deleting a variant")
  deleteVariantTitle: (variant: string) => `Delete ${variant}?`,
  deleteVariantText: 'The variant and its rules will be deleted.',
  deleteVariantTextEditing:
    'The variant and its rules will be deleted when you save. Its result link then stops working for good.',
  deleteVariantConfirm: 'Delete variant',
  // The unrequested-data banner (F11, F58, C5; U50 6863:47363, 7173:52333; FR-023, Q5): a field
  // no longer requested, or the whole document, naming the variant (FR-023c); the "Add it in
  // Documents" action stays (FR-023f), although the design draws plain text
  unrequestedText: (rule: string, branch: string) =>
    `${rule} in ${branch} checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule.`,
  unrequestedDocumentText: (rule: string, branch: string, document: string) =>
    `${rule} in ${branch} checks data from ${document}, which is no longer requested. Add the document again in Documents, or edit or delete the rule.`,
  addInDocuments: 'Add it in Documents',
  // A refused Publish or Save (F11), with the server's message
  refusedPublishTitle: 'Couldn’t publish',
  refusedSaveTitle: 'Couldn’t save',
  // The findings banner's chevron (spec 003, S2; A1, W19)
  showFindings: 'Show findings',
  hideFindings: 'Hide findings',
  // Links (spec 007, contracts/ui-screens.md S4, S5; FR-028, FR-031): the ⋯ menus' entry, its
  // toasts, and the notice of a link to what no longer exists
  copyLink: 'Copy link',
  linkCopied: 'Link copied.',
  linkNotCopied:
    'The link couldn’t be copied. Copy it from the address bar after opening the item.',
  missingVariant: 'This link points to a variant that no longer exists.',
  missingItem: 'This link points to a rule or group that no longer exists.',
  dismiss: 'Dismiss',
};

/**
 * The search parameters of a link to a variant, rule or group (spec 007, research R11):
 * `?step=rules&variant={variantId}&item={itemId}`, identifiers only (FR-029)
 */
export const LINK_PARAMS = {
  step: 'step',
  variant: 'variant',
  item: 'item',
} as const;

/** The `step` a link opens: the rules step */
export const LINK_STEP = 'rules';

/** The link notice's id, which takes the focus when an opened link names what isn't there (S5) */
export const LINK_NOTICE_ID = 'link-notice';

/**
 * The unrequested-data banner (U50 6863:47363, "Rules/Findings banner" in the danger kind): flush
 * at the top of the rules card's list, `feedback-danger-background` with its 1px
 * `feedback-danger` border, radius 8, padding 8 8 8 16; the action on the first line's right, or
 * under the text where the line is too narrow for both
 */
export const UNREQUESTED_BANNER_CLASSES =
  'bg-kern-feedback-danger-background border-kern-feedback-danger rounded-kern-default flex flex-wrap items-start gap-x-16 gap-y-4 border py-8 pr-8 pl-16';

/**
 * The findings banner's looks by kind (spec 003, S2; A1; design-notes.md §7, "Banner"): the
 * warning or info background with its 1 px border. At the variant level the info icon keeps
 * `feedback-info`; the darker `layout-text-muted` is only for the notes inside the rules
 * (decision 2026-11-01)
 */
export const BANNER_LOOKS: Record<FindingTone, string> = {
  warning: 'bg-kern-feedback-warning-background border-kern-feedback-warning',
  info: 'bg-kern-feedback-info-background border-kern-feedback-info',
};

/** The banner's 20 px kind icons, KERN's warning triangle and info icon (A1; research R15) */
export const BANNER_ICONS: Record<FindingTone, string> = {
  warning: 'kern-icon--warning bg-kern-feedback-warning!',
  info: 'kern-icon--info bg-kern-feedback-info!',
};

/** The id of a variant's expanded findings list, which the chevron controls */
export const findingsListId = (branchKey: string) => `findings-${branchKey}`;
