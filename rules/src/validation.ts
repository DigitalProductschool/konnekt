// The checks that refuse publishing or saving (FR-005, FR-006; data-model.md, "Validation"), with
// the server's messages, so that the rules step can name the problem, the rule and its branch
// before calling the API and move the focus there. Each problem comes with its code, the key of
// its message, which callers branch on (spec 009, R10), and its message in the language asked for
// (R4): a context's `language`, or a trailing `language`, English by default
import type {
  BranchInput,
  GroupItem,
  RuleItem,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';

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
import { DEFAULT_LANGUAGE, type Language } from './language';
import { effectiveItems, flattenItems, foldName, itemsWithNouns, twoDigits } from './tree';
import type {
  ConditionProblem,
  ItemAtDepth,
  ItemNoun,
  RuleContext,
  RuleDocument,
  RuleProblemDetail,
  RulesProblem,
  RulesProblemCode,
  TakenName,
} from './types';

function detail(code: RulesProblemCode, message: string): RuleProblemDetail {
  return { code, message };
}

/** Whether a problem's code is an incomplete condition's (`ConditionProblem`). */
export function isConditionProblem(code: RulesProblemCode): code is ConditionProblem {
  return Object.hasOwn(CONDITION_PROBLEM_MESSAGES[DEFAULT_LANGUAGE], code);
}

/** A text's length in characters, as the server counts it (code points, not UTF-16 units). */
export function textLength(text: string): number {
  return [...text].length;
}

/** The digits of an identifier's number without leading zeros: `rule-07` → "7". */
function idDigits(id: string): string | null {
  const match = /^(?:rule|group)-(\d+)$/.exec(id);
  return match ? match[1].replace(/^0+/, '') || '0' : null;
}

/** `reservedNameProblem` with its code, `'nameReserved'`. */
function reservedNameProblemOf(
  name: string,
  item: RuleTreeItem,
  language: Language
): RuleProblemDetail | null {
  // The stored default names are English in every language (FR-007), so is the pattern
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
  return detail(
    'nameReserved',
    RULES_MESSAGES[language].nameReserved(name, word, twoDigits(digits))
  );
}

/**
 * "Rule NN" is kept for the rule `rule-{NN}`, "Group NN" and "Sub-group NN" for the group
 * `group-{NN}`, with or without leading zeros (FR-005). The message for a trimmed name that
 * another item may not take, or null.
 */
export function reservedNameProblem(
  name: string,
  item: RuleTreeItem,
  language: Language = DEFAULT_LANGUAGE
): string | null {
  return reservedNameProblemOf(name, item, language)?.message ?? null;
}

/** `nameProblem` with the problem's code. */
export function nameProblemOf(
  name: string,
  item: RuleTreeItem,
  branch: BranchInput,
  branches: BranchInput[],
  language: Language = DEFAULT_LANGUAGE
): RuleProblemDetail | null {
  const messages = RULES_MESSAGES[language];
  const trimmed = name.trim();
  if (!trimmed) {
    return detail('nameMissing', messages.nameMissing);
  }
  if (textLength(trimmed) > NAME_MAX_LENGTH) {
    return detail('nameTooLong', messages.nameTooLong);
  }
  const folded = foldName(trimmed);
  const [main] = branches;
  const other = takenNames(main, branch).find(
    (entry) => entry.ownerId !== item.id && foldName(entry.name) === folded
  );
  if (other) {
    return detail('nameTaken', messages.nameTaken(other.noun, branch.name.trim(), other.name));
  }
  const reserved = reservedNameProblemOf(trimmed, item, language);
  if (reserved || branch.origin !== 'main') {
    return reserved;
  }
  const clash = renameClash(branches, item.id, trimmed);
  return (
    clash &&
    detail(
      'nameTaken',
      messages.nameTaken(clash.taken.noun, clash.branch.name.trim(), clash.taken.name)
    )
  );
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
  branches: BranchInput[],
  language: Language = DEFAULT_LANGUAGE
): string | null {
  return nameProblemOf(name, item, branch, branches, language)?.message ?? null;
}

/** `variantNameProblem` with the problem's code. */
export function variantNameProblemOf(
  name: string,
  otherNames: string[],
  language: Language = DEFAULT_LANGUAGE
): RuleProblemDetail | null {
  const messages = RULES_MESSAGES[language];
  const trimmed = name.trim();
  if (!trimmed) {
    return detail('variantNameMissing', messages.variantNameMissing);
  }
  if (textLength(trimmed) > NAME_MAX_LENGTH) {
    return detail('branchNameTooLong', messages.branchNameTooLong);
  }
  const other = otherNames.find((entry) => foldName(entry) === foldName(trimmed));
  return other === undefined
    ? null
    : detail('variantNameTaken', messages.variantNameTaken(other.trim()));
}

/**
 * Why a variant can't take a name in the Add variant and Edit variant dialogs (W3;
 * design-notes.md §4): missing, too long, or another variant's, ignoring letter case and outer
 * spaces (FR-020). `otherNames` are the other variants' names. Null when it can.
 */
export function variantNameProblem(
  name: string,
  otherNames: string[],
  language: Language = DEFAULT_LANGUAGE
): string | null {
  return variantNameProblemOf(name, otherNames, language)?.message ?? null;
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
 * The first problem of a rule's target, condition or message, with its code, or null (FR-006;
 * R10): `'chooseData'`, `'notRequested'`, `'unknownPart'`, an incomplete condition's
 * `ConditionProblem`, `'noMessage'` or `'messageTooLong'`. The message is the server's, in the
 * context's language. `context.documents` are the requested documents with their requested
 * fields.
 */
export function ruleProblemOf(
  rule: RuleItem,
  branchName: string,
  context: RuleContext
): RuleProblemDetail | null {
  const language = context.language ?? DEFAULT_LANGUAGE;
  const messages = RULES_MESSAGES[language];
  const name = rule.name.trim();
  const branch = branchName.trim();
  const chooseData = () => detail('chooseData', messages.chooseData(name, branch));
  const notRequested = () => detail('notRequested', messages.notRequested(name, branch));
  const { target } = rule;
  if (!target) {
    return chooseData();
  }
  if (checksUnrequestedData(rule, context.documents)) {
    return notRequested();
  }
  const field = context.documents
    .find((document) => document.key === target.document_type)
    ?.fields.find((entry) => entry.key === target.field);
  if (!field) {
    return notRequested();
  }
  const partKey = target.part ?? null;
  const licenceClass = target.licence_class ?? null;
  const unknownPart = detail('unknownPart', messages.unknownPart(name, branch, field.label));
  let kind = field.kind;
  let optionSet = field.option_set;
  if (field.kind === 'parts') {
    if (partKey === null) {
      return chooseData();
    }
    const part = field.parts?.find((entry) => entry.key === partKey);
    if (!part) {
      return unknownPart;
    }
    if (part.per_licence_class) {
      if (licenceClass === null) {
        return chooseData();
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
    return notRequested();
  }
  const options = kind === 'enum' ? optionsOf(context.optionSets, optionSet) : null;
  const problem = conditionProblem(rule.condition, kind, options);
  if (problem) {
    const conditionMessages = CONDITION_PROBLEM_MESSAGES[language];
    const text =
      problem === 'amount_at_least_1'
        ? conditionMessages.amount_at_least_1(
            rule.condition?.unit === 'months' ? 'months' : 'years'
          )
        : conditionMessages[problem];
    // "{rule} in {branch}: " is the same in both languages, as the server's
    return detail(problem, `${name} in ${branch}: ${text}`);
  }
  const message = (rule.message ?? '').trim();
  if (!message) {
    return detail('noMessage', messages.noMessage(name, branch));
  }
  if (textLength(message) > MESSAGE_MAX_LENGTH) {
    return detail('messageTooLong', messages.messageTooLong(name, branch));
  }
  return null;
}

/**
 * The first problem of a rule's target, condition or message, in the server's words and the
 * context's language, or null (FR-006). `context.documents` are the requested documents with
 * their requested fields.
 */
export function ruleProblem(
  rule: RuleItem,
  branchName: string,
  context: RuleContext
): string | null {
  return ruleProblemOf(rule, branchName, context)?.message ?? null;
}

/** `groupProblem` with the problem's code: `'rulesOnly'`, `'tooFewMembers'`, `'messageTooLong'`. */
export function groupProblemOf(
  group: GroupItem,
  noun: ItemNoun,
  branchName: string,
  based = false,
  language: Language = DEFAULT_LANGUAGE
): RuleProblemDetail | null {
  const messages = RULES_MESSAGES[language];
  const name = group.name.trim();
  const branch = branchName.trim();
  if (noun === 'sub-group' && group.items.some((member) => member.type === 'group')) {
    return detail('rulesOnly', messages.rulesOnly(name, branch));
  }
  const counted = !based || group.mark === 'added';
  if (counted && effectiveItems(group.items, based).length < 2) {
    return detail('tooFewMembers', messages.tooFewMembers(name, branch));
  }
  if (textLength((group.message ?? '').trim()) > MESSAGE_MAX_LENGTH) {
    return detail('messageTooLong', messages.messageTooLong(name, branch));
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
  based = false,
  language: Language = DEFAULT_LANGUAGE
): string | null {
  return groupProblemOf(group, noun, branchName, based, language)?.message ?? null;
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
): RuleProblemDetail | null {
  const based = branch.origin === 'based';
  if (item.type === 'group') {
    const language = context.language ?? DEFAULT_LANGUAGE;
    return groupProblemOf(item, noun, branch.name, based, language);
  }
  return checkedInBranch(branch, item) ? ruleProblemOf(item, branch.name, context) : null;
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
  earlierNames: Set<string>,
  language: Language
): RulesProblem | null {
  const messages = RULES_MESSAGES[language];
  const name = branch.name.trim();
  const problem = (code: RulesProblemCode, message: string): RulesProblem => ({
    code,
    message,
    branchIndex,
    itemId: null,
  });
  if (!name) {
    return problem('branchNameMissing', messages.branchNameMissing);
  }
  if (textLength(name) > NAME_MAX_LENGTH) {
    return problem('branchNameTooLong', messages.branchNameTooLong);
  }
  if (earlierNames.has(foldName(name))) {
    return problem('branchNameTwice', messages.branchNameTwice(name));
  }
  if (textLength((branch.description ?? '').trim()) > DESCRIPTION_MAX_LENGTH) {
    return problem('descriptionTooLong', messages.descriptionTooLong(name));
  }
  if (flattenItems(branch.items).length > MAX_ITEMS_PER_BRANCH) {
    return problem('tooManyItems', messages.tooManyItems(name));
  }
  if (!identifiersAreValid(branch.items)) {
    return problem('invalidIdentifier', messages.invalidIdentifier);
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
  taken: Map<string, TakenName>,
  language: Language
): RuleProblemDetail | null {
  const messages = RULES_MESSAGES[language];
  const name = item.name.trim();
  if (!name) {
    return detail('itemNameMissing', messages.itemNameMissing(noun, branch));
  }
  if (textLength(name) > NAME_MAX_LENGTH) {
    return detail('itemNameTooLong', messages.itemNameTooLong(noun, branch));
  }
  const other = taken.get(foldName(name));
  if (other && other.ownerId !== item.id) {
    return detail('nameTaken', messages.nameTaken(other.noun, branch, other.name));
  }
  return reservedNameProblemOf(name, item, language);
}

/**
 * The problems that refuse publishing or saving, in the server's order (FR-006, FR-010; spec
 * 011, R10): the number of branches and the main branch, which end the walk when either fails;
 * then branch by branch its own first problem (name, description, size, identifiers), followed
 * by its items in display order, each item's first problem (its name before its content, a
 * group before its members). An item's name counts as taken for the items after it whether or
 * not the item had a problem; a name already taken stays its first owner's. Lazy, so that
 * `firstProblem` stops at the first.
 */
function* problemsOf(branches: BranchInput[], context: RuleContext): Generator<RulesProblem, void> {
  const language = context.language ?? DEFAULT_LANGUAGE;
  const messages = RULES_MESSAGES[language];
  const tooMany = branches.length > MAX_BRANCHES;
  if (tooMany) {
    yield {
      code: 'tooManyBranches',
      message: messages.tooManyBranches,
      branchIndex: null,
      itemId: null,
    };
  }
  const mainBranches = branches.filter((branch) => branch.origin === 'main');
  const noMain = mainBranches.length !== 1 || branches[0].origin !== 'main';
  if (noMain) {
    yield { code: 'mainBranch', message: messages.mainBranch, branchIndex: null, itemId: null };
  }
  if (tooMany || noMain) {
    // Nothing below can be judged
    return;
  }
  const branchNames = new Set<string>();
  for (const [branchIndex, branch] of branches.entries()) {
    const problem = branchProblem(branch, branchIndex, branchNames, language);
    if (problem) {
      yield problem;
    }
    branchNames.add(foldName(branch.name));
    const branchName = branch.name.trim();
    // The server starts a branch's names from those an undo gives back
    const taken = new Map(
      namesGivenBackByUndo(branches[0], branch).map((entry) => [foldName(entry.name), entry])
    );
    for (const entry of itemsWithNouns(branch.items)) {
      const found =
        itemNameProblem(entry, branchName, taken, language) ??
        contentProblem(entry, branch, context);
      if (found) {
        yield { ...found, branchIndex, itemId: entry.item.id };
      }
      const name = entry.item.name.trim();
      const folded = foldName(name);
      const owner = taken.get(folded);
      if (!owner || owner.ownerId === entry.item.id) {
        taken.set(folded, { name, noun: entry.noun, ownerId: entry.item.id });
      }
    }
  }
}

/**
 * The first problem that refuses publishing or saving, or null (FR-006). The checks run in the
 * server's order: the number of branches and the main branch; then branch by branch its name,
 * description, size and identifiers, followed by its items in display order, each group before
 * its members. A rule's name comes before its target, condition and message; a group's name
 * before what it holds, its number of members and its message. In a based branch, the names an
 * undo gives back are taken, and what it inherits unchanged is checked once, in the main branch.
 * A problem that names a branch and an item comes with both, so that the UI can open the branch
 * and move the focus to the item. Every problem comes with its code (R10), its message in the
 * context's language.
 *
 * `context.documents` are the requested documents with only their requested fields
 * (`requestedRuleDocuments`).
 */
export function firstProblem(branches: BranchInput[], context: RuleContext): RulesProblem | null {
  const first = problemsOf(branches, context).next();
  return first.done ? null : first.value;
}

/**
 * Every problem that refuses publishing or saving, for a draft's gaps (FR-010, FR-018; spec
 * 011, R10): the checks of `firstProblem`, in its order, collected instead of stopping, so that
 * the first is `firstProblem`'s. A wrong number of branches or a missing main branch ends the
 * list, as nothing below them can be judged; both are listed when both fail. Then branch by
 * branch, in their order: at most one problem of the branch's own (name, description, size,
 * identifiers), followed by at most one problem per item in display order (its name before its
 * content, a group before its members), each with the branch's index and the item's id. An
 * item's name counts as taken for the items after it whether or not it had a problem. Every
 * problem has its code and the server's message in the context's language. `[]` when publishing
 * would accept the rules.
 *
 * `context.documents` are the requested documents with only their requested fields
 * (`requestedRuleDocuments`).
 */
export function publishProblems(branches: BranchInput[], context: RuleContext): RulesProblem[] {
  return [...problemsOf(branches, context)];
}
