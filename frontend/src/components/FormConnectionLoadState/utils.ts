import type { Language } from '@connection-portal/rules/language';

import { NOT_FOUND_COPY } from '../NotFound/constants';
import { LOAD_STATE_COPY } from './constants';
import type { FormConnectionLoadStateProps } from './types';

/** The tab title while the connection isn't there, in the given language. */
export function documentTitleOf(
  state: FormConnectionLoadStateProps['state'],
  language: Language
): string {
  switch (state.status) {
    case 'notFound':
      return NOT_FOUND_COPY[language].title;
    case 'failed':
      return LOAD_STATE_COPY[language].errorTitle;
    case 'loading':
      return LOAD_STATE_COPY[language].loading;
  }
}
