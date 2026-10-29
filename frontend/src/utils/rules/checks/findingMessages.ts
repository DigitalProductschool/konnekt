// The texts of the rule checks' findings (specs/003-rule-consistency-checks, research R12;
// contracts/ui-screens.md "Copy"; design-notes.md §1–§5): the notes on rules and groups, the
// summary above the rules, the tab's text alternative and the announcements. This module is the
// only place where finding texts are written. Every function is pure.
//
// Conventions (design-notes.md §1): apostrophes are typographic (’); rules, groups and variants
// are named by their current names (FR-011), lists follow the display order and read "Rule 02,
// Rule 03 and Rule 04" (W3); every note starts with its kind (FR-012); a finding that holds only
// for applicants who share today says so (FR-008); no text words a finding as something to
// change (FR-016)
import type { RuleTreeItem } from '../../../types/form-connections';
import { flattenItems } from '../tree';
import type {
  BranchCheck,
  BranchNotice,
  ConflictingFinding,
  ConflictingReason,
  FindingChange,
  ItemFinding,
  ItemNames,
  MembersReason,
  NamedBranch,
} from './types';

// Names and lists

/** The current names of a branch's rules, groups and sub-groups, by id, in display order. */
export function namesOf(items: RuleTreeItem[]): ItemNames {
  return new Map(flattenItems(items).map((item) => [item.id, item.name]));
}

/** "A", "A and B", "A, B and C", without a serial comma (W3); the same with "or". */
export function listOf(items: readonly string[], conjunction: 'and' | 'or' = 'and'): string {
  if (items.length <= 1) {
    return items.join('');
  }
  return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
}

/**
 * The names of `ids` in display order. An id without a current name, such as an item deleted
 * since the result, is left out, so that no text shows an id.
 */
function namesInOrder(ids: readonly string[], names: ItemNames): string[] {
  const order = [...names.keys()];
  return [...new Set(ids)]
    .filter((id) => names.has(id))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => names.get(id) as string);
}

function isGroupId(id: string): boolean {
  return id.startsWith('group-');
}

// Pieces shared by the notes, the summary and the announcements (FR-008)

/** Ends a sentence's clause for a finding that holds only for applicants who share today. */
function todaySuffix(today: boolean): string {
  return today ? ' by applicants who share today' : '';
}

function noApplicant(today: boolean): string {
  return today ? 'No applicant who shares today' : 'No applicant';
}

function nobody(today: boolean): string {
  return today ? 'nobody who shares today' : 'nobody';
}

/**
 * A group's own conflict, without its full stop (design-notes.md §2.2, §5): `place` is "this
 * group" in its note, the group's name in an announcement. '' without a member's name.
 */
function membersSentence(
  reason: MembersReason,
  members: string[],
  place: string,
  today: boolean
): string {
  const suffix = todaySuffix(today);
  if (members.length === 0) {
    return '';
  }
  if (members.length === 1) {
    return `${members[0]} in ${place} can’t be met${suffix}`;
  }
  if (reason.operator === 'and') {
    return `${listOf(members)} in ${place} can’t be met together${suffix}`;
  }
  if (members.length === 2) {
    return `Neither ${members[0]} nor ${members[1]} in ${place} can be met${suffix}`;
  }
  return `None of ${listOf(members)} in ${place} can be met${suffix}`;
}

// Notes (S2; FR-003, FR-008, FR-012; design-notes.md §2)

const CONFLICTING = 'Conflicting.';

/** The note of a conflicting rule or group (design-notes.md §2.1–§2.3). */
function conflictingNote(finding: ConflictingFinding, names: ItemNames): string {
  const { reason, today } = finding;
  switch (reason.type) {
    case 'with': {
      const others = namesInOrder(reason.items, names);
      if (others.length === 0) {
        return CONFLICTING;
      }
      return `${CONFLICTING} Can’t be met together with ${listOf(others)}${todaySuffix(today)}.`;
    }
    case 'members': {
      const sentence = membersSentence(
        reason,
        namesInOrder(reason.items, names),
        'this group',
        today
      );
      return sentence ? `${CONFLICTING} ${sentence}.` : CONFLICTING;
    }
    case 'condition':
      return `${CONFLICTING} ${noApplicant(today)} can meet this rule’s condition.`;
  }
}

/**
 * The note under a rule or a group's header, starting with its kind (FR-012). `names` are the
 * current names of the branch's items, from `namesOf()`.
 */
export function noteOf(finding: ItemFinding, names: ItemNames): string {
  switch (finding.kind) {
    case 'conflicting':
      return conflictingNote(finding, names);
    // The texts of redundant and always-met findings aren't built yet (spec 003, US2)
    case 'redundant':
    case 'always_met':
      return '';
  }
}

// Branch notices and the incomplete check (FR-004, FR-008, FR-010; design-notes.md §3)

/** A branch notice's own text, in the summary and when it appears. */
function noticeText(notice: BranchNotice, branchName: string): string {
  switch (notice.kind) {
    case 'none_can_meet':
      return `${noApplicant(notice.today)} can meet the rules of ${branchName}.`;
    // The text of the notice that every applicant meets a branch isn't built yet (spec 003, US2)
    case 'all_meet':
      return '';
  }
}

/** FR-010's sentence, after a check that couldn't finish. */
function incompleteText(branchName: string): string {
  return (
    `The rules of ${branchName} couldn’t be checked completely. ` +
    'Only findings that are certain are shown.'
  );
}

// The summary (S2; F1, W5, W12, W13; FR-013; design-notes.md §3)

/** "1 conflicting rule", "2 conflicting groups": `count` items of one kind, one noun. */
function countPhrase(count: number, adjective: string, noun: 'rule' | 'group'): string {
  return `${count} ${adjective} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The counts of findings of one kind, rules before groups, sub-groups counting as groups:
 * ["2 conflicting rules", "1 conflicting group"]. The summary joins them as a list.
 */
function countPhrases(findings: readonly ItemFinding[], adjective: string): string[] {
  const groups = findings.filter((finding) => isGroupId(finding.itemId)).length;
  const rules = findings.length - groups;
  return [
    ...(rules > 0 ? [countPhrase(rules, adjective, 'rule')] : []),
    ...(groups > 0 ? [countPhrase(groups, adjective, 'group')] : []),
  ];
}

/**
 * The ids of the items a conflict names: the item and T, the group and the members its note
 * names, or the rule alone (design-notes.md §3, "Clauses").
 */
function conflictSet(itemId: string, reason: ConflictingReason): string[] {
  return reason.type === 'condition' ? [itemId] : [itemId, ...reason.items];
}

/**
 * What the summary says of the first conflict, in display order: "nobody can meet both Rule 01
 * and Rule 02". Null without a current name.
 */
function conflictClause(finding: ConflictingFinding, names: ItemNames): string | null {
  const { itemId, reason, today } = finding;
  const ids = reason.type === 'members' ? reason.items : conflictSet(itemId, reason);
  const items = namesInOrder(ids, names);
  if (items.length === 0) {
    return null;
  }
  const subject = `${nobody(today)} can meet`;
  if (items.length === 1) {
    return `${subject} ${items[0]}`;
  }
  if (reason.type === 'members' && reason.operator === 'or') {
    return `${subject} ${listOf(items, 'or')}`;
  }
  if (items.length === 2) {
    return `${subject} both ${items[0]} and ${items[1]}`;
  }
  return `${subject} all of ${listOf(items)}`;
}

/** The sentence on the conflicts: the counts, the first conflict's clause, and any other. */
function conflictsSentences(conflicts: ConflictingFinding[], names: ItemNames): string[] {
  const [first] = conflicts;
  const counts = listOf(countPhrases(conflicts, 'conflicting'));
  const clause = conflictClause(first, names);
  const covered = new Set(conflictSet(first.itemId, first.reason));
  const others = conflicts.some((finding) => !covered.has(finding.itemId));
  return [
    clause ? `${counts}: ${clause}.` : `${counts}.`,
    ...(others ? ['The other conflicts are marked below.'] : []),
  ];
}

function isConflicting(finding: ItemFinding): finding is ConflictingFinding {
  return finding.kind === 'conflicting';
}

/**
 * The summary above the rules of the branch shown (FR-013): the counts of its conflicts with the
 * first one's clause, the branch's notice, then FR-010's sentence after an incomplete check, which
 * stands alone when no finding is certain. '' when there is nothing to say, and for a branch
 * without checked rules (W13).
 */
export function summaryOf(check: BranchCheck, branch: NamedBranch, names: ItemNames): string {
  if (check.checkedRules === 0) {
    return '';
  }
  const conflicts = check.findings.filter(isConflicting);
  const notice = check.notice ? noticeText(check.notice, branch.name) : '';
  return [
    ...(conflicts.length > 0 ? conflictsSentences(conflicts, names) : []),
    ...(notice ? [notice] : []),
    ...(check.complete ? [] : [incompleteText(branch.name)]),
  ].join(' ');
}

// The tab (S4; F7; FR-014; design-notes.md §4)

/** The text alternative of a variant tab's icon: "Standard has findings". */
export function tabLabelOf(branchName: string): string {
  return `${branchName} has findings`;
}

// Announcements (FR-015; W1; design-notes.md §5)

/** A conflict that appeared, without the variant's prefix: "Rule 02 conflicts with Rule 01." */
function conflictAppeared(finding: ConflictingFinding, item: string, names: ItemNames): string {
  const { reason, today } = finding;
  switch (reason.type) {
    case 'with': {
      const others = namesInOrder(reason.items, names);
      return others.length > 0
        ? `${item} conflicts with ${listOf(others)}${todaySuffix(today)}.`
        : '';
    }
    case 'members': {
      const sentence = membersSentence(reason, namesInOrder(reason.items, names), item, today);
      return sentence ? `${sentence}.` : '';
    }
    case 'condition':
      return `${noApplicant(today)} can meet ${item}.`;
  }
}

/**
 * A conflict that went: "Rule 02 no longer conflicts with Rule 01.", or for a conflict without
 * items it was conflicting with, "Sub-group 01 is no longer conflicting."
 */
function conflictGone(finding: ConflictingFinding, item: string, names: ItemNames): string {
  const others = finding.reason.type === 'with' ? namesInOrder(finding.reason.items, names) : [];
  return others.length > 0
    ? `${item} no longer conflicts with ${listOf(others)}.`
    : `${item} is no longer conflicting.`;
}

/** The sentence of a finding that appeared or went, without the variant's prefix. */
function findingSentence(change: FindingChange, names: ItemNames): string {
  if (change.type === 'notice') {
    return '';
  }
  const { finding } = change;
  const item = names.get(finding.itemId);
  if (item === undefined || !isConflicting(finding)) {
    // The texts of redundant and always-met findings aren't built yet (spec 003, US2)
    return '';
  }
  return change.type === 'appeared'
    ? conflictAppeared(finding, item, names)
    : conflictGone(finding, item, names);
}

/**
 * The announcement of one change in the polite status region (FR-015). `names` are the current
 * names of the change's branch, from `namesOf()`: an item without one is left out of a list.
 * `shownBranch` is the key of the branch shown. A finding in another variant starts with
 * "In <variant>: "; a notice names its variant already. '' for a change there is nothing to say
 * about, such as one on an item that has no name any more.
 */
export function announcementOf(
  change: FindingChange,
  names: ItemNames,
  shownBranch: string
): string {
  if (change.type === 'notice') {
    return noticeText(change.notice, change.branch.name);
  }
  const sentence = findingSentence(change, names);
  if (!sentence || change.branch.key === shownBranch) {
    return sentence;
  }
  return `In ${change.branch.name}: ${sentence}`;
}
