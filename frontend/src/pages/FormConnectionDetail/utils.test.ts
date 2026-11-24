import type { DocumentField } from '@konnekt/api-types/document-types';
import type {
  ActivityActor,
  ActivityEntry,
  ActivityKind,
  ActivityPage,
  Branch,
  BranchInput,
  FormConnection,
  GroupItem,
  Mark,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import type { BranchCheck, ItemFinding } from '@konnekt/rules/checks/types';
import { mainBranch, rule, US1_RULES } from '@konnekt/rules/testData';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../api/client';
import {
  INITIAL_ACTIONS_STATE,
  INITIAL_ACTIVITY_CARD_STATE,
  INITIAL_DRAFT_DELETE_STATE,
} from './constants';
import type { ActivityCardAction, ActivityCardState, DatePillSource } from './types';
import {
  accordionBodyClassesOf,
  actionsReducer,
  activityCardReducer,
  activityClosedLineOf,
  activityDateTimeOf,
  activityEntriesOf,
  activityEventOf,
  activityPersonOf,
  activityRequestOf,
  activityStatusOf,
  confirmationOf,
  connectionMenuOf,
  datePillOf,
  deleteDraftDialogOf,
  deleteDraftErrorOf,
  deleteDraftNoticeOf,
  dialogCopyOf,
  draftDeleteReducer,
  editedLineOf,
  editEntryCopyOf,
  hasOlderActivity,
  initialAccordionOf,
  isNoAnswer,
  isShownConnection,
  keyedBranchesOf,
  linksCountsOf,
  overviewStateAfterDeletion,
  reactivateHintOf,
  reactivatePlanOf,
  reactivateSummaryOf,
  requestedDocumentsOf,
  resultLinksOf,
  rulesCountsOf,
  startDateChoiceOf,
  startDateHintOf,
  startDateNowLabelOf,
  startDatePlanOf,
  statusBandOf,
  successMessageOf,
  summaryCountsOf,
  summaryFindingsOf,
  toggleAccordion,
} from './utils';

function branch(id: string, name: string, isMain = false): Branch {
  return {
    id,
    name,
    description: isMain ? null : `About ${name}`,
    origin: isMain ? 'main' : 'based',
    operator: 'and',
    operator_mark: null,
    items: [],
    is_main: isMain,
    pull_url: isMain
      ? 'https://connect.example/api/connect/fc/requests/{reference}'
      : `https://connect.example/api/connect/fc/branches/${id}/requests/{reference}`,
  };
}

function connection(branches: Branch[]): FormConnection {
  return {
    status: 'published',
    id: 'fc',
    name: 'Passenger transport licence',
    description: 'PT-1',
    is_active: true,
    documents: [],
    trigger_url: 'https://connect.example/api/connect/fc/requests',
    pull_url: 'https://connect.example/api/connect/fc/requests/{reference}',
    branches,
    rule_set_version: 1,
    version_fingerprint: '62D0-715F-01D1',
    next_rule_number: 1,
    next_group_number: 1,
    created_at: '2026-10-25T10:00:00Z',
    updated_at: '2026-10-25T10:00:00Z',
    state: 'live',
    published_at: '2026-10-25T10:00:00Z',
    activated_at: '2026-10-25T10:00:00Z',
    deactivated_at: null,
    start_date: null,
    last_activity: null,
  };
}

describe('resultLinksOf (FR-026; F24, W2)', () => {
  it('shows Standard’s pull URL as spec 001 does, without a label, while it is the only one', () => {
    expect(resultLinksOf(connection([branch('main', 'Standard', true)]))).toEqual([
      {
        key: 'result',
        url: 'https://connect.example/api/connect/fc/requests/{reference}',
        branch: null,
      },
    ]);
  });

  it('labels every variant’s own pull URL, Standard first, from its pull_url', () => {
    const links = resultLinksOf(
      connection([branch('main', 'Standard', true), branch('b-1', 'Ambulance')])
    );
    expect(links.map(({ key, url, branch: labelled }) => [key, url, labelled?.name])).toEqual([
      ['main', 'https://connect.example/api/connect/fc/requests/{reference}', 'Standard'],
      [
        'b-1',
        'https://connect.example/api/connect/fc/branches/b-1/requests/{reference}',
        'Ambulance',
      ],
    ]);
  });
});

function marked<T extends RuleTreeItem>(item: T, mark: Mark | null): T {
  return { ...item, mark };
}

function group(number: number, items: RuleTreeItem[]): GroupItem {
  return {
    type: 'group',
    id: `group-${number}`,
    name: `Group 0${number}`,
    mark: null,
    operator: 'or',
    message: null,
    items,
  };
}

function variant(origin: BranchInput['origin'], items: RuleTreeItem[]): BranchInput {
  return { ...mainBranch(items), name: 'Ambulance', origin };
}

describe('rulesCountsOf (Figma 10.11, B8)', () => {
  it('counts Standard as a variant, and no rules as 0 rules', () => {
    expect(rulesCountsOf([mainBranch([])], 'en')).toBe('1\u00a0variant · 0\u00a0rules');
  });

  it('uses the singular for one rule', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])], 'en')).toBe(
      '1\u00a0variant · 1\u00a0rule'
    );
  });

  it('counts the rules in groups and sub-groups one by one, not the groups', () => {
    const items = [
      rule(1, null, null),
      group(1, [rule(2, null, null), group(2, [rule(3, null, null), rule(4, null, null)])]),
    ];
    expect(rulesCountsOf([mainBranch(items)], 'en')).toBe('1\u00a0variant · 4\u00a0rules');
  });

  it('counts a rule that variants inherit, change or remove once, and their own rules too', () => {
    const standard = [rule(1, null, null), rule(2, null, null), rule(3, null, null)];
    const ambulance = variant('based', [
      rule(1, null, null),
      marked(rule(2, null, null), 'changed'),
      marked(rule(3, null, null), 'removed'),
      marked(rule(4, null, null), 'added'),
    ]);
    const taxi = variant('empty', [rule(5, null, null), rule(6, null, null)]);
    expect(rulesCountsOf([mainBranch(standard), ambulance, taxi], 'en')).toBe(
      '3\u00a0variants · 6\u00a0rules'
    );
  });

  it('skips a rule that only a removed item holds', () => {
    const removedGroup = marked(group(1, [rule(1, null, null), rule(2, null, null)]), 'removed');
    const items = [removedGroup, marked(rule(3, null, null), 'removed'), rule(4, null, null)];
    expect(rulesCountsOf([variant('empty', items)], 'en')).toBe('1\u00a0variant · 1\u00a0rule');
  });

  it('counts in German with one and other forms (spec 009)', () => {
    expect(rulesCountsOf([mainBranch([rule(1, null, null)])], 'de')).toBe(
      '1\u00a0Variante · 1\u00a0Regel'
    );
    const items = [rule(1, null, null), rule(2, null, null)];
    expect(rulesCountsOf([mainBranch(items), variant('empty', [])], 'de')).toBe(
      '2\u00a0Varianten · 2\u00a0Regeln'
    );
  });
});

describe('linksCountsOf (FR-052f)', () => {
  it('counts the request link and one result link per variant', () => {
    const withVariants = connection([
      branch('b1', 'Standard', true),
      branch('b2', 'Ambulance'),
      branch('b3', 'School transport'),
    ]);
    expect(linksCountsOf(withVariants, 'en')).toBe('1 request link · 3 result links');
  });

  it('says "1 result link" with Standard only', () => {
    expect(linksCountsOf(connection([branch('b1', 'Standard', true)]), 'en')).toBe(
      '1 request link · 1 result link'
    );
  });

  it('counts in German (spec 009)', () => {
    expect(linksCountsOf(connection([branch('b1', 'Standard', true)]), 'de')).toBe(
      '1 Anfragelink · 1 Ergebnislink'
    );
    expect(
      linksCountsOf(connection([branch('b1', 'Standard', true), branch('b2', 'Ambulance')]), 'de')
    ).toBe('1 Anfragelink · 2 Ergebnislinks');
  });
});

describe('initialAccordionOf and toggleAccordion (FR-046, F50; spec 010 FR-022, F40)', () => {
  it('opens the links right after publishing or scheduling', () => {
    expect(initialAccordionOf('published')).toBe('links');
  });

  // Spec 010 FR-022 (Clarification 2026-11-10 #34, E4): saving an edit lands with Links open too
  it('opens the links after saving an edit', () => {
    expect(initialAccordionOf('saved')).toBe('links');
  });

  it('opens the summary on any other arrival, as from the overview', () => {
    expect(initialAccordionOf(null)).toBe('summary');
  });

  it('keeps one accordion open at a time', () => {
    expect(toggleAccordion('summary', 'links')).toBe('links');
    expect(toggleAccordion('links', 'links')).toBeNull();
    expect(toggleAccordion(null, 'summary')).toBe('summary');
    expect(toggleAccordion('links', 'summary')).toBe('summary');
  });

  it('closes links or summary when the activity opens, and the activity when another opens', () => {
    expect(toggleAccordion('links', 'activity')).toBe('activity');
    expect(toggleAccordion('summary', 'activity')).toBe('activity');
    expect(toggleAccordion(null, 'activity')).toBe('activity');
    expect(toggleAccordion('activity', 'activity')).toBeNull();
    expect(toggleAccordion('activity', 'links')).toBe('links');
    expect(toggleAccordion('activity', 'summary')).toBe('summary');
  });
});

// Bug published-sticky-bar: a clip that isn't positioned lets the closed cards' `sr-only` texts
// out, and they lengthen the page below the sticky footer
describe('accordionBodyClassesOf (FR-046, V6)', () => {
  const classesOf = (clipped: boolean) => accordionBodyClassesOf(clipped).split(/\s+/);

  it('positions the body whenever it clips, so the clip holds its absolute descendants', () => {
    expect(classesOf(true)).toEqual(
      expect.arrayContaining(['min-h-0', 'relative', 'overflow-hidden'])
    );
  });

  it('neither clips nor positions the body once it is open and settled', () => {
    expect(classesOf(false)).toEqual(['min-h-0']);
  });
});

describe('editedLineOf (S16, FR-049)', () => {
  it('writes the overview’s date with the 24-hour time of the browser’s time zone', () => {
    const editedAt = new Date(2026, 9, 3, 14, 32).toISOString();
    expect(editedLineOf(editedAt, 'en')).toBe('Edited 03.10.2026, 14:32');
  });

  it('pads the day, month, hour and minutes, and writes midnight as 00', () => {
    expect(editedLineOf(new Date(2026, 0, 9, 9, 5).toISOString(), 'en')).toBe(
      'Edited 09.01.2026, 09:05'
    );
    expect(editedLineOf(new Date(2026, 0, 9, 0, 0).toISOString(), 'en')).toBe(
      'Edited 09.01.2026, 00:00'
    );
  });

  it('writes the same date and 24-hour time after the German word (spec 009, R5)', () => {
    expect(editedLineOf(new Date(2026, 9, 3, 14, 32).toISOString(), 'de')).toBe(
      'Bearbeitet 03.10.2026, 14:32'
    );
    expect(editedLineOf(new Date(2026, 0, 9, 0, 0).toISOString(), 'de')).toBe(
      'Bearbeitet 09.01.2026, 00:00'
    );
  });
});

// Spec 010, FR-015, FR-020, FR-021 (data-model §1.4; C1): the date pill's line by state
describe('datePillOf (FR-015, FR-020, FR-021)', () => {
  const updatedAt = new Date(2026, 10, 4, 9, 15).toISOString();
  const live: DatePillSource = {
    state: 'live',
    updated_at: updatedAt,
    published_at: new Date(2026, 8, 12, 8, 0).toISOString(),
    activated_at: new Date(2026, 9, 23, 14, 32).toISOString(),
    deactivated_at: null,
    start_date: null,
  };
  const scheduled: DatePillSource = {
    ...live,
    state: 'scheduled',
    activated_at: null,
    start_date: '2026-12-01',
  };
  const deactivated: DatePillSource = {
    ...live,
    state: 'deactivated',
    deactivated_at: new Date(2026, 9, 24, 10, 5).toISOString(),
  };
  const draft: DatePillSource = {
    state: 'draft',
    updated_at: new Date(2026, 9, 3, 14, 32).toISOString(),
  };

  it('writes each state’s line with the date and the 24-hour time (US2-AS4, US2-AS5)', () => {
    expect(datePillOf(live, 'en')).toBe('Active since 23.10.2026, 14:32');
    expect(datePillOf(scheduled, 'en')).toBe('Active from 01.12.2026, 00:00');
    expect(datePillOf(deactivated, 'en')).toBe('Deactivated since 24.10.2026, 10:05');
    expect(datePillOf(draft, 'en')).toBe('Edited 03.10.2026, 14:32');
  });

  it('writes the glossary’s German with the same dates (spec 009, FR-012)', () => {
    expect(datePillOf(live, 'de')).toBe('Aktiv seit 23.10.2026, 14:32');
    expect(datePillOf(scheduled, 'de')).toBe('Aktiv ab 01.12.2026, 00:00');
    expect(datePillOf(deactivated, 'de')).toBe('Deaktiviert seit 24.10.2026, 10:05');
    expect(datePillOf(draft, 'de')).toBe('Bearbeitet 03.10.2026, 14:32');
  });

  it('reads "Active since" from the last activation, not the publication (US2-AS6, FR-018)', () => {
    const reactivated = { ...live, activated_at: new Date(2026, 10, 2, 7, 45).toISOString() };
    expect(datePillOf(reactivated, 'en')).toBe('Active since 02.11.2026, 07:45');
  });

  it('reads the start date as written in every time zone (FR-020)', () => {
    try {
      for (const zone of ['America/New_York', 'Pacific/Honolulu', 'Pacific/Kiritimati']) {
        vi.stubEnv('TZ', zone);
        expect(new Date('2026-12-01T00:00:00Z').getTimezoneOffset()).not.toBe(0);
        expect(datePillOf(scheduled, 'en')).toBe('Active from 01.12.2026, 00:00');
        expect(datePillOf(scheduled, 'de')).toBe('Aktiv ab 01.12.2026, 00:00');
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('never leaves the pill empty when a state’s date is missing (FR-021)', () => {
    expect(datePillOf({ ...live, activated_at: null }, 'en')).toBe(
      'Active since 12.09.2026, 08:00'
    );
    expect(datePillOf({ ...live, activated_at: null, published_at: undefined }, 'en')).toBe(
      'Edited 04.11.2026, 09:15'
    );
    expect(datePillOf({ ...scheduled, start_date: null }, 'en')).toBe('Edited 04.11.2026, 09:15');
    expect(datePillOf({ ...deactivated, deactivated_at: null }, 'en')).toBe(
      'Deactivated since 04.11.2026, 09:15'
    );
  });
});

describe('statusBandOf (C1, S15)', () => {
  it('gives each published state its tone and sentences', () => {
    expect(statusBandOf('live', 'en')).toEqual({
      tone: 'active',
      title: 'Your connection is active',
      text: 'Citizens can now share their data with you. Add the links below to your service.',
    });
    expect(statusBandOf('scheduled', 'en')).toEqual({
      tone: 'scheduled',
      title: 'Your connection is scheduled',
      text: 'The links are ready to be added to your service. They become active on the scheduled date below.',
    });
    expect(statusBandOf('deactivated', 'en')).toEqual({
      tone: 'deactivated',
      title: 'Connection deactivated',
      text: 'Citizens can’t start a new request. Your settings are saved.',
    });
  });

  it('words the scheduled band in German', () => {
    expect(statusBandOf('scheduled', 'de').title).toBe('Ihre Anbindung ist geplant');
  });
});

describe('deleteDraftErrorOf (S6)', () => {
  it('says that the draft has been published meanwhile for a 409 draft_published', () => {
    const error = new ApiError(409, {
      error: 'draft_published',
      message: 'This draft has been published since you opened it.',
    });
    expect(deleteDraftErrorOf(error, 'en')).toEqual({
      kind: 'published',
      notice: { message: 'This draft has been published since you opened it.' },
    });
  });

  it('says that the draft was already deleted for a 404', () => {
    const error = new ApiError(404, { error: 'Not found', message: 'Not found' });
    expect(deleteDraftErrorOf(error, 'en')).toEqual({
      kind: 'deleted',
      notice: { message: 'This draft has already been deleted.' },
    });
  });

  it('passes another 409 and a 5xx through, with the error ID', () => {
    const conflict = new ApiError(409, { error: 'not_published', message: 'Not a draft.' });
    expect(deleteDraftErrorOf(conflict, 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Not a draft.', error_id: undefined },
    });
    const serverError = new ApiError(500, {
      error: 'Internal server error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(deleteDraftErrorOf(serverError, 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Something went wrong.', error_id: 'abc123' },
    });
  });

  it('says that nothing changed after a network failure', () => {
    expect(deleteDraftErrorOf(new TypeError('Failed to fetch'), 'en')).toEqual({
      kind: 'failed',
      notice: { message: 'Nothing changed. Check your connection and try again.' },
    });
  });

  it('words its own messages in German, and passes the API’s through (spec 009)', () => {
    expect(
      deleteDraftErrorOf(new ApiError(409, { error: 'draft_published', message: '' }), 'de')
    ).toEqual({
      kind: 'published',
      notice: { message: 'Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben.' },
    });
    expect(
      deleteDraftErrorOf(new ApiError(404, { error: 'Not found', message: '' }), 'de').notice
    ).toEqual({ message: 'Dieser Entwurf wurde bereits gelöscht.' });
    expect(deleteDraftErrorOf(new TypeError('Failed to fetch'), 'de').notice).toEqual({
      message:
        'Es wurde nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    });
    const serverError = new ApiError(500, {
      error: 'Internal server error',
      message: 'Etwas ist auf unserer Seite schiefgelaufen.',
      error_id: 'abc123',
    });
    expect(deleteDraftErrorOf(serverError, 'de').notice).toEqual({
      message: 'Etwas ist auf unserer Seite schiefgelaufen.',
      error_id: 'abc123',
    });
  });
});

describe('deleteDraftNoticeOf (S6; spec 009)', () => {
  it('words a draft published or deleted meanwhile in the language of the moment', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'en'
    );
    const deleted = deleteDraftErrorOf(
      new ApiError(404, { error: 'Not found', message: '' }),
      'en'
    );
    expect(deleteDraftNoticeOf(published, 'en')).toEqual(published.notice);
    expect(deleteDraftNoticeOf(published, 'de')).toEqual({
      message: 'Dieser Entwurf wurde veröffentlicht, nachdem Sie ihn geöffnet haben.',
    });
    expect(deleteDraftNoticeOf(deleted, 'de')).toEqual({
      message: 'Dieser Entwurf wurde bereits gelöscht.',
    });
  });

  it('shows another failure as it arrived, and nothing without one', () => {
    const failed = deleteDraftErrorOf(
      new ApiError(500, { error: 'Internal server error', message: 'Etwas.', error_id: 'abc' }),
      'de'
    );
    expect(deleteDraftNoticeOf(failed, 'en')).toBe(failed.notice);
    expect(deleteDraftNoticeOf(null, 'de')).toBeNull();
  });
});

describe('the delete confirmation of a draft (S6)', () => {
  const failed = deleteDraftErrorOf(new TypeError('Failed to fetch'), 'en');

  it('keeps the dialog open while deleting runs, and shows a failure until it retries', () => {
    const open = draftDeleteReducer(INITIAL_DRAFT_DELETE_STATE, { type: 'openDialog' });
    const running = draftDeleteReducer(open, { type: 'start' });
    expect(draftDeleteReducer(running, { type: 'closeDialog' })).toBe(running);
    const failure = draftDeleteReducer(running, { type: 'failed', failure: failed });
    expect(failure).toEqual({ dialogOpen: true, deleting: false, failure: failed });
    expect(draftDeleteReducer(failure, { type: 'start' }).failure).toBeNull();
    expect(draftDeleteReducer(failure, { type: 'closeDialog' })).toEqual(
      INITIAL_DRAFT_DELETE_STATE
    );
  });

  it('offers to open the connection or the overview after a conflict, and to retry otherwise', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'en'
    );
    const deleted = deleteDraftErrorOf(
      new ApiError(404, { error: 'Not found', message: '' }),
      'en'
    );
    expect(deleteDraftDialogOf(published, 'en')).toMatchObject({
      retryLabel: 'Open the connection',
      danger: false,
    });
    expect(deleteDraftDialogOf(deleted, 'en')).toMatchObject({
      retryLabel: 'Go to overview',
      danger: false,
    });
    expect(deleteDraftDialogOf(failed, 'en')).toMatchObject({
      retryLabel: 'Try again',
      danger: true,
    });
    expect(deleteDraftDialogOf(null, 'en')).toMatchObject({ danger: true });
  });

  it('labels the error and the buttons in German (spec 009)', () => {
    const published = deleteDraftErrorOf(
      new ApiError(409, { error: 'draft_published', message: '' }),
      'de'
    );
    expect(deleteDraftDialogOf(published, 'de')).toEqual({
      errorTitle: 'Die Anbindung konnte nicht gelöscht werden',
      retryLabel: 'Anbindung öffnen',
      danger: false,
    });
    expect(deleteDraftDialogOf(null, 'de').retryLabel).toBe('Erneut versuchen');
  });
});

describe('the confirmations of a published connection (S17)', () => {
  const active = connection([branch('main', 'Standard', true)]);
  const deactivated: FormConnection = { ...active, is_active: false, state: 'deactivated' };

  it('deletes in the overview’s one dialog, its body by the state, in danger red', () => {
    expect(dialogCopyOf('delete', active, 'en')).toMatchObject({
      title: 'Delete “Passenger transport licence”?',
      text: 'This connection is active. Citizens won’t be able to use it, and its links stop working.',
      confirmLabel: 'Delete connection',
      cancelLabel: 'Keep connection',
      busyLabel: 'Deleting…',
      danger: true,
      wide: false,
    });
    expect(dialogCopyOf('delete', deactivated, 'en').text).toBe(
      'Its documents and rules will be deleted too.'
    );
  });

  it('deactivates with F13’s body and “Keep active”, and reactivates in the wide dialog', () => {
    expect(dialogCopyOf('deactivate', active, 'en')).toMatchObject({
      title: 'Deactivate this connection?',
      text: 'The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service.',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Keep active',
      danger: false,
    });
    expect(dialogCopyOf('activate', deactivated, 'en')).toMatchObject({
      title: 'Activate this connection again?',
      confirmLabel: 'Activate',
      cancelLabel: 'Cancel',
      busyLabel: 'Activating…',
      errorTitle: 'Couldn’t reactivate',
      wide: true,
    });
  });

  it('words every confirmation in German, with the overview’s delete dialog (spec 009)', () => {
    expect(dialogCopyOf('delete', active, 'de')).toMatchObject({
      title: '„Passenger transport licence“ löschen?',
      text: 'Diese Anbindung ist aktiv. Bürgerinnen und Bürger können sie dann nicht mehr nutzen, und ihre Links funktionieren nicht mehr.',
      confirmLabel: 'Anbindung löschen',
      cancelLabel: 'Anbindung behalten',
      busyLabel: 'Wird gelöscht …',
      errorTitle: 'Die Anbindung konnte nicht gelöscht werden',
      danger: true,
    });
    expect(dialogCopyOf('deactivate', active, 'de')).toEqual({
      title: 'Diese Anbindung deaktivieren?',
      text: 'Die Anbindung wird deaktiviert, und ihre Links funktionieren sofort nicht mehr. Laufende Anfragen werden abgebrochen. Denken Sie daran, die Wallet-Anbindung aus Ihrem Dienst zu entfernen.',
      confirmLabel: 'Deaktivieren',
      cancelLabel: 'Aktiv lassen',
      busyLabel: 'Wird deaktiviert …',
      errorTitle: 'Die Anbindung konnte nicht deaktiviert werden',
      danger: false,
      wide: false,
    });
    expect(dialogCopyOf('activate', deactivated, 'de')).toMatchObject({
      title: 'Diese Anbindung wieder aktivieren?',
      confirmLabel: 'Aktivieren',
      cancelLabel: 'Abbrechen',
      busyLabel: 'Wird aktiviert …',
      errorTitle: 'Die Anbindung konnte nicht reaktiviert werden',
      wide: true,
    });
  });

  it('sums up the documents and the variants’ rules for reactivating (FR-051 (40))', () => {
    const standard = { ...branch('main', 'Standard', true), items: US1_RULES };
    const ambulance = { ...branch('b1', ' Ambulance '), items: [] };
    const summary = reactivateSummaryOf(
      {
        documents: [
          {
            document_type: 'pid',
            label: 'Personal ID',
            fields: [field('birthdate', 'Date of birth'), field('given_name', 'Given name')],
          },
          { document_type: 'mdl', label: 'Driving licence', fields: [field('classes', 'Classes')] },
        ],
        branches: [standard, ambulance],
      },
      'en'
    );
    expect(summary).toEqual({
      documentLines: ['Personal ID · 2 data items', 'Driving licence · 1 data item'],
      ruleLines: [`Standard · ${US1_RULES.length} rules`, 'Ambulance · No rules'],
    });
  });

  it('sums up in German, with the publish dialog’s lines (spec 009)', () => {
    const summary = reactivateSummaryOf(
      {
        documents: [
          { document_type: 'pid', label: 'Personalausweis', fields: [field('birthdate', 'G')] },
        ],
        branches: [{ ...branch('main', 'Standard', true), items: [] }],
      },
      'de'
    );
    expect(summary).toEqual({
      documentLines: ['Personalausweis · 1 Feld'],
      ruleLines: ['Standard · Keine Regeln'],
    });
  });
});

/** A requested field of a document, as the API gives it */
function field(key: string, label: string): DocumentField {
  return {
    key,
    label,
    kind: 'text',
    option_set: null,
    date_of_birth: false,
    parts: null,
    multiple_values: false,
  };
}

describe('summaryCountsOf (FR-046 (i))', () => {
  // Each number joined to its noun by a no-break space, so that a line never ends in a bare
  // number (T046, D8); `rulesCountsOf` above the same
  const personalId = {
    document_type: 'pid',
    label: 'Personal ID',
    fields: Array.from({ length: 7 }, (_, index) => field(`f${index}`, `F${index}`)),
  };
  const drivingLicence = {
    document_type: 'mdl',
    label: 'Driving licence',
    fields: [field('driving_privileges', 'Licence classes'), field('issue_date', 'Issue date')],
  };

  it('counts the documents, their data items, the variants and the distinct rules', () => {
    const main = mainBranch([rule(1, null, null), rule(2, null, null), rule(3, null, null)]);
    const changed = { ...rule(1, null, null), mark: 'changed' as Mark };
    const added = { ...rule(4, null, null), mark: 'added' as Mark };
    const branches = [
      main,
      { ...main, name: 'Ambulance', origin: 'based' as const, items: [changed] },
      { ...main, name: 'School transport', origin: 'based' as const, items: [added] },
    ];
    expect(summaryCountsOf([personalId, drivingLicence], branches, 'en')).toBe(
      '2\u00a0documents · 9\u00a0data items · 3\u00a0variants · 4\u00a0rules'
    );
  });

  it('uses the singular for one of each, and counts nothing as 0', () => {
    expect(
      summaryCountsOf(
        [{ ...drivingLicence, fields: drivingLicence.fields.slice(0, 1) }],
        [mainBranch([rule(1, null, null)])],
        'en'
      )
    ).toBe('1\u00a0document · 1\u00a0data item · 1\u00a0variant · 1\u00a0rule');
    expect(summaryCountsOf([], [mainBranch([])], 'en')).toBe(
      '0\u00a0documents · 0\u00a0data items · 1\u00a0variant · 0\u00a0rules'
    );
  });

  it('counts in German, a data item as a field (spec 009; G§2 "data item")', () => {
    const main = mainBranch([rule(1, null, null), rule(2, null, null)]);
    expect(summaryCountsOf([personalId, drivingLicence], [main], 'de')).toBe(
      '2\u00a0Dokumente · 9\u00a0Felder · 1\u00a0Variante · 2\u00a0Regeln'
    );
    expect(
      summaryCountsOf(
        [{ ...drivingLicence, fields: drivingLicence.fields.slice(0, 1) }],
        [mainBranch([rule(1, null, null)])],
        'de'
      )
    ).toBe('1\u00a0Dokument · 1\u00a0Feld · 1\u00a0Variante · 1\u00a0Regel');
  });
});

describe('keyedBranchesOf and requestedDocumentsOf (research R7)', () => {
  it('keys a branch by its id, and a draft’s without one by its place', () => {
    const keyed = keyedBranchesOf([branch('b1', 'Standard', true), mainBranch([])]);
    expect(keyed.map((entry) => entry.key)).toEqual(['b1', '1']);
    expect(keyed[0].name).toBe('Standard');
  });

  it('gives the requested documents with the keys of their fields', () => {
    expect(
      requestedDocumentsOf([
        { document_type: 'pid', label: 'Personal ID', fields: [field('birthdate', 'B')] },
      ])
    ).toEqual([{ document_type: 'pid', fields: ['birthdate'] }]);
  });
});

describe('summaryFindingsOf (FR-047, CLAR #36; U85)', () => {
  const branches = keyedBranchesOf([
    { ...mainBranch(US1_RULES), id: 'main' },
    { ...mainBranch(US1_RULES), id: 'b2', name: 'Ambulance', origin: 'based' },
    { ...mainBranch(US1_RULES), id: 'b3', name: 'School transport', origin: 'based' },
  ]);
  const duplicate: ItemFinding[] = [
    { itemId: 'rule-3', kind: 'redundant', reason: { type: 'same', item: 'rule-1' }, today: false },
  ];
  const conflict: ItemFinding[] = [
    {
      itemId: 'rule-1',
      kind: 'conflicting',
      reason: { type: 'with', items: ['rule-2'] },
      today: false,
    },
    {
      itemId: 'rule-2',
      kind: 'conflicting',
      reason: { type: 'with', items: ['rule-1'] },
      today: false,
    },
  ];

  function check(branchKey: string, findings: ItemFinding[]): BranchCheck {
    return {
      branchKey,
      fingerprint: 'f',
      complete: true,
      notice: findings === conflict ? { kind: 'none_can_meet', today: false } : null,
      findings: [...findings, ...(findings === conflict ? duplicate : [])],
      checkedRules: US1_RULES.length,
    };
  }

  it('lists the publish dialog’s line of each variant with findings, warnings first', () => {
    const items = summaryFindingsOf(
      branches,
      {
        main: check('main', duplicate),
        b2: check('b2', conflict),
        b3: check('b3', []),
      },
      'en'
    );
    expect(items).toEqual([
      {
        key: 'b2',
        tone: 'warning',
        kindText: null,
        parts: [
          'Ambulance: no citizen can meet these rules. 2 rules contradict each other, and 1 rule is a duplicate.',
        ],
      },
      { key: 'main', tone: 'info', kindText: null, parts: ['Standard: 1 rule is a duplicate.'] },
    ]);
  });

  it('shows nothing for a variant not checked yet, and nothing as a link', () => {
    const items = summaryFindingsOf(branches, { main: check('main', duplicate), b2: null }, 'en');
    expect(items.map((item) => item.key)).toEqual(['main']);
    expect(items.every((item) => item.parts.every((part) => typeof part === 'string'))).toBe(true);
    expect(summaryFindingsOf(branches, {}, 'en')).toEqual([]);
  });

  it('words the lines in German, warnings first (spec 009)', () => {
    const items = summaryFindingsOf(
      branches,
      { main: check('main', duplicate), b2: check('b2', conflict) },
      'de'
    );
    expect(items.map((item) => [item.key, item.tone])).toEqual([
      ['b2', 'warning'],
      ['main', 'info'],
    ]);
    expect(items[1].parts).toEqual(['Standard: 1 Regel ist ein Duplikat.']);
  });
});

describe('the ⋯ menu and the links of a scheduled connection (S15; FR-007–FR-009)', () => {
  const active = connection([branch('main', 'Standard', true)]);
  const scheduled: FormConnection = {
    ...active,
    is_active: false,
    state: 'scheduled',
    activated_at: null,
    start_date: '2026-12-01',
  };
  const deactivated: FormConnection = {
    ...active,
    is_active: false,
    state: 'deactivated',
    deactivated_at: '2026-10-26T10:00:00Z',
  };

  it('offers a scheduled and an active connection the start date, deactivating and deleting', () => {
    expect(connectionMenuOf('scheduled')).toEqual(['startDate', 'deactivate', 'delete']);
    expect(connectionMenuOf('live')).toEqual(['startDate', 'deactivate', 'delete']);
  });

  it('offers a deactivated connection deleting alone', () => {
    expect(connectionMenuOf('deactivated')).toEqual(['delete']);
  });

  it('opens "Change start date" as the page’s dialog, which is no confirmation', () => {
    const opened = actionsReducer(INITIAL_ACTIONS_STATE, {
      type: 'openDialog',
      dialog: 'startDate',
    });
    expect(opened).toMatchObject({ dialog: 'startDate', dialogOpen: true, error: null });
    expect(confirmationOf(opened.dialog)).toBeNull();
    expect(actionsReducer(opened, { type: 'closeDialog' }).dialogOpen).toBe(false);
    expect(confirmationOf('deactivate')).toBe('deactivate');
    expect(confirmationOf('delete')).toBe('delete');
    expect(confirmationOf('activate')).toBe('activate');
  });

  it('asks to delete a scheduled connection with its start date (FR-010; U14 6872:45929)', () => {
    expect(dialogCopyOf('delete', scheduled, 'en')).toMatchObject({
      title: 'Delete “Passenger transport licence”?',
      text: 'This connection will be active from 01.12.2026. If you delete it, it won’t become active and its links won’t work.',
      confirmLabel: 'Delete connection',
      cancelLabel: 'Keep connection',
      danger: true,
    });
    expect(dialogCopyOf('delete', scheduled, 'de').text).toBe(
      'Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie löschen, wird sie nicht aktiv und ihre Links funktionieren nicht.'
    );
    expect(dialogCopyOf('delete', deactivated, 'en').text).toBe(
      'Its documents and rules will be deleted too.'
    );
  });

  it('asks to deactivate a scheduled connection with "Keep scheduled" (FR-012; W5, F11)', () => {
    expect(dialogCopyOf('deactivate', scheduled, 'en')).toEqual({
      title: 'Deactivate this connection?',
      text: 'This connection will be active from 01.12.2026. If you deactivate it, it won’t become active and its links won’t work. You can activate it again later.',
      confirmLabel: 'Deactivate',
      cancelLabel: 'Keep scheduled',
      busyLabel: 'Deactivating…',
      errorTitle: 'Couldn’t deactivate',
      danger: false,
      wide: false,
    });
    expect(dialogCopyOf('deactivate', scheduled, 'de')).toMatchObject({
      text: 'Diese Anbindung ist ab 01.12.2026 aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren.',
      cancelLabel: 'Geplant lassen',
    });
    // An active connection keeps F13's body and "Keep active"
    expect(dialogCopyOf('deactivate', active, 'en').cancelLabel).toBe('Keep active');
  });

  it('asks "Edit this scheduled connection?" with its start date, else "Edit “<name>”?" (W7)', () => {
    expect(editEntryCopyOf(scheduled, 'en')).toEqual({
      title: 'Edit this scheduled connection?',
      text: 'Your changes only take effect when you save them. Saved changes become active on 01.12.2026.',
      cancel: 'Cancel',
      confirm: 'Edit connection',
    });
    expect(editEntryCopyOf(scheduled, 'de')).toEqual({
      title: 'Diese geplante Anbindung bearbeiten?',
      text: 'Ihre Änderungen werden erst wirksam, wenn Sie sie speichern. Gespeicherte Änderungen werden am 01.12.2026 aktiv.',
      cancel: 'Abbrechen',
      confirm: 'Anbindung bearbeiten',
    });
    expect(editEntryCopyOf(active, 'en')).toMatchObject({
      title: 'Edit “Passenger transport licence”?',
      text: 'Your changes only take effect when you save them. Started connections don’t get interrupted or modified even after saving.',
    });
    expect(editEntryCopyOf(deactivated, 'de').title).toBe(
      '„Passenger transport licence“ bearbeiten?'
    );
  });
});

describe('"Activate this connection again?" with "Active from" (S17; FR-011, FR-014; W4, W8)', () => {
  const deactivated: FormConnection = {
    ...connection([branch('main', 'Standard', true)]),
    is_active: false,
    state: 'deactivated',
    deactivated_at: '2026-10-26T10:00:00Z',
  };
  const today = '2026-11-11';
  const opened = actionsReducer(INITIAL_ACTIONS_STATE, { type: 'openDialog', dialog: 'activate' });

  it('opens with "Now" and an empty field, as the reactivate dialog it was', () => {
    expect(opened).toMatchObject({
      dialog: 'activate',
      dialogOpen: true,
      activeFrom: 'now',
      startDateText: '',
      dateError: false,
    });
    expect(confirmationOf(opened.dialog)).toBe('activate');
  });

  it('reads "Activate" with "Now" and "Schedule" / "Scheduling…" with "On a date"', () => {
    expect(dialogCopyOf('activate', deactivated, 'en', 'now')).toMatchObject({
      confirmLabel: 'Activate',
      busyLabel: 'Activating…',
    });
    expect(dialogCopyOf('activate', deactivated, 'en', 'date')).toMatchObject({
      title: 'Activate this connection again?',
      text: 'Check the summary below. Once it’s active, citizens can share their data again, so make sure your service is ready to receive it.',
      confirmLabel: 'Schedule',
      cancelLabel: 'Cancel',
      busyLabel: 'Scheduling…',
      errorTitle: 'Couldn’t reactivate',
      wide: true,
    });
    expect(dialogCopyOf('activate', deactivated, 'de', 'date')).toMatchObject({
      confirmLabel: 'Planen',
      busyLabel: 'Wird geplant …',
    });
  });

  it('gives "On a date" copy.md §2’s hint, and "Now" none', () => {
    expect(reactivateHintOf('date', 'en')).toBe(
      'The connection becomes active again on the date you choose. Until then, its links don’t work.'
    );
    expect(reactivateHintOf('date', 'de')).toBe(
      'Die Anbindung wird am gewählten Datum wieder aktiv. Bis dahin funktionieren ihre Links nicht.'
    );
    expect(reactivateHintOf('now', 'en')).toBeUndefined();
  });

  it('activates at once with "Now" and sends the day with "On a date", also as D.M.YYYY', () => {
    expect(reactivatePlanOf('now', '', today)).toEqual({ kind: 'send', startDate: null });
    expect(reactivatePlanOf('now', 'abc', today)).toEqual({ kind: 'send', startDate: null });
    expect(reactivatePlanOf('date', '01.12.2026', today)).toEqual({
      kind: 'send',
      startDate: '2026-12-01',
    });
    expect(reactivatePlanOf('date', '1.12.2026', today)).toEqual({
      kind: 'send',
      startDate: '2026-12-01',
    });
  });

  it('refuses an empty field, today, the past and no date (FR-003)', () => {
    for (const text of ['', '11.11.2026', '10.11.2026', '31.02.2027', 'abc']) {
      expect(reactivatePlanOf('date', text, today)).toEqual({ kind: 'refused' });
    }
  });

  it('shows a refused date, also the server’s, as the field’s error, keeping the dialog', () => {
    const onDate = actionsReducer(
      actionsReducer(opened, { type: 'chooseActiveFrom', choice: 'date' }),
      { type: 'typeStartDate', text: '11.11.2026' }
    );
    const refused = actionsReducer(onDate, { type: 'dateRefused' });
    expect(refused).toMatchObject({
      dialog: 'activate',
      dialogOpen: true,
      dateError: true,
      dateRefusals: 1,
      startDateText: '11.11.2026',
    });
    const running = actionsReducer(
      actionsReducer(refused, { type: 'typeStartDate', text: '01.12.2026' }),
      { type: 'start', action: 'activate' }
    );
    expect(running).toMatchObject({ running: 'activate', dateError: false });
    expect(actionsReducer(running, { type: 'dateRefused' })).toMatchObject({
      running: null,
      dialogOpen: true,
      dateError: true,
      dateRefusals: 2,
      activeFrom: 'date',
      startDateText: '01.12.2026',
    });
  });

  it('keeps the choice and the text through a failure, so that "Try again" repeats them', () => {
    const onDate = actionsReducer(
      actionsReducer(opened, { type: 'chooseActiveFrom', choice: 'date' }),
      { type: 'typeStartDate', text: '01.12.2026' }
    );
    const running = actionsReducer(onDate, { type: 'start', action: 'activate' });
    const failed = actionsReducer(running, {
      type: 'failed',
      error: { message: 'Nothing changed.' },
      noAnswer: true,
    });
    expect(failed).toMatchObject({
      dialog: 'activate',
      dialogOpen: true,
      running: null,
      activeFrom: 'date',
      startDateText: '01.12.2026',
      noAnswer: true,
    });
    expect(actionsReducer(failed, { type: 'start', action: 'activate' })).toMatchObject({
      running: 'activate',
      error: null,
      noAnswer: false,
      activeFrom: 'date',
      startDateText: '01.12.2026',
    });
  });

  it('confirms "Connection scheduled for <date>." on a date, "Connection reactivated." now', () => {
    expect(successMessageOf('activate', 'en', '2026-12-01')).toBe(
      'Connection scheduled for 01.12.2026.'
    );
    expect(successMessageOf('activate', 'de', '2026-12-01')).toBe(
      'Anbindung für den 01.12.2026 geplant.'
    );
    expect(successMessageOf('activate', 'en', null)).toBe('Connection reactivated.');
    expect(successMessageOf('activate', 'de')).toBe('Anbindung reaktiviert.');
    // The toast after deactivating a scheduled connection stays, without "Undo" (F13)
    expect(successMessageOf('deactivate', 'en')).toBe('Connection deactivated.');
  });
});

describe('"Change start date" (S15; FR-003, FR-008, FR-009, FR-014; F10, W1–W3, W8)', () => {
  const live: FormConnection = {
    ...connection([branch('main', 'Standard', true)]),
    activated_at: new Date(2026, 9, 23, 14, 32).toISOString(),
  };
  const scheduled: FormConnection = {
    ...live,
    is_active: false,
    state: 'scheduled',
    activated_at: null,
    start_date: '2026-12-01',
  };
  const today = '2026-11-11';
  const opened = actionsReducer(INITIAL_ACTIONS_STATE, {
    type: 'openDialog',
    dialog: 'startDate',
    ...startDateChoiceOf(scheduled),
  });

  it('opens a scheduled connection with "On a date" and its start date, an active one with "Now"', () => {
    expect(startDateChoiceOf(scheduled)).toEqual({
      activeFrom: 'date',
      startDateText: '01.12.2026',
    });
    expect(startDateChoiceOf(live)).toEqual({ activeFrom: 'now', startDateText: '' });
    expect(opened).toMatchObject({
      dialog: 'startDate',
      dialogOpen: true,
      activeFrom: 'date',
      startDateText: '01.12.2026',
      dateError: false,
      error: null,
      noAnswer: false,
    });
  });

  it('names "Now" with an active connection’s start, in both languages', () => {
    expect(startDateNowLabelOf(live, 'en')).toBe('Now (active since 23.10.2026, 14:32)');
    expect(startDateNowLabelOf(live, 'de')).toBe('Sofort (aktiv seit 23.10.2026, 14:32)');
    const published = new Date(2026, 8, 12, 8, 0).toISOString();
    expect(
      startDateNowLabelOf({ ...live, activated_at: null, published_at: published }, 'en')
    ).toBe('Now (active since 12.09.2026, 08:00)');
    expect(startDateNowLabelOf(scheduled, 'en')).toBeUndefined();
  });

  it('gives an active connection’s "On a date" the cancellation hint (F10), and nothing else', () => {
    expect(startDateHintOf('live', 'date', 'en')).toBe(
      'Until that date, citizens can’t start a new request. Requests in progress are cancelled.'
    );
    expect(startDateHintOf('live', 'date', 'de')).toBe(
      'Bis zu diesem Datum können Bürgerinnen und Bürger keine neue Anfrage starten. Laufende Anfragen werden abgebrochen.'
    );
    expect(startDateHintOf('live', 'now', 'en')).toBeUndefined();
    expect(startDateHintOf('scheduled', 'date', 'en')).toBeUndefined();
  });

  it('sends null for a scheduled connection’s "Now" and nothing for an active one’s (W2, FR-009)', () => {
    expect(startDatePlanOf(scheduled, 'now', '01.12.2026', today)).toEqual({
      kind: 'send',
      startDate: null,
    });
    expect(startDatePlanOf(live, 'now', '', today)).toEqual({ kind: 'unchanged' });
  });

  it('sends a new day, also as D.M.YYYY, and nothing for the scheduled day itself', () => {
    expect(startDatePlanOf(scheduled, 'date', '15.12.2026', today)).toEqual({
      kind: 'send',
      startDate: '2026-12-15',
    });
    expect(startDatePlanOf(live, 'date', '1.12.2026', today)).toEqual({
      kind: 'send',
      startDate: '2026-12-01',
    });
    expect(startDatePlanOf(scheduled, 'date', '01.12.2026', today)).toEqual({ kind: 'unchanged' });
  });

  it('refuses an empty field, today, the past and no date (FR-003)', () => {
    for (const text of ['', '11.11.2026', '10.11.2026', '31.02.2027', 'abc']) {
      expect(startDatePlanOf(live, 'date', text, today)).toEqual({ kind: 'refused' });
      expect(startDatePlanOf(scheduled, 'date', text, today)).toEqual({ kind: 'refused' });
    }
  });

  it('shows a refused date as the field’s error, which the choice, the text or a call clears', () => {
    const refused = actionsReducer(opened, { type: 'dateRefused' });
    expect(refused).toMatchObject({ dialogOpen: true, dateError: true, dateRefusals: 1 });
    expect(actionsReducer(refused, { type: 'dateRefused' }).dateRefusals).toBe(2);
    expect(actionsReducer(refused, { type: 'typeStartDate', text: '2.12.2026' })).toMatchObject({
      startDateText: '2.12.2026',
      dateError: false,
    });
    expect(actionsReducer(refused, { type: 'chooseActiveFrom', choice: 'now' })).toMatchObject({
      activeFrom: 'now',
      dateError: false,
    });
    expect(actionsReducer(refused, { type: 'start', action: 'startDate' })).toMatchObject({
      running: 'startDate',
      dateError: false,
    });
  });

  it('shows the server’s invalid_start_date as the same error, ending the call (W1)', () => {
    const running = actionsReducer(opened, { type: 'start', action: 'startDate' });
    expect(actionsReducer(running, { type: 'dateRefused' })).toMatchObject({
      running: null,
      dialogOpen: true,
      dateError: true,
      error: null,
      startDateText: '01.12.2026',
    });
  });

  it('keeps the choice and the text through a failure, so that "Try again" repeats them (W8)', () => {
    const typed = actionsReducer(opened, { type: 'typeStartDate', text: '15.12.2026' });
    const running = actionsReducer(typed, { type: 'start', action: 'startDate' });
    const failed = actionsReducer(running, {
      type: 'failed',
      error: { message: 'Something went wrong', error_id: 'abc123' },
    });
    expect(failed).toMatchObject({
      running: null,
      dialogOpen: true,
      activeFrom: 'date',
      startDateText: '15.12.2026',
      error: { message: 'Something went wrong', error_id: 'abc123' },
      noAnswer: false,
    });
    const noAnswer = actionsReducer(running, {
      type: 'failed',
      error: { message: 'Nothing changed.' },
      noAnswer: true,
    });
    expect(noAnswer.noAnswer).toBe(true);
    expect(actionsReducer(noAnswer, { type: 'start', action: 'startDate' })).toMatchObject({
      error: null,
      noAnswer: false,
      startDateText: '15.12.2026',
    });
    expect(actionsReducer(noAnswer, { type: 'closeDialog' })).toMatchObject({
      dialogOpen: false,
      noAnswer: false,
    });
  });

  it('opens another dialog with "Now" and an empty field', () => {
    const closed = actionsReducer(opened, { type: 'closeDialog' });
    expect(actionsReducer(closed, { type: 'openDialog', dialog: 'activate' })).toMatchObject({
      dialog: 'activate',
      activeFrom: 'now',
      startDateText: '',
    });
  });

  it('confirms with "Start date saved.", also after "Now" (FR-008, W3)', () => {
    expect(successMessageOf('startDate', 'en')).toBe('Start date saved.');
    expect(successMessageOf('startDate', 'de')).toBe('Startdatum gespeichert.');
    expect(successMessageOf('deactivate', 'en')).toBe('Connection deactivated.');
    expect(successMessageOf('activate', 'en')).toBe('Connection reactivated.');
    const running = actionsReducer(opened, { type: 'start', action: 'startDate' });
    expect(
      actionsReducer(running, { type: 'succeeded', message: 'Start date saved.' })
    ).toMatchObject({
      dialogOpen: false,
      running: null,
      toast: { kind: 'success', message: 'Start date saved.' },
    });
  });

  it('tells no answer from an answer: a network failure or a 5xx without an error ID (F2, W8)', () => {
    expect(isNoAnswer(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNoAnswer(new ApiError(502, { error: 'Unknown error', message: 'x' }))).toBe(true);
    expect(
      isNoAnswer(new ApiError(500, { error: 'internal', message: 'x', error_id: 'abc' }))
    ).toBe(false);
    expect(isNoAnswer(new ApiError(409, { error: 'status_changed', message: 'x' }))).toBe(false);
  });
});

// Spec 010, US3 (FR-023–FR-027, FR-032; copy.md §3, W10): the activity's sentences
describe('the activity’s sentences (FR-025, FR-027, FR-032; copy.md §3)', () => {
  const at = new Date(2026, 9, 23, 14, 32).toISOString();
  function entry(kind: ActivityKind, extra: Partial<ActivityEntry> = {}): ActivityEntry {
    return { id: kind, kind, at, variant: null, start_date: null, actor: null, ...extra };
  }
  const laura: ActivityActor = { name: 'Laura Weber', agent: null, approved: false };
  const withAgent: ActivityActor = { name: 'Laura Weber', agent: 'Claude Code', approved: false };
  const approved: ActivityActor = { name: 'Jonas Brandt', agent: 'Claude Code', approved: true };

  // Every kind of data-model §2.2, and `start_date_changed` with and without a date
  const events: [ActivityEntry, string, string][] = [
    [entry('created'), 'Created', 'Erstellt'],
    [entry('renamed'), 'Name changed', 'Name geändert'],
    [entry('description_changed'), 'Description changed', 'Beschreibung geändert'],
    [entry('documents_changed'), 'Documents changed', 'Dokumente geändert'],
    [
      entry('variant_added', { variant: 'Ambulance' }),
      'Variant added: Ambulance',
      'Variante hinzugefügt: Ambulance',
    ],
    [
      entry('variant_removed', { variant: 'Taxi' }),
      'Variant removed: Taxi',
      'Variante entfernt: Taxi',
    ],
    [
      entry('variant_renamed', { variant: 'School transport' }),
      'Variant renamed: School transport',
      'Variante umbenannt: School transport',
    ],
    [
      entry('rules_changed', { variant: 'Standard' }),
      'Rules changed in Standard',
      'Regeln in Standard geändert',
    ],
    [entry('published'), 'Published', 'Veröffentlicht'],
    [
      entry('scheduled', { start_date: '2026-12-01' }),
      'Scheduled for 01.12.2026',
      'Geplant für den 01.12.2026',
    ],
    [
      entry('start_date_changed', { start_date: '2027-01-15' }),
      'Start date changed to 15.01.2027',
      'Startdatum auf den 15.01.2027 geändert',
    ],
    [entry('start_date_changed'), 'Start date changed to now', 'Startdatum auf sofort geändert'],
    [entry('became_active'), 'Became active', 'Aktiv geworden'],
    [entry('deactivated'), 'Deactivated', 'Deaktiviert'],
    [entry('reactivated'), 'Activated again', 'Wieder aktiviert'],
    [entry('deleted'), 'Deleted', 'Gelöscht'],
    [entry('restored'), 'Restored', 'Wiederhergestellt'],
  ];

  it.each(events)('words %o in English and German', (activity, english, german) => {
    expect(activityEventOf(activity, 'en')).toBe(english);
    expect(activityEventOf(activity, 'de')).toBe(german);
  });

  it('has a sentence for every kind of data-model §2.2', () => {
    const kinds = new Set(events.map(([activity]) => activity.kind));
    expect(kinds.size).toBe(16);
  });

  it('writes the start date as stored in every time zone (FR-020)', () => {
    const scheduled = entry('scheduled', { start_date: '2026-12-01' });
    try {
      for (const zone of ['America/New_York', 'Pacific/Kiritimati']) {
        vi.stubEnv('TZ', zone);
        expect(activityEventOf(scheduled, 'en')).toBe('Scheduled for 01.12.2026');
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('names the person in each form of FR-027, and nobody for the middleware', () => {
    expect(activityPersonOf(laura, 'en')).toBe('Laura Weber');
    expect(activityPersonOf(laura, 'de')).toBe('Laura Weber');
    expect(activityPersonOf(withAgent, 'en')).toBe('Laura Weber with Claude Code');
    expect(activityPersonOf(withAgent, 'de')).toBe('Laura Weber mit Claude Code');
    expect(activityPersonOf(approved, 'en')).toBe('Jonas Brandt, asked by Claude Code');
    expect(activityPersonOf(approved, 'de')).toBe('Jonas Brandt, angefragt von Claude Code');
    expect(activityPersonOf(null, 'en')).toBeNull();
    expect(activityPersonOf(null, 'de')).toBeNull();
  });

  it('writes the row’s date and time as the date pill does (FR-020)', () => {
    expect(activityDateTimeOf(entry('published'), 'en')).toBe('23.10.2026, 14:32');
    expect(activityDateTimeOf(entry('published'), 'de')).toBe('23.10.2026, 14:32');
  });

  it('writes the closed line with the person and the time (FR-024; U86 6396:48524)', () => {
    const published = entry('published', { actor: laura });
    expect(activityClosedLineOf(published, 'live', 'en')).toBe(
      'Last edited by Laura Weber · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(published, 'scheduled', 'de')).toBe(
      'Zuletzt bearbeitet von Laura Weber · 23.10.2026, 14:32'
    );
    const agentEdit = entry('rules_changed', { variant: 'Standard', actor: withAgent });
    expect(activityClosedLineOf(agentEdit, 'draft', 'en')).toBe(
      'Last edited by Laura Weber with Claude Code · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(entry('published', { actor: approved }), 'live', 'de')).toBe(
      'Zuletzt bearbeitet von Jonas Brandt, angefragt von Claude Code · 23.10.2026, 14:32'
    );
  });

  it('reads "Deactivated by" while deactivated (FR-024, US3-AS3; U97 7246:56962)', () => {
    const deactivated = entry('deactivated', { actor: laura });
    expect(activityClosedLineOf(deactivated, 'deactivated', 'en')).toBe(
      'Deactivated by Laura Weber · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(deactivated, 'deactivated', 'de')).toBe(
      'Deaktiviert von Laura Weber · 23.10.2026, 14:32'
    );
    // Deactivated without a deactivation entry, the server's fallback: the last edit
    expect(activityClosedLineOf(entry('published', { actor: laura }), 'deactivated', 'en')).toBe(
      'Last edited by Laura Weber · 23.10.2026, 14:32'
    );
  });

  it('shows the time alone without a person (FR-032)', () => {
    expect(activityClosedLineOf(entry('published'), 'live', 'en')).toBe(
      'Last edited · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(entry('published'), 'live', 'de')).toBe(
      'Zuletzt bearbeitet · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(entry('deactivated'), 'deactivated', 'en')).toBe(
      'Deactivated · 23.10.2026, 14:32'
    );
    expect(activityClosedLineOf(entry('deactivated'), 'deactivated', 'de')).toBe(
      'Deaktiviert · 23.10.2026, 14:32'
    );
  });

  it('has no line for a connection without entries', () => {
    expect(activityClosedLineOf(null, 'live', 'en')).toBeNull();
  });
});

// Spec 010, US3 (S15 "The Activity card"; FR-022, FR-023; R15 V6): the card's list
describe('activityCardReducer (S15; FR-022, FR-023)', () => {
  function page(ids: string[], nextCursor: string | null): ActivityPage {
    return {
      items: ids.map((id) => ({
        id,
        kind: 'published',
        at: '2026-10-23T12:32:00Z',
        variant: null,
        start_date: null,
        actor: null,
      })),
      next_cursor: nextCursor,
    };
  }
  const first = page(['a', 'b'], 'c1');
  const second = page(['c'], 'c2');
  const last = page(['d'], null);
  const notice = { message: 'Check your connection and try again.' };

  function run(...actions: ActivityCardAction[]): ActivityCardState {
    return actions.reduce(activityCardReducer, INITIAL_ACTIVITY_CARD_STATE);
  }

  it('starts closed with nothing to load or show', () => {
    expect(INITIAL_ACTIVITY_CARD_STATE).toEqual({ kind: 'closed' });
    expect(activityRequestOf(INITIAL_ACTIVITY_CARD_STATE)).toBeNull();
    expect(activityEntriesOf(INITIAL_ACTIVITY_CARD_STATE)).toEqual([]);
    expect(activityStatusOf(INITIAL_ACTIVITY_CARD_STATE, 'en')).toBe('');
  });

  it('loads the first page when the card first opens, and announces it', () => {
    const loading = run({ type: 'load' });
    expect(loading).toEqual({ kind: 'loading' });
    expect(activityRequestOf(loading)).toEqual({ cursor: null });
    expect(activityStatusOf(loading, 'en')).toBe('Loading activity…');
    expect(activityStatusOf(loading, 'de')).toBe('Aktivität wird geladen …');
    const loaded = run({ type: 'load' }, { type: 'pageLoaded', page: first });
    expect(loaded).toEqual({ kind: 'loaded', pages: [first] });
    expect(activityEntriesOf(loaded).map((item) => item.id)).toEqual(['a', 'b']);
    expect(activityRequestOf(loaded)).toBeNull();
    expect(activityStatusOf(loaded, 'en')).toBe('');
  });

  it('loads a page once: opening again after it loaded changes nothing', () => {
    const loaded = run({ type: 'load' }, { type: 'pageLoaded', page: first });
    expect(activityCardReducer(loaded, { type: 'load' })).toBe(loaded);
    const loading = run({ type: 'load' });
    expect(activityCardReducer(loading, { type: 'load' })).toBe(loading);
  });

  it('loads the older pages after the cursor, down to the oldest entry', () => {
    const more = run({ type: 'load' }, { type: 'pageLoaded', page: first }, { type: 'loadMore' });
    expect(more).toEqual({ kind: 'loadingMore', pages: [first] });
    expect(activityRequestOf(more)).toEqual({ cursor: 'c1' });
    expect(activityStatusOf(more, 'en')).toBe('Loading earlier activity…');
    expect(activityStatusOf(more, 'de')).toBe('Frühere Aktivität wird geladen …');
    // The entries stay while the next page loads
    expect(activityEntriesOf(more).map((item) => item.id)).toEqual(['a', 'b']);
    const all = run(
      { type: 'load' },
      { type: 'pageLoaded', page: first },
      { type: 'loadMore' },
      { type: 'pageLoaded', page: second },
      { type: 'loadMore' },
      { type: 'pageLoaded', page: last }
    );
    expect(activityEntriesOf(all).map((item) => item.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(hasOlderActivity(all)).toBe(false);
    // The oldest page reached: the end coming into view loads nothing
    expect(activityCardReducer(all, { type: 'loadMore' })).toBe(all);
  });

  it('knows when an older page is there', () => {
    expect(hasOlderActivity(run({ type: 'load' }))).toBe(false);
    expect(hasOlderActivity(run({ type: 'load' }, { type: 'pageLoaded', page: first }))).toBe(true);
    expect(hasOlderActivity(run({ type: 'load' }, { type: 'pageLoaded', page: last }))).toBe(false);
  });

  it('asks for no second page while one loads', () => {
    const more = run({ type: 'load' }, { type: 'pageLoaded', page: first }, { type: 'loadMore' });
    expect(activityCardReducer(more, { type: 'loadMore' })).toBe(more);
    expect(activityCardReducer(run({ type: 'load' }), { type: 'loadMore' })).toEqual({
      kind: 'loading',
    });
  });

  it('fails the first page with nothing shown, and "Try again" asks for it again', () => {
    const failed = run({ type: 'load' }, { type: 'pageFailed', error: notice });
    expect(failed).toEqual({ kind: 'failed', pages: [], error: notice });
    expect(activityRequestOf(failed)).toBeNull();
    expect(activityStatusOf(failed, 'en')).toBe('');
    // The failure isn't "closed": opening again doesn't retry by itself
    expect(activityCardReducer(failed, { type: 'load' })).toBe(failed);
    const retried = activityCardReducer(failed, { type: 'retry' });
    expect(retried).toEqual({ kind: 'loading' });
    expect(activityRequestOf(retried)).toEqual({ cursor: null });
  });

  it('keeps the loaded entries when an older page fails, and retries that page', () => {
    const failed = run(
      { type: 'load' },
      { type: 'pageLoaded', page: first },
      { type: 'loadMore' },
      { type: 'pageFailed', error: notice }
    );
    expect(failed).toEqual({ kind: 'failed', pages: [first], error: notice });
    expect(activityEntriesOf(failed).map((item) => item.id)).toEqual(['a', 'b']);
    expect(activityCardReducer(failed, { type: 'loadMore' })).toBe(failed);
    const retried = activityCardReducer(failed, { type: 'retry' });
    expect(retried).toEqual({ kind: 'loadingMore', pages: [first] });
    expect(activityRequestOf(retried)).toEqual({ cursor: 'c1' });
  });

  it('ignores an answer it didn’t ask for, and "Try again" outside a failure', () => {
    const loaded = run({ type: 'load' }, { type: 'pageLoaded', page: first });
    expect(activityCardReducer(loaded, { type: 'pageLoaded', page: second })).toBe(loaded);
    expect(activityCardReducer(loaded, { type: 'pageFailed', error: notice })).toBe(loaded);
    expect(activityCardReducer(loaded, { type: 'retry' })).toBe(loaded);
    const closed = INITIAL_ACTIVITY_CARD_STATE;
    expect(activityCardReducer(closed, { type: 'pageLoaded', page: first })).toBe(closed);
  });

  it('forgets the pages on a reset, so that the list loads again from the newest', () => {
    const states = [
      run({ type: 'load' }),
      run({ type: 'load' }, { type: 'pageLoaded', page: first }),
      run({ type: 'load' }, { type: 'pageLoaded', page: first }, { type: 'loadMore' }),
      run({ type: 'load' }, { type: 'pageFailed', error: notice }),
    ];
    for (const state of states) {
      const reset = activityCardReducer(state, { type: 'reset' });
      expect(reset).toEqual({ kind: 'closed' });
      expect(activityCardReducer(reset, { type: 'load' })).toEqual({ kind: 'loading' });
    }
  });
});

describe('overviewStateAfterDeletion (spec 010, FR-033)', () => {
  it('hands the overview the name and the deletion id for "Undo"', () => {
    expect(
      overviewStateAfterDeletion('Fishing licence', {
        id: 'd-1',
        restorable_until: '2026-11-11T12:05:00Z',
      })
    ).toEqual({ deleted: { names: ['Fishing licence'], deletionId: 'd-1' } });
  });

  it('keeps a deletion nothing can restore without an id, so the toast offers no "Undo"', () => {
    expect(
      overviewStateAfterDeletion('Fishing licence', { id: null, restorable_until: null })
    ).toEqual({ deleted: { names: ['Fishing licence'], deletionId: null } });
  });
});

describe('isShownConnection', () => {
  const shown = connection([branch('b-1', 'Standard', true), branch('b-2', 'Taxi')]);

  it('is true for an equal answer, a copy of the shown connection', () => {
    expect(isShownConnection(shown, structuredClone(shown))).toBe(true);
  });

  it('is false when anything differs: the content, a label, the status or the state', () => {
    const renamed = structuredClone(shown);
    renamed.branches[1].name = 'Hire car';
    expect(isShownConnection(shown, renamed)).toBe(false);
    expect(isShownConnection(shown, { ...shown, name: `${shown.name} (edited)` })).toBe(false);
    expect(isShownConnection(shown, { ...shown, state: 'deactivated' })).toBe(false);
    expect(isShownConnection(shown, { ...shown, updated_at: '2026-11-15T12:00:00Z' })).toBe(false);
  });

  it('is false while nothing is shown', () => {
    expect(isShownConnection(null, shown)).toBe(false);
  });
});
