// The test step's pure helpers (specs/004-rule-test-personas, S8)
import type { ValueChoice } from '../../../components/ValuesPicker/types';
import type { OptionSet } from '../../../types/option-sets';
import { parseDayNumber } from '../../../utils/rules/checks/calendar';
import { optionsOf } from '../../../utils/rules/conditions';
import { ageSuffixOf, runStatusOf } from '../../../utils/rules/personas/messages';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  PersonaValue,
} from '../../../utils/rules/personas/types';
import { ageOn, isEmptyValue } from '../../../utils/rules/personas/values';
import type { RulesBranch } from '../RulesStep/types';
import { TEST_STEP_COPY } from './constants';
import type {
  DocumentGroup,
  DraftsAction,
  DraftsState,
  ParseResult,
  PickerAction,
  PickerState,
} from './types';

/** `YYYY-MM-DD` as the panel writes dates, `dd.mm.yyyy` ("08.07.2007"); anything else unchanged */
export function formatDisplayDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) {
    return iso;
  }
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
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
 * How the panel writes a value (S8.4; design-notes §4.1):
 * - an empty value, of any kind: "Not shared";
 * - a date as `dd.mm.yyyy`, a date of birth with its age: "08.07.2007 (age 19)" (F10);
 * - an enum by its labels, several in the value set's order: "German", "B, BE" (F11); a value
 *   outside the set as it is, after the others;
 * - text and numbers as stored
 */
export function valueTextOf(
  field: PersonaField,
  value: PersonaValue | undefined,
  optionSets: OptionSet[],
  today: string
): string {
  if (value === undefined || value === null || isEmptyValue(value)) {
    return TEST_STEP_COPY.notShared;
  }
  if (field.kind === 'date' && typeof value === 'string') {
    return formatDisplayDate(value) + (field.dateOfBirth ? ageSuffixOf(value, today) : '');
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
 * The loading status of a run (S8.8; design-notes §8), from the personas of its free slots and of
 * its filled slots, in the chips' order: "Creating new data for Mia…", "Adding new data for Mia
 * and Anna…", "Creating 3 sample applicants…" when all three are free; '' without a run, so that
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
 * Whether the step shows frame 18 (S8.8): the first generation, "Generate all again" and "Try
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
 * The panel's drafts by key, with their errors (research R12; design-notes §5.3). "Done" and
 * 'reset' drop the invalid ones: the persona kept its last valid value all along
 */
export function draftsReducer(state: DraftsState, action: DraftsAction): DraftsState {
  switch (action.type) {
    case 'edit':
      return { ...state, [action.key]: { text: action.text, error: action.error } };
    case 'done':
      return Object.fromEntries(Object.entries(state).filter(([, draft]) => draft.error === null));
    case 'reset':
      return {};
  }
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
