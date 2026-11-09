import type { OptionSet } from '@connection-portal/api-types/option-sets';

import { VALUES_MENU_METRICS } from './constants';
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

/**
 * The menu's height with every option on one line, before it opens: the frame, the search
 * field where there is one, the options, the footer where it shows, and the "Done" row
 */
export function valuesMenuHeight(
  options: number,
  classes: boolean,
  searchable: boolean,
  footer: boolean
): number {
  const m = VALUES_MENU_METRICS;
  const list = classes
    ? options * m.classRow + Math.max(options - 1, 0) * m.gap
    : options * m.valueRow + m.valueListPadding;
  const parts = [
    ...(searchable ? [m.search] : []),
    list,
    ...(footer ? [m.divider, m.footer] : []),
    m.actions,
  ];
  return (
    m.frame + parts.reduce((sum, part) => sum + part, 0) + Math.max(parts.length - 1, 0) * m.gap
  );
}
