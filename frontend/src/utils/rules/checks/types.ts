// Types of the rule checks (specs/003-rule-consistency-checks, data-model.md and
// contracts/rule-checks.md): the checked tree that the main thread builds, the formulas the solver
// reads, the findings it returns, and the messages between the hook and the worker. Every shape is
// plain data, so that it can be posted to the worker
import type { Combinator } from '../../../types/form-connections';
import type { ConditionKind } from '../types';

// The checked tree (data-model.md, "Checked branch")

/**
 * What the checks read of one branch (spec "Checked rules", research R2). Built by
 * `buildCheckedBranch()` on the main thread. It carries no names or messages
 */
export interface CheckedBranch {
  /** `RulesBranch.key` of the rules step, stable while the branch has no id */
  branchKey: string;
  /** The top level's combination */
  operator: Combinator;
  /** The top level's items that count, in display order */
  items: CheckedItem[];
  /** Ids of the rules left out (FR-002), for tests and the count of checked rules */
  leftOut: string[];
  /** Every variable a checked rule uses, by key */
  variables: Record<string, Variable>;
  /** `YYYY-MM-DD`, the calendar date in Germany when the run started */
  today: string;
  /**
   * Canonical serialisation of everything above except `branchKey`; equal fingerprints have equal
   * results. Names and messages aren't in it, so a rename needs no new check (FR-011)
   */
  fingerprint: string;
}

/**
 * A rule that counts. Its formula is one literal, or for a licence class's date
 * `held(K) ∧ c(date_K)` (research R3)
 */
export interface CheckedRule {
  type: 'rule';
  /** rule-{n} */
  id: string;
  formula: Formula;
}

/** A group or sub-group that counts, with at least two items */
export interface CheckedGroup {
  type: 'group';
  /** group-{n} */
  id: string;
  operator: Combinator;
  /** Its items that count, in display order: at least two */
  items: CheckedItem[];
}

/** An item of a checked tree, discriminated by `type` as `RuleTreeItem` is */
export type CheckedItem = CheckedRule | CheckedGroup;

// Variables and literals (data-model.md; research R3, R6, R7)

/** A value of an enum's set as the evaluator compares it: codes as integers, texts case-folded */
export type EnumValue = string | number;

/**
 * One value an applicant has (FR-009): of a document type's field, of its part for a field made of
 * parts, and of a licence class for a class's dates. Variables never constrain each other
 * (FR-007), except that a rule on a class's date also needs the class to be held.
 *
 * The values an applicant can have: number, whole numbers from 0; enum, one value of `values`, or
 * a non-empty subset when `multiple`; text, a text that isn't empty after normalisation; date, a
 * day from 0001-01-01 to 9999-12-31. A licence class's date has a value whenever the class is held
 */
export interface Variable {
  /**
   * `document_type.field`, then `.part` for a field made of parts, then `#class` for a licence
   * class's date, such as `mdl.driving_privileges.issue_date#B`
   */
  key: string;
  /** From the catalog */
  kind: ConditionKind;
  /** Enums only: `multiple_values` of the field or part. False for the other kinds */
  multiple: boolean;
  /**
   * Enums only: the set's keys as the evaluator compares them, codes as integers and texts
   * case-folded. Empty for the other kinds
   */
  values: EnumValue[];
}

/** A number's tests: greater than, less than, equal to, not equal to */
export type NumberOp = 'gt' | 'lt' | 'eq' | 'ne';

/** A text's tests: is equal to, is not equal to, contains, doesn't contain */
export type TextOp = 'eq' | 'ne' | 'contains' | 'not_contains';

/** An enum's tests: includes one of, includes none of */
export type EnumOp = 'one_of' | 'none_of';

/** A date's tests against a fixed date */
export type FixedDateOp = 'before' | 'after' | 'on';

/** A date's tests counted back from the day of sharing, in years */
export type YearsAgoOp = 'at_least_years_ago' | 'less_than_years_ago' | 'exactly_years_ago';

/** A date's tests counted forward from the day of sharing, in years or months */
export type FromNowOp = 'at_least_from_now' | 'less_than_from_now';

/** What a count of time from the day of sharing counts */
export type DateUnit = 'years' | 'months';

export interface NumberTest {
  kind: 'number';
  op: NumberOp;
  /** A finite number, possibly with decimals: "is greater than 20.5" means at least 21 */
  value: number;
}

export interface TextTest {
  kind: 'text';
  op: TextOp;
  /** Normalised as the evaluator does (`normalisedText()`, research R7) */
  text: string;
  /** Whether letter case counts */
  matchCase: boolean;
}

export interface EnumTest {
  kind: 'enum';
  op: EnumOp;
  /** Keys of the set, in the form of `Variable.values` */
  values: EnumValue[];
}

/** "Is before", "is after" and "is" a fixed date: strict comparisons */
export interface FixedDateTest {
  kind: 'date';
  op: FixedDateOp;
  /** A day number (proleptic Gregorian ordinal, 0001-01-01 is 1) */
  date: number;
}

/** "Is at least", "is less than" and "is exactly" N years ago */
export interface YearsAgoTest {
  kind: 'date';
  op: YearsAgoOp;
  /** A whole number from 1 */
  count: number;
  /** Always years, so that every test counted from the day of sharing has a unit */
  unit: 'years';
}

/** "Is at least" and "is less than" N years or months from now */
export interface FromNowTest {
  kind: 'date';
  op: FromNowOp;
  /** A whole number from 1 */
  count: number;
  unit: DateUnit;
}

/** A date's tests counted from the day of sharing, whose sets of days move with that day */
export type RelativeDateTest = YearsAgoTest | FromNowTest;

/** A date's tests: against a fixed date, or counted from the day of sharing */
export type DateTest = FixedDateTest | RelativeDateTest;

/** A rule's condition in a form the theories read, discriminated by `kind`, then by `op` */
export type LiteralTest = NumberTest | TextTest | EnumTest | DateTest;

/**
 * A test on one variable. A theory can name the tests it reads, such as `Literal<NumberTest>`.
 * The negation of a literal is the same literal with `negated` flipped: number ≤ and ≥ for > and
 * <, text "is equal to" ↔ "is not equal to", "contains" ↔ "doesn't contain", enum "includes one of"
 * ↔ "includes none of", a date test's complementary set of days
 */
export interface Literal<T extends LiteralTest = LiteralTest> {
  /** The variable's key in `CheckedBranch.variables` */
  variable: string;
  test: T;
  /** Set by the questions of research R4, never by a rule */
  negated: boolean;
}

// Formulas and questions (data-model.md; research R4, R5)

/** All of its formulas: a level combined with AND */
export interface AndFormula {
  and: Formula[];
}

/** At least one of its formulas: a level combined with OR */
export interface OrFormula {
  or: Formula[];
}

/**
 * `true` (every applicant meets it), `false` (none does), a literal, or AND and OR over formulas.
 * A branch is a positive formula; the negation of a formula is its De Morgan dual, with each
 * literal's `negated` flipped (research R3). Tell the shapes apart with `typeof formula ===
 * 'boolean'`, `'and' in formula` and `'or' in formula`
 */
export type Formula = boolean | Literal | AndFormula | OrFormula;

/**
 * Days of sharing in day numbers, both included. The questions use today alone (conflicts, the
 * unmeetable branch) or today to 9999-12-31 (redundant, always met, every applicant meets, and
 * whether a conflict holds on later days) (research R4)
 */
export interface DayRange {
  from: number;
  to: number;
}

/**
 * A question's answer (research R5): `'unknown'` when a theory can't decide or the deadline
 * passes. It never turns into `'sat'` or `'unsat'`, so findings that depend on it aren't reported
 */
export type Verdict = 'sat' | 'unsat' | 'unknown';

/** What `checkBranch()` and the solver are given to stop in time (contracts/rule-checks.md) */
export interface CheckOptions {
  /** When to stop asking questions, in milliseconds of `now` */
  deadline: number;
  /**
   * The clock: `performance.timeOrigin + performance.now()` in the worker, injected so that the
   * tests can drive the deadline
   */
  now: () => number;
}

// Findings (data-model.md, "Findings"; research R8). Every id in a reason names an item of the
// same branch's checked tree; notes show the current names (FR-011)

/** Conflicting: can't be met together with these items */
export interface WithItemsReason {
  type: 'with';
  /** A smallest set from the AND-context that can be met without the item, in display order */
  items: string[];
}

/** Conflicting: a group that can't be met on its own, because of these members */
export interface MembersReason {
  type: 'members';
  /**
   * The group's combination, which decides the wording: an AND group's members can't be met
   * together, none of an OR group's members can be met (design-notes.md §2.2)
   */
  operator: Combinator;
  /**
   * AND: a smallest set of its members that can't be met together. OR: its members, none of
   * which can be met. In display order
   */
  items: string[];
}

/** Conflicting: a rule that can't be met on its own, because of its condition */
export interface ConditionReason {
  type: 'condition';
}

/** Why an item is conflicting (FR-003) */
export type ConflictingReason = WithItemsReason | MembersReason | ConditionReason;

/** Redundant: the same check as this item */
export interface SameReason {
  type: 'same';
  item: string;
}

/**
 * Redundant: anyone who meets `items` also meets this item, or else one of `orItems`. `orItems`
 * is empty but for a redundancy through an enclosing OR level (research R8, step 4)
 */
export interface ImpliedByReason {
  type: 'implied_by';
  items: string[];
  orItems: string[];
}

/**
 * Redundant: anyone who meets this item, and `givenItems`, also meets one of `items`.
 * `givenItems` is empty but for a redundancy through an enclosing AND level (research R8, step 4)
 */
export interface ImpliesReason {
  type: 'implies';
  items: string[];
  givenItems: string[];
}

/** Why an item is redundant (FR-005) */
export type RedundantReason = SameReason | ImpliedByReason | ImpliesReason;

/** A rule or group that no applicant can meet together with others, or on its own (FR-003) */
export interface ConflictingFinding {
  /** The rule or group (`rule-{n}`, `group-{n}`) */
  itemId: string;
  kind: 'conflicting';
  reason: ConflictingReason;
  /**
   * True when the finding holds today but not on every later day (FR-008), so the note adds "by
   * applicants who share today"
   */
  today: boolean;
}

/** A rule or group whose deletion changes no outcome (FR-005) */
export interface RedundantFinding {
  /** The rule or group (`rule-{n}`, `group-{n}`) */
  itemId: string;
  kind: 'redundant';
  reason: RedundantReason;
  /** Conflicting only: a redundant finding holds on every day from today on (research R4) */
  today: false;
}

/** A rule or group that every applicant meets (FR-006) */
export interface AlwaysMetFinding {
  /** The rule or group (`rule-{n}`, `group-{n}`) */
  itemId: string;
  kind: 'always_met';
  reason: null;
  /** Conflicting only: an always-met finding holds on every day from today on (research R4) */
  today: false;
}

/** A finding on a rule or group, discriminated by `kind` (FR-003, FR-005, FR-006) */
export type ItemFinding = ConflictingFinding | RedundantFinding | AlwaysMetFinding;

/** The kinds of finding on a rule or group, in the summary's order */
export type ItemFindingKind = ItemFinding['kind'];

/** No applicant can meet the branch's rules (FR-004) */
export interface NoneCanMeetNotice {
  kind: 'none_can_meet';
  /**
   * True when it holds today but not on every later day: "No applicant who shares today can meet
   * …" (FR-008)
   */
  today: boolean;
}

/** Every applicant meets the branch's rules, on every day from today on (FR-006) */
export interface AllMeetNotice {
  kind: 'all_meet';
  /** `none_can_meet` only */
  today: false;
}

/** A finding on a branch, discriminated by `kind` */
export type BranchNotice = NoneCanMeetNotice | AllMeetNotice;

/** The result for one branch, from `checkBranch()` */
export interface BranchCheck {
  /** What was checked */
  branchKey: string;
  fingerprint: string;
  /** False when the deadline passed or a question came back `'unknown'` (FR-010) */
  complete: boolean;
  notice: BranchNotice | null;
  /** In display order, at most one per item. Only certain findings */
  findings: ItemFinding[];
  /** The rules checked. 0 means no summary, notice or tab icon (W13) */
  checkedRules: number;
}

// The worker protocol (contracts/rule-checks.md, "Worker protocol")

/** Main thread → worker: check these branches, in this order: the shown branch first, then tabs */
export interface CheckMessage {
  type: 'check';
  runId: number;
  /**
   * When to stop asking questions, in milliseconds of `performance.timeOrigin +
   * performance.now()`: the change's time plus `WORKER_STOP_MS`
   */
  deadline: number;
  branches: CheckedBranch[];
}

/** Worker → main thread: one branch's result, as soon as that branch is done */
export interface ResultMessage {
  type: 'result';
  runId: number;
  check: BranchCheck;
}

/** Worker → main thread: every branch of the run is done */
export interface DoneMessage {
  type: 'done';
  runId: number;
}

/** What the worker posts, discriminated by `type` */
export type WorkerMessage = ResultMessage | DoneMessage;

// The hook (contracts/rule-checks.md, "useRuleChecks")

/**
 * Why a branch's result changed: a change the team member made, the branch's first result, or a
 * new day in Germany. Only `'action'` is announced (FR-015)
 */
export type CheckCause = 'action' | 'first' | 'new_day';

/** What `useRuleChecks()` returns to the editor page */
export interface RuleChecks {
  /** Per branch key: the result to show, or null while a branch has never been checked */
  byBranch: Record<string, BranchCheck | null>;
  /** The latest announcement, for the status region; '' when there is none */
  announcement: string;
}

// The run state (data-model.md, "A check run: lifecycle"; research R10): the pure reducer of
// `runState.ts` behind `useRuleChecks()`

/** The causes of a change that the hook dispatches; `'first'` follows from a branch's history */
export type ChangeCause = Exclude<CheckCause, 'first'>;

/** A run of the worker over the branches without a cached result */
export interface CheckRun {
  runId: number;
  /** The change's time, in milliseconds of `performance.timeOrigin + performance.now()` */
  startedAt: number;
  /** The branches to check, in the order to check them: the shown branch first, then tab order */
  branchKeys: string[];
}

/** One branch as a change hands it to the run state */
export interface RunBranch {
  /** Its key and current name */
  branch: NamedBranch;
  /** Its current names, from `namesOf()` */
  names: ItemNames;
  /** Its checked tree, from `buildCheckedBranch()` */
  checked: CheckedBranch;
}

/** The run state's record of one current branch */
export interface BranchRun extends RunBranch {
  /** Pending while its fingerprint's result isn't there yet */
  status: 'pending' | 'done';
  /** The cause of the change that gave the branch its fingerprint */
  cause: ChangeCause;
}

/** The results that a change with an earlier fingerprint, such as an undo, reuses at once */
export interface ResultCache {
  /** The latest `done` result per branch key, complete or not */
  latest: Record<string, BranchCheck>;
  /**
   * Earlier complete results, one per fingerprint, the oldest first, at most
   * `MAX_EARLIER_RESULTS`
   */
  earlier: BranchCheck[];
}

/** The state of `useRuleChecks()` */
export interface RunState {
  /** The current branches, in tab order */
  branches: BranchRun[];
  /** The key of the branch shown, for the order of a run and the announcements' wording */
  shownBranchKey: string;
  /** `RuleChecks.byBranch`: per current branch, the result to show */
  byBranch: Record<string, BranchCheck | null>;
  /** The run the worker is busy with, or null */
  run: CheckRun | null;
  /** The id of the next run */
  nextRunId: number;
  cache: ResultCache;
  /** `RuleChecks.announcement` */
  announcement: string;
}

/** A change of the branches or of their context (FR-011), or a new day in Germany */
export interface ChangeAction {
  type: 'change';
  /** Every branch, in tab order */
  branches: RunBranch[];
  shownBranchKey: string;
  cause: ChangeCause;
  /** The change's time, in milliseconds of `performance.timeOrigin + performance.now()` */
  now: number;
}

/** Another branch is shown: no run, only the next run's order and the announcements' wording */
export interface ShowAction {
  type: 'show';
  shownBranchKey: string;
}

/** The worker posted a branch's result (`ResultMessage`) */
export interface ResultAction {
  type: 'result';
  runId: number;
  check: BranchCheck;
}

/**
 * A run ended: the worker posted `'done'`, the watchdog fired, or the worker couldn't be created
 * or reported an error. Its branches still pending are done, incomplete, with no findings
 */
export interface RunEndAction {
  type: 'done' | 'watchdog' | 'failed';
  runId: number;
}

/** What the run state's reducer takes, discriminated by `type` */
export type RunAction = ChangeAction | ShowAction | ResultAction | RunEndAction;

// The finding texts (research R12): what `findingMessages.ts` reads besides the results

/**
 * The current names of a branch's rules, groups and sub-groups, by id, in display order (a `Map`
 * keeps the order it is filled in). Built from the current tree with `namesOf()`, so that a rename
 * shows at once (FR-011)
 */
export type ItemNames = ReadonlyMap<string, string>;

/** A branch as the finding texts name it */
export interface NamedBranch {
  /** `RulesBranch.key` of the rules step */
  key: string;
  /** Its current name: "Standard" until the main branch is renamed */
  name: string;
}

/** A finding that appeared, or whose reason changed with its kind unchanged (FR-015) */
export interface FindingAppeared {
  type: 'appeared';
  branch: NamedBranch;
  /** The new finding */
  finding: ItemFinding;
}

/** A finding that went, worded with its previous reason (FR-015) */
export interface FindingGone {
  type: 'gone';
  branch: NamedBranch;
  /** The previous finding */
  finding: ItemFinding;
}

/** A branch notice that appeared, announced with its own text (FR-015) */
export interface NoticeAppeared {
  type: 'notice';
  branch: NamedBranch;
  notice: BranchNotice;
}

/**
 * A change between a branch's previous result and its new one, which `announcementOf()` words
 * (data-model.md, "Announcements"), discriminated by `type`
 */
export type FindingChange = FindingAppeared | FindingGone | NoticeAppeared;

/** What `announcementsFor()` words a branch's changes with */
export interface AnnouncementContext {
  /** The branch whose results are compared, by its current name */
  branch: NamedBranch;
  /** Its current names, from `namesOf()`, which also give the display order */
  names: ItemNames;
  /** The key of the branch shown: a finding in another branch names its variant */
  shownBranch: string;
}

// The theories (research R5, R6, R7): one module per kind decides the literals of one variable,
// for the solver, which picks the theory by `Variable.kind`

/** The literals can be met, by `witness` */
export interface SatAnswer<V> {
  readonly verdict: 'sat';
  /** A value an applicant can have, for which the theory's `holds()` is true for every literal */
  readonly witness: V;
}

/** No value an applicant can have meets every literal */
export interface UnsatAnswer {
  readonly verdict: 'unsat';
}

/** The theory can't tell (research R7's corner). It is never taken for `'sat'` or `'unsat'` */
export interface UnknownAnswer {
  readonly verdict: 'unknown';
}

/**
 * A theory's answer for the literals of one variable, discriminated by `verdict`, a `Verdict`.
 * Only `'sat'` carries a witness. Answers are plain data that nobody changes, so a theory may
 * hand out the same `'unsat'` object every time
 */
export type TheoryAnswer<V> = SatAnswer<V> | UnsatAnswer | UnknownAnswer;

/**
 * The decision procedure of one kind of variable (research R6, R7). `numberTheory.ts`,
 * `enumTheory.ts`, `dateTheory.ts` and `textTheory.ts` each export one as `<kind>Theory`, made of
 * their functions `<kind>Holds()` and `decide<Kind>()`, which may leave out trailing parameters
 * they don't read. `T` is the kind's test, and `V` a value an applicant can have (`Variable`) in
 * the form of the literals' values (`literals.ts`): a whole number, an enum's keys (a list of one
 * without `multiple`), a normalised text, a day number.
 *
 * The literals handed to a theory are all on one variable and of its kind, as `literals.ts` builds
 * them, so the solver narrows `Literal[]` by `Variable.kind`. A theory is pure and exact: its
 * answer covers every value an applicant can have, never a sample. The number, enum and text
 * theories don't read the day, so their answer holds on every day: over a range of days, the
 * solver takes `'sat'` for every day of it and `'unsat'` for none. The date theory also answers
 * over a range of days, with the days on which the literals can be met, as sorted, disjoint
 * `DayRange`s
 */
export interface Theory<T extends LiteralTest, V> {
  /**
   * The literal's membership test: whether an applicant whose value is `value` and who shares on
   * `day` (a day number) meets it, by the evaluator's comparison, with `negated` flipping the
   * outcome. Only the date theory reads the day
   */
  holds: (literal: Literal<T>, value: V, day: number) => boolean;
  /**
   * Whether one value of `variable` meets every literal on `day`. `'sat'` carries such a value,
   * so `holds(literal, answer.witness, day)` is true for each literal. `'unsat'`: no value does.
   * `'unknown'` comes only from the text theory (research R7). Without literals, `'sat'`
   */
  decide: (literals: readonly Literal<T>[], variable: Variable, day: number) => TheoryAnswer<V>;
}
