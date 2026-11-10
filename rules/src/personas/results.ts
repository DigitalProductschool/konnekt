// The test results (specs/004-rule-test-personas, research R5; data-model.md "Test result";
// contracts/personas.md `testResultsOf()`, `resultViewOf()`; FR-014, FR-015, FR-018):
// `testResultsOf()` evaluates every ready persona against every branch with the evaluator that
// ports evaluation.py, and `resultViewOf()` turns one result into what the test step shows: the
// rows, the headings and the failing values. Every function is pure.
//
// Bundle (research R9, R16): this module reaches `evaluation.ts`, `checks/literals.ts` and, through
// `fields.ts`, `checks/checkedTree.ts` and the case-folding table. The main bundle never imports it
// statically: the hook loads it with one dynamic `import()`, which is why it re-exports
// `personaFieldsOf()` and `checkedBranchesOf()`
import type {
  BranchInput,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';

import { dayNumber } from '../checks/calendar';
import type { KeyedBranch } from '../checks/checkedTree';
import { variableKey } from '../checks/literals';
import { evaluateBranch, type EvaluatedItem } from '../evaluation';
import { DEFAULT_LANGUAGE } from '../language';
import { statementOf, statementPartsOf } from '../statements';
import type { RuleContext, StatementParts } from '../types';
import { applicantOf } from './applicant';
import { GROUP_SUBTITLES } from './constants';
import { meetsHeadingOf, messageColumnOf, resultHeadingOf } from './messages';
import type {
  Persona,
  PersonaBranchResult,
  PersonaField,
  ResultRow,
  ResultView,
  TestResults,
} from './types';

export { checkedBranchesOf, type CheckedBranchWithRules, personaFieldsOf } from './fields';

/** The part of `driving_privileges` that lists the classes held, which a class's dates need */
const CLASSES_PART = 'classes';

/**
 * Every ready persona (`status` `'ready'`) against every branch, including the branches without
 * rules, by persona id, then branch key (FR-014). Each result is exactly
 * `evaluateBranch(branch, applicantOf(persona, fields), today, context)`: `met`, the items that
 * count with their outcomes, and the messages. `today` is `YYYY-MM-DD`, the date in Germany.
 *
 * Total: a branch the evaluator refuses (it throws where evaluation.py raises ValueError, on a rule
 * that doesn't pass `firstProblem()`, which the rules step can hold while it is edited) has no
 * result for that persona, instead of throwing out of the hook's `useMemo`. The test step is only
 * reached through `firstProblem()`, so there every branch has its result. Throws a `RangeError`
 * only for a `today` that isn't a date.
 *
 * Linear in personas × branches × items (SC-003): one citizen per persona, one evaluation each
 */
export function testResultsOf(
  personas: readonly Persona[],
  fields: readonly PersonaField[],
  branches: readonly KeyedBranch[],
  context: RuleContext,
  today: string
): TestResults {
  const sharedOn = dayNumber(today);
  const results: TestResults = {};
  for (const persona of personas) {
    if (persona.status !== 'ready') {
      continue;
    }
    const applicant = applicantOf(persona, fields);
    const byBranch: Partial<Record<string, PersonaBranchResult>> = {};
    for (const branch of branches) {
      try {
        const { met, items, messages } = evaluateBranch(branch, applicant, sharedOn, context);
        byBranch[branch.key] = { met, items, messages };
      } catch {
        // Left out: see the function's comment
      }
    }
    results[persona.id] = byBranch;
  }
  return results;
}

/**
 * What the test step shows of one persona's result for one variant (FR-015; data-model.md
 * "ResultView"):
 * - `rows`, in this order: first the reported items, in the order of the evaluation's messages,
 *   each with its message and, for a group, its members that aren't met, recursively (F8, W10);
 *   then every other top-level item that counts, in display order, with its outcome and no
 *   message (F14). A group is never `'not_checked'`.
 * - `heading`: "Result: doesn’t meet 2 rules" with the rules not met (`resultHeadingOf()`; spec
 *   008 FR-024), counted as the rows list them (V4, `unmetRulesOf()`); `listHeading` under a
 *   variant the persona meets, `messageColumn` under one it doesn't (F3).
 * - `failingFields` (K1): the keys of the fields in `fields` read by the rules the rows show as
 *   failing, in the order of `fields`. A rule fails as shown when it isn't met and no group around
 *   it is met: a rule inside a met group marks nothing. A rule on a licence class's date that the
 *   persona doesn't hold marks "Licence classes", whose value makes it fail, as the date is hidden.
 *
 * Names, statements and group operators are the branch's current ones, looked up by id in
 * `branch`, so a rename shows without evaluating anew. Statements are worded as the rules step
 * words them: a rule's by `statementOf()` with `context` (`statementPartsOf()` for `RuleSentence`),
 * a group's by its header's subtitle (design-notes.md §6.2).
 *
 * The texts are composed in `context.language` (spec 009, R4; English by default): the headings,
 * the statements and the group subtitles. The rows, outcomes and failing fields are the same in
 * both languages; names and messages are shown as stored
 */
export function resultViewOf(
  result: PersonaBranchResult,
  branch: Pick<BranchInput, 'items'>,
  persona: Pick<Persona, 'name' | 'values'>,
  context: RuleContext,
  fields: readonly PersonaField[]
): ResultView {
  const language = context.language ?? DEFAULT_LANGUAGE;
  const current = currentItemsOf(branch.items);
  const evaluated = evaluatedById(result.items);
  const row = (entry: EvaluatedItem, message: string | null, members: ResultRow[]): ResultRow =>
    rowOf(entry, current.get(entry.item.id) ?? entry.item, context, message, members);
  const memberRows = (entry: EvaluatedItem): ResultRow[] =>
    entry.members
      .filter((member) => member.outcome !== 'met')
      .map((member) => row(member, null, memberRows(member)));

  const reported = new Set<string>();
  const rows: ResultRow[] = [];
  for (const { id, message } of result.messages) {
    const entry = evaluated.get(id);
    if (entry === undefined) {
      continue;
    }
    reported.add(id);
    rows.push(row(entry, message, memberRows(entry)));
  }
  for (const entry of result.items) {
    if (!reported.has(entry.item.id)) {
      rows.push(row(entry, null, []));
    }
  }

  return {
    meets: result.met,
    heading: resultHeadingOf(result.met ? 0 : unmetRulesOf(rows), language),
    listHeading: result.met ? meetsHeadingOf(persona, language) : null,
    messageColumn: result.met ? null : messageColumnOf(persona, language),
    rows,
    failingFields: failingFieldsOf(result.items, persona, fields),
  };
}

/**
 * The rules the persona doesn't meet, for the heading (V4; spec 008 FR-024): every reported rule,
 * and inside every reported group the rules the rows list under it, the members that aren't met,
 * recursively through the sub-groups that aren't met. A group itself never counts, and a rule
 * inside a met group doesn't either, as its group isn't listed. U65 (7057:58811) and U66 (#19,
 * #25) draw no group, so this is the literal reading of "doesn’t meet <n> rules"
 */
function unmetRulesOf(rows: readonly ResultRow[]): number {
  const ids = new Set<string>();
  const walk = (level: readonly ResultRow[]): void => {
    for (const row of level) {
      if (row.type === 'rule') {
        ids.add(row.itemId);
      } else {
        walk(row.members);
      }
    }
  };
  walk(rows.filter((row) => row.reported));
  return ids.size;
}

/** The branch's items at every level, by id */
function currentItemsOf(items: readonly RuleTreeItem[]): Map<string, RuleTreeItem> {
  const byId = new Map<string, RuleTreeItem>();
  const walk = (level: readonly RuleTreeItem[]): void => {
    for (const item of level) {
      byId.set(item.id, item);
      if (item.type === 'group') {
        walk(item.items);
      }
    }
  };
  walk(items);
  return byId;
}

/** The evaluated items at every level, by id */
function evaluatedById(items: readonly EvaluatedItem[]): Map<string, EvaluatedItem> {
  const byId = new Map<string, EvaluatedItem>();
  const walk = (level: readonly EvaluatedItem[]): void => {
    for (const entry of level) {
      byId.set(entry.item.id, entry);
      walk(entry.members);
    }
  };
  walk(items);
  return byId;
}

/**
 * One row: the item's outcome, with its current name and statement. `message` is the evaluation's
 * for a reported item, null otherwise; `members` are a reported group's members that aren't met
 */
function rowOf(
  entry: EvaluatedItem,
  item: RuleTreeItem,
  context: RuleContext,
  message: string | null,
  members: ResultRow[]
): ResultRow {
  const { statement, parts } =
    item.type === 'rule'
      ? ruleStatementOf(item, context)
      : {
          statement: GROUP_SUBTITLES[context.language ?? DEFAULT_LANGUAGE][item.operator],
          parts: null,
        };
  return {
    itemId: entry.item.id,
    type: entry.item.type,
    name: item.name,
    statement,
    parts,
    // A group's outcome is met or not met; a rule's may be not checked
    status: entry.outcome,
    message,
    reported: message !== null,
    members,
  };
}

/**
 * A rule's statement as `RuleRow` words it on the rules step: `statementOf()`'s text, or the
 * document and the data while the condition can't be read; and its parts for `RuleSentence`
 */
function ruleStatementOf(
  rule: RuleItem,
  context: RuleContext
): { statement: string; parts: StatementParts | null } {
  const parts = statementPartsOf(rule, context);
  const statement =
    statementOf(rule, context)?.text ?? (parts ? `${parts.document} · ${parts.data}` : '');
  return { statement, parts };
}

/**
 * The keys of `fields` read by the rules that fail as shown, in the order of `fields`: the rules
 * that aren't met, walking down only into groups that aren't met
 */
function failingFieldsOf(
  items: readonly EvaluatedItem[],
  persona: Pick<Persona, 'values'>,
  fields: readonly PersonaField[]
): string[] {
  const keys = new Set<string>();
  const walk = (level: readonly EvaluatedItem[]): void => {
    for (const { item, outcome, members } of level) {
      if (outcome === 'met') {
        continue;
      }
      if (item.type === 'group') {
        walk(members);
      } else if (item.target) {
        keys.add(readKeyOf(item.target, persona));
      }
    }
  };
  walk(items);
  return fields.filter((field) => keys.has(field.key)).map((field) => field.key);
}

/**
 * The key of the value that makes a failing rule fail: its target's, or for a licence class's date
 * whose class the persona doesn't hold, the classes held
 */
function readKeyOf(target: RuleTarget, persona: Pick<Persona, 'values'>): string {
  const key = variableKey(target);
  if (!target.licence_class) {
    return key;
  }
  const classesKey = variableKey({ ...target, part: CLASSES_PART, licence_class: null });
  const classes = persona.values[classesKey];
  const held =
    Array.isArray(classes) && classes.some((code) => String(code) === target.licence_class);
  return held ? key : classesKey;
}
