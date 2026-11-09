import type {
  FormConnection,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { deletionEffects, isInherited } from '@connection-portal/rules/branches';
import { kindTextOf } from '@connection-portal/rules/checks/findingMessages';
import type { FindingsBanner } from '@connection-portal/rules/checks/types';
import { MAX_BRANCHES, RULES_MESSAGES } from '@connection-portal/rules/constants';
import * as edits from '@connection-portal/rules/edits';
import {
  deleteItem,
  findItem,
  flattenItems,
  isDissolved,
  newRule,
  numberOfId,
} from '@connection-portal/rules/tree';
import type { EditResult, EditState, RuleDocument } from '@connection-portal/rules/types';
import { variantNameProblem } from '@connection-portal/rules/validation';
import { generatePath } from 'react-router';

import { GROUP_HEADER_ID_SUFFIX } from '../../../components/GroupFrame/constants';
import type { ToastKind } from '../../../components/Toast/types';
import { ROUTES } from '../../../constants';
import { ELEMENT_IDS } from '../constants';
import {
  LINK_PARAMS,
  LINK_STEP,
  MAIN_BRANCH_NAME,
  MENU_ENTRY_ORDER,
  RULES_COPY,
} from './constants';
import type {
  BannerItem,
  BannerView,
  ItemStanding,
  LinkNoticeKind,
  MenuContext,
  MenuEntry,
  MenuEntryId,
  MenuItem,
  MenuRuleLevel,
  MenuTreeItemState,
  RenameAction,
  RenameField,
  RenamingItem,
  RuleEditing,
  RulesAction,
  RulesBranch,
  RulesSelection,
  RulesState,
  RulesUndo,
  SelectScope,
  SwitchedLevel,
  VariantForm,
  VariantFormAction,
} from './types';

/**
 * The step's first state: the connection's branches, keyed by their ids, and counters when
 * editing; a main branch "Standard" without rules, numbering from 1, when creating (FR-018), whose
 * key is a new id (spec 007, research R10), which it keeps when the connection is saved.
 */
export function initialRulesState(formConnection?: FormConnection): RulesState {
  const branches: RulesBranch[] = formConnection
    ? formConnection.branches.map((branch) => ({
        key: branch.id,
        id: branch.id,
        name: branch.name,
        description: branch.description,
        origin: branch.origin,
        operator: branch.operator,
        operator_mark: branch.operator_mark,
        items: branch.items,
      }))
    : [
        {
          key: crypto.randomUUID(),
          id: null,
          name: MAIN_BRANCH_NAME,
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ];
  const counters = formConnection
    ? { rule: formConnection.next_rule_number, group: formConnection.next_group_number }
    : { rule: 1, group: 1 };
  return {
    branches,
    openBranch: branches[0].key,
    counters,
    numberingBase: counters,
    ruleSetVersion: formConnection?.rule_set_version ?? null,
    editing: null,
    renaming: null,
    dialog: null,
    toast: null,
    undo: null,
    showBranch: null,
    problem: null,
    selection: null,
    switched: null,
    expandedFindings: [],
  };
}

/**
 * Moves the focus once the current render, and a dialog it closes, are done: a modal dialog
 * keeps the page inert until it closes, and then gives the focus back to what opened it. With
 * `onlyIfLost`, only when nothing has the focus by then, so that it doesn't take it from where
 * something else has just put it.
 */
export function focusSoon(id: string, fallbackId?: string, onlyIfLost = false) {
  requestAnimationFrame(() => {
    if (onlyIfLost && document.activeElement && document.activeElement !== document.body) {
      return;
    }
    const element =
      document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    element?.focus();
  });
}

/**
 * What the findings banner draws (S2; A1, W12, W17; design-notes.md §3.3), from `bannerOf()`:
 * *single* with fewer than two lines, its `head` with the banner's icon, and the line's hidden kind
 * text when there is a line; *collapsed* by default with two or more lines, its `head` (the counts
 * row with what follows it); *expanded*, the counts row, then one item per line with its icon and
 * hidden kind text, then the notice and FR-010's sentence without a link or kind text. No text is
 * built here.
 */
export function bannerViewOf(banner: FindingsBanner, expanded: boolean): BannerView {
  const { kind, lines, counts, notice, incomplete, head } = banner;
  if (lines.length < 2) {
    const kindText = lines.length === 1 ? kindTextOf(lines[0].kind) : null;
    return {
      state: 'single',
      summary: { key: 'summary', tone: kind, kindText, parts: head },
      items: [],
    };
  }
  if (!expanded) {
    return {
      state: 'collapsed',
      summary: { key: 'summary', tone: kind, kindText: null, parts: head },
      items: [],
    };
  }
  const items: BannerItem[] = [
    ...lines.map((line, index) => ({
      key: `line-${index}`,
      tone: line.tone,
      kindText: kindTextOf(line.kind),
      parts: line.parts,
    })),
    ...(notice ? [{ key: 'notice', tone: notice.tone, kindText: null, parts: [notice.text] }] : []),
    ...(incomplete
      ? [{ key: 'incomplete', tone: 'info' as const, kindText: null, parts: [incomplete] }]
      : []),
  ];
  return {
    state: 'expanded',
    summary: { key: 'summary', tone: kind, kindText: null, parts: [counts] },
    items,
  };
}

/**
 * Where a banner name's link moves the focus, in order of preference (S2; A1; W19; FR-013): a
 * group's header, which its note describes (contracts/ui-screens.md "Accessibility"), then the
 * rule's row, or the group's frame should the header be missing. Only a group's frame has a
 * header, so a rule's row is the first id that exists.
 */
export function findingTargetIdsOf(branchKey: string, itemId: string): string[] {
  const frameId = ELEMENT_IDS.rule(branchKey, itemId);
  return [`${frameId}${GROUP_HEADER_ID_SUFFIX}`, frameId];
}

/**
 * A banner name's link (S2; A1; W19; FR-013): moves the focus to its rule's row or its group's
 * header, which its note describes, and scrolls it into view, only as far as needed.
 */
export function goToItem(branchKey: string, itemId: string) {
  const element = findingTargetIdsOf(branchKey, itemId)
    .map((id) => document.getElementById(id))
    .find((found) => found !== null);
  if (!element) {
    return;
  }
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'nearest' });
}

/**
 * The link of a variant, or of a rule or group in it (spec 007, S4; research R11; FR-028, FR-029):
 * `{origin}/form-connections/{connectionId}/edit?step=rules&variant={variantId}`, and
 * `&item={itemId}` for a rule or group. Identifiers only, never names, so that it leads to the same
 * item after renaming and after publishing. `origin` is the page's own, so that previews and
 * production get their own links.
 */
export function linkOf(
  origin: string,
  connectionId: string,
  variantId: string,
  itemId?: string
): string {
  const params = new URLSearchParams({
    [LINK_PARAMS.step]: LINK_STEP,
    [LINK_PARAMS.variant]: variantId,
  });
  if (itemId !== undefined) {
    params.set(LINK_PARAMS.item, itemId);
  }
  const path = generatePath(ROUTES.editFormConnection, { id: connectionId });
  return `${origin}${path}?${params.toString()}`;
}

/**
 * What an opened link names that the step's branches don't hold (S5; FR-031): its variant, or its
 * rule or group in the variant; null when both are there. The page resolves the link against the
 * content it loaded (`linkTargetOf()`); this checks it again against what the wizard opens, such as
 * a stored draft's unsaved changes restored on this device.
 */
export function linkNoticeOf(
  state: RulesState,
  variantId: string,
  itemId: string | null
): LinkNoticeKind | null {
  const branch = branchOf(state, variantId);
  if (!branch) {
    return 'variant';
  }
  return itemId !== null && !findItem(branch.items, itemId) ? 'item' : null;
}

/** The items of a level of a branch: a group's members, or the top level for null. */
export function levelItems(items: RuleTreeItem[], parentId: string | null): RuleTreeItem[] {
  if (parentId === null) {
    return items;
  }
  const found = findItem(items, parentId);
  return found?.item.type === 'group' ? found.item.items : [];
}

/**
 * Where the focus goes when an item leaves the list: the next item of its level, or the one
 * before it. A group left with one member is dissolved, and that member takes its place.
 */
export function neighbourOf(state: RulesState, branchKey: string, itemId: string): string | null {
  const items = branchOf(state, branchKey)?.items ?? [];
  const found = findItem(items, itemId);
  if (!found) {
    return null;
  }
  const level = levelItems(items, found.parentId);
  return (level[found.index + 1] ?? level[found.index - 1])?.id ?? null;
}

/** The inline rename field: what is typed, and why it was refused. */
export function renameReducer(field: RenameField, action: RenameAction): RenameField {
  switch (action.type) {
    case 'reset':
      return { value: action.value, error: null };
    case 'change':
      return { value: action.value, error: null };
    case 'refuse':
      return { ...field, error: action.error };
  }
}

export function branchOf(state: RulesState, branchKey: string): RulesBranch | undefined {
  return state.branches.find((branch) => branch.key === branchKey);
}

/** A rule of a branch, or null. */
export function ruleOf(branch: RulesBranch | undefined, ruleId: string): RuleItem | null {
  const found = branch ? findItem(branch.items, ruleId) : null;
  return found?.item.type === 'rule' ? found.item : null;
}

/** A group or sub-group of a branch, or null. */
export function groupOf(branch: RulesBranch | undefined, groupId: string): GroupItem | null {
  const found = branch ? findItem(branch.items, groupId) : null;
  return found?.item.type === 'group' ? found.item : null;
}

/**
 * What an item is to its branch, which decides its menu (`ItemStanding`): the branch's own, an
 * inherited item of a based branch, or one removed there.
 */
export function standingOf(branch: RulesBranch, item: RuleTreeItem): ItemStanding {
  if (item.mark === 'removed') {
    return 'removed';
  }
  return isInherited(branch, item) ? 'inherited' : 'own';
}

/**
 * Whether an item of select mode's level can be chosen (FR-036, FR-038; CLAR #60, #61, #64): a
 * rule that isn't removed. Groups never are: the rules package groups rules only (`canGroup`),
 * so grouping a group is deferred (CLAR #64, Implement Q2; deferred.md group B). Select mode
 * lists only its scope's level, so in a top-level group only the rules directly in it.
 */
export function selectableIn(item: RuleTreeItem): boolean {
  return item.type === 'rule' && item.mark !== 'removed';
}

/**
 * Whether another item of the found item's level can be chosen with it (`selectableIn`): its
 * neighbour for "Group with other rules". A sub-group's rules have none: it holds no further
 * grouping (FR-036; 002-S2.10).
 */
function hasGroupingNeighbour(
  items: RuleTreeItem[],
  found: { item: RuleTreeItem; parentId: string | null; depth: number }
): boolean {
  if (found.depth > 1) {
    return false;
  }
  return levelItems(items, found.parentId).some(
    (other) => other.id !== found.item.id && selectableIn(other)
  );
}

/** Whether a tree holds the item, not removed there, nor in a removed group. */
function holdsItem(items: RuleTreeItem[], id: string): boolean {
  return items.some(
    (item) =>
      item.mark !== 'removed' &&
      (item.id === id || (item.type === 'group' && holdsItem(item.items, id)))
  );
}

/**
 * Whether some other variant could still receive a copy of a rule of `source` ("Copy to
 * variant", FR-036; CLAR #53; build note U54 6522:33107 #4): always for a rule added or changed in
 * a based variant ("New addition", "Changed here"); otherwise (a Standard rule, in Standard or as a
 * variant inherits it unchanged, or a rule of a variant that started empty) only while some other
 * variant doesn't hold it: one not linked to it, or one that removed it, alone or with its group.
 */
function receivableElsewhere(
  branches: RulesBranch[],
  source: RulesBranch,
  rule: RuleItem
): boolean {
  const others = branches.filter((branch) => branch.key !== source.key);
  if (source.origin === 'based' && (rule.mark === 'added' || rule.mark === 'changed')) {
    return others.length > 0;
  }
  return others.some((branch) => !holdsItem(branch.items, rule.id));
}

/**
 * What a rule's or group's ⋯ menu is built from (`menuEntriesOf()`; FR-036; data-model "The rules
 * step's menus"), as it sits in its branch: a group or a sub-group, or a rule at the top level, in
 * a group or in a sub-group; whether it is linked to Standard there, changed or removed (an
 * inherited group dissolved in a based variant counts as removed, F13); whether another item of
 * its level can be grouped with it; a group's message and sub-groups; and whether some other
 * variant could still receive a rule's copy. Null if the branch has no such item. What is faded
 * with a removed or dissolved group has no menu: the list doesn't ask for one.
 */
export function menuItemOf(
  branches: RulesBranch[],
  branchKey: string,
  itemId: string
): MenuItem | null {
  const branch = branches.find((entry) => entry.key === branchKey);
  const found = branch ? findItem(branch.items, itemId) : null;
  if (!branch || !found) {
    return null;
  }
  const based = branch.origin === 'based';
  const { item, parentId, depth } = found;
  const standing = standingOf(branch, item);
  const state: MenuTreeItemState = {
    linked: standing === 'inherited',
    changed: item.mark === 'changed',
    removed: standing === 'removed' || isDissolved(item, based),
    neighbours: hasGroupingNeighbour(branch.items, found),
  };
  if (item.type === 'group') {
    return {
      kind: depth === 0 ? 'group' : 'sub-group',
      hasMessage: item.message !== null,
      holdsSubGroup: subGroupCount(item) > 0,
      ...state,
    };
  }
  let level: MenuRuleLevel = { level: 'sub-group' };
  if (depth === 0) {
    level = { level: 'top' };
  } else if (depth === 1 && parentId !== null) {
    level = { level: 'group', groupId: parentId };
  }
  return {
    kind: 'rule',
    receivable: receivableElsewhere(branches, branch, item),
    ...level,
    ...state,
  };
}

/**
 * The entries of a ⋯ menu, in `MENU_ENTRY_ORDER` (FR-036; data-model "The rules step's menus";
 * Clarifications #22, #48, #53, #54, #60, #61; spec 007, S4):
 * - every menu carries "Copy link" while the connection is stored, as its last entry before the
 *   destructive ones, also after "Restore" on a removed item, which offers nothing else;
 * - a rule: "Edit rule", "Rename", "Duplicate", "Copy to variant" while some other variant could
 *   still receive it, "Group with other rules", and "Delete rule";
 * - a group or sub-group: "Rename" (inline, with the duplicate check), "Add message", and "Remove
 *   message" next to it while the group has one, "Ungroup", and "Delete group" or "Delete
 *   sub-group";
 * - in a variant, an item linked to Standard has no "Rename", "Duplicate" or "Ungroup", offers
 *   "Reset to Standard" once changed there, and "Remove from <variant>" instead of Delete;
 * - "Group with other rules", with a neighbour (`MenuTreeItemState.neighbours`), on a top-level
 *   rule or a top-level group without a sub-group, selecting at the top level, and on a rule
 *   directly in a top-level group, selecting that group's rules; never on a sub-group, a rule in a
 *   sub-group or a group holding a sub-group;
 * - a variant's tab: "Rename" (Edit variant), and "Delete variant" except on Standard.
 */
export function menuEntriesOf(item: MenuItem, context: MenuContext): MenuEntry[] {
  const shown = new Set<MenuEntryId>();
  let scope: SelectScope = 'top';
  if (item.kind === 'variant') {
    shown.add('rename');
    if (context.branchKind === 'variant') {
      shown.add('delete');
    }
  } else if (item.removed) {
    shown.add('restore');
  } else {
    // Only a variant links its items to Standard
    const linked = context.branchKind === 'variant' && item.linked;
    if (!linked) {
      shown.add('rename');
    }
    if (item.kind === 'rule') {
      shown.add('edit');
      if (!linked) {
        shown.add('duplicate');
      }
      if (item.receivable) {
        shown.add('copyToVariant');
      }
      if (item.neighbours && item.level !== 'sub-group') {
        shown.add('group');
        scope = item.level === 'group' ? item.groupId : 'top';
      }
    } else {
      shown.add('addMessage');
      if (item.hasMessage) {
        shown.add('removeMessage');
      }
      if (!linked) {
        shown.add('ungroup');
      }
      // No "Group with other rules" on a group: deferred (CLAR #64, Implement Q2)
    }
    if (linked && item.changed) {
      shown.add('reset');
    }
    shown.add(linked ? 'remove' : 'delete');
  }
  if (context.linkable) {
    shown.add('copyLink');
  }
  return MENU_ENTRY_ORDER.filter((id) => shown.has(id)).map((id) =>
    id === 'group' ? { id, scope } : { id }
  );
}

/** Whether the open rule editor holds changes that "Save changes to Rule 01?" asks about. */
export function hasUnsavedChanges(state: RulesState): boolean {
  const { editing } = state;
  if (!editing) {
    return false;
  }
  const { draft, original } = editing;
  if (!original) {
    // A new rule: anything chosen or typed counts
    return draft.target !== null || draft.condition !== null || draft.message.trim() !== '';
  }
  return JSON.stringify(draft) !== JSON.stringify(original);
}

/** Names as the toasts list them: "Rule 02 and Rule 03", "Rule 02, Rule 03 and Rule 04". */
export function joinNames(names: string[]): string {
  if (names.length < 2) {
    return names.join('');
  }
  return `${names.slice(0, -1).join(', ')} ${RULES_COPY.and} ${names[names.length - 1]}`;
}

/** The selection bar's text (U16): what is chosen, and what grouping it makes. */
export function selectionText(selection: RulesSelection, branch: RulesBranch): string {
  const { ids, parentId } = selection;
  if (ids.length === 0) {
    return RULES_COPY.selectTwo;
  }
  if (ids.length === 1) {
    const rule = findItem(branch.items, ids[0])?.item;
    return RULES_COPY.selectOneMore(rule?.name ?? '');
  }
  const group = parentId === null ? null : findItem(branch.items, parentId)?.item;
  return group
    ? RULES_COPY.selectedSubGroup(ids.length, group.name)
    : RULES_COPY.selected(ids.length);
}

/** The note after switching a level's AND or OR, if this level was just switched. */
export function switchNoteOf(
  state: RulesState,
  branch: RulesBranch,
  parentId: string | null
): string | null {
  const { switched } = state;
  if (!switched || switched.branchKey !== branch.key || switched.parentId !== parentId) {
    return null;
  }
  const level =
    parentId === null ? branch.name.trim() : (findItem(branch.items, parentId)?.item.name ?? '');
  return switched.operator === 'or'
    ? RULES_COPY.switchedToOr(level)
    : RULES_COPY.switchedToAnd(level);
}

/**
 * The toast after ungrouping (002-S2.34). A group with its own message gives the rules it held
 * their own messages back, as U35 6965:50849 says (F32): not those of a sub-group with its own
 * message, and none while a group around it has one; otherwise the baseline's toast.
 */
export function ungroupedText(branch: RulesBranch, group: GroupItem): string {
  const parentId = findItem(branch.items, group.id)?.parentId ?? null;
  const parent = parentId === null ? null : groupOf(branch, parentId);
  const freed =
    group.message === null || (parent && parent.message !== null)
      ? []
      : group.items.flatMap((item) =>
          item.type === 'rule' ? [item] : item.message === null ? item.items : []
        );
  return freed.length > 0
    ? RULES_COPY.ungroupedOwnMessages(
        joinNames(freed.map((item) => item.name.trim())),
        freed.length
      )
    : RULES_COPY.ungrouped(group.name, branch.name);
}

/** The refused Publish's problem, if it names this item of the branch (F11). */
/**
 * The group whose message citizens read instead of a rule's at `parentId` (F32, FR-037): the
 * outermost group on the way up that has a message, as the list shows its members
 * (`GroupListItem`); null when none has one
 */
export function messageGroupOf(items: RuleTreeItem[], parentId: string | null): GroupItem | null {
  let found: GroupItem | null = null;
  let id = parentId;
  while (id !== null) {
    const entry = findItem(items, id);
    if (!entry || entry.item.type !== 'group') {
      break;
    }
    if (entry.item.message !== null) {
      found = entry.item;
    }
    id = entry.parentId;
  }
  return found;
}

/**
 * The message hint of the open rule editor (U35 6965:50822; F32): the rule's group, or the group
 * a new rule goes into, decides
 */
export function editorMessageHintOf(items: RuleTreeItem[], editing: RuleEditing): string | null {
  const parentId = editing.original
    ? (findItem(items, editing.original.id)?.parentId ?? null)
    : editing.parentId;
  const group = messageGroupOf(items, parentId);
  return group ? RULES_COPY.notShownInGroup(group.name.trim()) : null;
}

/**
 * The note under a rule on data no longer requested (U50 6197:10708, 7173:52351; FR-023): "<field>
 * is no longer requested.", or the document's label while the whole document is no longer
 * requested; `null` when the catalog doesn't know the target, so that the caller keeps the
 * server's sentence. `requested` are the requested documents, `catalog` all of them
 */
export function unrequestedNoteOf(
  rule: RuleItem,
  requested: RuleDocument[],
  catalog: RuleDocument[]
): string | null {
  const { target } = rule;
  const document = target && catalog.find((entry) => entry.key === target.document_type);
  if (!target || !document) {
    return null;
  }
  if (!requested.some((entry) => entry.key === target.document_type)) {
    return RULES_COPY.noLongerRequested(document.label.trim());
  }
  const field = document.fields.find((entry) => entry.key === target.field);
  return field ? RULES_COPY.noLongerRequested(field.label.trim()) : null;
}

export function problemFlagOf(
  state: RulesState,
  branch: RulesBranch,
  itemId: string
): string | null {
  const { problem } = state;
  if (!problem || problem.itemId !== itemId || problem.branchIndex === null) {
    return null;
  }
  return state.branches[problem.branchIndex]?.key === branch.key ? problem.message : null;
}

/**
 * The body of "Delete Rule 03?" or "Delete Group 01?" (U14 6113:29056; F14, W8). In Standard,
 * while variants are based on it, it says what the deletion does to them instead (design-notes
 * §4 and §5): a rule's is U47's drawn body naming the variants that follow Standard (6185:8847;
 * CLAR #56, FR-037), a group's names the variants that changed what is deleted and keep their
 * version; and a group the deletion leaves with one member is ungrouped everywhere, also where a
 * variant changed it (FR-022's one exception). Only the drawn rule body goes without "You can
 * undo this right after.", as U47 draws it. `statement` is the deleted rule's, if it reads.
 */
export function deleteDialogText(
  state: RulesState,
  dialog: { branchKey: string; itemId: string },
  statement: string | null
): string {
  const branch = branchOf(state, dialog.branchKey);
  const item = branch && findItem(branch.items, dialog.itemId);
  if (!branch || !item) {
    return '';
  }
  const { item: deleted, depth } = item;
  const based = state.branches.filter((entry) => entry.origin === 'based');
  if (branch.origin !== 'main' || based.length === 0) {
    return deleted.type === 'rule'
      ? RULES_COPY.deleteText(statement)
      : RULES_COPY.deleteGroupText(deleted.name, subGroupCount(deleted));
  }
  const main = branch.name.trim();
  const after = deleteItem(branch.items, deleted.id);
  const effects = deletionEffects(state.branches, after?.items ?? branch.items);
  const keptBy = (id: string) =>
    effects
      .filter((effect) => effect.kept.some((kept) => kept.id === id))
      .map((effect) => effect.branch.name.trim());
  const sentences: string[] = [];
  if (deleted.type === 'rule') {
    sentences.push(
      RULES_COPY.removedFromVariants(main, joinNames(based.map((entry) => entry.name.trim())))
    );
  } else {
    sentences.push(RULES_COPY.groupRemovedFromVariants(depth > 0 ? 'sub-group' : 'group', main));
    for (const entry of flattenItems([deleted])) {
      const variants = keptBy(entry.id);
      if (variants.length > 0) {
        sentences.push(
          RULES_COPY.itemKeptByVariants(joinNames(variants), variants.length, entry.name.trim())
        );
      }
    }
  }
  const dissolved = after?.dissolved;
  if (dissolved) {
    sentences.push(RULES_COPY.ungroupedEverywhere(dissolved.name.trim(), main));
    const lost = effects
      .filter((effect) => effect.dissolved.some((group) => group.id === dissolved.id))
      .map((effect) => effect.branch.name.trim());
    if (lost.length > 0) {
      const owners = joinNames(lost.map((variant) => RULES_COPY.possessive(variant)));
      sentences.push(RULES_COPY.changesGo(owners, dissolved.name.trim()));
    }
  }
  if (deleted.type !== 'rule') {
    sentences.push(RULES_COPY.undoRightAfter);
  }
  return sentences.join(' ');
}

/**
 * What a based variant's link strip says it removed (U47 6344:60085, 6344:60090, 6344:60095;
 * FR-051 (38)), or null while it removed nothing of Standard's: "Group 01 is removed here." while
 * only groups are removed (the outermost ones, with what they hold), or else "2 of 3 Standard
 * rules are removed here.", counting the rules it inherits from Standard (changed ones too, and
 * those it put into a group of its own) and,
 * among them, those removed on their own or with a group around them. A group dissolved there
 * removes nothing (F13): the rule that remains counts.
 */
export function linkStripSummaryOf(branch: RulesBranch, mainName: string): string | null {
  const removedGroups: string[] = [];
  let removedRules = 0;
  let removedOnTheirOwn = 0;
  let total = 0;
  const walk = (items: RuleTreeItem[], inRemoved: boolean) => {
    for (const item of items) {
      const removed = inRemoved || item.mark === 'removed';
      // A group the variant added may hold rules it inherits (grouped there)
      if (item.type === 'group') {
        if (!inRemoved && item.mark === 'removed') {
          removedGroups.push(item.name.trim());
        }
        walk(item.items, removed);
        continue;
      }
      if (!isInherited(branch, item)) {
        continue;
      }
      total += 1;
      if (removed) {
        removedRules += 1;
        removedOnTheirOwn += inRemoved ? 0 : 1;
      }
    }
  };
  walk(branch.items, false);
  if (removedOnTheirOwn === 0 && removedGroups.length > 0) {
    return RULES_COPY.removedGroups(joinNames(removedGroups), removedGroups.length);
  }
  return removedRules > 0 ? RULES_COPY.removedRules(removedRules, total, mainName.trim()) : null;
}

/**
 * The variants a rule of `branchKey` can be copied to, in tab order (FR-022): every other one.
 * While Standard is `chosen`, the variants based on it are included; Standard's line carries the
 * hint that they are, when any of them is a target.
 */
export function copyTargetsOf(
  state: RulesState,
  branchKey: string,
  chosen: string[]
): { branch: RulesBranch; included: boolean; hint: boolean }[] {
  const [main] = state.branches;
  const targets = state.branches.filter((branch) => branch.key !== branchKey);
  const mainChosen = chosen.includes(main.key);
  const anyBased = targets.some((branch) => branch.origin === 'based');
  return targets.map((branch) => ({
    branch,
    included: mainChosen && branch.origin === 'based',
    hint: branch.key === main.key && anyBased,
  }));
}

/** The sub-groups of a group, which "Delete Group 01?" names (design-notes §5). */
export function subGroupCount(group: GroupItem): number {
  return group.items.filter((member) => member.type === 'group').length;
}

/**
 * The tab an arrow key, Home or End moves to from the tab `index` of `count`, the arrows wrapping
 * round (WAI-ARIA tabs); null for any other key.
 */
export function tabAfterKey(key: string, index: number, count: number): number | null {
  switch (key) {
    case 'ArrowRight':
      return (index + 1) % count;
    case 'ArrowLeft':
      return (index - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

/** The Add variant dialog's empty fields, or Edit variant's with the branch's. */
export function initialVariantForm(branch?: RulesBranch): VariantForm {
  return {
    name: branch?.name ?? '',
    description: branch?.description ?? '',
    origin: 'based',
    error: null,
  };
}

/** The variant dialogs' fields: a change takes the refusal away. */
export function variantFormReducer(form: VariantForm, action: VariantFormAction): VariantForm {
  switch (action.type) {
    case 'reset':
      return action.form;
    case 'change':
      return { ...form, ...action.changes, error: null };
    case 'refuse':
      return { ...form, error: action.error };
  }
}

/**
 * Why the variant dialog can't add or rename the variant (W3): a missing or used name, or a
 * 21st variant. `ownKey` is the edited branch's, null when adding.
 */
export function variantFormProblem(
  form: VariantForm,
  state: RulesState,
  ownKey: string | null
): string | null {
  if (ownKey === null && state.branches.length >= MAX_BRANCHES) {
    return RULES_MESSAGES.tooManyBranches;
  }
  const others = state.branches.filter((branch) => branch.key !== ownKey);
  return variantNameProblem(
    form.name,
    others.map((branch) => branch.name)
  );
}

/**
 * The step's content as the editor's actions take it (`@connection-portal/rules/edits`): every
 * branch with its key as its id, and the counters.
 */
export function editStateOf(state: RulesState): EditState {
  return {
    branches: state.branches.map(({ key, ...branch }) => ({ ...branch, id: key })),
    counters: state.counters,
  };
}

/**
 * The step's branches after an action: keyed by their ids, which the actions keep, each with the
 * id it had in the step, null for a variant the action added.
 */
function branchesOf(state: RulesState, content: EditState): RulesBranch[] {
  return content.branches.map((branch) => {
    const key = branch.id ?? '';
    return { ...branch, key, id: branchOf(state, key)?.id ?? null };
  });
}

function nextToastId(state: RulesState): number {
  return (state.toast?.id ?? 0) + 1;
}

/**
 * The state after an action changed the rules: its branches, a change of the main branch already
 * passed on to every branch based on it (FR-021, W4), and its counters. The change ends select
 * mode and the note after switching, and clears the refused Publish's problem. It also drops the
 * last Undo, which puts back the rules as they were before that change only, and a copy's Show:
 * the toast stays, without its action, and goes after its time.
 */
function changed(state: RulesState, content: EditState): RulesState {
  return {
    ...state,
    branches: branchesOf(state, content),
    counters: content.counters,
    problem: null,
    selection: null,
    switched: null,
    undo: null,
    toast: state.toast?.actionLabel ? { ...state.toast, actionLabel: undefined } : state.toast,
  };
}

/**
 * A change with an Undo toast: the toast's Undo puts every branch back as it was. A deletion's
 * toast is neutral, a grouping's or ungrouping's `success` (the Figma toast's description:
 * "saved, grouped, copied, restored, published"; U36 #27, U35 #41).
 */
function undoable(
  state: RulesState,
  content: EditState,
  message: string,
  focus: Omit<RulesUndo, 'branches'>,
  kind: ToastKind = 'neutral'
): RulesState {
  return {
    ...changed(state, content),
    undo: { branches: state.branches, ...focus },
    showBranch: null,
    toast: {
      id: nextToastId(state),
      ...(kind === 'success' ? { kind } : {}),
      message,
      actionLabel: RULES_COPY.undo,
    },
  };
}

/** The state after an action that refuses nothing worth saying: unchanged if it is refused. */
function changedOr(state: RulesState, result: EditResult): RulesState {
  return result.ok ? changed(state, result.state) : state;
}

/** A new rule that was never saved gives its number back, so the next one shows it again. */
function releaseNumber(state: RulesState): RulesState['counters'] {
  const { editing, counters } = state;
  if (editing && !editing.original && numberOfId(editing.draft.id) === counters.rule - 1) {
    return { ...counters, rule: counters.rule - 1 };
  }
  return counters;
}

/** Whether the open editor's rule, or its new rule's group, is in a deleted item. */
function editorIsIn(state: RulesState, deleted: RuleTreeItem): boolean {
  const { editing } = state;
  if (!editing) {
    return false;
  }
  const ids = new Set(flattenItems([deleted]).map((item) => item.id));
  return ids.has(editing.draft.id) || (editing.parentId !== null && ids.has(editing.parentId));
}

/**
 * The rule editor's rule put into its branch: a saved rule changed, or a new one added with the
 * number the editor gave it, at the end of its group, or of the top level once the group is gone
 * or removed meanwhile.
 */
function savedRule(state: RulesState, editing: RuleEditing): EditResult {
  const content = editStateOf(state);
  const { branchKey, draft } = editing;
  const fields = {
    name: draft.name,
    target: draft.target,
    condition: draft.condition,
    message: draft.message,
  };
  if (editing.original) {
    return edits.changeRule(content, branchKey, draft.id, fields);
  }
  const items = branchOf(state, branchKey)?.items ?? [];
  const parentId =
    editing.parentId !== null && findItem(items, editing.parentId) ? editing.parentId : null;
  const rule = { id: draft.id, ...fields };
  const added = edits.addRule(content, branchKey, parentId, rule);
  return added.ok || parentId === null ? added : edits.addRule(content, branchKey, null, rule);
}

/** The inline rename (U15) of a rule, group or sub-group, as its name field checked it. */
function renamed(state: RulesState, { branchKey, itemId }: RenamingItem, name: string) {
  const content = editStateOf(state);
  const item = findItem(branchOf(state, branchKey)?.items ?? [], itemId)?.item;
  return item?.type === 'group'
    ? edits.changeGroup(content, branchKey, itemId, { name })
    : edits.changeRule(content, branchKey, itemId, { name });
}

/** Deletes the rule or group the dialog asks about, with an Undo toast. */
function deleteFromState(state: RulesState, branchKey: string, itemId: string): RulesState {
  const branch = branchOf(state, branchKey);
  const deleted = edits.deleteItem(editStateOf(state), branchKey, itemId);
  // The dialog deletes; what a based variant inherits isn't asked about, but removed there
  if (!branch || !deleted.ok || deleted.action !== 'deleted') {
    return { ...state, dialog: null };
  }
  const { item } = deleted;
  const message =
    item.type === 'rule'
      ? RULES_COPY.ruleDeleted(item.name, branch.name)
      : RULES_COPY.groupDeleted(item.name, branch.name);
  return {
    ...undoable(state, deleted.state, message, { branchKey, itemId }),
    // A rule open in the editor goes with its deletion
    editing: editorIsIn(state, item) ? null : state.editing,
    dialog: null,
  };
}

/**
 * Deletes a variant, which takes effect when the connection is saved (FR-020). The tab to its
 * left opens, and the toast offers Undo, which brings the variant back and opens it (FR-051
 * (33); U61 6523:37941): the undo names no item, so the focus goes to the variant's tab.
 */
function deleteVariant(state: RulesState, branchKey: string): RulesState {
  const deleted = edits.deleteVariant(editStateOf(state), branchKey);
  if (!deleted.ok) {
    return { ...state, dialog: null };
  }
  const index = state.branches.findIndex((branch) => branch.key === branchKey);
  const editing = state.editing?.branchKey === branchKey ? null : state.editing;
  return {
    ...undoable(state, deleted.state, RULES_COPY.variantDeleted(deleted.branch.name.trim()), {
      branchKey,
      itemId: '',
    }),
    openBranch: state.branches[index - 1].key,
    counters: editing === state.editing ? state.counters : releaseNumber(state),
    editing,
    renaming: state.renaming?.branchKey === branchKey ? null : state.renaming,
    dialog: null,
  };
}

/** Copies the rule the dialog names to the branches `targets` (FR-022), with F29's toast. */
function copyFromDialog(state: RulesState, targets: string[]): RulesState {
  const { dialog } = state;
  if (dialog?.type !== 'copyRule') {
    return state;
  }
  const rule = ruleOf(branchOf(state, dialog.branchKey), dialog.ruleId);
  const copied = edits.copyRule(
    editStateOf(state),
    dialog.branchKey,
    dialog.ruleId,
    targets.filter((key) => branchOf(state, key))
  );
  if (!rule || !copied.ok) {
    return { ...state, dialog: null };
  }
  const names = copied.copies.map(({ branchId }) => branchOf(state, branchId)?.name.trim() ?? '');
  return {
    ...changed(state, copied.state),
    dialog: null,
    showBranch: copied.copies[0].branchId,
    toast: {
      id: nextToastId(state),
      kind: 'success',
      message: RULES_COPY.copied(rule.name, joinNames(names)),
      actionLabel: RULES_COPY.show,
    },
  };
}

/**
 * The rules step's state after an action. What changes the rules is the editor's action of
 * `@connection-portal/rules/edits`, which the agents' tools share (spec 007, FR-014); this keeps
 * what the step shows: the open tab, the selection, the dialogs, the toasts, the Undo, the focus,
 * the inline rename and the rule editor, whose new rule's number it reserves.
 */
export function rulesReducer(state: RulesState, action: RulesAction): RulesState {
  switch (action.type) {
    case 'addRule': {
      const { rule, counters } = newRule(state.counters);
      return {
        ...state,
        openBranch: action.branchKey,
        counters,
        editing: {
          branchKey: action.branchKey,
          parentId: action.parentId,
          original: null,
          draft: rule,
        },
        renaming: null,
        dialog: null,
        selection: null,
      };
    }
    case 'editRule': {
      const branch = branchOf(state, action.branchKey);
      const rule = ruleOf(branch, action.ruleId);
      if (!branch || !rule || rule.mark === 'removed') {
        return state;
      }
      return {
        ...state,
        counters: releaseNumber(state),
        editing: {
          branchKey: action.branchKey,
          parentId: findItem(branch.items, rule.id)?.parentId ?? null,
          original: rule,
          draft: rule,
        },
        renaming: null,
        dialog: null,
        selection: null,
      };
    }
    case 'changeDraft':
      return state.editing
        ? { ...state, editing: { ...state.editing, draft: action.draft }, problem: null }
        : state;
    case 'saveRule': {
      const { editing } = state;
      if (!editing) {
        return state;
      }
      const branch = branchOf(state, editing.branchKey);
      const saved = savedRule(state, editing);
      if (!saved.ok) {
        return { ...state, counters: releaseNumber(state), editing: null, dialog: null };
      }
      return {
        ...changed(state, saved.state),
        editing: null,
        dialog: null,
        showBranch: null,
        toast: {
          id: nextToastId(state),
          // A finished action: the Figma toast's success type ("saved, grouped, …"; T036)
          kind: 'success',
          message: RULES_COPY.ruleSaved(editing.draft.name, branch?.name ?? ''),
        },
      };
    }
    case 'closeEditor':
      return { ...state, counters: releaseNumber(state), editing: null, dialog: null };
    case 'startRename':
      return { ...state, renaming: { branchKey: action.branchKey, itemId: action.itemId } };
    case 'rename': {
      const { renaming } = state;
      if (!renaming) {
        return state;
      }
      return { ...changedOr(state, renamed(state, renaming, action.name.trim())), renaming: null };
    }
    case 'cancelRename':
      return { ...state, renaming: null };
    case 'duplicateRule':
      return changedOr(
        state,
        edits.duplicateRule(editStateOf(state), action.branchKey, action.ruleId)
      );
    case 'askDelete':
      return {
        ...state,
        dialog: { type: 'deleteRule', branchKey: action.branchKey, ruleId: action.ruleId },
      };
    case 'askDeleteGroup':
      return {
        ...state,
        dialog: { type: 'deleteGroup', branchKey: action.branchKey, groupId: action.groupId },
      };
    case 'confirmDelete': {
      const { dialog } = state;
      switch (dialog?.type) {
        case 'deleteRule':
          return deleteFromState(state, dialog.branchKey, dialog.ruleId);
        case 'deleteGroup':
          return deleteFromState(state, dialog.branchKey, dialog.groupId);
        case 'deleteVariant':
          return deleteVariant(state, dialog.branchKey);
        default:
          return state;
      }
    }
    case 'askSaveChanges':
      return { ...state, dialog: { type: 'saveChanges', next: action.next } };
    case 'closeDialog':
      return { ...state, dialog: null };
    case 'undo': {
      const { undo, counters } = state;
      if (!undo) {
        return { ...state, toast: null };
      }
      return {
        ...state,
        branches: undo.branches,
        openBranch: undo.branchKey,
        // An undone grouping gives its number back, so the next group shows it again
        counters:
          undo.groupNumber === counters.group - 1
            ? { ...counters, group: counters.group - 1 }
            : counters,
        undo: null,
        toast: null,
        problem: null,
        selection: null,
        switched: null,
      };
    }
    // The toast goes after its 6 seconds (B4); its Undo stands until the next change, for
    // Ctrl/Cmd+Z, while its Show goes with it
    case 'dismissToast':
      return { ...state, toast: null, showBranch: null };
    // A toast that changes nothing, such as "Link copied.": no action, and Undo stays for
    // Ctrl/Cmd+Z, since the rules haven't changed
    case 'showToast':
      return {
        ...state,
        toast: { id: nextToastId(state), message: action.message },
        showBranch: null,
      };
    case 'clearProblem':
      return { ...state, problem: null };
    case 'showProblem':
      return { ...state, problem: action.problem };
    case 'selectBranch':
      return { ...state, openBranch: action.branchKey, selection: null, switched: null };
    case 'switchOperator': {
      const switched = edits.switchOperator(
        editStateOf(state),
        action.branchKey,
        action.parentId,
        action.operator
      );
      if (!switched.ok) {
        return state;
      }
      const level: SwitchedLevel = {
        branchKey: action.branchKey,
        parentId: action.parentId,
        operator: action.operator,
      };
      return { ...changed(state, switched.state), switched: level };
    }
    case 'startSelect': {
      const found = findItem(branchOf(state, action.branchKey)?.items ?? [], action.itemId);
      if (!found) {
        return state;
      }
      return {
        ...state,
        selection: { branchKey: action.branchKey, parentId: found.parentId, ids: [action.itemId] },
        renaming: null,
      };
    }
    case 'toggleSelect': {
      const { selection } = state;
      if (!selection) {
        return state;
      }
      const ids = selection.ids.includes(action.itemId)
        ? selection.ids.filter((id) => id !== action.itemId)
        : [...selection.ids, action.itemId];
      return { ...state, selection: { ...selection, ids } };
    }
    case 'cancelSelect':
      return { ...state, selection: null };
    case 'toggleFindings': {
      const { expandedFindings } = state;
      return {
        ...state,
        expandedFindings: expandedFindings.includes(action.branchKey)
          ? expandedFindings.filter((key) => key !== action.branchKey)
          : [...expandedFindings, action.branchKey],
      };
    }
    case 'groupSelected': {
      const { selection } = state;
      const branch = selection && branchOf(state, selection.branchKey);
      const grouped = branch && edits.groupItems(editStateOf(state), branch.key, selection.ids);
      if (!selection || !branch || !grouped?.ok) {
        return state;
      }
      const group = grouped.item;
      const names = joinNames(group.items.map((member) => member.name));
      const message =
        branch.origin === 'based'
          ? RULES_COPY.groupedInVariant(names, branch.name, group.name, state.branches[0].name)
          : RULES_COPY.grouped(names, branch.name, group.name);
      return undoable(
        state,
        grouped.state,
        message,
        { branchKey: branch.key, itemId: group.items[0].id, groupNumber: state.counters.group },
        'success'
      );
    }
    case 'ungroup': {
      const branch = branchOf(state, action.branchKey);
      const ungrouped = edits.ungroup(editStateOf(state), action.branchKey, action.groupId);
      if (!branch || !ungrouped.ok) {
        return state;
      }
      const group = ungrouped.item;
      return undoable(
        state,
        ungrouped.state,
        ungroupedText(branch, group),
        { branchKey: branch.key, itemId: group.id },
        'success'
      );
    }
    case 'setGroupMessage':
      return changedOr(
        state,
        edits.setGroupMessage(editStateOf(state), action.branchKey, action.groupId, action.message)
      );
    case 'askAddVariant':
      return { ...state, dialog: { type: 'addVariant' }, renaming: null, selection: null };
    case 'addVariant': {
      const id = action.id ?? crypto.randomUUID();
      const added = edits.addVariant(editStateOf(state), action.variant, action.origin, id);
      if (!added.ok) {
        return state;
      }
      return { ...changed(state, added.state), openBranch: id, dialog: null };
    }
    case 'askEditVariant':
      return { ...state, dialog: { type: 'editVariant', branchKey: action.branchKey } };
    case 'editVariant':
      return {
        ...changedOr(
          state,
          edits.editVariant(editStateOf(state), action.branchKey, action.variant)
        ),
        dialog: null,
      };
    case 'askDeleteVariant':
      return { ...state, dialog: { type: 'deleteVariant', branchKey: action.branchKey } };
    case 'removeItem': {
      const removed = edits.deleteItem(editStateOf(state), action.branchKey, action.itemId);
      // "Remove from this variant": only what a based variant inherits, which stays, removed
      return removed.ok && removed.action === 'removed' ? changed(state, removed.state) : state;
    }
    case 'restoreItem':
      return changedOr(
        state,
        edits.restoreItem(editStateOf(state), action.branchKey, action.itemId)
      );
    case 'resetItem':
      return changedOr(state, edits.resetItem(editStateOf(state), action.branchKey, action.itemId));
    case 'resetOperator':
      return changedOr(state, edits.resetOperator(editStateOf(state), action.branchKey));
    case 'askCopyRule':
      return {
        ...state,
        dialog: { type: 'copyRule', branchKey: action.branchKey, ruleId: action.ruleId },
      };
    case 'copyRule':
      return copyFromDialog(state, action.targets);
  }
}
