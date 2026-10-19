import { NOT_FOUND_COPY } from '../NotFound/constants';
import { LOAD_STATE_COPY } from './constants';
import type { FormConnectionLoadStateProps } from './types';

/** The tab title while the connection isn't there. */
export function documentTitleOf(state: FormConnectionLoadStateProps['state']): string {
  switch (state.status) {
    case 'notFound':
      return NOT_FOUND_COPY.title;
    case 'failed':
      return LOAD_STATE_COPY.errorTitle;
    case 'loading':
      return LOAD_STATE_COPY.loading;
  }
}
