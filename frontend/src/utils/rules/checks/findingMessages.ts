// The texts of the rule checks' findings (specs/003-rule-consistency-checks, research R12;
// contracts/ui-screens.md "Copy"; design-notes.md §1–§5): the notes on rules and groups, the
// findings banner, the counts row, the tab's icon and tooltip, and the announcements. This module
// is the only place where finding texts are written. Every function is pure.
//
// Conventions (design-notes.md §1): apostrophes are typographic (’); rules, groups and variants
// are named by their current names (FR-011), lists follow the display order and read "Rule 02,
// Rule 03 and Rule 04" (W3); notes and lines carry no visible kind, which only the icon's hidden
// text gives (`kindTextOf()`, A3); a finding that holds only for applicants who share today ends
// "at the moment" (FR-008, A7); no text words a finding as something to change (FR-016).
//
// Redundant and always-met findings (US2) have no texts yet: their notes, lines, counts and
// announcements slot into the `switch`es on the finding's kind below.
import type { RuleTreeItem } from '../../../types/form-connections';
import { flattenItems } from '../tree';
import type {
  BannerLine,
  BannerNotice,
  BannerPart,
  BranchCheck,
  BranchNotice,
  ConflictingFinding,
  FindingChange,
  FindingsBanner,
  FindingTone,
  ItemFinding,
  ItemNames,
  MembersReason,
  NamedBranch,
  TabFindings,
} from './types';

// The kinds (A3, W19)

/** The visually hidden text of a kind's icon, read before the note or line it marks (FR-012). */
export function kindTextOf(kind: ItemFinding['kind']): string {
  switch (kind) {
    case 'conflicting':
      return 'Conflicting:';
    case 'redundant':
      return 'Redundant:';
    case 'always_met':
      return 'Always met:';
  }
}

/** The icon of a kind: the warning triangle for conflicts, the info icon otherwise (A1). */
function toneOf(kind: ItemFinding['kind']): FindingTone {
  return kind === 'conflicting' ? 'warning' : 'info';
}

// Names and lists

/** The current names of a branch's rules, groups and sub-groups, by id, in display order. */
export function namesOf(items: RuleTreeItem[]): ItemNames {
  return new Map(flattenItems(items).map((item) => [item.id, item.name]));
}

/** "A", "A and B", "A, B and C", without a serial comma (W3); the same with "or". */
export function listOf(items: readonly string[], conjunction: 'and' | 'or' = 'and'): string {
  return textOf(listParts(items, conjunction));
}

/** `listOf()` for parts, so that a banner's names stay references. */
function listParts(items: readonly BannerPart[], conjunction: 'and' | 'or' = 'and'): BannerPart[] {
  return items.flatMap((item, index) => {
    if (index === 0) {
      return [item];
    }
    return [index === items.length - 1 ? ` ${conjunction} ` : ', ', item];
  });
}

/** A banner text as plain text, its names as they read: for the tooltip, and the tests. */
export function textOf(parts: readonly BannerPart[]): string {
  return parts.map((part) => (typeof part === 'string' ? part : part.name)).join('');
}

/** Joins adjacent plain texts, so that a line has as few parts as it reads. */
function joined(parts: readonly BannerPart[]): BannerPart[] {
  return parts.reduce<BannerPart[]>((result, part) => {
    const last = result[result.length - 1];
    if (typeof part === 'string' && typeof last === 'string') {
      result[result.length - 1] = last + part;
    } else if (part !== '') {
      result.push(part);
    }
    return result;
  }, []);
}

/**
 * The ids of `ids` that have a current name, once each, in display order. An id without one, such
 * as an item deleted since the result, is left out, so that no text shows an id.
 */
function idsInOrder(ids: readonly string[], names: ItemNames): string[] {
  const order = [...names.keys()];
  return [...new Set(ids)]
    .filter((id) => names.has(id))
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function namesInOrder(ids: readonly string[], names: ItemNames): string[] {
  return idsInOrder(ids, names).map((id) => names.get(id) as string);
}

/** The references to `ids`, in display order, for a banner line. */
function referencesInOrder(ids: readonly string[], names: ItemNames): BannerPart[] {
  return idsInOrder(ids, names).map((itemId) => ({ itemId, name: names.get(itemId) as string }));
}

function isGroupId(id: string): boolean {
  return id.startsWith('group-');
}

function isConflicting(finding: ItemFinding): finding is ConflictingFinding {
  return finding.kind === 'conflicting';
}

// Pieces shared by the notes, the banner and the announcements (FR-008, A7)

/** Ends a conflict's sentence when it holds only for applicants who share today. */
function atTheMoment(today: boolean): string {
  return today ? ' at the moment' : '';
}

/**
 * A group's own conflict, without its full stop (design-notes.md §2.2, §3.1, §5). With `place`,
 * the members are "in" it: "this group" in a note, the group's name in an announcement, as in
 * "Rule 04 and Rule 05 in this group can’t be met together". Without, the sentence follows the
 * group's name and a colon in a banner line: "neither Rule 02 nor Rule 03 can be met". Empty
 * without a member's name.
 */
function membersParts(
  reason: MembersReason,
  members: readonly BannerPart[],
  place: BannerPart | null,
  today: boolean
): BannerPart[] {
  if (members.length === 0) {
    return [];
  }
  const inPlace: BannerPart[] = place === null ? [] : [' in ', place];
  const suffix = atTheMoment(today);
  if (members.length === 1) {
    return [members[0], ...inPlace, ` can’t be met${suffix}`];
  }
  if (reason.operator === 'and') {
    return [...listParts(members), ...inPlace, ` can’t be met together${suffix}`];
  }
  const capital = place !== null;
  if (members.length === 2) {
    return [
      capital ? 'Neither ' : 'neither ',
      members[0],
      ' nor ',
      members[1],
      ...inPlace,
      ` can be met${suffix}`,
    ];
  }
  return [
    capital ? 'None of ' : 'none of ',
    ...listParts(members),
    ...inPlace,
    ` can be met${suffix}`,
  ];
}

// Notes (S2; FR-003, FR-008, FR-012; A3, A5, W2, W3, W18; design-notes.md §2)

/** The note of a conflicting rule or group (design-notes.md §2.1–§2.3). */
function conflictingNote(finding: ConflictingFinding, names: ItemNames): string {
  const { reason, today } = finding;
  const suffix = atTheMoment(today);
  switch (reason.type) {
    case 'with': {
      const others = namesInOrder(reason.items, names);
      // Only while an item it names has no name any more, such as a deleted one
      const items = others.length > 0 ? listOf(others) : 'other rules';
      return `Can’t be met together with ${items}${suffix}.`;
    }
    case 'members': {
      const parts = membersParts(reason, namesInOrder(reason.items, names), 'this group', today);
      return parts.length > 0 ? `${textOf(parts)}.` : `This group can’t be met${suffix}.`;
    }
    case 'condition':
      return `No applicant can meet this rule${suffix}.`;
  }
}

/**
 * The note under a rule or a group's header, without its kind, which the icon's hidden text gives
 * (`kindTextOf()`, A3). `names` are the current names of the branch's items, from `namesOf()`.
 */
export function noteOf(finding: ItemFinding, names: ItemNames): string {
  switch (finding.kind) {
    case 'conflicting':
      return conflictingNote(finding, names);
    // The texts of redundant and always-met findings come with US2 (T035)
    case 'redundant':
    case 'always_met':
      return '';
  }
}

// Branch notices and the incomplete check (FR-004, FR-006, FR-008, FR-010; design-notes.md §3.2)

/** A branch notice as its own item, or alone, and as an announcement. */
function noticeText(notice: BranchNotice, branchName: string): string {
  switch (notice.kind) {
    case 'none_can_meet':
      return `${notice.today ? 'Right now, no' : 'No'} applicant can meet the rules of ${branchName}.`;
    case 'all_meet':
      return `Every applicant meets the rules of ${branchName}.`;
  }
}

/** A branch notice appended to a single line or to the counts row. */
function noticeAppended(notice: BranchNotice, branchName: string): string {
  if (notice.kind === 'none_can_meet' && !notice.today) {
    return `So no applicant can meet the rules of ${branchName}.`;
  }
  return noticeText(notice, branchName);
}

function bannerNoticeOf(notice: BranchNotice, branchName: string): BannerNotice {
  return {
    tone: notice.kind === 'none_can_meet' ? 'warning' : 'info',
    text: noticeText(notice, branchName),
    appended: noticeAppended(notice, branchName),
  };
}

/** FR-010's sentence, after a check that couldn't finish. */
function incompleteText(branchName: string): string {
  return (
    `The rules of ${branchName} couldn’t be checked completely. ` +
    'Only findings that are certain are shown.'
  );
}

/** What follows the counts row after a check that couldn't finish (§3.2). */
const INCOMPLETE_AFTER_COUNTS = ' · couldn’t be checked completely';

// The counts row (A2; design-notes.md §3.4)

/** "2 rules", "1 rule and 1 group": the findings' items, rules before groups. */
function itemsPhrase(findings: readonly ItemFinding[]): string {
  const groups = findings.filter((finding) => isGroupId(finding.itemId)).length;
  const rules = findings.length - groups;
  const phrases = [
    ...(rules > 0 ? [`${rules} rule${rules === 1 ? '' : 's'}`] : []),
    ...(groups > 0 ? [`${groups} group${groups === 1 ? '' : 's'}`] : []),
  ];
  return listOf(phrases);
}

/**
 * The counts row of a branch's findings (§3.4), for the banner, the tab's tooltip and the dialog:
 * one phrase per kind, joined with " · ", such as "2 rules can’t be met together · 1 duplicate
 * rule". A group whose own conflict names its members isn't counted: its members are. '' without
 * a finding to count.
 */
export function countsOf(check: BranchCheck): string {
  const conflicts = check.findings.filter(isConflicting);
  const together = conflicts.filter((finding) => finding.reason.type === 'with');
  const alone = conflicts.filter((finding) => finding.reason.type === 'condition');
  // The phrases of duplicates, covered and always-met items follow with US2 (T035)
  return [
    ...(together.length > 0 ? [`${itemsPhrase(together)} can’t be met together`] : []),
    ...(alone.length > 0 ? [`${itemsPhrase(alone)} can’t be met`] : []),
  ].join(' · ');
}

// The banner's lines (A1, A2, W3, W18; design-notes.md §3.1)

/** A line in the making: the ids it names and where it goes. */
interface LineDraft {
  /** The display position of its first item */
  position: number;
  line: BannerLine;
}

/** The ids a conflict names in its line: the item and T, or the rule alone. */
function conflictSetOf(finding: ConflictingFinding): string[] {
  return finding.reason.type === 'with'
    ? [finding.itemId, ...finding.reason.items]
    : [finding.itemId];
}

/** A line of a finding of `kind`, with its icon. */
function lineOf(kind: ItemFinding['kind'], parts: BannerPart[]): BannerLine {
  return { kind, tone: toneOf(kind), parts: joined(parts) };
}

/**
 * The lines of the conflicts (A2): a group's own conflict has a line, which also shows every
 * conflict set contained in the members it names (U05); the other conflicts whose sets are equal
 * share one (U01, EC-11). Lines without a current name are left out.
 */
function conflictLines(conflicts: readonly ConflictingFinding[], names: ItemNames): LineDraft[] {
  const order = [...names.keys()];
  const position = (id: string): number => order.indexOf(id);
  const groups = conflicts.filter((finding) => finding.reason.type === 'members');
  const drafts: LineDraft[] = [];
  for (const finding of groups) {
    const { itemId, reason, today } = finding;
    const group = names.get(itemId);
    const members = reason.type === 'members' ? referencesInOrder(reason.items, names) : [];
    if (group === undefined || members.length === 0 || reason.type !== 'members') {
      continue;
    }
    const sentence = membersParts(reason, members, null, today);
    drafts.push({
      position: position(itemId),
      line: lineOf('conflicting', [{ itemId, name: group }, ': ', ...sentence, '.']),
    });
  }
  const shownByGroup = (ids: readonly string[]): boolean =>
    groups.some(
      ({ itemId, reason }) =>
        names.has(itemId) &&
        reason.type === 'members' &&
        ids.every((id) => reason.items.includes(id))
    );
  // The other conflicts, by their set of named items in display order
  const sets = new Map<string, { ids: string[]; findings: ConflictingFinding[] }>();
  for (const finding of conflicts) {
    if (finding.reason.type === 'members') {
      continue;
    }
    const ids = idsInOrder(conflictSetOf(finding), names);
    const needed = finding.reason.type === 'with' ? 2 : 1;
    if (ids.length < needed || shownByGroup(ids)) {
      continue;
    }
    const key = ids.join(' ');
    const set = sets.get(key) ?? { ids, findings: [] };
    set.findings.push(finding);
    sets.set(key, set);
  }
  for (const { ids, findings } of sets.values()) {
    const suffix = atTheMoment(findings.every((finding) => finding.today));
    const references = referencesInOrder(ids, names);
    const parts: BannerPart[] =
      findings[0].reason.type === 'condition'
        ? ['No applicant can meet ', references[0], `${suffix}.`]
        : [...listParts(references), ` can’t be met together${suffix}.`];
    drafts.push({ position: position(ids[0]), line: lineOf('conflicting', parts) });
  }
  return drafts;
}

/** The banner's lines in display order of their first item (§3.1). */
function linesOf(check: BranchCheck, names: ItemNames): BannerLine[] {
  // The lines of redundant and always-met findings follow with US2 (T035)
  const drafts = conflictLines(check.findings.filter(isConflicting), names);
  return drafts.sort((a, b) => a.position - b.position).map(({ line }) => line);
}

// The banner (S2; A1, A2, A7, W12, W13, W17; FR-004, FR-010, FR-013; design-notes.md §3)

/**
 * The single banner's text or the collapsed banner's row (§3.2, §3.3): one line, followed by the
 * notice appended and FR-010's sentence; the counts row, " · couldn’t be checked completely" and
 * the notice appended; or the notice and FR-010's sentence alone.
 */
function headOf(
  lines: readonly BannerLine[],
  counts: string,
  notice: BannerNotice | null,
  incomplete: string | null
): BannerPart[] {
  if (lines.length >= 2) {
    const row = `${counts}${incomplete === null ? '' : INCOMPLETE_AFTER_COUNTS}`;
    return [notice === null ? row : `${row}. ${notice.appended}`];
  }
  const sentences: BannerPart[][] = [
    ...(lines.length === 1 ? [lines[0].parts] : []),
    ...(notice === null ? [] : [[lines.length === 1 ? notice.appended : notice.text]]),
    ...(incomplete === null ? [] : [[incomplete]]),
  ];
  return joined(sentences.flatMap((parts, index) => (index === 0 ? parts : [' ', ...parts])));
}

/**
 * The findings banner of the branch shown, as data (contracts/rule-checks.md): its kind, its lines
 * with the names as references for links, the counts row, the notice, FR-010's sentence after an
 * incomplete check, and the single or collapsed text (`head`). `names` are the current names of
 * the branch's items, from `namesOf()`. Null when there is no banner: a branch without checked
 * rules (W13), or without a line, a notice or an incomplete check.
 */
export function bannerOf(
  check: BranchCheck,
  branch: NamedBranch,
  names: ItemNames
): FindingsBanner | null {
  if (check.checkedRules === 0) {
    return null;
  }
  const lines = linesOf(check, names);
  const notice = check.notice ? bannerNoticeOf(check.notice, branch.name) : null;
  const incomplete = check.complete ? null : incompleteText(branch.name);
  if (lines.length === 0 && notice === null && incomplete === null) {
    return null;
  }
  const counts = lines.length >= 2 ? countsOf(check) : '';
  const warning = lines.some((line) => line.tone === 'warning') || notice?.tone === 'warning';
  return {
    kind: warning ? 'warning' : 'info',
    lines,
    counts,
    notice,
    incomplete,
    head: headOf(lines, counts, notice, incomplete),
  };
}

// The tab (S4; A6, W20; FR-014; design-notes.md §4)

/** The text alternative of a variant tab's icon: "Standard has findings". */
export function tabLabelOf(branchName: string): string {
  return `${branchName} has findings`;
}

/** What the tooltip says before a branch's only line: "1 conflict". */
function oneLineLabel(line: BannerLine): string {
  switch (line.kind) {
    case 'conflicting':
      return '1 conflict';
    // "1 duplicate" and "1 finding" come with US2 (T035)
    case 'redundant':
    case 'always_met':
      return '1 finding';
  }
}

/**
 * The findings segment of a variant tab's tooltip, with its icon's kind (§4): "1 conflict: <line>"
 * or the counts row, followed by the notice and FR-010's sentence as in the banner; or these
 * alone. Null when the branch has no banner.
 */
export function tabFindingsOf(
  check: BranchCheck,
  branch: NamedBranch,
  names: ItemNames
): TabFindings | null {
  const banner = bannerOf(check, branch, names);
  if (banner === null) {
    return null;
  }
  const text = textOf(banner.head);
  return {
    kind: banner.kind,
    text: banner.lines.length === 1 ? `${oneLineLabel(banner.lines[0])}: ${text}` : text,
  };
}

// Announcements (FR-015; W1; design-notes.md §5)

/** A conflict that appeared, without the variant's prefix: "Rule 02 conflicts with Rule 01." */
function conflictAppeared(finding: ConflictingFinding, item: string, names: ItemNames): string {
  const { reason, today } = finding;
  switch (reason.type) {
    case 'with': {
      const others = namesInOrder(reason.items, names);
      return others.length > 0
        ? `${item} conflicts with ${listOf(others)}${atTheMoment(today)}.`
        : '';
    }
    case 'members': {
      const parts = membersParts(reason, namesInOrder(reason.items, names), item, today);
      return parts.length > 0 ? `${textOf(parts)}.` : '';
    }
    case 'condition':
      return `${today ? 'Right now, no' : 'No'} applicant can meet ${item}.`;
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
  if (item === undefined) {
    return '';
  }
  switch (finding.kind) {
    case 'conflicting':
      return change.type === 'appeared'
        ? conflictAppeared(finding, item, names)
        : conflictGone(finding, item, names);
    // The announcements of redundant and always-met findings come with US2 (T038)
    case 'redundant':
    case 'always_met':
      return '';
  }
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
