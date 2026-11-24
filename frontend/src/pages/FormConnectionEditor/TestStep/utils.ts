// The test step's pure helpers (specs/004-rule-test-personas, S8)
import type { Combinator } from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import { sameValue } from '@konnekt/rules/branches';
import { parseDayNumber } from '@konnekt/rules/checks/calendar';
import { listOf } from '@konnekt/rules/checks/findingMessages';
import { optionsOf } from '@konnekt/rules/conditions';
import { type Language, LANGUAGES } from '@konnekt/rules/language';
import { GROUP_SUBTITLES } from '@konnekt/rules/personas/constants';
import {
  classesSinceOf,
  displayDateOf,
  firstName,
  runStatusOf,
  validUntilOf,
} from '@konnekt/rules/personas/messages';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  PersonaValue,
  ResultRow,
} from '@konnekt/rules/personas/types';
import { ageOn, type DataRow, isEmptyValue, isExpiryDate } from '@konnekt/rules/personas/values';

import { GROUP_FRAME_COPY } from '../../../components/GroupFrame/constants';
import type { ValueChoice } from '../../../components/ValuesPicker/types';
import type { RulesBranch } from '../RulesStep/types';
import { DATE_ENTRY_DIGITS, EDIT_DATA_COPY, ISSUE_DATE_PART, TEST_STEP_COPY } from './constants';
import type {
  DataRowGroup,
  DateEntry,
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
 * How the panel writes a value in `language` (S8.4; design-notes §4.1; spec 008 FR-024, C6):
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
  optionSets: OptionSet[],
  language: Language
): string {
  if (value === undefined || value === null || isEmptyValue(value)) {
    return TEST_STEP_COPY[language].notShared;
  }
  if (field.kind === 'date' && typeof value === 'string') {
    return isExpiryDate(field) ? validUntilOf(value, language) : formatDisplayDate(value);
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
 * How the data card writes one of `dataRowsOf()`'s rows in `language` (spec 008 FR-024, CLAR
 * #46): a row of
 * licence classes as "B, BE since 02.05.2010" (the classes by `valueTextOf()`, "B, BE" without a
 * shown issue date, "Not shared" without a class), any other row as `valueTextOf()` writes its
 * value
 */
export function dataRowTextOf(
  row: DataRow,
  values: Persona['values'],
  optionSets: OptionSet[],
  language: Language
): string {
  if (row.classes === null) {
    return valueTextOf(row.field, values[row.field.key], optionSets, language);
  }
  const classes = valueTextOf(row.field, row.classes, optionSets, language);
  return row.classes.length === 0 ? classes : classesSinceOf(classes, row.since, language);
}

/**
 * A data row's label (spec 008 CLAR #46, cosmetic 12; U65 7057:59072, U66 #14): "Date of birth"
 * for the date of birth, which the rules call "Date of birth (Age)"; "Licence classes" for a row
 * of classes; any other row its field's label
 */
export function dataRowLabelOf(row: DataRow, language: Language): string {
  return row.field.dateOfBirth ? TEST_STEP_COPY[language].dateOfBirth : row.field.label;
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
 * A result row's statement as the step shows it in `language`: a rule's as the rules package
 * words it (C3); a group's as its frame on the rules step says how its members combine, "All
 * rules must be met" / "At least one rule must be met" (FR-051 (32); `GROUP_FRAME_COPY`), in place
 * of the rules package's `GROUP_SUBTITLES` ("All of these must be met"), which `rules/src/` keeps.
 * The group's statement is recognised in either language, as the results were composed in the
 * language of their moment
 */
export function resultStatementOf(
  row: Pick<ResultRow, 'type' | 'statement'>,
  language: Language
): string {
  if (row.type !== 'group') {
    return row.statement;
  }
  const operator = COMBINATORS.find((entry) =>
    LANGUAGES.some((composed) => GROUP_SUBTITLES[composed][entry] === row.statement)
  );
  return operator === undefined ? row.statement : GROUP_FRAME_COPY[language].subtitles[operator];
}

/**
 * The loading status of a run in `language` (S8.8; design-notes §8), from the personas of its free
 * slots and of its filled slots, in the chips' order: "Creating new data for Mia…", "Adding new data for Mia
 * and Anna…", "Creating 3 sample citizens…" when all three are free; '' without a run, so that
 * the next run's text is announced when it starts
 */
export function runStatusTextOf(
  run: GenerationRun | null,
  personas: readonly Persona[],
  language: Language
): string {
  if (run === null) {
    return '';
  }
  const slotsOf = (kind: GenerationRun['slots'][number]) =>
    personas.filter((_, index) => run.slots[index] === kind);
  return runStatusOf(slotsOf('free'), slotsOf('filled'), language);
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
 * A date field's entry after a change, with the dots put in as the user types `dd.mm.yyyy` (bug
 * v5-ui-fixes B5, 2026-11-18), and where the caret goes. `previous` is the field's text before the
 * change, `next` the browser's after it, `caret` the browser's caret in `next`, and `deletion`
 * which way a deletion went (Delete is `forward`; Backspace, and a keyboard that doesn't say, are
 * `backward`). The rules, in this order:
 * 1. A deletion that removed only a dot (not the last character) removes the digit beside it
 *    instead and keeps the dot: Backspace the digit before it, Delete the digit after it; the caret
 *    goes where that digit was.
 * 2. Text that isn't only digits and dots (letters, `-`, spaces, a pasted ISO date) stays as typed,
 *    for `parseDisplayDate()` to refuse.
 * 3. When every part but the last (split at the dots, at most three) has exactly two digits, the
 *    text is rebuilt from its digits as `dd.mm.yyyy`: a dot before the 3rd and the 5th digit, at
 *    most 8 digits (a 9th is dropped), and a dot typed right after the 2nd or 4th digit stays. The
 *    caret goes after as many digits as before, and past a dot the rebuild put right after it.
 * 4. Otherwise (an edit in the middle left a part short or long: `08.1.2007`) the text stays as
 *    typed until the user completes it.
 */
export function dateEntryOf(
  previous: string,
  next: string,
  caret: number,
  deletion: 'backward' | 'forward' = 'backward'
): DateEntry {
  const removedDot = removedDotOf(previous, next, caret, deletion);
  if (removedDot) {
    return removedDot;
  }
  const parts = next.split('.');
  const fits =
    /^[\d.]*$/.test(next) &&
    parts.length <= 3 &&
    parts.slice(0, -1).every((part) => /^\d{2}$/.test(part));
  if (!fits) {
    return { text: next, caret };
  }
  const digits = next.replaceAll('.', '').slice(0, DATE_ENTRY_DIGITS);
  let text = digits.slice(0, 2);
  if (digits.length > 2) {
    text += `.${digits.slice(2, 4)}`;
  }
  if (digits.length > 4) {
    text += `.${digits.slice(4)}`;
  }
  if (next.endsWith('.') && (digits.length === 2 || digits.length === 4)) {
    text += '.';
  }
  const digitsBefore = next.slice(0, caret).replaceAll('.', '').length;
  let at = indexAfterDigits(text, digitsBefore);
  if (text[at] === '.' && next[caret] !== '.') {
    at += 1;
  }
  return { text, caret: at };
}

/** Rule 1 of `dateEntryOf()`: a deletion that took only a dot takes the digit beside it instead */
function removedDotOf(
  previous: string,
  next: string,
  caret: number,
  deletion: 'backward' | 'forward'
): DateEntry | null {
  const tookOneDot =
    next.length === previous.length - 1 &&
    previous[caret] === '.' &&
    caret < previous.length - 1 &&
    previous.slice(0, caret) + previous.slice(caret + 1) === next;
  if (!tookOneDot) {
    return null;
  }
  if (deletion === 'backward' && /\d/.test(previous[caret - 1] ?? '')) {
    return { text: previous.slice(0, caret - 1) + previous.slice(caret), caret: caret - 1 };
  }
  if (deletion === 'forward' && /\d/.test(previous[caret + 1] ?? '')) {
    return { text: previous.slice(0, caret + 1) + previous.slice(caret + 2), caret: caret + 1 };
  }
  return null;
}

/** The index right after the `count`th digit of `text`: 0 for none, the end when it has fewer */
function indexAfterDigits(text: string, count: number): number {
  if (count === 0) {
    return 0;
  }
  let seen = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (/\d/.test(text[index])) {
      seen += 1;
      if (seen === count) {
        return index + 1;
      }
    }
  }
  return text.length;
}

/**
 * A `dd.mm.yyyy` entry as `YYYY-MM-DD`; an empty entry gives `null` (surrounding spaces ignored);
 * anything else, including a date the calendar doesn't have, such as 31.02.2007 or year 0000,
 * gives the error in `language` (FR-008). `dd.mm.yyyy` in both languages (spec 009, FR-012)
 */
export function parseDisplayDate(text: string, language: Language): ParseResult<string> {
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
  return { ok: false, error: TEST_STEP_COPY[language].enterDate };
}

/**
 * Digits as a number; an empty entry gives `null`; letters, decimals, signs and anything else
 * give the error in `language` (FR-008, W11)
 */
export function parseWholeNumber(text: string, language: Language): ParseResult<number> {
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
  return { ok: false, error: TEST_STEP_COPY[language].enterWholeNumber };
}

/**
 * A date of birth that gives `age` on `today` (`YYYY-MM-DD`), keeping the day and month of
 * `current`; a 29 February becomes 1 March in a year without it (R12), and where no date with that day and
 * month gives `age`, today's, or 28 February, are kept. With a `current` that isn't
 * a date, today's day and month are kept (design-notes §5.2). When no date of birth from year 1 on
 * gives `age`, the error "Enter a smaller age, e.g. 25." in `language` (design-notes §5.2). For
 * every age it accepts, `ageOn(result, today) === age` (FR-007)
 */
export function dateOfBirthForAge(
  age: number,
  current: string | null | undefined,
  today: string,
  language: Language
): ParseResult<string> {
  const tooLarge: ParseResult<string> = {
    ok: false,
    error: TEST_STEP_COPY[language].enterSmallerAge,
  };
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

/**
 * "Enter a name." in `language` for a name that is empty after trimming, `null` for a valid one
 * (FR-009)
 */
export function nameProblem(text: string, language: Language): string | null {
  return text.trim() === '' ? TEST_STEP_COPY[language].enterName : null;
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
 * The edit-data dialog's drafts with their errors in `language` (spec 009, FR-003): a draft keeps
 * the error of the moment it was typed, so after a switch each invalid draft's error is worded
 * again from its text, as the dialog checked it (the name, a field's entry, an "Age today" with
 * the date of birth it would change, `values` holding its last valid value). A valid draft, and
 * one whose field isn't in `fields`, stays as it is; the verdict never changes
 */
export function draftsInLanguage(
  drafts: DraftsState,
  fields: readonly PersonaField[],
  values: Persona['values'],
  today: string,
  language: Language
): DraftsState {
  const errorOf = (key: string, text: string): string | null => {
    if (key === NAME_DRAFT_KEY) {
      return nameProblem(text, language);
    }
    const field = fields.find((entry) => entry.key === key);
    if (field) {
      const parsed = parseEntry(field.kind, text, language);
      return parsed.ok ? null : parsed.error;
    }
    const aged = fields.find((entry) => ageDraftKey(entry.key) === key);
    if (!aged) {
      return null;
    }
    const entered = parseWholeNumber(text, language);
    if (!entered.ok || entered.value === null) {
      return entered.ok ? null : entered.error;
    }
    const current = values[aged.key];
    const born = dateOfBirthForAge(
      entered.value,
      typeof current === 'string' ? current : null,
      today,
      language
    );
    return born.ok ? null : born.error;
  };
  return Object.fromEntries(
    Object.entries(drafts).map(([key, draft]) => [
      key,
      draft.error === null ? draft : { ...draft, error: errorOf(key, draft.text) ?? draft.error },
    ])
  );
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
 * A field's label in the edit-data dialog in `language` (spec 008 F40; U66 7058:60656,
 * 7058:60662): "Date of birth" for the date of birth (the rules say "Date of birth (Age)"), "Class
 * B since" for a licence class's issue date (the rules say "Licence class B – Issue date"), any
 * other field its label as the rules name it
 */
export function editorLabelOf(field: PersonaField, language: Language): string {
  if (field.dateOfBirth) {
    return TEST_STEP_COPY[language].dateOfBirth;
  }
  if (field.licenceClass !== null && field.part === ISSUE_DATE_PART) {
    return EDIT_DATA_COPY[language].classSince(field.licenceClass);
  }
  return field.label;
}

/**
 * The toast after "Save and test" in `language` (spec 008 FR-042; U67 7058:61203): "Results
 * updated.", then
 * the top-level rules and groups of the shown variant that the change made met, "Mia now meets
 * Rule 01.", and those it made unmet, "Mia no longer meets Rule 02 and Rule 03.", each list in
 * the order of `after`. `before` and `after` are the variant's result rows (`ResultView.rows`)
 * before and after the change; an item in only one of them is left out
 */
export function savedToastOf(
  before: readonly Pick<ResultRow, 'itemId' | 'name' | 'status'>[],
  after: readonly Pick<ResultRow, 'itemId' | 'name' | 'status'>[],
  persona: Pick<Persona, 'name'>,
  language: Language
): string {
  const copy = TEST_STEP_COPY[language];
  const sentences = EDIT_DATA_COPY[language];
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
    copy.resultsUpdated,
    ...(nowMet.length > 0 ? [sentences.nowMeets(name, listOf(nowMet, 'and', language))] : []),
    ...(noLonger.length > 0
      ? [sentences.noLongerMeets(name, listOf(noLonger, 'and', language))]
      : []),
  ].join(' ');
}

/**
 * What a field's entry gives (T043, T044): text as typed, with an empty text as `null`; a whole
 * number for a number field; a date as `YYYY-MM-DD`; otherwise the error to show under the field,
 * in `language` (FR-008). A date or a number takes surrounding spaces; a text keeps them (SC-001)
 */
export function parseEntry(
  kind: PersonaField['kind'],
  text: string,
  language: Language
): ParseResult<PersonaValue> {
  switch (kind) {
    case 'number':
      return parseWholeNumber(text, language);
    case 'date':
      return parseDisplayDate(text, language);
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
