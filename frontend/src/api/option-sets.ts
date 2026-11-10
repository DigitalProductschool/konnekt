import type { OptionSet } from '@connection-portal/api-types/option-sets';
import type { Language } from '@connection-portal/rules/language';

import { apiFetch } from './client';

/** The value sets, their labels in `language` (default: the website's language). */
export function getOptionSets(language?: Language): Promise<OptionSet[]> {
  return apiFetch<OptionSet[]>('/option-sets', { language });
}
