import type { OptionSet } from '@connection-portal/api-types/option-sets';

import { apiFetch } from './client';

export function getOptionSets(): Promise<OptionSet[]> {
  return apiFetch<OptionSet[]>('/option-sets');
}
