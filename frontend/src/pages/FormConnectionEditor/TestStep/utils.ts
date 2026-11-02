// The test step's pure helpers (specs/004-rule-test-personas, S8)
import type { OptionSet } from '../../../types/option-sets';
import { optionsOf } from '../../../utils/rules/conditions';
import { ageSuffixOf, runStatusOf } from '../../../utils/rules/personas/messages';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  PersonaValue,
} from '../../../utils/rules/personas/types';
import { isEmptyValue } from '../../../utils/rules/personas/values';
import type { RulesBranch } from '../RulesStep/types';
import { TEST_STEP_COPY } from './constants';
import type { DocumentGroup } from './types';

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
