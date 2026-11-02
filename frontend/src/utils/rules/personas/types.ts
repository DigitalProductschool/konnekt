// Types of the personas (specs/004-rule-test-personas, data-model.md and contracts/personas.md):
// the persona fields and values, the personas and their state, the test results and what the step
// shows of them, the shapes of generation, and the messages between the hook and the worker. Every
// shape is plain data, so that it can be posted to the worker. Only types are imported, so this
// module brings no code into the main bundle
import type { RuleItem } from '../../../types/form-connections';
import type { CheckedBranch, Formula, Literal } from '../checks/types';
import type { EvaluatedItem } from '../evaluation';
import type { RuleContext } from '../types';

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

/** A sample applicant: a name, and a value for each persona field */
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
  /** `'generating'` shows the placeholder, without "Edit data" or "Generate again" (FR-013) */
  status: 'ready' | 'generating';
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

/** The open question before generating anew (FR-012) */
export type PersonaConfirm = { type: 'one'; slot: PersonaSlot } | { type: 'all' };

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
  /** The last run failed: the failure state (FR-013, F7) */
  failed: boolean;
  /** The persona whose panel is in edit mode (FR-006) */
  editing: PersonaSlot | null;
  /** The open question before generating anew (FR-012) */
  confirm: PersonaConfirm | null;
  /** The latest text for the status region (FR-017) */
  announcement: string;
}

/**
 * The reducer's actions. US1's (T023); T040 adds the editing and confirm actions, T051 the fill
 * run's
 */
export type PersonaAction =
  | {
      /** The step opens with the current fields: selects the variant, may start the first run */
      type: 'opened';
      fields: PersonaField[];
      /** The rules step's open branch */
      openBranchKey: string | null;
      /** Every branch's key, in tab order */
      branchKeys: string[];
    }
  | { type: 'generateOne'; slot: PersonaSlot }
  | { type: 'generateAll' }
  | { type: 'retry' }
  | { type: 'runSucceeded'; runId: number; slots: GeneratedMessage['slots'] }
  | { type: 'runFailed'; runId: number }
  | { type: 'select'; slot: PersonaSlot }
  | { type: 'selectBranch'; branchKey: string };

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

/** By persona id, then branch key: every ready persona against every branch */
export type TestResults = Partial<Record<PersonaId, Record<string, PersonaBranchResult>>>;

/** One item of the result list, for the selected persona and variant */
export interface ResultRow {
  itemId: string;
  type: 'rule' | 'group';
  name: string;
  statement: string;
  status: 'met' | 'not_met' | 'not_checked';
  /**
   * The item's message for a reported row; `null` for other rows, which the step draws as "–"
   * when there is a message column
   */
  message: string | null;
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
  /** "Result: meets the rules", "Result: doesn't meet 1 rule and 1 group" (FR-015, W10) */
  heading: string;
  /** "Rules Mia meets" under a met variant, otherwise null (F3) */
  listHeading: string | null;
  /** "Message Mia reads" under a variant the persona doesn't meet, otherwise null (F3, F14) */
  messageColumn: string | null;
  /** Reported items first, then the other top-level items */
  rows: ResultRow[];
  /** The keys of the fields read by rules shown as failing (K1) */
  failingFields: string[];
}

// Generation, internal to the worker (data-model.md, "Generation"; research R6–R8)

/** A slot's kind, its fixed values (kept, filled) and its name (kept, or drawn) */
export interface SlotPlan {
  kind: SlotKind;
  /** The values that stay as they are: all of a kept slot's, a filled slot's present ones */
  values: Record<string, PersonaValue>;
  name: string;
}

/**
 * Branches with the same formula, by canonical serialisation, and that formula: no applicant can
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
 * formula's canonical serialisation, so that a rule several branches inherit is one pair of targets
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
 * random self-reduction)
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
