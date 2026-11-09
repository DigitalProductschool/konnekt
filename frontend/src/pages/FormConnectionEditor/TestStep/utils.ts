// The test step's pure helpers (specs/004-rule-test-personas, S8)
import type { Combinator } from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { sameValue } from '@connection-portal/rules/branches';
import { parseDayNumber } from '@connection-portal/rules/checks/calendar';
import { listOf } from '@connection-portal/rules/checks/findingMessages';
import { optionsOf } from '@connection-portal/rules/conditions';
import { GROUP_SUBTITLES } from '@connection-portal/rules/personas/constants';
import {
  classesSinceOf,
  displayDateOf,
  firstName,
  runStatusOf,
  validUntilOf,
} from '@connection-portal/rules/personas/messages';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  PersonaValue,
  ResultRow,
} from '@connection-portal/rules/personas/types';
import {
  ageOn,
  type DataRow,
  isEmptyValue,
  isExpiryDate,
} from '@connection-portal/rules/personas/values';

import { GROUP_FRAME_COPY } from '../../../components/GroupFrame/constants';
import type { ValueChoice } from '../../../components/ValuesPicker/types';
import type { RulesBranch } from '../RulesStep/types';
import { EDIT_DATA_COPY, ISSUE_DATE_PART, TEST_STEP_COPY } from './constants';
import type {
  DataRowGroup,
  DocumentGroup,
  DraftsAction,
  DraftsState,
  EditDataAction,
  EditDataState,
  ParseResult,
  PickerAction,
  PickerState,
} from './types';

/** A group's two ways of combining its members, for `resultStatementOf()` */
const COMBINATORS: readonly Combinator[] = ['and', 'or'];

/**
 * `YYYY-MM-DD` as the panel writes dates, `dd.mm.yyyy` ("08.07.2007"); anything else unchanged
 * (the rules package's `displayDateOf()`, which the test-day line uses too)
 */
export function formatDisplayDate(iso: string): string {
  return displayDateOf(iso);
}

/**
 * The variant the step shows: the selected one (`PersonaState.branchKey`), or the first while
 * none is selected or the selected one no longer exists. `branches` is never empty (Standard)
 */
export function selectedBranchOf(
  branches: readonly RulesBranch[],
  branchKey: string | null
): RulesBranch {
  return branches.find((branch) => branch.key === branchKey) ?? branches[0];
}

/**
 * The fields grouped by document, the documents in the order of their first field and each
 * document's fields in the order of `fields`, which is the catalog's (F9)
 */
export function documentGroupsOf(fields: readonly PersonaField[]): DocumentGroup[] {
  const groups: DocumentGroup[] = [];
  for (const field of fields) {
    const group = groups.find((entry) => entry.documentType === field.documentType);
    if (group) {
      group.fields.push(field);
    } else {
      groups.push({
        documentType: field.documentType,
        documentLabel: field.documentLabel,
        fields: [field],
      });
    }
  }
  return groups;
}

/**
 * How the panel writes a value (S8.4; design-notes §4.1; spec 008 FR-024, C6):
 * - an empty value, of any kind: "Not shared";
 * - a date as `dd.mm.yyyy`, a date of birth without its age: "08.07.2007"; an expiry date as
 *   "Valid until 19.08.2040";
 * - an enum by its labels, several in the value set's order: "German", "B, BE" (F11); a value
 *   outside the set as it is, after the others;
 * - text and numbers as stored
 */
export function valueTextOf(
  field: PersonaField,
  value: PersonaValue | undefined,
  optionSets: OptionSet[]
): string {
  if (value === undefined || value === null || isEmptyValue(value)) {
    return TEST_STEP_COPY.notShared;
  }
  if (field.kind === 'date' && typeof value === 'string') {
    return isExpiryDate(field) ? validUntilOf(value) : formatDisplayDate(value);
  }
  const values = Array.isArray(value) ? value : [value as string | number];
  if (field.kind !== 'enum') {
    return values.join(', ');
  }
  const options = optionsOf(optionSets, field.optionSet) ?? [];
  const indexOf = (entry: string | number): number => {
    const index = options.findIndex((option) => option.value === entry);
    return index === -1 ? options.length : index;
  };
  return [...values]
    .sort((a, b) => indexOf(a) - indexOf(b))
    .map((entry) => options.find((option) => option.value === entry)?.label ?? String(entry))
    .join(', ');
}

/**
 * How the data card writes one of `dataRowsOf()`'s rows (spec 008 FR-024, CLAR #46): a row of
 * licence classes as "B, BE since 02.05.2010" (the classes by `valueTextOf()`, "B, BE" without a
 * shown issue date, "Not shared" without a class), any other row as `valueTextOf()` writes its
 * value
 */
export function dataRowTextOf(
  row: DataRow,
  values: Persona['values'],
  optionSets: OptionSet[]
): string {
  if (row.classes === null) {
    return valueTextOf(row.field, values[row.field.key], optionSets);
  }
  const classes = valueTextOf(row.field, row.classes, optionSets);
  return row.classes.length === 0 ? classes : classesSinceOf(classes, row.since);
}

/**
 * A data row's label (spec 008 CLAR #46, cosmetic 12; U65 7057:59072, U66 #14): "Date of birth"
 * for the date of birth, which the rules call "Date of birth (Age)"; "Licence classes" for a row
 * of classes; any other row its field's label
 */
export function dataRowLabelOf(row: DataRow): string {
  return row.field.dateOfBirth ? TEST_STEP_COPY.dateOfBirth : row.field.label;
}

/**
 * The data card's rows grouped by document (spec 008 F63, FR-043; 004-S8.4.2): the documents in
 * the order of their first row, each document's rows in the order of `rows`, which is the
 * catalog's. The card shows them as one flat list; each group's document name is its hidden
 * heading
 */
export function dataRowGroupsOf(rows: readonly DataRow[]): DataRowGroup[] {
  const groups: DataRowGroup[] = [];
  for (const row of rows) {
    const group = groups.find((entry) => entry.documentType === row.field.documentType);
    if (group) {
      group.rows.push(row);
    } else {
      groups.push({
        documentType: row.field.documentType,
        documentLabel: row.field.documentLabel,
        rows: [row],
      });
    }
  }
  return groups;
}

/**
 * A result row's statement as the step shows it: a rule's as the rules package words it (C3); a
 * group's as its frame on the rules step says how its members combine, "All rules must be met" /
 * "At least one rule must be met" (FR-051 (32); `GROUP_FRAME_COPY`), in place of the rules
 * package's `GROUP_SUBTITLES` ("All of these must be met"), which `rules/src/` keeps
 */
export function resultStatementOf(row: Pick<ResultRow, 'type' | 'statement'>): string {
  if (row.type !== 'group') {
    return row.statement;
  }
  const operator = COMBINATORS.find((entry) => GROUP_SUBTITLES[entry] === row.statement);
  return operator === undefined ? row.statement : GROUP_FRAME_COPY.subtitles[operator];
}

/**
 * The loading status of a run (S8.8; design-notes §8), from the personas of its free slots and of
 * its filled slots, in the chips' order: "Creating new data for Mia…", "Adding new data for Mia
 * and Anna…", "Creating 3 sample citizens…" when all three are free; '' without a run, so that
 * the next run's text is announced when it starts
 */
export function runStatusTextOf(run: GenerationRun | null, personas: readonly Persona[]): string {
  if (run === null) {
    return '';
  }
  const slotsOf = (kind: GenerationRun['slots'][number]) =>
    personas.filter((_, index) => run.slots[index] === kind);
  return runStatusOf(slotsOf('free'), slotsOf('filled'));
}

/**
 * Whether the step shows frame 18 (S8.8): the first generation, "Generate all" and "Try
 * again", which generate all three personas anew, as opposed to frame 19, where only the personas
 * being generated are placeholders
 */
export function createsAll(run: GenerationRun | null): boolean {
  return run !== null && run.slots.every((kind) => kind === 'free');
}

/**
 * A `dd.mm.yyyy` entry as `YYYY-MM-DD`; an empty entry gives `null` (surrounding spaces ignored);
 * anything else, including a date the calendar doesn't have, such as 31.02.2007 or year 0000,
 * gives the error (FR-008)
 */
export function parseDisplayDate(text: string): ParseResult<string> {
  const entry = text.trim();
  if (entry === '') {
    return { ok: true, value: null };
  }
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(entry);
  if (match) {
    const [, day, month, year] = match;
    const iso = `${year}-${month}-${day}`;
    if (parseDayNumber(iso) !== null) {
      return { ok: true, value: iso };
    }
  }
  return { ok: false, error: TEST_STEP_COPY.enterDate };
}

/**
 * Digits as a number; an empty entry gives `null`; letters, decimals, signs and anything else
 * give the error (FR-008, W11)
 */
export function parseWholeNumber(text: string): ParseResult<number> {
  const entry = text.trim();
  if (entry === '') {
    return { ok: true, value: null };
  }
  if (/^\d+$/.test(entry)) {
    const value = Number(entry);
    if (Number.isSafeInteger(value)) {
      return { ok: true, value };
    }
  }
  return { ok: false, error: TEST_STEP_COPY.enterWholeNumber };
}

/**
 * A date of birth that gives `age` on `today` (`YYYY-MM-DD`), keeping the day and month of
 * `current`; a 29 February becomes 1 March in a year without it (R12), and where no date with that day and
 * month gives `age`, today's, or 28 February, are kept. With a `current` that isn't
 * a date, today's day and month are kept (design-notes §5.2). When no date of birth from year 1 on
 * gives `age`, the error "Enter a smaller age, e.g. 25." (design-notes §5.2). For every age it
 * accepts, `ageOn(result, today) === age` (FR-007)
 */
export function dateOfBirthForAge(
  age: number,
  current: string | null | undefined,
  today: string
): ParseResult<string> {
  const tooLarge: ParseResult<string> = { ok: false, error: TEST_STEP_COPY.enterSmallerAge };
  if (!Number.isSafeInteger(age) || age < 0) {
    return tooLarge;
  }
  const kept = typeof current === 'string' && parseDayNumber(current) !== null ? current : today;
  const todayYear = Number(today.slice(0, 4));
  // The kept day and month first; where none gives `age` (a 29 February reaches an age on 1
  // March, so age 5 on 28 February 2026 is out of its reach), today's, then 28 February, which
  // every year has and which gives `age` on 29 February too
  for (const monthDay of [kept.slice(5), today.slice(5), '02-28']) {
    // Born this far back, or one year earlier when the day and month are still to come this year
    for (const year of [todayYear - age, todayYear - age - 1]) {
      if (year < 1) {
        continue;
      }
      const padded = String(year).padStart(4, '0');
      let date = `${padded}-${monthDay}`;
      if (parseDayNumber(date) === null) {
        date = `${padded}-03-01`;
      }
      if (parseDayNumber(date) !== null && ageOn(date, today) === age) {
        return { ok: true, value: date };
      }
    }
  }
  return tooLarge;
}

/** "Enter a name." for a name that is empty after trimming, `null` for a valid one (FR-009) */
export function nameProblem(text: string): string | null {
  return text.trim() === '' ? TEST_STEP_COPY.enterName : null;
}

/** The key of the name's draft; no persona field has it (field keys are variable keys) */
export const NAME_DRAFT_KEY = 'name';

/** The key of the "Age today" draft next to the date of birth with this field key */
export function ageDraftKey(fieldKey: string): string {
  return `age:${fieldKey}`;
}

/**
 * The drafts by key, with their errors (research R12; design-notes §5.3): 'edit' records a typed
 * text (the edit-data dialog uses it through `editDataReducer()`)
 */
export function draftsReducer(state: DraftsState, action: DraftsAction): DraftsState {
  switch (action.type) {
    case 'edit':
      return { ...state, [action.key]: { text: action.text, error: action.error } };
  }
}

/** The edit-data dialog while it is closed: no persona, no values, no drafts */
export const CLOSED_EDIT_DATA: EditDataState = { personaId: null, values: {}, drafts: {} };

/**
 * The edit-data dialog's working copy (spec 008 FR-042; T072): 'start' copies the persona's values
 * and puts its name in the name's draft, 'draft' records a typed text and its error
 * (`draftsReducer`), 'value' applies a valid entry to the copy only, and 'close' drops it all
 */
export function editDataReducer(state: EditDataState, action: EditDataAction): EditDataState {
  switch (action.type) {
    case 'start':
      return {
        personaId: action.persona.id,
        values: { ...action.persona.values },
        drafts: { [NAME_DRAFT_KEY]: { text: action.persona.name, error: null } },
      };
    case 'close':
      return CLOSED_EDIT_DATA;
    case 'draft':
      return {
        ...state,
        drafts: draftsReducer(state.drafts, {
          type: 'edit',
          key: action.key,
          text: action.text,
          error: action.error,
        }),
      };
    case 'value':
      return { ...state, values: { ...state.values, [action.key]: action.value } };
  }
}

/** Whether any of the dialog's entries is invalid, which blocks "Save and test" (FR-042) */
export function hasEntryError(drafts: DraftsState): boolean {
  return Object.values(drafts).some((draft) => draft.error !== null);
}

/**
 * The values of `edited` that differ from `original` by `sameValue()`, by key: what "Save and
 * test" applies to the persona. A hidden value (a class's date while the class isn't held)
 * counts as well, as the dialog kept it
 */
export function changedValuesOf(
  original: Persona['values'],
  edited: Persona['values']
): Record<string, PersonaValue> {
  return Object.fromEntries(
    Object.entries(edited).filter(([key, value]) => !sameValue(value, original[key]))
  );
}

/**
 * A field's label in the edit-data dialog (spec 008 F40; U66 7058:60656, 7058:60662): "Date of
 * birth" for the date of birth (the rules say "Date of birth (Age)"), "Class B since" for a
 * licence class's issue date (the rules say "Licence class B – Issue date"), any other field its
 * label as the rules name it
 */
export function editorLabelOf(field: PersonaField): string {
  if (field.dateOfBirth) {
    return TEST_STEP_COPY.dateOfBirth;
  }
  if (field.licenceClass !== null && field.part === ISSUE_DATE_PART) {
    return EDIT_DATA_COPY.classSince(field.licenceClass);
  }
  return field.label;
}

/**
 * The toast after "Save and test" (spec 008 FR-042; U67 7058:61203): "Results updated.", then
 * the top-level rules and groups of the shown variant that the change made met, "Mia now meets
 * Rule 01.", and those it made unmet, "Mia no longer meets Rule 02 and Rule 03.", each list in
 * the order of `after`. `before` and `after` are the variant's result rows (`ResultView.rows`)
 * before and after the change; an item in only one of them is left out
 */
export function savedToastOf(
  before: readonly Pick<ResultRow, 'itemId' | 'name' | 'status'>[],
  after: readonly Pick<ResultRow, 'itemId' | 'name' | 'status'>[],
  persona: Pick<Persona, 'name'>
): string {
  const wasMet = new Map(before.map((row) => [row.itemId, row.status === 'met']));
  const moved = (met: boolean) =>
    after
      .filter((row) => wasMet.has(row.itemId) && wasMet.get(row.itemId) !== met)
      .filter((row) => (row.status === 'met') === met)
      .map((row) => row.name);
  const name = firstName(persona);
  const nowMet = moved(true);
  const noLonger = moved(false);
  return [
    TEST_STEP_COPY.resultsUpdated,
    ...(nowMet.length > 0 ? [EDIT_DATA_COPY.nowMeets(name, listOf(nowMet))] : []),
    ...(noLonger.length > 0 ? [EDIT_DATA_COPY.noLongerMeets(name, listOf(noLonger))] : []),
  ].join(' ');
}

/**
 * What a field's entry gives (T043, T044): text as typed, with an empty text as `null`; a whole
 * number for a number field; a date as `YYYY-MM-DD`; otherwise the error to show under the field
 * (FR-008). A date or a number takes surrounding spaces; a text keeps them (SC-001)
 */
export function parseEntry(kind: PersonaField['kind'], text: string): ParseResult<PersonaValue> {
  switch (kind) {
    case 'number':
      return parseWholeNumber(text);
    case 'date':
      return parseDisplayDate(text);
    case 'text':
    case 'enum':
      return { ok: true, value: text === '' ? null : text };
  }
}

/**
 * A value written as its field takes it, the text an edit field starts with: a date as
 * `dd.mm.yyyy`, a number or text as stored, an empty value as ''
 */
export function entryTextOf(kind: PersonaField['kind'], value: PersonaValue | undefined): string {
  if (value === undefined || isEmptyValue(value) || Array.isArray(value)) {
    return '';
  }
  return kind === 'date' ? formatDisplayDate(String(value)) : String(value);
}

/**
 * What "Age today" starts with: the age the date of birth gives on `today`, '' for an empty
 * value, one that isn't a date, or one in the future (design-notes §5.2)
 */
export function ageTextOf(dateOfBirth: PersonaValue | undefined, today: string): string {
  const age = ageOn(dateOfBirth, today);
  return age === null || age < 0 ? '' : String(age);
}

/**
 * The chosen values in the order of the value set, a value outside it after the others, so that
 * a commit equals the generated value by `sameValue()` whatever the order of the picks; `null`
 * for none, which stands for an empty list (FR-006)
 */
export function orderedValues(
  values: readonly (string | number)[],
  choices: readonly ValueChoice[]
): (string | number)[] | null {
  if (values.length === 0) {
    return null;
  }
  const indexOf = (value: string | number): number => {
    const index = choices.findIndex((choice) => choice.value === value);
    return index === -1 ? choices.length : index;
  };
  return [...values].sort((a, b) => indexOf(a) - indexOf(b));
}

/** The element id of a field's error, which its control's `aria-describedby` names */
export function errorIdOf(id: string): string {
  return `${id}-error`;
}

/** A values field's menu: open or closed, and what was searched for; closing clears the search */
export function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'open':
      return { open: true, search: '' };
    case 'close':
      return { open: false, search: '' };
    case 'search':
      return { ...state, search: action.text };
  }
}
