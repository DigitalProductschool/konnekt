// The checks that refuse publishing or saving (FR-005, FR-006; data-model.md, "Validation"), with
// the server's messages, so that the rules step can name the problem, the rule and its branch
// before calling the API and move the focus there
import type {
  BranchInput,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';

import { namesGivenBackByUndo, renameClash, takenNames } from './branches';
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
import { effectiveItems, flattenItems, foldName, itemsWithNouns, twoDigits } from './tree';
import type {
  ItemAtDepth,
  ItemNoun,
  RuleContext,
  RuleDocument,
  RulesProblem,
  TakenName,
} from './types';

/** A text's length in characters, as the server counts it (code points, not UTF-16 units). */
export function textLength(text: string): number {
  return [...text].length;
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
 * F12): empty, too long, taken in the branch, or kept for another item. A branch's taken names
 * include its removed items' names and, in a based branch, the main branch's names of the items
 * it changed (`takenNames`). A rename in the main branch must also fit every based branch that
 * follows the item or changed it, and is refused naming that branch (propagation rule 7). Null
 * when it can. `branches` are all of them, main branch first.
 */
export function nameProblem(
  name: string,
  item: RuleTreeItem,
  branch: BranchInput,
  branches: BranchInput[]
): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return RULES_MESSAGES.nameMissing;
  }
  if (textLength(trimmed) > NAME_MAX_LENGTH) {
    return RULES_MESSAGES.nameTooLong;
  }
  const folded = foldName(trimmed);
  const [main] = branches;
  const other = takenNames(main, branch).find(
    (entry) => entry.ownerId !== item.id && foldName(entry.name) === folded
  );
  if (other) {
    return RULES_MESSAGES.nameTaken(other.noun, branch.name.trim(), other.name);
  }
  const reserved = reservedNameProblem(trimmed, item);
  if (reserved || branch.origin !== 'main') {
    return reserved;
  }
  const clash = renameClash(branches, item.id, trimmed);
  return (
    clash && RULES_MESSAGES.nameTaken(clash.taken.noun, clash.branch.name.trim(), clash.taken.name)
  );
}

/**
 * Why a variant can't take a name in the Add variant and Edit variant dialogs (W3;
 * design-notes.md §4): missing, too long, or another variant's, ignoring letter case and outer
 * spaces (FR-020). `otherNames` are the other variants' names. Null when it can.
 */
export function variantNameProblem(name: string, otherNames: string[]): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return RULES_MESSAGES.variantNameMissing;
  }
  if (textLength(trimmed) > NAME_MAX_LENGTH) {
    return RULES_MESSAGES.branchNameTooLong;
  }
  const other = otherNames.find((entry) => foldName(entry) === foldName(trimmed));
  return other === undefined ? null : RULES_MESSAGES.variantNameTaken(other.trim());
}

/**
 * Whether an item of a branch is checked there for what it says: everything in the main branch
 * and in a branch that started empty; in a based branch only what the branch changed or added.
 * An inherited item it follows or removed mirrors the main branch's, whose problem is reported
 * once, for the main branch (FR-006).
 */
export function checkedInBranch(branch: Pick<BranchInput, 'origin'>, item: RuleTreeItem): boolean {
  return branch.origin !== 'based' || item.mark === 'changed' || item.mark === 'added';
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
 * step's banner and inline flags (F11). A rule a based branch inherits unchanged is named once,
 * for the main branch (FR-006).
 */
export function unrequestedRules(
  branches: Pick<BranchInput, 'origin' | 'items'>[],
  documents: RuleDocument[]
): { branchIndex: number; rule: RuleItem }[] {
  return branches.flatMap((branch, branchIndex) =>
    flattenItems(branch.items)
      .filter((item): item is RuleItem => item.type === 'rule')
      .filter((rule) => checkedInBranch(branch, rule) && checksUnrequestedData(rule, documents))
      .map((rule) => ({ branchIndex, rule }))
  );
}

/**
 * The rules that check a document, or one of its fields, with their branch's index, for the
 * documents step's question before that data goes (FR-029, US4-AS3; F18). Every branch's rules
 * count, removed ones and those a based branch inherits included: each stops being met in its
 * branch, and the step refuses publishing or saving while any of them remains (FR-006).
 */
export function rulesCheckingData(
  branches: Pick<BranchInput, 'items'>[],
  documentType: string,
  field?: string
): { branchIndex: number; rule: RuleItem }[] {
  return branches.flatMap((branch, branchIndex) =>
    flattenItems(branch.items)
      .filter((item): item is RuleItem => item.type === 'rule')
      .filter(
        ({ target }) =>
          target !== null &&
          target.document_type === documentType &&
          (field === undefined || target.field === field)
      )
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
 * FR-008): a sub-group holds rules only; a group needs at least two members that count
 * (`effectiveItems`), except an inherited group in a based branch (`based`), which is dissolved
 * there instead; its own message has at most 500 characters after trimming, and a blank one
 * counts as none. Its name and its members are checked on their own.
 */
export function groupProblem(
  group: GroupItem,
  noun: ItemNoun,
  branchName: string,
  based = false
): string | null {
  const name = group.name.trim();
  const branch = branchName.trim();
  if (noun === 'sub-group' && group.items.some((member) => member.type === 'group')) {
    return RULES_MESSAGES.rulesOnly(name, branch);
  }
  const counted = !based || group.mark === 'added';
  if (counted && effectiveItems(group.items, based).length < 2) {
    return RULES_MESSAGES.tooFewMembers(name, branch);
  }
  if (textLength((group.message ?? '').trim()) > MESSAGE_MAX_LENGTH) {
    return RULES_MESSAGES.messageTooLong(name, branch);
  }
  return null;
}

/**
 * The first problem of a rule's target, condition and message, or of a group's content. What a
 * based branch inherits unchanged is checked in the main branch (`checkedInBranch`), but an
 * inherited group's members still need to fit it.
 */
function contentProblem(
  { item, noun }: ItemAtDepth,
  branch: BranchInput,
  context: RuleContext
): string | null {
  const based = branch.origin === 'based';
  if (item.type === 'group') {
    return groupProblem(item, noun, branch.name, based);
  }
  return checkedInBranch(branch, item) ? ruleProblem(item, branch.name, context) : null;
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

/**
 * The first problem of an item's name within its branch: missing, too long, taken by an item
 * before it or by an undo (`taken`), or reserved.
 */
function itemNameProblem(
  { item, noun }: ItemAtDepth,
  branch: string,
  taken: Map<string, TakenName>
): string | null {
  const name = item.name.trim();
  if (!name) {
    return RULES_MESSAGES.itemNameMissing(noun, branch);
  }
  if (textLength(name) > NAME_MAX_LENGTH) {
    return RULES_MESSAGES.itemNameTooLong(noun, branch);
  }
  const other = taken.get(foldName(name));
  if (other && other.ownerId !== item.id) {
    return RULES_MESSAGES.nameTaken(other.noun, branch, other.name);
  }
  return reservedNameProblem(name, item);
}

/**
 * The first problem that refuses publishing or saving, or null (FR-006). The checks run in the
 * server's order: the number of branches and the main branch; then branch by branch its name,
 * description, size and identifiers, followed by its items in display order, each group before
 * its members. A rule's name comes before its target, condition and message; a group's name
 * before what it holds, its number of members and its message. In a based branch, the names an
 * undo gives back are taken, and what it inherits unchanged is checked once, in the main branch.
 * A problem that names a branch and an item comes with both, so that the UI can open the branch
 * and move the focus to the item.
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
    // The server starts a branch's names from those an undo gives back
    const taken = new Map(
      namesGivenBackByUndo(branches[0], branch).map((entry) => [foldName(entry.name), entry])
    );
    for (const entry of itemsWithNouns(branch.items)) {
      const message =
        itemNameProblem(entry, branchName, taken) ?? contentProblem(entry, branch, context);
      if (message) {
        return { message, branchIndex, itemId: entry.item.id };
      }
      const name = entry.item.name.trim();
      taken.set(foldName(name), { name, noun: entry.noun, ownerId: entry.item.id });
    }
  }
  return null;
}
