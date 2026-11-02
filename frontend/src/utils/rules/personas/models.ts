// Models by random self-reduction (specs/004-rule-test-personas, research R7 "Models",
// "Plausibility literals"; data-model.md "Generation"; FR-010, EC "Unlikely values"): `modelOf()`
// turns a slot's formula C_p into literals per variable (`Model`), which `sampling.ts` then meets
// with values.
//
// The walk: an AND keeps every child; an OR keeps the first of its children, in random order, that
// keeps the conjunction 'sat' (spec 003's `satisfiable()`, today alone). The conjunction asked is
// the literals chosen so far, the formulas still to walk and the child. It starts 'sat' and stays
// 'sat', so the last child left after every other one came back 'unsat' needs no question. Since
// formulas are positive in their literals (a negation is the De Morgan dual, with each literal's
// `negated` flipped), any values that meet every chosen literal meet the formula.
//
// Plausibility (FR-010): the walk first tries with the plausibility literals of
// `plausibilityLiteralsOf()` on the date-of-birth fields, "Age in years" and "Year of birth", and
// without any of them if the formula and they together aren't 'sat': they describe one fact, so
// they give way together. When they stay, they are part of the model, so that every value that
// meets the model, a theory's witness included, is plausible.
//
// 'unknown' (spec 003's text corner, or the deadline) is never taken for 'sat': an OR none of whose
// children is 'sat' gives `null`, as does a formula that isn't 'sat'. `checks/solver.ts` doesn't
// change. Pure, as long as `now()` is
import { dayNumber, isoDate, yearsAgoThreshold } from '../checks/calendar';
import { allOf, isLiteral } from '../checks/literals';
import { satisfiable, type SolverOptions } from '../checks/solver';
import type { DateTest, Formula, Literal, NumberTest, Variable, Verdict } from '../checks/types';
import { FROM_DATE_OF_BIRTH, MAX_AGE, MIN_AGE } from './constants';
import type { Random } from './random';
import type { Model, PersonaField } from './types';

/** What `modelOf()` reads besides the formula */
export interface ModelOptions extends SolverOptions {
  /**
   * `YYYY-MM-DD`, the calendar date in Germany: the questions ask for today alone. `variables` are
   * the run's merged variables and `memo` the run's memo, shared with `goals.ts`' questions
   */
  today: string;
  /** Chooses the order in which an OR's children are tried */
  random: Random;
  /**
   * The plausibility literals, from `plausibilityLiteralsOf()`, each on a variable of
   * `variables`. Tried first, and left out together if the formula and they aren't 'sat'.
   * Without them, the formula alone
   */
  plausible?: readonly Literal[];
}

/**
 * The plausibility literals (FR-010; research R7) on the variables of `variables`, for `today`
 * (`YYYY-MM-DD`):
 * - each date field whose `PersonaField.dateOfBirth` is set ("Date of birth" of both documents):
 *   "at least 18 years ago" and "less than 81 years ago";
 * - "Age in years" (`mdl.age_in_years`, `FROM_DATE_OF_BIRTH`): greater than 17 and less than 81;
 * - "Year of birth" (`mdl.age_birth_year`): greater than and less than the years just outside
 *   those of the dates of birth above, today.
 *
 * A field that `variables` doesn't have, or has with another kind, gets none
 */
export function plausibilityLiteralsOf(
  fields: readonly PersonaField[],
  variables: Readonly<Record<string, Variable>>,
  today: string
): Literal[] {
  const day = dayNumber(today);
  const hasKind = (key: string, kind: Variable['kind']) => variables[key]?.kind === kind;
  const literals: Literal[] = [];
  for (const field of fields) {
    if (field.dateOfBirth && hasKind(field.key, 'date')) {
      literals.push(
        dateLiteral(field.key, {
          kind: 'date',
          op: 'at_least_years_ago',
          count: MIN_AGE,
          unit: 'years',
        }),
        dateLiteral(field.key, {
          kind: 'date',
          op: 'less_than_years_ago',
          count: MAX_AGE + 1,
          unit: 'years',
        })
      );
    }
  }
  // The dates of birth for ages 18 to 80 today: from the day after the threshold of 81 years ago
  // to the threshold of 18 years ago
  const firstYear = yearOf(yearsAgoThreshold(day, MAX_AGE + 1) + 1);
  const lastYear = yearOf(yearsAgoThreshold(day, MIN_AGE));
  for (const [key, derived] of Object.entries(FROM_DATE_OF_BIRTH)) {
    if (!hasKind(key, 'number')) {
      continue;
    }
    const [low, high] = derived === 'age' ? [MIN_AGE, MAX_AGE] : [firstYear, lastYear];
    literals.push(
      numberLiteral(key, { kind: 'number', op: 'gt', value: low - 1 }),
      numberLiteral(key, { kind: 'number', op: 'lt', value: high + 1 })
    );
  }
  return literals;
}

/**
 * Per variable key, the literals that a random choice of OR children keeping `formula` 'sat'
 * today picked, with the plausibility literals of `options.plausible` when the formula and they
 * are 'sat' together. Any values that meet every literal of the model meet `formula`. `null` when
 * `formula` isn't 'sat' today ('unsat', or 'unknown' from the text corner or the deadline), or an
 * OR's children can't be told 'sat'. A variable without literals has no key. Every literal names a
 * variable of `options.variables`; the solver throws for others
 */
export function modelOf(formula: Formula, options: ModelOptions): Model | null {
  const plausible = options.plausible ?? [];
  const day = dayNumber(options.today);
  const ask = (conjuncts: readonly Formula[]): Verdict =>
    satisfiable(allOf(conjuncts), { from: day, to: day }, options);

  let chosen: Literal[] = [];
  if (plausible.length > 0 && ask([formula, ...plausible]) === 'sat') {
    chosen = [...plausible];
  } else if (ask([formula]) !== 'sat') {
    return null;
  }

  // The formulas still to walk, the next one last. Invariant: the chosen literals and these are
  // 'sat' together
  const pending: Formula[] = [formula];
  for (let next = pending.pop(); next !== undefined; next = pending.pop()) {
    if (typeof next === 'boolean') {
      // `false` can't be among formulas that are 'sat' together; `true` asks for nothing
      continue;
    }
    if (isLiteral(next)) {
      chosen.push(next);
    } else if ('and' in next) {
      pending.push(...[...next.and].reverse());
    } else {
      const child = childOf(
        next.or,
        (candidate) => ask([...chosen, ...pending, candidate]),
        options
      );
      if (child === null) {
        return null;
      }
      pending.push(child);
    }
  }
  return modelFrom(chosen);
}

/**
 * The first of an OR's children, in random order, that `verdictOf` finds 'sat'. When every other
 * child came back 'unsat', the last one is taken without asking, since the OR is 'sat'. `null`
 * when none is found 'sat' and one came back 'unknown'
 */
function childOf(
  children: readonly Formula[],
  verdictOf: (child: Formula) => Verdict,
  options: ModelOptions
): Formula | null {
  const candidates = options.random.shuffle(children.filter((child) => child !== false));
  let unknown = false;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const last = index === candidates.length - 1;
    if (last && !unknown) {
      return candidate;
    }
    const verdict = verdictOf(candidate);
    if (verdict === 'sat') {
      return candidate;
    }
    unknown = unknown || verdict === 'unknown';
  }
  return null;
}

/** The literals by variable key, each once (by its test and `negated`), in the order chosen */
function modelFrom(literals: readonly Literal[]): Model {
  const model: Model = {};
  const seen = new Set<string>();
  for (const literal of literals) {
    const key = JSON.stringify([literal.variable, literal.test, literal.negated]);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    (model[literal.variable] ??= []).push(literal);
  }
  return model;
}

function dateLiteral(variable: string, test: DateTest): Literal {
  return { variable, test, negated: false };
}

function numberLiteral(variable: string, test: NumberTest): Literal {
  return { variable, test, negated: false };
}

/** The year of a day number */
function yearOf(day: number): number {
  return Number(isoDate(day).slice(0, 4));
}
