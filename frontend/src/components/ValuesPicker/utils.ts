import type { OptionSet } from '../../types/option-sets';
import type { ValueChoice } from './types';

/** A value set's options for the values menu; licence classes show code and description. */
export function valueChoices(optionSet: OptionSet | null): ValueChoice[] {
  return (optionSet?.options ?? []).map((option) => ({
    value: option.value,
    label: option.label,
    description: option.description,
  }));
}

/** Whether a choice matches a menu's search, ignoring letter case. */
export function matchesSearch(text: string, search: string): boolean {
  return text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
}

/** The labels of the chosen values: licence classes by their code (F32). */
export function chosenValueLabels(
  values: (string | number)[],
  choices: ValueChoice[]
): { value: string | number; label: string }[] {
  return values.map((value) => ({
    value,
    label: choices.find((choice) => choice.value === value)?.label ?? String(value),
  }));
}
