// A draft's gaps and a rule's "Not complete:" (research R10; data-model sections 2 and 3; FR-010,
// FR-018): everything publishing would refuse, in the create flow's words. First the connection's
// own (its name, its description, its documents), then every problem of `publishProblems()` in
// its order, in the server's words. No rule check's finding ever enters (FR-041). Pure: no
// browser API, nothing logged
import type {
  Condition,
  FormConnectionDraft,
  RequestedDocumentView,
} from '@konnekt/api-types/form-connections';
import { CONDITION_PROBLEM_MESSAGES } from '@konnekt/rules/constants';
import type { Language } from '@konnekt/rules/language';
import type {
  ConditionProblem,
  RuleContext,
  RulesProblem,
  RulesProblemCode,
} from '@konnekt/rules/types';
import { publishProblems, textLength } from '@konnekt/rules/validation';

import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  VALIDATION_MESSAGES,
} from '../../pages/FormConnectionEditor/constants';
import { DOCUMENTS_COPY } from '../../pages/FormConnectionEditor/DocumentsStep/constants';
import { PDF_TEXTS } from './constants';
import type { PdfGap } from './types';

/** What `gapsOf()` reads of a draft: its own fields and its rules */
export type GapsSource = Pick<
  FormConnectionDraft,
  'name' | 'description' | 'documents' | 'branches'
>;

/** The connection's own gaps: its name, its description, no documents, a document without data */
function connectionGapsOf(draft: GapsSource, language: Language): string[] {
  const validation = VALIDATION_MESSAGES[language];
  const gaps: string[] = [];
  const name = draft.name.trim();
  if (!name) {
    gaps.push(validation.nameRequired);
  } else if (textLength(name) > NAME_MAX_LENGTH) {
    gaps.push(validation.nameTooLong);
  }
  if (textLength(draft.description.trim()) > DESCRIPTION_MAX_LENGTH) {
    gaps.push(validation.descriptionTooLong);
  }
  if (!draft.documents.length) {
    gaps.push(PDF_TEXTS[language].addDocument);
  }
  for (const document of draft.documents) {
    if (!document.fields.length) {
      gaps.push(documentGapOf(document, language));
    }
  }
  return gaps;
}

/** "<document>: Choose at least one data item, or remove this document." */
function documentGapOf(document: RequestedDocumentView, language: Language): string {
  return `${document.label}: ${DOCUMENTS_COPY[language].needsDataLine}`;
}

/**
 * The problems of `publishProblems()`, except the items' problems of a variant without a name:
 * their messages would name an empty variant ("… in : …"), and the variant's own problem,
 * "Enter a name for every variant.", comes first; once it has a name, they are listed
 */
function rulesGapsOf(problems: RulesProblem[]): string[] {
  const nameless = new Set(
    problems
      .filter((problem) => problem.code === 'branchNameMissing')
      .map((problem) => problem.branchIndex)
  );
  return problems
    .filter((problem) => problem.itemId === null || !nameless.has(problem.branchIndex))
    .map((problem) => problem.message);
}

/**
 * What publishing a draft would refuse (FR-010), one gap per problem, in `language`: first the
 * connection's own in the create flow's words (no name, a name or description too long, no
 * documents, each document without data items), then every problem of `publishProblems()` in its
 * order, in the server's words, naming its rule and variant. `context` is validation's: the
 * requested documents with only their requested fields (`requestedRuleDocuments`) and the value
 * sets; its language is replaced by `language`. `[]` when publishing would accept the draft
 */
export function gapsOf(draft: GapsSource, context: RuleContext, language: Language): PdfGap[] {
  const problems = publishProblems(draft.branches, { ...context, language });
  return [...connectionGapsOf(draft, language), ...rulesGapsOf(problems)].map((text) => ({
    text,
  }));
}

// ---------------------------------------------------------------------------------------------
// A rule's "Not complete:"

/** Checks at compile time that every code listed is a problem's code */
type ProblemCodes<T extends RulesProblemCode> = T;

/** The codes of a rule's name (`publishProblems()` names the rule in the gap list) */
type RuleNameCode = ProblemCodes<
  'itemNameMissing' | 'itemNameTooLong' | 'nameTaken' | 'nameReserved'
>;

/** The codes of a rule's content (`ruleProblemOf()`) */
type RuleContentCode = ProblemCodes<
  'chooseData' | 'notRequested' | 'unknownPart' | ConditionProblem | 'noMessage' | 'messageTooLong'
>;

/** Every code a rule's problem can have */
export type RuleProblemCode = RuleNameCode | RuleContentCode;

/** The unit an "enter a number of years or months" names */
type TimeUnit = 'years' | 'months';

/** An instruction in a language, for a condition of `unit` */
type Instruction = (language: Language, unit: TimeUnit) => string;

/** The create flow's instruction to the condition's problem, with a capital letter */
function conditionInstruction(
  problem: Exclude<ConditionProblem, 'amount_at_least_1'>
): Instruction {
  return (language) => upperFirst(CONDITION_PROBLEM_MESSAGES[language][problem], language);
}

/**
 * The instruction for each code a rule's problem can have; null for a name's, which the gap list
 * names. A `Record`, so the compiler asks for every code
 */
const INSTRUCTIONS: Record<RuleProblemCode, Instruction | null> = {
  itemNameMissing: null,
  itemNameTooLong: null,
  nameTaken: null,
  nameReserved: null,
  chooseData: (language) => PDF_TEXTS[language].chooseData,
  notRequested: (language) => PDF_TEXTS[language].addDataAgain,
  // A part or licence class the data doesn't have: the data is chosen again
  unknownPart: (language) => PDF_TEXTS[language].chooseData,
  choose_check: conditionInstruction('choose_check'),
  enter_number: conditionInstruction('enter_number'),
  enter_text: conditionInstruction('enter_text'),
  choose_value: conditionInstruction('choose_value'),
  values_from_list: conditionInstruction('values_from_list'),
  value_once: conditionInstruction('value_once'),
  enter_date: conditionInstruction('enter_date'),
  years_at_least_1: conditionInstruction('years_at_least_1'),
  choose_unit: conditionInstruction('choose_unit'),
  amount_at_least_1: (language, unit) =>
    upperFirst(CONDITION_PROBLEM_MESSAGES[language].amount_at_least_1(unit), language),
  noMessage: (language) => PDF_TEXTS[language].writeMessage,
  messageTooLong: (language) => PDF_TEXTS[language].shortenMessage,
};

/** The text with its first letter in upper case */
function upperFirst(text: string, language: Language): string {
  return text.charAt(0).toLocaleUpperCase(language) + text.slice(1);
}

/** Whether a code is one a rule's problem can have */
function isRuleProblemCode(code: RulesProblemCode): code is RuleProblemCode {
  return Object.hasOwn(INSTRUCTIONS, code);
}

/**
 * The short instruction after a rule's "Not complete:" (FR-018): the code of the rule's problem
 * (`publishProblems()`'s for the rule) mapped to the create flow's instruction with a capital
 * letter, in `language`, such as "Choose a check." or "Write the message for citizens.". Null
 * for a problem of the rule's name, which the gap list names, and for a code no rule has.
 * `condition` is the rule's: "enter a number of months" names its unit (years when it has none,
 * as validation does)
 */
export function missingOf(
  problem: Pick<RulesProblem, 'code'>,
  language: Language,
  condition: Condition | null = null
): string | null {
  const { code } = problem;
  if (!isRuleProblemCode(code)) {
    return null;
  }
  const unit: TimeUnit = condition?.unit === 'months' ? 'months' : 'years';
  return INSTRUCTIONS[code]?.(language, unit) ?? null;
}
