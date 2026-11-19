// Types of the personas (specs/004-rule-test-personas, data-model.md and contracts/personas.md):
// the persona fields and values, the personas and their state, the test results and what the step
// shows of them, the shapes of generation, and the messages between the hook and the worker. Every
// shape is plain data, so that it can be posted to the worker. Only types are imported, so this
// module brings no code into the main bundle
import type { RuleItem } from '@connection-portal/api-types/form-connections';

import type { CheckedBranch, Formula, Literal } from '../checks/types';
import type { EvaluatedItem } from '../evaluation';
import type { Language } from '../language';
import type { RuleContext, StatementParts } from '../types';
import type { AnnouncedBranch, MetByBranch } from './announcements';

// Persona fields and values (data-model.md, "Persona field", "Persona value"; research R3, R4)

/**
 * One datum that rules check, which every persona has a value for. `personaFieldsOf()` derives the
 * list, in display order
 */
export interface PersonaField {
  /**
   * Spec 003's variable key (`variableKey()`): `pid.birthdate`, `pid.place_of_birth.locality`,
   * `mdl.driving_privileges.classes`, `mdl.driving_privileges.issue_date#B`
   */
  key: string;
  /** `pid`, `mdl` */
  documentType: string;
  /** The heading: "Personal ID", "Driving licence" */
  documentLabel: string;
  /**
   * `dataOfResolved()`: "Date of birth (Age)", "City or town", "Licence classes", "Licence class B
   * – Issue date"
   */
  label: string;
  /** The catalog field's key */
  field: string;
  /** The part's key, for a field made of parts */
  part: string | null;
  /** The class, for a class's issue or expiry date */
  licenceClass: string | null;
  /** From the catalog */
  kind: 'number' | 'text' | 'enum' | 'date';
  /** Enums: the value set's key */
  optionSet: string | null;
  /** Enums: `multiple_values` of the field or part */
  multiple: boolean;
  /** The field's `date_of_birth`: show the age, offer "Age today" (FR-007) */
  dateOfBirth: boolean;
}

/**
 * A persona's value for one field.
 * - a number field's whole number, or the code of a single-value enum;
 * - text as typed; a date as `YYYY-MM-DD`; a single-value enum's text value;
 * - an enum that holds several values;
 * - empty.
 *
 * Empty: `null`, `''` or `[]`, for a document that doesn't give the value (FR-006). Absent: the
 * key is missing from `values`, because the persona never had a value. Only a fill run gives
 * absent values (FR-020)
 */
export type PersonaValue = number | string | readonly (string | number)[] | null;

// Personas (data-model.md, "Persona")

/** Stable for the flow: React keys, element ids */
export type PersonaId = 'persona-1' | 'persona-2' | 'persona-3';

/** A persona's place among the three, in their fixed order */
export type PersonaSlot = 0 | 1 | 2;

/** A sample citizen: a name, and a value for each persona field */
export interface Persona {
  id: PersonaId;
  /**
   * A label for the team, drawn when the persona is created and kept when it is generated anew
   * (FR-009; research R10). Never empty
   */
  name: string;
  /**
   * Every value the persona has, including hidden ones: fields no longer checked, and dates of
   * classes not held (FR-020, W4)
   */
  values: Record<string, PersonaValue>;
  /** The values as generation last gave them */
  generated: Record<string, PersonaValue>;
  /**
   * `'generating'` (all its values are being made anew) and `'filling'` (a fill run gives it values
   * for the fields that came into the rules, FR-020) show the placeholder, without "Edit data" or
   * "Generate again" (FR-013). A persona that is neither has a result
   */
  status: 'ready' | 'generating' | 'filling';
}

// Persona state (data-model.md, "Persona state"; research R9, R10)

/**
 * What a run does with a slot (research R8): `'free'`, all values new; `'kept'`, all values fixed;
 * `'filled'`, the absent values new and the others fixed
 */
export type SlotKind = 'free' | 'kept' | 'filled';

/** The run in progress */
export interface GenerationRun {
  /** Answers for another run id are ignored */
  runId: number;
  /** When the run was requested, in ms of `performance.timeOrigin + performance.now()` */
  startedAt: number;
  /** One per persona, in persona order */
  slots: SlotKind[];
}

/**
 * The open question before generating anew (FR-012, W9). `'one'` is "Generate again" for `slot`
 * (`confirmOneOf(personas[slot])`); `'all'` is "Generate all again", with `changed` the slots of
 * the ready personas that have changes, in the chips' order, never empty
 * (`confirmAllOf(changed.map((slot) => personas[slot]))`). Names are read from `personas`, which a
 * question that is open doesn't change
 */
export type PersonaConfirm =
  { type: 'one'; slot: PersonaSlot } | { type: 'all'; changed: PersonaSlot[] };

/** The state of `usePersonas()`, changed only by `personaStateReducer()` */
export interface PersonaState {
  /** `null` until the first generation gives values */
  personas: Persona[] | null;
  /** The selected persona. Kept when the variant changes (FR-004) */
  selected: PersonaSlot;
  /**
   * The test step's selected variant. When the step opens, it is set to the rules step's open
   * branch
   */
  branchKey: string | null;
  /** The run in progress */
  run: GenerationRun | null;
  /**
   * The last run id given, 0 before the first run. A new run, or a request merged into the
   * running one, takes the next id, so that answers of a superseded run are ignored (research R9)
   */
  lastRunId: number;
  /** The last run failed: the failure state (FR-013, F7) */
  failed: boolean;
  /** The persona whose panel is in edit mode (FR-006) */
  editing: PersonaSlot | null;
  /** The open question before generating anew (FR-012) */
  confirm: PersonaConfirm | null;
  /** The latest text for the status region (FR-017); '' when the last change moved no outcome */
  announcement: string;
  /**
   * Counts the announcements: `setValue` raises it whenever it gives a text, so that the same
   * sentence twice in a row still changes the region (the announcer uses it as its React `key`)
   */
  announcementId: number;
}

/**
 * The reducer's actions. US1's (T023), the editing and confirm ones (T040) and the fill run of
 * `opened` (T051).
 *
 * Every action that may start a run, or merge a request into the running one, carries `now`: the
 * time of the request in ms of `performance.timeOrigin + performance.now()`, which becomes the
 * run's `startedAt`. The reducer stays pure, and the hook takes the deadline and the watchdog from
 * the request's time
 */
export type PersonaAction =
  | {
      /**
       * The step opens with the current fields: selects the variant, and may start the first run,
       * or a fill run for the personas that lack a value for a field (`values` has no key for it;
       * an empty value is a value) (FR-020)
       */
      type: 'opened';
      fields: PersonaField[];
      /** The rules step's open branch */
      openBranchKey: string | null;
      /** Every branch's key, in tab order */
      branchKeys: string[];
      now: number;
    }
  | {
      /**
       * "Generate again". With `fields` it is judged whether the persona has changes: if so it only
       * sets `confirm`, and `confirmed` starts the run (FR-012)
       */
      type: 'generateOne';
      slot: PersonaSlot;
      fields: readonly PersonaField[];
      now: number;
    }
  | {
      /** "Generate all again": asks when a ready persona has changes (FR-012) */
      type: 'generateAll';
      fields: readonly PersonaField[];
      now: number;
    }
  | {
      /** "Generate new data" in the question: starts the run it was about; `now` as above */
      type: 'confirmed';
      now: number;
    }
  | { type: 'cancelled' }
  | { type: 'retry'; now: number }
  | { type: 'runSucceeded'; runId: number; slots: GeneratedMessage['slots'] }
  | {
      /**
       * The run failed: its worker's error, its watchdog. `null` for a failure outside a run, such
       * as `results.ts` that can't load, which fails whatever runs
       */
      type: 'runFailed';
      runId: number | null;
    }
  | { type: 'select'; slot: PersonaSlot }
  | { type: 'selectBranch'; branchKey: string }
  | {
      /**
       * One valid entry: changes one value of a ready persona, never `generated`, and sets
       * `announcement` from the persona's outcome changes. The hook computes `before` and `after`
       * (`PersonaBranchResult.met` per branch key, before and after the change) with the loaded
       * results module, so that the reducer stays out of the evaluator's chunk. A branch missing
       * from either map isn't announced. `branches` are the tabs' keys and names, in tab order
       */
      type: 'setValue';
      slot: PersonaSlot;
      key: string;
      value: PersonaValue;
      before: MetByBranch;
      after: MetByBranch;
      branches: readonly AnnouncedBranch[];
      /**
       * The language of the moment (spec 009, R4), in which the announcement is composed; English
       * when omitted
       */
      language?: Language;
    }
  | {
      /** A non-empty name (an empty or blank one is ignored); changes no result, no announcement */
      type: 'rename';
      slot: PersonaSlot;
      name: string;
    }
  | { type: 'startEditing'; slot: PersonaSlot }
  | { type: 'stopEditing' };

// Test results (data-model.md, "Test result"; research R5)

/** What the evaluation decides for one persona and one branch */
export interface PersonaBranchResult {
  /** `Evaluation.met`. True for a branch without rules */
  met: boolean;
  /**
   * Each top-level item that counts, with its outcome, and a group's members with theirs
   * (`evaluation.ts`)
   */
  items: EvaluatedItem[];
  /**
   * `Evaluation.messages`: empty when met. Otherwise the reported items, in the evaluation's order
   * (FR-014)
   */
  messages: { id: string; message: string }[];
}

/**
 * By persona id, then branch key: every ready persona against every branch. A branch the evaluator
 * can't evaluate (a rule that doesn't pass `firstProblem()`, which only the rules step shows) has
 * no result
 */
export type TestResults = Partial<Record<PersonaId, Partial<Record<string, PersonaBranchResult>>>>;

/** One item of the result list, for the selected persona and variant */
export interface ResultRow {
  itemId: string;
  type: 'rule' | 'group';
  name: string;
  /**
   * A rule's statement as the rules step words it (`statementOf()`, as `RuleRow` falls back), what
   * assistive technologies read; a group's is its header's subtitle (design-notes.md §6.2)
   */
  statement: string;
  /**
   * A rule's statement laid out as `RuleSentence` draws it (`statementPartsOf()`), with
   * `statement` as its text; null for a group, and for a rule whose target the context lacks
   */
  parts: StatementParts | null;
  status: 'met' | 'not_met' | 'not_checked';
  /**
   * The item's message for citizens as stored, the line the rules step draws under it ("Message
   * for citizens:"), on every row, met or not: a rule's message, or a group's own message; `null`
   * for a group without one. It is the item's current message, so an edit shows at once. Which
   * messages the citizen reads follows from `reported`
   */
  message: string | null;
  /**
   * The name of the outermost group around this row whose own message citizens read instead of
   * this item's, as the rules step finds it (`messageGroupOf()`; F32, FR-037): set only on the
   * members listed under a reported group with a message, otherwise `null`
   */
  messageGroup: string | null;
  /** Whether the evaluation reports the item: its message is one the citizen reads (FR-014) */
  reported: boolean;
  /**
   * A reported group's members that aren't met, recursively. Empty for everything else (W10,
   * FR-015)
   */
  members: ResultRow[];
}

/** What the step shows for the selected persona and variant */
export interface ResultView {
  /** Whether the persona meets the variant */
  meets: boolean;
  /** "Result: meets the rules", "Result: doesn't meet 2 rules" (FR-015; spec 008 FR-024, V4) */
  heading: string;
  /** Reported items first, then the other top-level items */
  rows: ResultRow[];
  /** The keys of the fields read by rules shown as failing (K1) */
  failingFields: string[];
}

// Generation, internal to the worker (data-model.md, "Generation"; research R6–R8)

/**
 * What `generatePersonas()` reads: a 'generate' message without its type, its run id and its
 * deadline, which come with the options
 */
export type GenerationRequest = Pick<
  GenerateMessage,
  'seed' | 'today' | 'branches' | 'fields' | 'context' | 'slots'
>;

/**
 * What `generatePersonas()` returns: the 'generated' message's slots, in persona order. A free
 * slot gets a value for every field and, without a name, the name drawn; a filled slot the values
 * of its absent fields; a kept slot `{ values: {}, name: null }`, since its persona stays as it is
 */
export interface GenerationResult {
  slots: GeneratedMessage['slots'];
}

/** A slot's kind, its fixed values (kept, filled) and its name (kept, or drawn) */
export interface SlotPlan {
  kind: SlotKind;
  /** The values that stay as they are: all of a kept slot's, a filled slot's present ones */
  values: Record<string, PersonaValue>;
  name: string;
}

/**
 * Branches with the same formula, by canonical serialisation, and that formula: no citizen can
 * meet them differently
 */
export interface BranchClass {
  /** The formula's canonical serialisation */
  key: string;
  formula: Formula;
  /** `CheckedBranch.branchKey` of each branch of the class, in tab order */
  branchKeys: string[];
}

/**
 * Per class, in the order of the classes: meet (`true`) or fail (`false`). "Realizable" when
 * `satisfiable()` answers `'sat'` for the conjunction today
 */
export type OutcomeVector = readonly boolean[];

/**
 * What generation tries to cover (FR-011): goal 1 `meet(class)`, goal 2 `fail(class)`, goal 3
 * `differ(a, b)`, goal 4 `meet(item)` and `fail(item)`. Classes by their index; items by their
 * formula's canonical serialisation, so that a rule several branches inherit is one pair of targets.
 * Goal 3 with `a < b`, covered by meeting either one and failing the other. Goal 4's `formula` is
 * what a persona meets to cover the target: the item's formula X for meet, `negate(X)` for fail
 */
export type Target =
  | { goal: 1; type: 'meet'; classIndex: number }
  | { goal: 2; type: 'fail'; classIndex: number }
  | { goal: 3; type: 'differ'; a: number; b: number }
  | { goal: 4; type: 'meet' | 'fail'; item: string; formula: Formula };

/** Covered targets per goal, compared in that order (FR-011) */
export type Score = readonly [goal1: number, goal2: number, goal3: number, goal4: number];

/**
 * Per variable key, the literals that a satisfying choice of OR children picked (`modelOf()`, by
 * random self-reduction), with the plausibility literals when they didn't have to give way. Values
 * that meet every literal of a variable, for every variable, meet the formula. A variable without
 * literals has no key
 */
export type Model = Record<string, Literal[]>;

// Worker protocol (contracts/personas.md, "Worker protocol")

/** Page → worker: one run */
export interface GenerateMessage {
  type: 'generate';
  runId: number;
  /** When to stop planning, in ms of performance.timeOrigin + performance.now(): request + 4500 */
  deadline: number;
  /** From crypto.getRandomValues() */
  seed: number;
  /** YYYY-MM-DD, the calendar date in Germany */
  today: string;
  /** Every branch, in tab order: its checked tree, and its rules by id for substitution */
  branches: { checked: CheckedBranch; rules: Record<string, RuleItem> }[];
  fields: PersonaField[];
  context: RuleContext;
  /** Three slots, in persona order */
  slots: { kind: SlotKind; name: string | null; values: Record<string, PersonaValue> }[];
}

/** Worker → page, once per run */
export interface GeneratedMessage {
  type: 'generated';
  runId: number;
  /**
   * In persona order: for free and filled slots, the new values (all of a free slot's fields; the
   * absent fields of a filled slot) and, for a free slot without a name, the name drawn
   */
  slots: { values: Record<string, PersonaValue>; name: string | null }[];
}
