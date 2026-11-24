import type { OptionSet } from '@konnekt/api-types/option-sets';
import type { Language } from '@konnekt/rules/language';

import { apiFetch } from './client';

/** The value sets, their labels in `language` (default: the website's language). */
export function getOptionSets(language?: Language): Promise<OptionSet[]> {
  return apiFetch<OptionSet[]>('/option-sets', { language });
}
