// The checks and tests (contracts/mcp-tools.md "Checks and tests"; FR-032 to FR-035; research
// R14, R15): `check_rules` answers the rules step's findings of one variant or of all, from the
// same checked trees and the same checks, run off the event loop by `runChecks()`;
// `test_applicants` evaluates fictitious citizens with the evaluator that ports the backend's,
// on a day of sharing. Neither stores or logs an argument, a citizen, a finding or a result
// (FR-035): the registry's request line carries the tool's name only
import type {
  BranchInput,
  FormConnectionOrDraft,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import { dayNumber } from '@konnekt/rules/checks/calendar';
import { buildCheckedBranch } from '@konnekt/rules/checks/checkedTree';
import { variableKey } from '@konnekt/rules/checks/literals';
import { RULES_MESSAGES } from '@konnekt/rules/constants';
import { isValidIsoDate, todayInGermany } from '@konnekt/rules/dates';
import {
  type Applicant,
  type BranchEvaluation,
  evaluateBranch,
  type EvaluatedItem,
  type Outcome,
} from '@konnekt/rules/evaluation';
import { DEFAULT_LANGUAGE } from '@konnekt/rules/language';
import { effectiveItems } from '@konnekt/rules/tree';
import type { RuleContext } from '@konnekt/rules/types';
import { ruleProblemOf } from '@konnekt/rules/validation';
import { z } from 'zod';

import { checkApplicant, type TestApplicant, toApplicant } from '../applicants';
import type { BackendClient } from '../backend';
import { runChecks } from '../checks';
import { type VariantCheck, variantCheckOf } from '../findings';
import { resolveConnectionId, resolveVariant } from '../resolve';
import {
  type ApplicantField,
  applicantFieldsOf,
  connectionLineOf,
  connectionRefOf,
  type ItemRef,
  itemRefOf,
  ruleContextOf,
  summaryTextOf,
  type ToolRuleContext,
  variantIdOf,
  variantLineOf,
  variantRefOf,
} from '../views';
import { registerTool, toolError, toolResult } from './registry';

const CONNECTION = z
  .string()
  .min(1)
  .describe('The connection, draft or published: its id, or any Konnekt link that names it');
const VARIANT = z
  .string()
  .min(1)
  .describe(
    'The variant: its id, its link, or its name ("Standard" for the main variant unless renamed)'
  );

/** The most citizens one call tests */
const MAX_APPLICANTS = 10;

export const CHECK_TOOL_MESSAGES = {
  /** A `day` that isn't a calendar date as `YYYY-MM-DD` */
  badDay: "'day' expects a date as YYYY-MM-DD.",
  /** A rule's outcome is not checked: the citizen has no value for its data */
  noValue: (key: string) => `The citizen has no value for '${key}'.`,
  /** A rule's outcome is not checked although the citizen has a value for its data */
  unreadableValue: (key: string) => `The value of '${key}' can't be read for this condition.`,
  /** A variant whose rules the evaluation can't take as they are: `problem` is the first one */
  untestable: (problem: string) =>
    `${problem} The variant can be tested once its rules are complete.`,
  /** The evaluation refused the variant without a problem the rules step names */
  untestableVariant: (variant: string) =>
    `The rules of ${variant} can't be tested as they are. Complete them, then test again.`,
} as const;

/** The connection or draft a reference names, as the management API answers it */
async function connectionOf(
  backend: BackendClient,
  reference: string
): Promise<FormConnectionOrDraft> {
  return backend.get<FormConnectionOrDraft>(
    `/api/form-connections/${resolveConnectionId(reference)}`
  );
}

/** The rules modules' context of a connection: its documents, the catalog, the value sets */
async function ruleContextFor(
  backend: BackendClient,
  fc: FormConnectionOrDraft
): Promise<ToolRuleContext> {
  const [documentTypes, optionSets] = await Promise.all([
    backend.documentTypes(),
    backend.optionSets(),
  ]);
  return ruleContextOf(fc.documents, documentTypes, optionSets);
}

// check_rules

/** A variant's check as lines of the text block */
function variantCheckLinesOf(check: VariantCheck): string[] {
  const { notice, findings, not_covered: notCovered } = check;
  const completeness = check.checked_completely
    ? `checked completely, ${check.rules_checked} rules checked`
    : `not checked completely in time, ${check.rules_checked} rules checked`;
  return [
    `${variantLineOf(check.variant)} (${completeness})`,
    ...(notice
      ? [
          `- Notice${notice.at_the_moment ? ' (at the moment)' : ''}: ${notice.text} ` +
            notice.resolution,
        ]
      : []),
    ...findings.map((finding) => {
      const moment = finding.at_the_moment ? ', at the moment' : '';
      return (
        `- ${finding.item.name} (${finding.item.id}), ${finding.kind}${moment}: ${finding.why} ` +
        `${finding.resolution} ${finding.item.link}`
      );
    }),
    ...(findings.length === 0 && notice === null ? ['- No findings.'] : []),
    ...notCovered.map(
      (entry) => `- Not covered (${entry.reason}): ${entry.text} ${entry.item.link}`
    ),
  ];
}

registerTool({
  name: 'check_rules',
  level: 'read',
  description:
    "Checks a connection's rules for mistakes, as the Rules step of Konnekt does, " +
    'for one variant or for all: rules that conflict, rules another rule already covers, rules ' +
    'every citizen meets, and a variant nobody or everybody meets. Each finding names the rule ' +
    'or group, why it holds, the other rules involved and what would resolve it; the answer also ' +
    'lists the rules the checks leave out with why, and says whether each variant was checked ' +
    'completely. Judges on today in Germany. Stores nothing.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT.optional().describe(
      'One variant: its id, its link or its name; every variant without'
    ),
  }),
  handler: async (_caller, input, { backend }) => {
    const fc = await connectionOf(backend, input.connection);
    const branches: BranchInput[] =
      input.variant === undefined
        ? fc.branches
        : [resolveVariant<BranchInput>(fc.branches, input.variant, fc.id)];
    const context = await ruleContextFor(backend, fc);
    const day = todayInGermany();
    const checked = branches.map((branch) =>
      buildCheckedBranch(
        {
          key: variantIdOf(branch),
          origin: branch.origin,
          operator: branch.operator,
          items: branch.items,
        },
        context,
        day
      )
    );
    const results = await runChecks(checked);
    const variants = branches.map((branch, index) =>
      variantCheckOf(results[index], branch, context, fc)
    );
    const connection = connectionRefOf(fc);
    return toolResult(
      { connection, day, variants },
      summaryTextOf(
        connectionLineOf(connection),
        `Checked on ${day}, today in Germany.`,
        ...variants.flatMap(variantCheckLinesOf)
      )
    );
  },
});

// test_applicants

/** One item's outcome as `test_applicants` answers it */
interface ItemOutcome {
  item: ItemRef;
  outcome: Outcome;
  /** Why a rule wasn't checked */
  reason?: string;
  /** The id of the group the item sits in; null at the top level */
  in_group: string | null;
}

/** One citizen's result (contracts/mcp-tools.md "Checks and tests") */
interface ApplicantResult {
  applicant: string;
  met: boolean;
  items: ItemOutcome[];
  messages: { item: ItemRef; message: string }[];
}

/** Whether the citizen gave a value for a key: not left out, `null`, `''` or `[]` */
function hasValue(values: Readonly<Record<string, unknown>>, key: string): boolean {
  const value = Object.hasOwn(values, key) ? values[key] : undefined;
  return !(
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

/**
 * The first problem that keeps the evaluation from taking the variant's rules, in the rules
 * step's words, or null. The evaluation reads the items that count (`effectiveItems()`): every
 * rule needs data the connection requests and a complete condition (`ruleProblemOf()`; a missing
 * or long message, by its code, doesn't change who meets it), and a group of the variant's own
 * needs two members that count. The texts are English: no language is passed (FR-017)
 */
function untestableProblemOf(
  branch: Pick<BranchInput, 'name' | 'origin' | 'items'>,
  context: RuleContext
): string | null {
  const based = branch.origin === 'based';
  const name = branch.name.trim();
  const walk = (items: RuleTreeItem[]): string | null => {
    for (const item of effectiveItems(items, based)) {
      if (item.type === 'rule') {
        const problem = ruleProblemOf(item, branch.name, context);
        if (problem !== null && problem.code !== 'noMessage' && problem.code !== 'messageTooLong') {
          return problem.message;
        }
        continue;
      }
      const counted = !based || item.mark === 'added';
      if (counted && effectiveItems(item.items, based).length < 2) {
        return RULES_MESSAGES[DEFAULT_LANGUAGE].tooFewMembers(item.name.trim(), name);
      }
      const problem = walk(item.items);
      if (problem !== null) {
        return problem;
      }
    }
    return null;
  };
  return walk(branch.items);
}

/** The evaluated items in the evaluation's order: depth first, each group before its members */
function inEvaluationOrder(items: readonly EvaluatedItem[]): EvaluatedItem[] {
  return items.flatMap((entry) => [entry, ...inEvaluationOrder(entry.members)]);
}

/** One citizen's evaluation as `test_applicants` answers it */
function applicantResultOf(
  label: string,
  values: Readonly<Record<string, unknown>>,
  evaluation: BranchEvaluation,
  branch: Pick<BranchInput, 'id'>,
  connectionId: string
): ApplicantResult {
  const evaluated = inEvaluationOrder(evaluation.items);
  const byId = new Map(evaluated.map((entry) => [entry.item.id, entry.item]));
  const items = evaluated.map(({ item, outcome, group }): ItemOutcome => {
    const ref = itemRefOf(item, branch, connectionId);
    if (outcome !== 'not_checked' || item.type !== 'rule' || !item.target) {
      return { item: ref, outcome, in_group: group };
    }
    const key = variableKey(item.target);
    const reason = hasValue(values, key)
      ? CHECK_TOOL_MESSAGES.unreadableValue(key)
      : CHECK_TOOL_MESSAGES.noValue(key);
    return { item: ref, outcome, reason, in_group: group };
  });
  const messages = evaluation.messages.flatMap(({ id, message }) => {
    const item = byId.get(id);
    return item ? [{ item: itemRefOf(item, branch, connectionId), message }] : [];
  });
  return { applicant: label, met: evaluation.met, items, messages };
}

/** A citizen's result as lines of the text block */
function applicantLinesOf(result: ApplicantResult): string[] {
  const outcomes = result.items.map(
    (entry) =>
      `  - ${entry.item.name} (${entry.item.id}): ${entry.outcome.replace('_', ' ')}` +
      (entry.reason ? `. ${entry.reason}` : '')
  );
  const messages = result.messages.map(
    (entry) => `  - Message of ${entry.item.name}: ${entry.message}`
  );
  return [
    `${result.applicant}: ${result.met ? 'meets the variant' : "doesn't meet the variant"}.`,
    ...outcomes,
    ...messages,
  ];
}

const applicantInput = z.object({
  name: z.string().optional().describe('A made-up name, such as "Citizen A"; never a real one'),
  values: z
    .record(z.string(), z.unknown())
    .describe(
      "Values by the keys of get_variant's applicant_fields (pid.birthdate, " +
        'mdl.driving_privileges.issue_date#B); a key left out is missing data'
    ),
});

registerTool({
  name: 'test_applicants',
  level: 'read',
  description:
    "Tests one variant's rules with 1 to 10 fictitious citizens, as the Test step of " +
    'Konnekt does: each citizen gives values for the citizen fields that ' +
    'get_variant lists. Answers per citizen whether they meet the variant, each rule and ' +
    "group's outcome (met, not met, or not checked with why) and the messages the citizen would " +
    'read, exactly as the evaluation decides on the day of sharing: today in Germany, or the day ' +
    'given. A value that does not fit its field refuses the whole test. Never use real data; ' +
    'nothing is stored.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    applicants: z.array(applicantInput).min(1).max(MAX_APPLICANTS),
    day: z
      .string()
      .optional()
      .describe('The day of sharing as YYYY-MM-DD; today in Germany without'),
  }),
  handler: async (_caller, input, { backend }) => {
    if (input.day !== undefined && !isValidIsoDate(input.day)) {
      return toolError('validation', CHECK_TOOL_MESSAGES.badDay);
    }
    const day = input.day ?? todayInGermany();
    const fc = await connectionOf(backend, input.connection);
    const branch = resolveVariant<BranchInput>(fc.branches, input.variant, fc.id);
    const context = await ruleContextFor(backend, fc);
    const problem = untestableProblemOf(branch, context);
    if (problem !== null) {
      return toolError('validation', CHECK_TOOL_MESSAGES.untestable(problem));
    }
    const fields: ApplicantField[] = applicantFieldsOf(branch, context);
    const applicants: TestApplicant[] = input.applicants;
    // Every citizen is checked before any is evaluated: the first refusal fails the call
    for (const [index, applicant] of applicants.entries()) {
      const refusal = checkApplicant(fields, applicant, context.optionSets, index + 1);
      if (refusal !== null) {
        return toolError('validation', refusal);
      }
    }
    const sharedOn = dayNumber(day);
    let results: ApplicantResult[];
    try {
      results = applicants.map((applicant, index) => {
        const evaluated: Applicant = toApplicant(fields, applicant.values);
        const label =
          applicant.name !== undefined && applicant.name.trim() !== ''
            ? applicant.name
            : `Citizen ${index + 1}`;
        return applicantResultOf(
          label,
          applicant.values,
          evaluateBranch(branch, evaluated, sharedOn, context),
          branch,
          fc.id
        );
      });
    } catch {
      // The evaluator refuses what the save's checks would refuse; `untestableProblemOf()` names
      // what the rules step names, so this is the rest
      return toolError('validation', CHECK_TOOL_MESSAGES.untestableVariant(branch.name.trim()));
    }
    const connection = connectionRefOf(fc);
    const variant = variantRefOf(branch, fc.id);
    return toolResult(
      { connection, variant, day, results },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        `Day of sharing: ${day}.`,
        ...results.flatMap(applicantLinesOf)
      )
    );
  },
});
