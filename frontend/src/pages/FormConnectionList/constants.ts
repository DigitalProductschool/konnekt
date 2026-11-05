import type { ListState } from './types';

export const LIST_COPY = {
  pageTitle: 'Your connections',
  title: 'Your connections',
  hint: 'Open a connection to copy its links, or connect another form.',
  newConnection: 'New connection',
  caption: (count: number) => `Connections (${count})`,
  loading: 'Loading your connections…',
  emptyTitle: 'No connections yet',
  emptyText:
    'Create your first connection. Applicants of its form can then share verified data from their EUDI Wallet.',
  errorTitle: 'Couldn’t load your connections',
  errorText: 'Check your connection and try again.',
  retry: 'Try again',
  edited: (date: string) => `Edited ${date}`,
  edit: 'Edit',
  view: 'View',
  saved: (date: string) => `Saved ${date}`,
  continue: 'Continue',
  hintWithDrafts: 'Pick up your draft or connect another form.',
  draftSaved: (name: string) => `Draft ${name} saved.`,
};

export const INITIAL_LIST_STATE: ListState = { status: 'loading', attempt: 0 };

// "5 Oct 2026", as in the design
export const EDITED_DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
