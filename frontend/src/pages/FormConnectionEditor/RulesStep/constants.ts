// The Rules step's copy: design-notes.md §2, §4 and §5, the Figma frames named, and F29's toasts
import type { FindingTone } from '@connection-portal/rules/checks/types';

import type { PopupPlacement } from '../../../utils/popupPlacement';
import type { ItemNameSize } from './types';

/** The main branch of a new connection, before it is saved (FR-018) */
export const MAIN_BRANCH_NAME = 'Standard';

/** The type of names (U14): label/small for a rule, title/default and title/small for groups */
export const NAME_SIZES: Record<ItemNameSize, string> = {
  rule: 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)',
  group: 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)',
  'sub-group': 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)',
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
 * The selection bar at rest at the top of the rules card (7px: the card's 8px radius, inside its
 * border), and pinned under the wizard's head (Figma "Selection bar · pinned" 6524:38485): square
 * corners and a 1px bottom line, drawn inside the bar so that pinning doesn't move the rows
 */
export const SELECTION_BAR_STATES = {
  resting: 'rounded-t-[7px]',
  pinned: 'shadow-[inset_0_-1px_0_var(--kern-color-decorative-border-default)]',
};

/**
 * In select mode, the space every element of the rules card keeps above it when the focus scrolls
 * it into view, so that it doesn't land under the pinned selection bar: the bar's 64px (8 + 48 +
 * 8) and 8px to spare. Below 640px the buttons wrap under the text, which takes up to three lines
 * with a long rule name: 8 + 72 + 8 + 48 + 8 = 144px, and 8px to spare
 */
export const SELECTION_SCROLL_MARGIN = '**:scroll-mt-72 max-sm:**:scroll-mt-152';

export const RULES_COPY = {
  // U11 6348:40213
  title: 'Rules',
  hint: 'Each rule checks the data citizens share. If a rule isn’t met, the citizen sees its error message.',
  loading: 'Loading the documents and their values…',
  loadErrorTitle: 'Couldn’t load the documents and their values',
  loadErrorText: 'Check your connection and try again.',
  retry: 'Try again',
  // U29 6197:11654 (W5)
  emptyTitle: 'No rules yet',
  emptyText: 'Without rules, anyone who shares the requested documents can apply.',
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
  // "Save changes to Rule 01?", U28 6197:10989 (F10)
  saveChangesTitle: (rule: string) => `Save changes to ${rule}?`,
  saveChangesText: 'You changed this rule but haven’t saved it yet.',
  discard: 'Discard',
  saveChanges: 'Save changes',
  undo: 'Undo',
  // F29: toasts name the rule with its branch
  ruleSaved: (rule: string, branch: string) => `${rule} in ${branch} saved.`,
  ruleDeleted: (rule: string, branch: string) => `${rule} in ${branch} deleted.`,
  // Grouping (U14 6344:53529, U16), with F29's toast: "Rule 02 and Rule 03 in Standard are now
  // Group 01."
  groupWithOthers: 'Group with other rules',
  grouped: (rules: string, branch: string, group: string) =>
    `${rules} in ${branch} are now ${group}.`,
  // F29, U19 6344:53873: grouping in a variant based on Standard
  groupedInVariant: (rules: string, branch: string, group: string, main: string) =>
    `${rules} in ${branch} are now ${group}. ${main} stays the same.`,
  // F29, U20 6344:54042: the copy toast, whose "Show" opens the variant
  copied: (rule: string, branches: string) => `${rule} copied to ${branches}.`,
  show: 'Show',
  and: 'and',
  // The selection bar (U16 6344:53542, 6344:53572, 6344:53670); the one for no rule chosen has
  // no frame
  selectOneMore: (rule: string) => `Select at least one more rule to group with ${rule}.`,
  selectTwo: 'Select two or more rules to group.',
  selected: (count: number) => `${count} rules selected`,
  selectedSubGroup: (count: number, group: string) =>
    `${count} rules selected. They become a sub-group of ${group}.`,
  groupRules: 'Group rules',
  selectRule: (rule: string) => `Select ${rule}`,
  // The note after switching a level (U14 6329:19219); the one for AND has no frame
  switchedToOr: (level: string) => `${level} now needs only one rule to be true.`,
  switchedToAnd: (level: string) => `${level} now needs all its rules to be true.`,
  // A group's and a sub-group's menu (W6, W8; design-notes §5), built like the rule menu
  groupMenuLabel: (group: string) => `Actions for ${group}`,
  addMessage: 'Add error message',
  removeMessage: 'Remove error message',
  ungroup: 'Ungroup',
  deleteGroup: 'Delete group',
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
  groupDeleted: (group: string, branch: string) => `${group} in ${branch} deleted.`,
  // A based variant's menus (U18 6324:39971; U23 6185:8802, 6185:41586; W8): in a variant, Delete
  // becomes "Remove from this variant" for what follows Standard, and a removed rule or group
  // only offers "Restore"
  copyToVariant: 'Copy to variant',
  resetTo: (main: string) => `Reset to ${main}`,
  removeFromVariant: 'Remove from this variant',
  restoreRule: 'Restore rule',
  restoreGroup: 'Restore group',
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
  // The problems banner, U27 6197:10696 (F11)
  unrequestedTitle: (count: number) =>
    count === 1
      ? '1 rule checks data that’s no longer requested'
      : `${count} rules check data that’s no longer requested`,
  unrequestedText: (rule: string, branch: string) =>
    `${rule} in ${branch} checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule.`,
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
