// The Rules step's copy: design-notes.md §2, §4 and §5, the Figma frames named, and F29's toasts
import type { FindingTone } from '@connection-portal/rules/checks/types';
import { defineTexts } from '@connection-portal/rules/language';

import copyToIcon from '../../../assets/icons/copy-to-variant.svg';
import groupIcon from '../../../assets/icons/group-brackets.svg';
import linkIcon from '../../../assets/icons/link-ink.svg';
import messageIcon from '../../../assets/icons/message-alert.svg';
import removeIcon from '../../../assets/icons/remove-circle-danger.svg';
import renameIcon from '../../../assets/icons/rename.svg';
import resetIcon from '../../../assets/icons/reset-restore.svg';
import ungroupIcon from '../../../assets/icons/ungroup-brackets.svg';
import type { MenuAction } from '../../../components/ActionMenu/types';
import type { MenuDirection, PopupPlacement } from '../../../utils/popupPlacement';
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

/** The width of the "Copy to variant" popover (U41 6344:53981) */
export const COPY_POPOVER_WIDTH = 300;

/**
 * Where the copy popover opens from its rule's ⋯ (utils/popupPlacement.ts, T020), as a ⋯ menu
 * does (components/ActionMenu): 8px below or above it, to the side that fits (U41 6344:53928
 * draws it above Rule 06, right-aligned with its ⋯), or across the rules card when neither does;
 * across the card, opening up it moves up by its own height, the ⋯'s 32px and the two gaps
 */
export const COPY_POPOVER_PLACEMENTS: Record<PopupPlacement, Record<MenuDirection, string>> = {
  start: { down: 'top-full left-0 mt-8 w-300', up: 'bottom-full left-0 mb-8 w-300' },
  end: { down: 'top-full right-0 mt-8 w-300', up: 'bottom-full right-0 mb-8 w-300' },
  full: { down: 'inset-x-16 mt-8', up: 'inset-x-16 mt-8 -translate-y-[calc(100%+48px)]' },
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

/**
 * The variant tab row (U38 6134:9153, U43 6168:7009): the tabs 24px apart, bottom-aligned on the
 * row's 1px `decorative-border` line; 49px high with "+ Add variant"'s 48px target. No fill, no
 * `overflow`, no `transform`: the step's pinned wrapper (`PINNED_TABS_CLASSES`) paints it white
 * and its menus and tooltips must not be clipped (V6). A narrow screen wraps it
 */
export const TAB_ROW_CLASSES =
  'flex flex-wrap items-end gap-x-24 border-b border-(--kern-color-decorative-border-default)';

/** The tabs themselves, 24px apart, wrapping on a narrow screen */
export const TAB_LIST_CLASSES = 'flex min-w-0 flex-wrap items-end gap-x-24';

/**
 * A tab's ⋯ (`BranchName`'s `actions`): its 32px target overhangs the 24px label row by 4px above
 * and below, so that the tab stays 38px high (U38 6134:9160)
 */
export const TAB_ACTIONS_CLASSES = '-my-4 shrink-0';

/**
 * "+ Add variant" and its (i) (U43 6168:7011): KERN's small tertiary button (48px target, 40px
 * visible) with the (i) 4px after its label (the frame's `mr-[-12px]`), and the group centres both
 * in the 48px row. The button's hover and pressed tints are its own background, so its box reaches
 * past the (i) (bug add-variant-hover-tooltip): its right padding 24 instead of KERN's 8, so that
 * it ends 32px after the label (8 of the label's own), pulled 28px back over the (i), which then
 * spans 4–24px after the label, 8px inside the box's edge as the "+" is after its left one. The
 * group's `pr-8` keeps those 8px in the row. The (i) stays on top for the pointer (KERN's icon
 * mask paints it after the button), so its tooltip and target are as before
 */
export const ADD_VARIANT_CLASSES =
  'flex items-center pr-8 [&>.kern-btn]:-mr-28! [&>.kern-btn]:pr-24!';

/**
 * The Add variant and Edit variant dialogs' fields (U37 "Dialog content/Add variant" 6139:32693):
 * the labels with the kit's label/default baseline (6 above, 2 below: 32px with the 8px under
 * them, where `TextField` draws U19's without it), the helper as body/default 16/24 in
 * `layout-text-default` with its baseline (32px) and 8px under it, and the description's
 * textarea 64px high (`TextField`'s is 120, Figma "Form/Textarea" of step 1). A refused name
 * (U52 6197:12011) puts the danger bar beside the label too, as the kit's P26 error does:
 * `TextField` draws it beside the field and the message only (U19 6699:45398), and its note
 * leaves it to the screen frame, so the bar moves from `kern-form-input--error` to the wrapper
 */
export const VARIANT_FIELD_CLASSES = {
  name: '[&_label]:pt-6 [&_label]:pb-2 has-[.kern-form-input--error]:border-l-4 has-[.kern-form-input--error]:border-kern-feedback-danger has-[.kern-form-input--error]:pl-16 [&_.kern-form-input--error]:border-l-0! [&_.kern-form-input--error]:pl-0!',
  description:
    '[&_label]:pt-6 [&_label]:pb-2 [&_.kern-hint]:text-kern-static-medium [&_.kern-hint]:text-kern-layout-text-default [&_.kern-hint]:pt-6 [&_.kern-hint]:pb-2 [&_.kern-hint]:mb-8 [&_.kern-hint]:leading-(--kern-typography-line-height-medium-static) [&_textarea]:h-64! [&_textarea]:min-h-0!',
};

/**
 * "Start with" (U37 6044:16300): its heading label/default 16/24, then the two options, 12px
 * apart. The legend floats, so that it is a flex item of the fieldset and the gap counts it
 */
export const START_WITH_CLASSES = {
  group: 'flex flex-col gap-12',
  legend:
    'text-kern-static-medium text-kern-layout-text-default float-left w-full leading-(--kern-typography-line-height-medium-static) font-semibold',
};

/**
 * One "Start with" option (U37 6044:16353, the design's "Data/Radio item" 6387:26931, a KERN
 * extension matching "Data/Check item"): a 20px radio, white with a 1px `layout-border` ring,
 * selected the 1px action-blue ring with a 10px action-blue dot; 8px to its label/default 16/24
 * label; 4px above and below the row; the help body/small 14/24 muted, indented 28px to the
 * label. States (the component's description): hover unselected a 2px action-blue ring on the
 * tint, hover selected a 3px tint ring, keyboard focus a 3px ring in the focus colour, never
 * after a click, disabled 40 %. KERN's radio is 32px with a 12px ink dot and swaps its border
 * for the ring on any focus (kern.css, unlayered), hence the `!`. After a click, `index.css`'s
 * `.kern-form-check__radio:focus:not(:focus-visible)` takes KERN's ring off (T104)
 */
export const START_WITH_OPTION_CLASSES = {
  row: 'kern-form-check flex! items-center! gap-8 py-4',
  radio:
    'kern-form-check__radio size-20! shrink-0 cursor-pointer border! border-kern-layout-border! bg-kern-layout-background-default! checked:border-kern-action-default! checked:before:size-10! checked:before:bg-kern-action-default! hover:not-checked:border-2! hover:not-checked:border-kern-action-default! hover:not-checked:bg-kern-action-state-indicator-tint! hover:checked:shadow-[0_0_0_3px_var(--kern-color-action-state-indicator-tint)] focus-visible:outline-3! focus-visible:outline-solid! focus-visible:outline-kern-action-focus-default! focus-visible:outline-offset-0!',
  label:
    'kern-label text-kern-static-medium! text-kern-layout-text-default cursor-pointer p-0! leading-(--kern-typography-line-height-medium-static) font-semibold!',
  help: 'text-kern-static-small text-kern-layout-text-muted pl-28 leading-(--kern-typography-line-height-medium-static)',
};

/**
 * The rules step's copy, the variants' and the findings' (S9, S11, S12): English as spec 008 words
 * it, German from the glossary (contracts/glossary.md G§2, G§3; spec 009, T037). Names, variant
 * names and statements are inserted as they are (FR-007)
 */
export const RULES_STEP_COPY = defineTexts(
  {
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
    // Grouping in a variant based on Standard, as U40 6344:53873 words it (report cosmetic 8, T066):
    // the variant's name and Standard's, without the rules and the group
    groupedInVariant: (_rules: string, branch: string, _group: string, main: string) =>
      `Grouped in ${branch} only. ${main} stays the same.`,
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
    // Deleting in Standard while variants are based on it (F14, W8; design-notes §4 and §5). A
    // rule's body is U47's as drawn (6185:8847; CLAR #56, FR-037): `variants` are the names of the
    // variants based on Standard, as `joinNames` lists them
    removedFromVariants: (main: string, variants: string) =>
      `This deletes it from ${main} and from the variants that follow it: ${variants}. If a variant changed this rule, it keeps its own version.`,
    groupRemovedFromVariants: (noun: string, main: string) =>
      `This ${noun} and the rules in it will be removed from ${main} and from the variants that follow them.`,
    // `variants` are the variants' names as `joinNames` lists them, `count` how many
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
    // The link strip at the top of a based variant's rules (U18 6344:60020; U47 6344:60085,
    // 6344:60090, 6344:60095), with what the variant removed before its text (FR-051 (38)): "2 of 3
    // Standard rules are removed here.", or, while only groups are, "Group 01 is removed here."
    linkedTo: (main: string) => `Linked to ${main}`,
    linkedText: (main: string) => `Rules you don’t change follow and update with ${main}.`,
    removedRules: (removed: number, total: number, main: string) =>
      `${removed} of ${total} ${main} ${total === 1 ? 'rule' : 'rules'} ${removed === 1 ? 'is' : 'are'} removed here.`,
    removedGroups: (groups: string, count: number) =>
      `${groups} ${count === 1 ? 'is' : 'are'} removed here.`,
    // The variant tabs (U38 6134:9153; F26) and "+ Add variant" with its (i) in every state (F27,
    // FR-035; U37 6151:33809, its text 6151:33820)
    variants: 'Variants',
    addVariant: 'Add variant',
    aboutVariants: 'About variants',
    variantsInfo:
      'A separate set of rules for citizens with different requirements. Each variant gets its own result link.',
    // The Add variant and Edit variant dialogs (U37 6139:32693, U52 6197:12011; F28, W18): the
    // intro repeats the (i)'s text (U37 #20)
    addVariantTitle: 'Add variant',
    addVariantIntro:
      'A separate set of rules for citizens with different requirements. Each variant gets its own result link.',
    editVariantTitle: 'Edit variant',
    variantName: 'Variant name',
    description: 'Description',
    descriptionHint: 'Shows when you hover the ⓘ next to the variant name.',
    startWith: 'Start with',
    // "Start with" (FR-052h: "Linked to Standard (recommended)" preselected)
    basedOn: (main: string) => `Linked to ${main} (recommended)`,
    basedOnHelp: (main: string) =>
      `Copies all ${main} rules. Unchanged rules remain the same as ${main} and update with it.`,
    startEmpty: 'Start empty',
    startEmptyHelp: (main: string) => `Starts with no rules. Changes to ${main} don’t affect it.`,
    saveVariant: 'Save changes',
    // "Copy to variant" (U41 6344:53981; FR-040: its help text)
    copyTitle: (rule: string) => `Copy ${rule} to`,
    copyHint: (main: string) => `Variants linked to ${main} get it too.`,
    copy: 'Copy',
    // A tab's menu ("Rules/Variant menu", U59 6523:37519; F28)
    variantMenuLabel: (variant: string) => `Actions for ${variant}`,
    renameVariant: 'Rename',
    deleteVariant: 'Delete variant',
    // "Delete “School transport”?" as U60 draws it (6523:37869; the active connection's body
    // 6790:45039; CLAR #38: "the delete-variant body names the broken result link as drawn");
    // `others` are the other variants' names, as `joinNames` lists them, `count` how many
    deleteVariantTitle: (variant: string) => `Delete “${variant}”?`,
    deleteVariantText: (variant: string, others: string, count: number) =>
      `Rules you changed or added in ${variant} are deleted. ${others} ${count === 1 ? 'remains' : 'remain'} unchanged.`,
    deleteVariantTextEditing: (variant: string, others: string, count: number) =>
      `The connection is active, so this only takes effect when you save. Once saved, ${variant} and its rules are deleted, and its result link stops working. Make sure your service no longer needs it. ${others} ${count === 1 ? 'remains' : 'remain'} unchanged.`,
    // A deactivated connection's edit flow (no frame): 11.5b's body without its first clause
    deleteVariantTextEditingInactive: (variant: string, others: string, count: number) =>
      `This only takes effect when you save. Once saved, ${variant} and its rules are deleted, and its result link stops working. Make sure your service no longer needs it. ${others} ${count === 1 ? 'remains' : 'remain'} unchanged.`,
    deleteVariantConfirm: 'Delete variant',
    keepVariant: 'Keep variant',
    // The toast after deleting a variant, with Undo (FR-051 (33); U61 6523:37991): neutral as every
    // deletion's toast (T036; U61's red type not built)
    variantDeleted: (variant: string) => `${variant} deleted.`,
    // The unrequested-data banner (F11, F58, C5; U50 6863:47363, 7173:52333; FR-023, Q5): a field
    // no longer requested, or the whole document, naming the variant (FR-023c); the "Add it in
    // Documents" action stays (FR-023f), although the design draws plain text
    unrequestedText: (rule: string, branch: string) =>
      `${rule} in ${branch} checks data that’s no longer requested. Add it again in Documents, or edit or delete the rule.`,
    unrequestedDocumentText: (rule: string, branch: string, document: string) =>
      `${rule} in ${branch} checks data from ${document}, which is no longer requested. Add the document again in Documents, or edit or delete the rule.`,
    addInDocuments: 'Add it in Documents',
    // The note under such a rule (U50 6197:10708, 7173:52351): the field, or the whole document
    noLongerRequested: (data: string) => `${data} is no longer requested.`,
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
  },
  {
    title: 'Regeln zur Antragsberechtigung festlegen',
    hint: 'Eine Regel ist eine Bedingung, die die antragstellende Person erfüllen muss. Konnekt prüft jede Regel und teilt Ihrem Dienst mit, ob sie erfüllt ist.',
    loading: 'Die Dokumente und ihre Werte werden geladen …',
    loadErrorTitle: 'Die Dokumente und ihre Werte konnten nicht geladen werden',
    loadErrorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    emptyTitle: 'Noch keine Regeln',
    emptyText:
      'Legen Sie fest, welche Voraussetzungen eine antragstellende Person erfüllen muss. Wenn Sie keine Regeln festlegen, werden die angeforderten Daten trotzdem an Ihren Dienst weitergegeben.',
    addRule: 'Regel hinzufügen',
    menuLabel: (rule: string) => `Aktionen für ${rule}`,
    editRule: 'Regel bearbeiten',
    rename: 'Umbenennen',
    duplicate: 'Duplizieren',
    deleteRule: 'Regel löschen',
    renameLabel: (rule: string) => `Name von ${rule}`,
    renameHint: 'Enter speichert · Esc bricht ab',
    deleteTitle: (rule: string) => `${rule} löschen?`,
    deleteText: (statement: string | null) =>
      statement
        ? `Bürgerinnen und Bürger werden nicht mehr auf „${statement}“ geprüft. Sie können das direkt danach rückgängig machen.`
        : 'Sie können das direkt danach rückgängig machen.',
    cancel: 'Abbrechen',
    saveChangesTitle: (rule: string) => `Änderungen an ${rule} speichern?`,
    saveChangesText:
      'Wenn Sie die Bearbeitung ohne Speichern beenden, gehen Ihre Änderungen verloren.',
    discard: 'Änderungen verwerfen',
    saveChanges: 'Änderungen speichern',
    undo: 'Rückgängig',
    ruleSaved: (rule: string, _branch: string) => `${rule} gespeichert.`,
    ruleDeleted: (rule: string, _branch: string) => `${rule} gelöscht.`,
    groupWithOthers: 'Mit anderen Regeln gruppieren',
    grouped: (rules: string, _branch: string, group: string) => `${rules} sind jetzt in ${group}.`,
    groupedInVariant: (_rules: string, branch: string, _group: string, main: string) =>
      `Nur in ${branch} gruppiert. ${main} bleibt unverändert.`,
    copied: (rule: string, branches: string) => `${rule} in ${branches} kopiert.`,
    show: 'Anzeigen',
    and: 'und',
    selectOneMore: (rule: string) =>
      `Wählen Sie mindestens eine weitere Regel aus, um sie mit ${rule} zu gruppieren.`,
    selectTwo: 'Wählen Sie zwei oder mehr Regeln zum Gruppieren aus.',
    selected: (count: number) => `${count} Regeln ausgewählt`,
    selectedSubGroup: (count: number, group: string) =>
      `${count} Regeln ausgewählt. Sie werden zu einer Untergruppe von ${group}.`,
    selectedInVariant: (count: number, branch: string, main: string) =>
      `${count} Regeln ausgewählt. Die Gruppe wird nur in ${branch} hinzugefügt. ${main} bleibt unverändert.`,
    groupRules: 'Regeln gruppieren',
    selectRule: (rule: string) => `${rule} auswählen`,
    switchedToOr: (level: string) => `Für ${level} muss jetzt nur noch eine Regel erfüllt sein.`,
    switchedToAnd: (level: string) => `Für ${level} müssen jetzt alle Regeln erfüllt sein.`,
    groupMenuLabel: (group: string) => `Aktionen für ${group}`,
    addMessage: 'Nachricht hinzufügen',
    removeMessage: 'Nachricht entfernen',
    ungroup: 'Gruppierung aufheben',
    deleteGroup: 'Gruppe löschen',
    deleteSubGroup: 'Untergruppe löschen',
    deleteGroupText: (group: string, subGroups: number) =>
      subGroups === 0
        ? `${group} und die Regeln darin werden gelöscht. Sie können das direkt danach rückgängig machen.`
        : `${group} und die Regeln und ${subGroups === 1 ? 'die Untergruppe' : 'Untergruppen'} darin werden gelöscht. Sie können das direkt danach rückgängig machen.`,
    removedFromVariants: (main: string, variants: string) =>
      `Dadurch wird die Regel aus ${main} und aus den Varianten gelöscht, die ${main} folgen: ${variants}. Hat eine Variante diese Regel geändert, behält sie ihre eigene Version.`,
    groupRemovedFromVariants: (noun: string, main: string) =>
      `Diese ${noun} und die Regeln darin werden aus ${main} und aus den Varianten entfernt, die ${main} folgen.`,
    itemKeptByVariants: (variants: string, count: number, item: string) =>
      count === 1
        ? `${variants} hat ${item} geändert und behält ihre eigene Version.`
        : `${variants} haben ${item} geändert und behalten ihre eigenen Versionen.`,
    ungroupedEverywhere: (group: string, main: string) =>
      `${group} enthält nur noch eine Regel, daher wird die Gruppierung in ${main} und den darauf basierenden Varianten aufgehoben.`,
    // German names the variants after the noun ("die Änderungen von Ambulance", glossary G§2 "a
    // sample citizen's"), so the name stays as it is and `changesGo` says "von"
    possessive: (variant: string) => variant,
    changesGo: (variants: string, group: string) =>
      `Die Änderungen von ${variants} an ${group} entfallen damit.`,
    undoRightAfter: 'Sie können das direkt danach rückgängig machen.',
    ungrouped: (group: string, branch: string) =>
      `Gruppierung von ${group} in ${branch} aufgehoben.`,
    ungroupedOwnMessages: (rules: string, count: number) =>
      count === 1
        ? `Gruppierung aufgehoben. ${rules} verwendet wieder ihre eigene Nachricht.`
        : `Gruppierung aufgehoben. ${rules} verwenden wieder ihre eigenen Nachrichten.`,
    groupDeleted: (group: string, _branch: string) => `${group} gelöscht.`,
    copyToVariant: 'In Variante kopieren',
    resetTo: (main: string) => `Auf ${main} zurücksetzen`,
    removeFrom: (variant: string) => `Aus ${variant} entfernen`,
    restoreRule: 'Regel wiederherstellen',
    restoreGroup: 'Gruppe wiederherstellen',
    restoreSubGroup: 'Untergruppe wiederherstellen',
    linkedTo: (main: string) => `Mit ${main} verknüpft`,
    linkedText: (main: string) =>
      `Regeln, die Sie hier nicht ändern, werden automatisch mit „${main}“ aktualisiert.`,
    removedRules: (removed: number, total: number, main: string) =>
      `${removed} von ${total} ${total === 1 ? 'Regel' : 'Regeln'} aus ${main} ${removed === 1 ? 'ist' : 'sind'} hier entfernt.`,
    removedGroups: (groups: string, count: number) =>
      `${groups} ${count === 1 ? 'ist' : 'sind'} hier entfernt.`,
    variants: 'Varianten',
    addVariant: 'Variante hinzufügen',
    aboutVariants: 'Informationen zu Varianten',
    variantsInfo:
      'Mit Varianten prüfen Sie unterschiedliche Voraussetzungen innerhalb eines Dienstes, z. B. eine niedrigere Altersgrenze für den Krankentransport. Jede Variante hat eigene Regeln und einen eigenen Ergebnislink.',
    addVariantTitle: 'Variante hinzufügen',
    addVariantIntro:
      'Mit Varianten prüfen Sie unterschiedliche Voraussetzungen innerhalb eines Dienstes, z. B. eine niedrigere Altersgrenze für den Krankentransport. Jede Variante hat eigene Regeln und einen eigenen Ergebnislink.',
    editVariantTitle: 'Variante bearbeiten',
    variantName: 'Name der Variante',
    description: 'Beschreibung',
    descriptionHint: 'Wird angezeigt, wenn Sie auf das ⓘ neben dem Namen der Variante zeigen.',
    startWith: 'Beginnen mit',
    basedOn: (main: string) => `Mit ${main} verknüpft (empfohlen)`,
    basedOnHelp: (main: string) =>
      `Startet mit allen Regeln aus „${main}“. Regeln, die Sie hier nicht ändern, werden automatisch mit „${main}“ aktualisiert.`,
    startEmpty: 'Leer',
    startEmptyHelp: (main: string) =>
      `Beginnt ohne Regeln. Änderungen an „${main}“ wirken sich nicht auf diese Variante aus.`,
    saveVariant: 'Änderungen speichern',
    copyTitle: (rule: string) => `${rule} in Varianten kopieren`,
    copyHint: (main: string) => `Mit ${main} verknüpfte Varianten erhalten sie auch.`,
    copy: 'Kopieren',
    variantMenuLabel: (variant: string) => `Aktionen für ${variant}`,
    renameVariant: 'Umbenennen',
    deleteVariant: 'Variante löschen',
    deleteVariantTitle: (variant: string) => `„${variant}“ löschen?`,
    deleteVariantText: (variant: string, others: string, count: number) =>
      `Regeln, die Sie in ${variant} geändert oder hinzugefügt haben, werden gelöscht. ${others} ${count === 1 ? 'bleibt' : 'bleiben'} unverändert.`,
    deleteVariantTextEditing: (variant: string, others: string, count: number) =>
      `Die Anbindung ist aktiv, daher wird dies erst beim Speichern wirksam. Nach dem Speichern werden die Variante ${variant} und ihre Regeln gelöscht, und ihr Ergebnislink funktioniert nicht mehr. Stellen Sie sicher, dass Ihr Dienst ihn nicht mehr braucht. ${others} ${count === 1 ? 'bleibt' : 'bleiben'} unverändert.`,
    deleteVariantTextEditingInactive: (variant: string, others: string, count: number) =>
      `Dies wird erst beim Speichern wirksam. Nach dem Speichern werden die Variante ${variant} und ihre Regeln gelöscht, und ihr Ergebnislink funktioniert nicht mehr. Stellen Sie sicher, dass Ihr Dienst ihn nicht mehr braucht. ${others} ${count === 1 ? 'bleibt' : 'bleiben'} unverändert.`,
    deleteVariantConfirm: 'Variante löschen',
    keepVariant: 'Variante behalten',
    variantDeleted: (variant: string) => `${variant} gelöscht.`,
    unrequestedText: (rule: string, branch: string) =>
      `${rule} in ${branch} prüft Daten, die nicht mehr angefordert werden. Fügen Sie die Daten im Schritt „Dokumente“ wieder hinzu oder bearbeiten oder löschen Sie die Regel.`,
    unrequestedDocumentText: (rule: string, branch: string, document: string) =>
      `${rule} in ${branch} prüft Daten aus dem Dokument „${document}“, das nicht mehr angefordert wird. Fügen Sie das Dokument im Schritt „Dokumente“ wieder hinzu oder bearbeiten oder löschen Sie die Regel.`,
    addInDocuments: 'In „Dokumente“ hinzufügen',
    noLongerRequested: (data: string) => `${data} wird nicht mehr angefordert.`,
    refusedPublishTitle: 'Die Anbindung konnte nicht veröffentlicht werden',
    refusedSaveTitle: 'Die Änderungen konnten nicht gespeichert werden',
    showFindings: 'Befunde anzeigen',
    hideFindings: 'Befunde ausblenden',
    copyLink: 'Link kopieren',
    linkCopied: 'Link kopiert.',
    linkNotCopied:
      'Der Link konnte nicht kopiert werden. Kopieren Sie ihn nach dem Öffnen des Elements aus der Adressleiste.',
    missingVariant: 'Dieser Link verweist auf eine Variante, die es nicht mehr gibt.',
    missingItem: 'Dieser Link verweist auf eine Regel oder Gruppe, die es nicht mehr gibt.',
    dismiss: 'Ausblenden',
  }
);

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
 * under the text where the line is too narrow for both. With the findings banner right after it
 * (no frame draws both), it takes that banner's 8px inset (U44 6750:40882), so that the two stack
 * 8px apart on the edges of the outlined rows below them
 */
export const UNREQUESTED_BANNER_CLASSES =
  'bg-kern-feedback-danger-background border-kern-feedback-danger rounded-kern-default flex flex-wrap items-start gap-x-16 gap-y-4 border py-8 pr-8 pl-16 [&:has(+[data-findings-banner])]:mx-8 [&:has(+[data-findings-banner])]:mt-8';

/**
 * The findings banner's wrap (U44 6754:44401 "Findings banner · wrap", U46 6754:44401): the banner
 * 8px inside the card, as the outlined rows. Its `data-findings-banner` attribute lets the
 * unrequested-data banner before it take the same inset
 */
export const FINDINGS_BANNER_WRAP_CLASSES = 'p-8';

/**
 * The findings banner's looks by kind (Figma `Rules/Findings banner` 6750:40865: U44 6750:40882
 * warning, U45 6750:41077 info): `feedback-warning-background` #fff4e0 with its 1px
 * `feedback-warning` #9a4a00 border, or `feedback-info-background` #e0f2fe with its 1px
 * `feedback-info` border (the §1.5 AA value #0273ae, as the notes' info icon)
 */
export const BANNER_LOOKS: Record<FindingTone, string> = {
  warning: 'bg-kern-feedback-warning-background border-kern-feedback-warning',
  info: 'bg-kern-feedback-info-background border-kern-feedback-info',
};

/**
 * The banner's 20px kind icons (U45 6753:40144: `icon-warning-small`, `icon-info-small`), KERN's
 * warning triangle and info icon in the kind's colour (research R15)
 */
export const BANNER_ICONS: Record<FindingTone, string> = {
  warning: 'kern-icon--warning bg-kern-feedback-warning!',
  info: 'kern-icon--info bg-kern-feedback-info!',
};

/**
 * A finding's name link in the banner (F39; Figma `Rules/Finding item` in U45 6753:40144, U44
 * 6750:40882): body/small in `action-default`, underlined as drawn (`decoration-[8%]`, the
 * font's underline position, as the toast's action); hovered, KERN's link hover (kit P21: the
 * 3px underline); KERN's 4px focus ring for keyboard focus only
 */
export const FINDING_LINK_CLASSES =
  'text-kern-action-default rounded-kern-small focus-visible:outline-kern-action-focus-default cursor-pointer text-left underline decoration-[8%] [text-underline-position:from-font] hover:decoration-3 focus-visible:outline-4 focus-visible:outline-offset-2';

/**
 * The banner's chevron (U45 6753:40144 "Collapse", `button-tertiary-small`): a 48px target around
 * the drawn 40px box, which takes the kit's hover and pressed layers (P33 2:1985: the action
 * colour at 8% and 16%, as the ⋯ menus, T021) with the colour transition (design-notes §4), and
 * KERN's 4px focus ring for keyboard focus only
 */
export const FINDINGS_TOGGLE_CLASSES = {
  button:
    'group flex size-48 shrink-0 cursor-pointer items-center justify-center focus-visible:outline-none',
  box: 'rounded-kern-default group-focus-visible:outline-kern-action-focus-default motion group-hover:bg-kern-action-state-indicator-default/8 group-active:bg-kern-action-state-indicator-default/16 flex size-40 items-center justify-center transition-colors duration-(--duration-colour) group-focus-visible:outline-4 group-focus-visible:outline-offset-2',
};

/** The id of a variant's expanded findings list, which the chevron controls */
export const findingsListId = (branchKey: string) => `findings-${branchKey}`;
