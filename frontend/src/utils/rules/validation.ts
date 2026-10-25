// The checks that refuse publishing or saving (FR-005, FR-006; data-model.md, "Validation"), with
// the server's messages, so that the rules step can name the problem, the rule and its branch
// before calling the API and move the focus there
import type { BranchInput, GroupItem, RuleItem, RuleTreeItem } from '../../types/form-connections';
import { conditionProblem, optionsOf } from './conditions';
import {
  CONDITION_PROBLEM_MESSAGES,
  DESCRIPTION_MAX_LENGTH,
  GROUP_ID_PATTERN,
  LICENCE_CLASSES_SET,
  MAX_BRANCHES,
  MAX_ITEMS_PER_BRANCH,
  MESSAGE_MAX_LENGTH,
  NAME_MAX_LENGTH,
  RESERVED_NAME_PATTERN,
  RULE_ID_PATTERN,
  RULES_MESSAGES,
} from './constants';
import { flattenItems, twoDigits } from './tree';
import type { ItemAtDepth, ItemNoun, RuleContext, RuleDocument, RulesProblem } from './types';

/** A name as names are compared: trimmed and ignoring letter case, "ß" as "ss" (FR-005). */
export function foldName(name: string): string {
  return name.trim().toUpperCase().toLowerCase();
}

/** A text's length in characters, as the server counts it (code points, not UTF-16 units). */
export function textLength(text: string): number {
  return [...text].length;
}

function nounOf(item: RuleTreeItem, depth: number): ItemNoun {
  if (item.type === 'rule') {
    return 'rule';
  }
  return depth === 0 ? 'group' : 'sub-group';
}

/** Every item of a tree in display order, with the noun that names it. */
function itemsWithNouns(items: RuleTreeItem[], depth = 0): ItemAtDepth[] {
  return items.flatMap((item) => [
    { item, noun: nounOf(item, depth) },
    ...(item.type === 'group' ? itemsWithNouns(item.items, depth + 1) : []),
  ]);
}

/** The digits of an identifier's number without leading zeros: `rule-07` → "7". */
function idDigits(id: string): string | null {
  const match = /^(?:rule|group)-(\d+)$/.exec(id);
  return match ? match[1].replace(/^0+/, '') || '0' : null;
}

/**
 * "Rule NN" is kept for the rule `rule-{NN}`, "Group NN" and "Sub-group NN" for the group
 * `group-{NN}`, with or without leading zeros (FR-005). The message for a trimmed name that
 * another item may not take, or null.
 */
export function reservedNameProblem(name: string, item: RuleTreeItem): string | null {
  const match = RESERVED_NAME_PATTERN.exec(name);
  if (!match) {
    return null;
  }
  const word = match[1].toLowerCase() as ItemNoun;
  const digits = match[2].replace(/^0+/, '') || '0';
  const ownType = word === 'rule' ? 'rule' : 'group';
  if (item.type === ownType && idDigits(item.id) === digits) {
    return null;
  }
  return RULES_MESSAGES.nameReserved(name, word, twoDigits(digits));
}

/**
 * Why a rule, group or sub-group can't take a name in its branch, for inline renaming (FR-005;
 * F12): empty, too long, another item's name in the branch, or a name kept for another item.
 * Null when it can.
 */
export function nameProblem(
  name: string,
  item: RuleTreeItem,
  branch: Pick<BranchInput, 'name' | 'items'>
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return RULES_MESSAGES.nameMissing;
  }
  if (textLength(trimmed) > NAME_MAX_LENGTH) {
    return RULES_MESSAGES.nameTooLong;
  }
  const folded = foldName(trimmed);
  const other = itemsWithNouns(branch.items).find(
    (entry) => entry.item.id !== item.id && foldName(entry.item.name) === folded
  );
  if (other) {
    return RULES_MESSAGES.nameTaken(other.noun, branch.name.trim(), other.item.name.trim());
  }
  return reservedNameProblem(trimmed, item);
}

/**
 * Whether a rule checks data the connection no longer requests, or an image (FR-006; F11).
 * `documents` are the requested ones.
 */
export function checksUnrequestedData(rule: RuleItem, documents: RuleDocument[]): boolean {
  const { target } = rule;
  if (!target) {
    return false;
  }
  const field = documents
    .find((document) => document.key === target.document_type)
    ?.fields.find((entry) => entry.key === target.field);
  return !field || field.kind === 'image';
}

/**
 * The rules that check data no longer requested, with their branch's index, for the rules
 * step's banner and inline flags (F11).
 */
export function unrequestedRules(
  branches: Pick<BranchInput, 'items'>[],
  documents: RuleDocument[]
): { branchIndex: number; rule: RuleItem }[] {
  return branches.flatMap((branch, branchIndex) =>
    flattenItems(branch.items)
      .filter((item): item is RuleItem => item.type === 'rule')
      .filter((rule) => checksUnrequestedData(rule, documents))
      .map((rule) => ({ branchIndex, rule }))
  );
}

/**
 * The first problem of a rule's target, condition or message, in the server's words, or null
 * (FR-006). `context.documents` are the requested documents with their requested fields.
 */
export function ruleProblem(
  rule: RuleItem,
  branchName: string,
  context: RuleContext
): string | null {
  const name = rule.name.trim();
  const branch = branchName.trim();
  const { target } = rule;
  if (!target) {
    return RULES_MESSAGES.chooseData(name, branch);
  }
  if (checksUnrequestedData(rule, context.documents)) {
    return RULES_MESSAGES.notRequested(name, branch);
  }
  const field = context.documents
    .find((document) => document.key === target.document_type)
    ?.fields.find((entry) => entry.key === target.field);
  if (!field) {
    return RULES_MESSAGES.notRequested(name, branch);
  }
  const partKey = target.part ?? null;
  const licenceClass = target.licence_class ?? null;
  const unknownPart = RULES_MESSAGES.unknownPart(name, branch, field.label);
  let kind = field.kind;
  let optionSet = field.option_set;
  if (field.kind === 'parts') {
    if (partKey === null) {
      return RULES_MESSAGES.chooseData(name, branch);
    }
    const part = field.parts?.find((entry) => entry.key === partKey);
    if (!part) {
      return unknownPart;
    }
    if (part.per_licence_class) {
      if (licenceClass === null) {
        return RULES_MESSAGES.chooseData(name, branch);
      }
      const classes = optionsOf(context.optionSets, LICENCE_CLASSES_SET);
      if (classes && !classes.some((option) => option.value === licenceClass)) {
        return unknownPart;
      }
    } else if (licenceClass !== null) {
      return unknownPart;
    }
    kind = part.kind;
    optionSet = part.option_set;
  } else if (partKey !== null || licenceClass !== null) {
    return unknownPart;
  }
  if (kind === 'image' || kind === 'parts') {
    return RULES_MESSAGES.notRequested(name, branch);
  }
  const options = kind === 'enum' ? optionsOf(context.optionSets, optionSet) : null;
  const problem = conditionProblem(rule.condition, kind, options);
  if (problem) {
    const detail =
      problem === 'amount_at_least_1'
        ? CONDITION_PROBLEM_MESSAGES.amount_at_least_1(
            rule.condition?.unit === 'months' ? 'months' : 'years'
          )
        : CONDITION_PROBLEM_MESSAGES[problem];
    return `${name} in ${branch}: ${detail}`;
  }
  const message = (rule.message ?? '').trim();
  if (!message) {
    return RULES_MESSAGES.noMessage(name, branch);
  }
  if (textLength(message) > MESSAGE_MAX_LENGTH) {
    return RULES_MESSAGES.messageTooLong(name, branch);
  }
  return null;
}

/**
 * The first problem of a group or sub-group itself, in the server's words, or null (FR-004,
 * FR-008): a sub-group holds rules only; a group needs at least two members, not counting those
 * a based branch removed; its own message has at most 500 characters after trimming, and a blank
 * one counts as none. Its name and its members are checked on their own.
 */
export function groupProblem(group: GroupItem, noun: ItemNoun, branchName: string): string | null {
  const name = group.name.trim();
  const branch = branchName.trim();
  if (noun === 'sub-group' && group.items.some((member) => member.type === 'group')) {
    return RULES_MESSAGES.rulesOnly(name, branch);
  }
  if (group.items.filter((member) => member.mark !== 'removed').length < 2) {
    return RULES_MESSAGES.tooFewMembers(name, branch);
  }
  if (textLength((group.message ?? '').trim()) > MESSAGE_MAX_LENGTH) {
    return RULES_MESSAGES.messageTooLong(name, branch);
  }
  return null;
}

/** The first problem of a rule's target, condition and message, or of a group's content. */
function contentProblem(
  { item, noun }: ItemAtDepth,
  branchName: string,
  context: RuleContext
): string | null {
  return item.type === 'rule'
    ? ruleProblem(item, branchName, context)
    : groupProblem(item, noun, branchName);
}

function identifiersAreValid(items: RuleTreeItem[]): boolean {
  const seen = new Set<string>();
  return flattenItems(items).every((item) => {
    const pattern = item.type === 'rule' ? RULE_ID_PATTERN : GROUP_ID_PATTERN;
    if (!pattern.test(item.id) || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

/** The first problem of a branch's own name, description, size and identifiers. */
function branchProblem(
  branch: BranchInput,
  branchIndex: number,
  earlierNames: Set<string>
): RulesProblem | null {
  const name = branch.name.trim();
  const problem = (message: string, itemId: string | null = null): RulesProblem => ({
    message,
    branchIndex,
    itemId,
  });
  if (!name) {
    return problem(RULES_MESSAGES.branchNameMissing);
  }
  if (textLength(name) > NAME_MAX_LENGTH) {
    return problem(RULES_MESSAGES.branchNameTooLong);
  }
  if (earlierNames.has(foldName(name))) {
    return problem(RULES_MESSAGES.branchNameTwice(name));
  }
  if (textLength((branch.description ?? '').trim()) > DESCRIPTION_MAX_LENGTH) {
    return problem(RULES_MESSAGES.descriptionTooLong(name));
  }
  if (flattenItems(branch.items).length > MAX_ITEMS_PER_BRANCH) {
    return problem(RULES_MESSAGES.tooManyItems(name));
  }
  if (!identifiersAreValid(branch.items)) {
    return problem(RULES_MESSAGES.invalidIdentifier);
  }
  return null;
}

/** The first problem of an item's name within its branch: missing, too long, taken, reserved. */
function itemNameProblem(
  { item, noun }: ItemAtDepth,
  branch: string,
  earlier: Map<string, ItemAtDepth>
): string | null {
  const name = item.name.trim();
  if (!name) {
    return RULES_MESSAGES.itemNameMissing(noun, branch);
  }
  if (textLength(name) > NAME_MAX_LENGTH) {
    return RULES_MESSAGES.itemNameTooLong(noun, branch);
  }
  const other = earlier.get(foldName(name));
  if (other) {
    return RULES_MESSAGES.nameTaken(other.noun, branch, other.item.name.trim());
  }
  return reservedNameProblem(name, item);
}

/**
 * The first problem that refuses publishing or saving, or null (FR-006). The checks run in the
 * server's order: the number of branches and the main branch; then branch by branch its name,
 * description, size and identifiers, followed by its items in display order, each group before
 * its members. A rule's name comes before its target, condition and message; a group's name
 * before what it holds, its number of members and its message. A problem that names a branch and
 * an item comes with both, so that the UI can open the branch and move the focus to the item.
 *
 * `context.documents` are the requested documents with only their requested fields
 * (`requestedRuleDocuments`).
 */
export function firstProblem(branches: BranchInput[], context: RuleContext): RulesProblem | null {
  if (branches.length > MAX_BRANCHES) {
    return { message: RULES_MESSAGES.tooManyBranches, branchIndex: null, itemId: null };
  }
  const mainBranches = branches.filter((branch) => branch.origin === 'main');
  if (mainBranches.length !== 1 || branches[0].origin !== 'main') {
    return { message: RULES_MESSAGES.mainBranch, branchIndex: null, itemId: null };
  }
  const branchNames = new Set<string>();
  for (const [branchIndex, branch] of branches.entries()) {
    const problem = branchProblem(branch, branchIndex, branchNames);
    if (problem) {
      return problem;
    }
    branchNames.add(foldName(branch.name));
    const branchName = branch.name.trim();
    const earlier = new Map<string, ItemAtDepth>();
    for (const entry of itemsWithNouns(branch.items)) {
      const message =
        itemNameProblem(entry, branchName, earlier) ?? contentProblem(entry, branchName, context);
      if (message) {
        return { message, branchIndex, itemId: entry.item.id };
      }
      earlier.set(foldName(entry.item.name), entry);
    }
  }
  return null;
}
