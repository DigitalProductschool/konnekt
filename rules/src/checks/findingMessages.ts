// The texts of the rule checks' findings (specs/003-rule-consistency-checks, research R12;
// contracts/ui-screens.md "Copy"; design-notes.md §1–§6): the notes on rules and groups, the
// findings banner, the counts row, the tab's icon and tooltip, the publish and save dialog's
// lines, the announcements, and what would resolve a finding, for agents (spec 007, research R14).
// This module is the only place where finding texts are written. Every function is pure.
//
// Conventions (design-notes.md §1): apostrophes are typographic (’); rules, groups and variants
// are named by their current names (FR-011), lists follow the display order and read "Rule 02,
// Rule 03 and Rule 04" (W3); notes and lines carry no visible kind, which only the icon's hidden
// text gives (`kindTextOf()`, A3); a finding that holds only for applicants who share today ends
// "at the moment" (FR-008, A7); no text words a finding as something to change (FR-016), except
// `resolutionOf()`'s, which tell agents what would resolve a finding (spec 007, research R14).
import type { RuleTreeItem } from '@connection-portal/api-types/form-connections';

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
  RedundantFinding,
  RedundantReason,
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

function isRedundant(finding: ItemFinding): finding is RedundantFinding {
  return finding.kind === 'redundant';
}

/** "rule" or "group", for "this rule" and "You can delete the group." */
function nounOf(id: string): string {
  return isGroupId(id) ? 'group' : 'rule';
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
 * A covered item's sentence, with its full stop (design-notes.md §2.4, §3.1; research R8, step 4).
 * `self` is the item: "this rule" in a note, its reference in a banner line; `others` names the
 * reason's items in display order. In an AND level, "Anyone who meets <items> also meets <self>",
 * with an enclosing OR level's alternatives after `self` ("<self> or Group 03"), and "Every
 * applicant meets <self> or Group 03" without items. In an OR level, "Anyone who meets <self> also
 * meets <items>" (one of them, so joined with "or"), with an enclosing AND level's context after
 * `self` ("<self> and Rule 05"). Null when a list the sentence needs has no current name left.
 */
function coveredParts(
  reason: Exclude<RedundantReason, { type: 'same' }>,
  self: BannerPart,
  others: (ids: readonly string[]) => BannerPart[]
): BannerPart[] | null {
  if (reason.type === 'implied_by') {
    const given = others(reason.items);
    const alternatives = others(reason.orItems);
    if (reason.items.length > 0 && given.length === 0) {
      return null;
    }
    const met = listParts([self, ...alternatives], 'or');
    return given.length === 0
      ? ['Every applicant meets ', ...met, '.']
      : ['Anyone who meets ', ...listParts(given), ' also meets ', ...met, '.'];
  }
  const met = others(reason.items);
  if (met.length === 0) {
    return null;
  }
  const given = listParts([self, ...others(reason.givenItems)]);
  return ['Anyone who meets ', ...given, ' also meets ', ...listParts(met, 'or'), '.'];
}

/** The note of a redundant rule or group (design-notes.md §2.4): what covers it, and its deletion. */
function redundantNote(finding: RedundantFinding, names: ItemNames): string {
  const { itemId, reason } = finding;
  const noun = nounOf(itemId);
  if (reason.type === 'same') {
    // "another rule" only while the item it names has no name any more, such as a deleted one
    const other = names.get(reason.item) ?? `another ${nounOf(reason.item)}`;
    return `Same as ${other}. You can delete one of them.`;
  }
  const parts = coveredParts(reason, `this ${noun}`, (ids) => {
    const others = namesInOrder(ids, names);
    // Only while the items it names have no name any more, such as deleted ones
    return others.length > 0 || ids.length === 0 ? others : ['other rules'];
  });
  return `${textOf(parts ?? [])} You can delete the ${noun}.`;
}

/**
 * The note under a rule or a group's header, without its kind, which the icon's hidden text gives
 * (`kindTextOf()`, A3). `names` are the current names of the branch's items, from `namesOf()`.
 */
export function noteOf(finding: ItemFinding, names: ItemNames): string {
  switch (finding.kind) {
    case 'conflicting':
      return conflictingNote(finding, names);
    case 'redundant':
      return redundantNote(finding, names);
    case 'always_met':
      return `Every applicant meets this ${nounOf(finding.itemId)}.`;
  }
}

// Resolutions for agents (spec 007, FR-032; research R14): what would resolve each finding and
// notice, worded for an LLM. The one place where texts word a finding as something to change

/** The item's current name, or "the rule" / "the group" while it has none, such as a deleted one. */
function nameOrNoun(id: string, names: ItemNames): string {
  return names.get(id) ?? `the ${nounOf(id)}`;
}

/**
 * The current names of `ids` in display order, with "other rules" at the end while some of them
 * have no name any more, such as deleted ones, so that no text shows an id.
 */
function namesOrOthers(ids: readonly string[], names: ItemNames): string[] {
  const named = namesInOrder(ids, names);
  return named.length < new Set(ids).size ? [...named, 'other rules'] : named;
}

/**
 * A conflict's resolution: one of the items that can't be met together changes or goes. A group
 * that can't be met because of one member, or a rule that can't be met on its own, changes or
 * goes; so does one member of an OR group none of whose members can be met, or the group.
 */
function conflictingResolution(finding: ConflictingFinding, names: ItemNames): string {
  const { itemId, reason, today } = finding;
  const suffix = atTheMoment(today);
  switch (reason.type) {
    case 'with':
      return (
        `Change or delete one of ${listOf(namesOrOthers([itemId, ...reason.items], names))}; ` +
        `they can’t be met together${suffix}.`
      );
    case 'members': {
      if (reason.items.length < 2 || namesInOrder(reason.items, names).length === 0) {
        const single = reason.items.length === 1 ? names.get(reason.items[0]) : undefined;
        return `Change or delete ${single ?? nameOrNoun(itemId, names)}; it can’t be met${suffix}.`;
      }
      const members = namesOrOthers(reason.items, names);
      if (reason.operator === 'and') {
        return `Change or delete one of ${listOf(members)}; they can’t be met together${suffix}.`;
      }
      return (
        `Change one of ${listOf(members)} so that it can be met, or delete ` +
        `${nameOrNoun(itemId, names)}; none of them can be met${suffix}.`
      );
    }
    case 'condition':
      return `Change or delete ${nameOrNoun(itemId, names)}; no applicant can meet it${suffix}.`;
  }
}

/**
 * A redundant item's resolution: its deletion, since the items its reason names already cover
 * it. For a covered item, they are every item the reason names, an enclosing level's included,
 * such as the group that is the alternative of an item covered through an OR level.
 */
function redundantResolution(finding: RedundantFinding, names: ItemNames): string {
  const { itemId, reason } = finding;
  const item = nameOrNoun(itemId, names);
  if (reason.type === 'same') {
    const other = names.get(reason.item) ?? `another ${nounOf(reason.item)}`;
    return `You can delete ${item}; ${other} already covers it.`;
  }
  const extra = reason.type === 'implied_by' ? reason.orItems : reason.givenItems;
  const ids = [...reason.items, ...extra];
  const covering = ids.length > 0 ? namesOrOthers(ids, names) : ['other rules'];
  const verb = covering.length === 1 && covering[0] !== 'other rules' ? 'covers' : 'cover';
  return `You can delete ${item}; ${listOf(covering)} already ${verb} it.`;
}

/** A branch notice's resolution: loosen the rules no applicant can meet, or check something. */
function noticeResolution(notice: BranchNotice): string {
  switch (notice.kind) {
    case 'none_can_meet':
      return (
        'Loosen or delete one of the rules that no applicant can meet together' +
        `${atTheMoment(notice.today)}.`
      );
    case 'all_meet':
      return 'Add a rule or make one stricter; as it is, the variant accepts every applicant.';
  }
}

/**
 * What would resolve a finding on a rule or group, for agents (spec 007, FR-032; research R14):
 * "Change or delete one of Rule 02 and Rule 03; they can’t be met together.", "You can delete
 * Rule 06; Rule 03 already covers it.", "Rule 05’s condition is always met; delete it or make it
 * stricter.". `names` are the current names of the branch's items, from `namesOf()`, as
 * `noteOf()` takes them.
 */
export function resolutionOf(finding: ItemFinding, names: ItemNames): string;
/**
 * What would resolve a variant's notice, for agents (spec 007, FR-032; research R14): "Loosen or
 * delete one of the rules that no applicant can meet together.", "Add a rule or make one
 * stricter; as it is, the variant accepts every applicant."
 */
export function resolutionOf(notice: BranchNotice): string;
export function resolutionOf(
  subject: ItemFinding | BranchNotice,
  names: ItemNames = new Map()
): string {
  if (!('itemId' in subject)) {
    return noticeResolution(subject);
  }
  switch (subject.kind) {
    case 'conflicting':
      return conflictingResolution(subject, names);
    case 'redundant':
      return redundantResolution(subject, names);
    case 'always_met': {
      const item = names.get(subject.itemId) ?? `The ${nounOf(subject.itemId)}`;
      return `${item}’s condition is always met; delete it or make it stricter.`;
    }
  }
}

// Branch notices and the incomplete check (FR-004, FR-006, FR-008, FR-010; design-notes.md §3.2)

/**
 * A branch notice as its own item, or alone, and as an announcement; also the test step's notice
 * and tab tooltip (spec 004, FR-018, research R5, R16): "No applicant can meet the rules of
 * Standard."
 */
export function noticeText(notice: BranchNotice, branchName: string): string {
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

/**
 * "2 rules", "1 rule and 1 group": the findings' items, rules before groups. With `adjective`,
 * before each noun: "2 duplicate rules and 1 duplicate group".
 */
function itemsPhrase(findings: readonly ItemFinding[], adjective = ''): string {
  const groups = findings.filter((finding) => isGroupId(finding.itemId)).length;
  const rules = findings.length - groups;
  const prefix = adjective === '' ? '' : `${adjective} `;
  const phrases = [
    ...(rules > 0 ? [`${rules} ${prefix}rule${rules === 1 ? '' : 's'}`] : []),
    ...(groups > 0 ? [`${groups} ${prefix}group${groups === 1 ? '' : 's'}`] : []),
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
  const redundant = check.findings.filter(isRedundant);
  const duplicates = redundant.filter((finding) => finding.reason.type === 'same');
  const covered = redundant.filter((finding) => finding.reason.type !== 'same');
  const alwaysMet = check.findings.filter((finding) => finding.kind === 'always_met');
  return [
    ...(together.length > 0 ? [`${itemsPhrase(together)} can’t be met together`] : []),
    ...(alone.length > 0 ? [`${itemsPhrase(alone)} can’t be met`] : []),
    ...(duplicates.length > 0 ? [itemsPhrase(duplicates, 'duplicate')] : []),
    ...(covered.length > 0 ? [`${itemsPhrase(covered)} already covered`] : []),
    ...(alwaysMet.length > 0 ? [`${itemsPhrase(alwaysMet)} every applicant meets`] : []),
  ].join(' · ');
}

// The banner's lines (A1, A2, W3, W18; design-notes.md §3.1)

/** What the tab's tooltip says before a branch's only line (§4; W20) */
type OneLineLabel = '1 conflict' | '1 duplicate' | '1 finding';

/** A line in the making: where it goes, and how the tooltip counts it alone. */
interface LineDraft {
  /** The display position of its first item */
  position: number;
  line: BannerLine;
  label: OneLineLabel;
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
      label: '1 conflict',
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
    drafts.push({
      position: position(ids[0]),
      line: lineOf('conflicting', parts),
      label: '1 conflict',
    });
  }
  return drafts;
}

/**
 * The line of a redundant or always-met finding (§3.1; A2: each has a line of its own), placed at
 * its item. Null without a current name for the item, or for the items its sentence needs.
 */
function otherLine(finding: ItemFinding, names: ItemNames): LineDraft | null {
  const name = names.get(finding.itemId);
  if (name === undefined || finding.kind === 'conflicting') {
    return null;
  }
  const self: BannerPart = { itemId: finding.itemId, name };
  const position = [...names.keys()].indexOf(finding.itemId);
  if (finding.kind === 'always_met') {
    return {
      position,
      line: lineOf('always_met', [
        'Every applicant meets ',
        self,
        ', so it doesn’t check anything.',
      ]),
      label: '1 finding',
    };
  }
  const { reason } = finding;
  if (reason.type === 'same') {
    const [other] = referencesInOrder([reason.item], names);
    if (other === undefined) {
      return null;
    }
    return {
      position,
      line: lineOf('redundant', [self, ' is the same as ', other, '.']),
      label: '1 duplicate',
    };
  }
  const parts = coveredParts(reason, self, (ids) => referencesInOrder(ids, names));
  return parts === null ? null : { position, line: lineOf('redundant', parts), label: '1 finding' };
}

/** The banner's lines in display order of their first item (§3.1). */
function lineDraftsOf(check: BranchCheck, names: ItemNames): LineDraft[] {
  const drafts = [
    ...conflictLines(check.findings.filter(isConflicting), names),
    ...check.findings.flatMap((finding) => otherLine(finding, names) ?? []),
  ];
  return drafts.sort((a, b) => a.position - b.position);
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
  return bannerWithLabels(check, branch, names)?.banner ?? null;
}

/** `bannerOf()`, with what the tab's tooltip says before each line when it is the only one. */
function bannerWithLabels(
  check: BranchCheck,
  branch: NamedBranch,
  names: ItemNames
): { banner: FindingsBanner; labels: OneLineLabel[] } | null {
  if (check.checkedRules === 0) {
    return null;
  }
  const drafts = lineDraftsOf(check, names);
  const lines = drafts.map(({ line }) => line);
  const notice = check.notice ? bannerNoticeOf(check.notice, branch.name) : null;
  const incomplete = check.complete ? null : incompleteText(branch.name);
  if (lines.length === 0 && notice === null && incomplete === null) {
    return null;
  }
  const counts = lines.length >= 2 ? countsOf(check) : '';
  const warning = lines.some((line) => line.tone === 'warning') || notice?.tone === 'warning';
  return {
    banner: {
      kind: warning ? 'warning' : 'info',
      lines,
      counts,
      notice,
      incomplete,
      head: headOf(lines, counts, notice, incomplete),
    },
    labels: drafts.map(({ label }) => label),
  };
}

// The tab (S4; A6, W20; FR-014; design-notes.md §4)

/** The text alternative of a variant tab's icon: "Standard has findings". */
export function tabLabelOf(branchName: string): string {
  return `${branchName} has findings`;
}

/**
 * The findings segment of a variant tab's tooltip, with its icon's kind (§4): "1 conflict: <line>",
 * "1 duplicate: <line>", "1 finding: <line>" for a covered or always-met item, or the counts row,
 * followed by the notice and FR-010's sentence as in the banner; or these alone. Null when the
 * branch has no banner.
 */
export function tabFindingsOf(
  check: BranchCheck,
  branch: NamedBranch,
  names: ItemNames
): TabFindings | null {
  const result = bannerWithLabels(check, branch, names);
  if (result === null) {
    return null;
  }
  const { banner, labels } = result;
  const text = textOf(banner.head);
  return {
    kind: banner.kind,
    text: labels.length === 1 ? `${labels[0]}: ${text}` : text,
  };
}

// The publish and save dialog (S5; FR-017, FR-019; W10; design-notes.md §6)

/**
 * A branch's line in the publish and save dialog (§6): "<variant>: <counts row>", followed by the
 * notice, as in "Ambulance: 2 rules can’t be met together. No applicant can meet the rules of
 * Ambulance."; the notice alone, without "<variant>: ", when the branch has no finding to count.
 * FR-010's sentence isn't repeated in the dialog (§6). Null when the branch has nothing to show:
 * no checked rules (W13), or neither a finding to count nor a notice, such as a check that only
 * couldn't finish.
 */
export function dialogLineOf(check: BranchCheck, branchName: string): string | null {
  if (check.checkedRules === 0) {
    return null;
  }
  const counts = countsOf(check);
  const notice = check.notice ? noticeText(check.notice, branchName) : null;
  if (counts === '') {
    return notice;
  }
  const line = `${branchName}: ${counts}`;
  return notice === null ? line : `${line}. ${notice}`;
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

/**
 * A redundant finding that appeared: "Rule 06 is the same as Rule 03.", or "Rule 01 makes no
 * difference beside Rule 02." with every item its reason names, in display order.
 */
function redundantAppeared(finding: RedundantFinding, item: string, names: ItemNames): string {
  const { reason } = finding;
  if (reason.type === 'same') {
    const other = names.get(reason.item);
    return other === undefined ? '' : `${item} is the same as ${other}.`;
  }
  const extra = reason.type === 'implied_by' ? reason.orItems : reason.givenItems;
  const others = namesInOrder([...reason.items, ...extra], names);
  return others.length > 0 ? `${item} makes no difference beside ${listOf(others)}.` : '';
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
    case 'redundant':
      return change.type === 'appeared'
        ? redundantAppeared(finding, item, names)
        : `${item} is no longer redundant.`;
    case 'always_met':
      return change.type === 'appeared'
        ? `Every applicant meets ${item}.`
        : `${item} is no longer always met.`;
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
