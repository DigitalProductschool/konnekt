import type { DocumentField, DocumentType } from '@connection-portal/api-types/document-types';
import type {
  Branch,
  BranchInput,
  FormConnection,
  FormConnectionDraft,
} from '@connection-portal/api-types/form-connections';
import type { BranchCheck, BranchNotice, ItemFinding } from '@connection-portal/rules/checks/types';
import { droppedDataOf } from '@connection-portal/rules/dropped';
import { mainBranch, US1_RULES } from '@connection-portal/rules/testData';
import { countRules } from '@connection-portal/rules/tree';
import { describe, expect, it } from 'vitest';

import { ApiError, handleResponse } from '../../api/client';
import { emptyContent, sameContent } from '../../utils/localDrafts/content';
import { flowKeyOfDraft, newFlowKey } from '../../utils/localDrafts/keys';
import type { LocalDraftContent, LocalDraftRecord } from '../../utils/localDrafts/types';
import {
  DRAFT_COPY,
  INITIAL_EDITOR_STATE,
  INITIAL_PUBLISH_DIALOG_STATE,
  PUBLISH_DIALOG_COPY,
} from './constants';
import { RULES_STEP_COPY } from './RulesStep/constants';
import type { RulesBranch } from './RulesStep/types';
import { initialRulesState, rulesReducer } from './RulesStep/utils';
import type {
  DraftConflict,
  DraftSaveError,
  DroppedData,
  EditorOrigin,
  PendingRemoval,
  PublishDialogAction,
  PublishDialogState,
} from './types';
import {
  conflictOf,
  connectionErrorsOf,
  createPayload,
  documentLines,
  documentsToastOf,
  draftNameErrors,
  draftPayload,
  draftSaveErrorOf,
  droppedRemovalOf,
  editorReducer,
  entryOf,
  findingLinesOf,
  firstBranchWithFindings,
  firstInvalidElementId,
  headerTitleOf,
  initialEditorState,
  initialStatesFromDraft,
  initialStatesFromLocal,
  isInvalidStartDate,
  isRulesChanged,
  localContentOf,
  offeredFieldsOf,
  openingStepOf,
  originOfRecord,
  pageTitleOf,
  problemPlaceOf,
  publishDialogReducer,
  publishErrorNotice,
  publishFailureOf,
  publishStartDateOf,
  removalAction,
  removalInLanguage,
  removedDataRulesOf,
  ruleLines,
  rulesChanged,
  rulesNextActionOf,
  saveFailureToastOf,
  startOfEntry,
  startOfOrigin,
  stepForDroppedData,
  validateConnection,
  warningsFirst,
} from './utils';

const STANDARD: Branch = {
  id: 'main',
  name: 'Standard',
  description: null,
  origin: 'main',
  operator: 'and',
  operator_mark: null,
  items: US1_RULES,
  is_main: true,
  pull_url: 'https://connect.example/api/connect/fc/requests/{reference}',
};

const LOADED: FormConnection = {
  status: 'published',
  id: 'fc',
  name: 'Passenger transport licence',
  description: 'PT-1',
  is_active: true,
  documents: [],
  trigger_url: 'https://connect.example/api/connect/fc/requests',
  pull_url: STANDARD.pull_url,
  branches: [STANDARD],
  rule_set_version: 3,
  next_rule_number: 4,
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

/** Ids of variants, as `crypto.randomUUID()` makes them */
const MAIN_ID = '5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6';
const VARIANT_ID = 'c8a2f1e0-1b2c-4d3e-8f40-5a6b7c8d9e0f';

const RULES_CHANGED_MESSAGE =
  'Another team member saved the rules of this connection after you opened it. Replacing their ' +
  'changes deletes the variant School transport.';

function rulesChangedError(): ApiError {
  return new ApiError(409, { error: 'rules_changed', message: RULES_CHANGED_MESSAGE });
}

/** The editor's rules after the team member set rule 1's message. */
function withMessage(message: string) {
  const rules = initialRulesState(LOADED);
  const [first, ...others] = rules.branches[0].items;
  return {
    ...rules,
    branches: [{ ...rules.branches[0], items: [{ ...first, message }, ...others] }],
  };
}

describe('createPayload (FR-028)', () => {
  const state = initialEditorState({ formConnection: LOADED, initialStep: 'rules' });

  it('always sends the rules of a new connection, Standard with the id it was keyed by', () => {
    const rules = initialRulesState();
    const payload = createPayload(INITIAL_EDITOR_STATE, rules);

    expect(payload.rules).toEqual({
      branches: [
        {
          id: rules.branches[0].key,
          name: 'Standard',
          description: null,
          origin: 'main',
          operator: 'and',
          operator_mark: null,
          items: [],
        },
      ],
      numbering_base: { rule: 1, group: 1 },
      base_version: null,
      replace: false,
    });
  });

  it('leaves the rules out of an edit that didn’t change them', () => {
    const payload = createPayload(state, initialRulesState(LOADED), { loaded: LOADED });

    expect(payload).toEqual({
      name: 'Passenger transport licence',
      description: 'PT-1',
      documents: [],
    });
    expect('rules' in payload).toBe(false);
  });

  it('sends changed rules with the rule set they were loaded from', () => {
    const payload = createPayload(state, withMessage('Citizens must be 21.'), {
      loaded: LOADED,
    });

    expect(payload.rules?.base_version).toBe(3);
    expect(payload.rules?.numbering_base).toEqual({ rule: 4, group: 1 });
    expect(payload.rules?.replace).toBe(false);
    expect(payload.rules?.branches[0].items[0].message).toBe('Citizens must be 21.');
    // The step's keys and the API's pull URLs stay out
    expect(Object.keys(payload.rules?.branches[0] ?? {}).sort()).toEqual([
      'description',
      'id',
      'items',
      'name',
      'operator',
      'operator_mark',
      'origin',
    ]);
  });

  it('sends a variant added in the step with its key as its id (spec 007, R10)', () => {
    const added = rulesReducer(initialRulesState(LOADED), {
      type: 'addVariant',
      variant: { name: 'Ambulance', description: null },
      origin: 'based',
      id: VARIANT_ID,
    });
    expect(added.branches[1]).toMatchObject({ key: VARIANT_ID, id: null });
    const payload = createPayload(state, added, { loaded: LOADED });
    expect(payload.rules?.branches.map((branch) => branch.id)).toEqual(['main', VARIANT_ID]);
  });

  it('replaces the other team member’s rules on request', () => {
    const payload = createPayload(state, withMessage('Citizens must be 21.'), {
      loaded: LOADED,
      replace: true,
    });

    expect(payload.rules?.replace).toBe(true);
  });
});

describe('rulesChanged', () => {
  it('compares the branches, so that a change undone by hand counts as none', () => {
    expect(rulesChanged(withMessage('Citizens must be 21.'), LOADED)).toBe(true);
    expect(rulesChanged(withMessage(US1_RULES[0].message), LOADED)).toBe(false);
  });

  it('ignores the order of the keys and the counters', () => {
    const rules = initialRulesState(LOADED);
    const reordered = Object.fromEntries(
      Object.entries(rules.branches[0].items[0]).reverse()
    ) as (typeof US1_RULES)[number];

    expect(
      rulesChanged(
        {
          ...rules,
          counters: { rule: 9, group: 2 },
          branches: [{ ...rules.branches[0], items: [reordered, ...US1_RULES.slice(1)] }],
        },
        LOADED
      )
    ).toBe(false);
  });

  it('counts an added or deleted variant as a change', () => {
    const rules = initialRulesState(LOADED);
    const ambulance = { ...rules.branches[0], key: 'new-1', id: null, name: 'Ambulance' };

    expect(rulesChanged({ ...rules, branches: [...rules.branches, ambulance] }, LOADED)).toBe(true);
  });
});

describe('isRulesChanged and publishErrorNotice (W9)', () => {
  it('recognises only the 409 rules_changed', () => {
    expect(isRulesChanged(rulesChangedError())).toBe(true);
    expect(
      isRulesChanged(new ApiError(409, { error: 'unavailable', message: 'Deactivated' }))
    ).toBe(false);
    expect(
      isRulesChanged(new ApiError(400, { error: 'rules_changed', message: 'Unknown variant.' }))
    ).toBe(false);
    expect(isRulesChanged(new Error('Network'))).toBe(false);
  });

  it('shows the API’s message, then what Reload and replacing do', () => {
    expect(publishErrorNotice(rulesChangedError(), true, 'en')).toEqual({
      message: `${RULES_CHANGED_MESSAGE} ${PUBLISH_DIALOG_COPY.en.rulesChangedHint}`,
    });
  });
});

describe('editorReducer and rules_changed', () => {
  const failed = editorReducer(
    { ...INITIAL_EDITOR_STATE, dialogOpen: true, publishing: true },
    {
      type: 'publishFailed',
      error: publishErrorNotice(rulesChangedError(), true, 'en'),
      rulesChanged: true,
    }
  );

  it('keeps the dialog open with the conflict', () => {
    expect(failed).toMatchObject({ dialogOpen: true, publishing: false, rulesChanged: true });
  });

  it.each([{ type: 'publish' }, { type: 'closeDialog' }, { type: 'openDialog' }] as const)(
    'forgets it on $type',
    (action) => {
      expect(editorReducer(failed, action)).toMatchObject({
        publishError: null,
        rulesChanged: false,
      });
    }
  );
});

describe('editorReducer and the toast on leaving a step (B4)', () => {
  it('drops the documents toast and its Undo', () => {
    const removed = editorReducer(
      {
        ...INITIAL_EDITOR_STATE,
        step: 'documents',
        documents: [{ document_type: 'pid', fields: [] }],
      },
      { type: 'removeDocument', documentType: 'pid', label: 'Personal ID' }
    );
    expect(removed.toast).not.toBeNull();
    const left = editorReducer(removed, { type: 'goToStep', step: 'rules' });
    expect(left).toMatchObject({ step: 'rules', toast: null, removed: null });
  });
});

describe('editorReducer and saving a draft (FR-013, S1.5)', () => {
  const failure: DraftSaveError = {
    notice: { message: DRAFT_COPY.en.saveNetworkError, error_id: 'abc123' },
    retryable: true,
  };

  it('saveDraft starts the save and clears the last failure', () => {
    const state = { ...INITIAL_EDITOR_STATE, draftError: failure };
    expect(editorReducer(state, { type: 'saveDraft' })).toMatchObject({
      savingDraft: true,
      draftError: null,
    });
  });

  it('saveDraftFailed ends the save and keeps the failure', () => {
    const saving = { ...INITIAL_EDITOR_STATE, savingDraft: true };
    expect(editorReducer(saving, { type: 'saveDraftFailed', error: failure })).toMatchObject({
      savingDraft: false,
      draftError: failure,
    });
  });

  it('goToStep takes the alert away', () => {
    const failed = { ...INITIAL_EDITOR_STATE, step: 'documents' as const, draftError: failure };
    expect(editorReducer(failed, { type: 'goToStep', step: 'connection' })).toMatchObject({
      step: 'connection',
      draftError: null,
    });
  });
});

describe('conflictOf (S2; R6)', () => {
  const draftOrigin: EditorOrigin = {
    kind: 'draft',
    draftId: 'd1',
    draftVersion: 3,
    flowKey: 'draft-d1',
  };
  const newOrigin: EditorOrigin = { kind: 'new', flowKey: 'new-1' };
  const publishedOrigin: EditorOrigin = { kind: 'published', formConnection: LOADED };
  const changed = new ApiError(409, {
    error: 'draft_changed',
    message: 'Kim saved this draft at 14:32.',
  });
  const published = new ApiError(409, {
    error: 'draft_published',
    message: 'Kim published this draft at 14:32.',
  });
  const deleted = new ApiError(404, { error: 'not_found', message: 'Draft not found.' });

  it('gives draft_changed with the server message and what was running', () => {
    expect(conflictOf(changed, draftOrigin, 'save', 'en')).toEqual({
      kind: 'draft_changed',
      during: 'save',
      message: 'Kim saved this draft at 14:32.',
    });
    expect(conflictOf(changed, draftOrigin, 'publish', 'en')?.during).toBe('publish');
  });

  it('gives draft_published with the server message', () => {
    expect(conflictOf(published, draftOrigin, 'publish', 'en')).toEqual({
      kind: 'draft_published',
      during: 'publish',
      message: 'Kim published this draft at 14:32.',
    });
  });

  it('gives draft_deleted with the deleted text for a 404 of a stored draft', () => {
    expect(conflictOf(deleted, draftOrigin, 'save', 'en')).toEqual({
      kind: 'draft_deleted',
      during: 'save',
      message: DRAFT_COPY.en.draftDeletedText,
    });
  });

  it('is null for any other answer of a stored draft', () => {
    const other409 = new ApiError(409, { error: 'rules_changed', message: 'Changed.' });
    const badRequest = new ApiError(400, { error: 'draft_changed', message: 'Invalid.' });
    const serverError = new ApiError(500, { error: 'server_error', message: 'Failed.' });
    expect(conflictOf(other409, draftOrigin, 'save', 'en')).toBeNull();
    expect(conflictOf(badRequest, draftOrigin, 'save', 'en')).toBeNull();
    expect(conflictOf(serverError, draftOrigin, 'publish', 'en')).toBeNull();
    expect(conflictOf(new TypeError('Failed to fetch'), draftOrigin, 'save', 'en')).toBeNull();
    expect(conflictOf(undefined, draftOrigin, 'save', 'en')).toBeNull();
  });

  it('is null for a new or a published origin', () => {
    for (const origin of [newOrigin, publishedOrigin]) {
      expect(conflictOf(changed, origin, 'save', 'en')).toBeNull();
      expect(conflictOf(published, origin, 'publish', 'en')).toBeNull();
      expect(conflictOf(deleted, origin, 'publish', 'en')).toBeNull();
    }
  });
});

describe('editorReducer and draft conflicts (S2)', () => {
  const conflict: DraftConflict = {
    kind: 'draft_changed',
    during: 'save',
    message: 'Kim saved this draft at 14:32.',
  };

  it('starts with no conflict', () => {
    expect(INITIAL_EDITOR_STATE.conflict).toBeNull();
  });

  it('draftConflict shows the conflict and ends the save and the publish', () => {
    const running = {
      ...INITIAL_EDITOR_STATE,
      savingDraft: true,
      publishing: true,
      dialogOpen: true,
    };
    expect(editorReducer(running, { type: 'draftConflict', conflict })).toMatchObject({
      conflict,
      savingDraft: false,
      publishing: false,
      dialogOpen: true,
    });
  });

  it('closeConflict takes the conflict away and keeps the work', () => {
    const shown = { ...INITIAL_EDITOR_STATE, name: 'Parking permit', conflict };
    expect(editorReducer(shown, { type: 'closeConflict' })).toMatchObject({
      conflict: null,
      name: 'Parking permit',
    });
  });
});

describe('removing data that rules check (FR-029, F18)', () => {
  const documents = [
    { document_type: 'pid', fields: ['birthdate', 'nationalities'] },
    { document_type: 'mdl', fields: ['driving_privileges'] },
  ];
  const rules = initialRulesState(LOADED);
  const DOCUMENT: PendingRemoval = {
    type: 'document',
    documentType: 'mdl',
    label: 'Driving licence',
  };
  const FIELD: PendingRemoval = {
    type: 'field',
    documentType: 'pid',
    field: 'birthdate',
    label: 'Date of birth',
  };
  const ALL: PendingRemoval = { type: 'allFields', documentType: 'pid', label: 'Personal ID' };

  it('names the rules of a document, a field and "All data", with their variants', () => {
    const named = (removal: PendingRemoval) =>
      removedDataRulesOf(removal, rules.branches, documents).map(
        ({ ruleName, branchName }) => `${ruleName} in ${branchName}`
      );
    expect(named(DOCUMENT)).toEqual(['Rule 02 in Standard', 'Rule 03 in Standard']);
    expect(named(FIELD)).toEqual(['Rule 01 in Standard']);
    expect(named(ALL)).toEqual(['Rule 01 in Standard']);
    expect(named({ ...FIELD, field: 'nationalities' })).toEqual([]);
  });

  it('leaves out rules on data already not requested, which the Rules step flags', () => {
    const withoutBirthdate = [{ document_type: 'pid', fields: ['nationalities'] }];
    expect(removedDataRulesOf(ALL, rules.branches, withoutBirthdate)).toEqual([]);
    expect(
      removedDataRulesOf({ ...DOCUMENT, documentType: 'pid' }, rules.branches, withoutBirthdate)
    ).toEqual([]);
  });

  it('gives each named rule a key of its own in every variant', () => {
    const twice = {
      ...rules,
      branches: [rules.branches[0], { ...rules.branches[0], key: 'ambulance', name: 'Ambulance' }],
    };
    const keys = removedDataRulesOf(FIELD, twice.branches, documents).map(({ key }) => key);
    expect(new Set(keys).size).toBe(2);
  });

  it('asks first, then applies the change once confirmed, keeping no question open', () => {
    const state = { ...INITIAL_EDITOR_STATE, documents };
    const asked = editorReducer(state, { type: 'askRemoval', removal: FIELD });
    expect(asked.pendingRemoval).toEqual(FIELD);
    expect(asked.documents).toEqual(documents);

    expect(editorReducer(asked, { type: 'cancelRemoval' })).toEqual(state);

    const confirmed = editorReducer(asked, { type: 'confirmRemoval' });
    expect(confirmed.pendingRemoval).toBeNull();
    expect(confirmed.documents[0].fields).toEqual(['nationalities']);
  });

  it('removes a document as without rules, with its Undo, and "All data" deselects every field', () => {
    const state = { ...INITIAL_EDITOR_STATE, documents };
    const removed = editorReducer(editorReducer(state, { type: 'askRemoval', removal: DOCUMENT }), {
      type: 'confirmRemoval',
    });
    expect(removed).toEqual(editorReducer(state, removalAction(DOCUMENT)));
    expect(removed.documents.map((document) => document.document_type)).toEqual(['pid']);
    // The design's wording (FR-002, U24 #27 "Driving licence removed."; spec 008 T052)
    expect(removed.toast?.message).toBe('Driving licence removed.');

    const cleared = editorReducer(editorReducer(state, { type: 'askRemoval', removal: ALL }), {
      type: 'confirmRemoval',
    });
    expect(cleared.documents[0].fields).toEqual([]);
  });
});

// The dialog's lines and "Check rules again" (spec 003, S5; W10; FR-017, FR-019)

/** A branch of the rules step, with US1's rules. */
function branch(key: string, name: string): RulesBranch {
  return {
    key,
    id: key,
    name,
    description: null,
    origin: key === 'main' ? 'main' : 'based',
    operator: 'and',
    operator_mark: null,
    items: US1_RULES,
  };
}

/** A complete check of US1's rules with these findings. */
function check(
  branchKey: string,
  findings: ItemFinding[],
  notice: BranchNotice | null = null
): BranchCheck {
  return {
    branchKey,
    fingerprint: 'f',
    complete: true,
    notice,
    findings,
    checkedRules: US1_RULES.length,
  };
}

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
const alwaysMet: ItemFinding[] = [
  { itemId: 'rule-3', kind: 'always_met', reason: null, today: false },
];
const BRANCHES = [branch('main', 'Standard'), branch('b2', 'Ambulance'), branch('b3', 'Taxi')];

describe('firstBranchWithFindings', () => {
  it('is null when no branch has findings', () => {
    expect(
      firstBranchWithFindings(BRANCHES, {
        main: check('main', []),
        b2: check('b2', []),
        b3: check('b3', []),
      })
    ).toBeNull();
    expect(firstBranchWithFindings(BRANCHES, {})).toBeNull();
  });

  it('takes the first in tab order, not in the order of byBranch', () => {
    expect(
      firstBranchWithFindings(BRANCHES, {
        b3: check('b3', conflict),
        b2: check('b2', conflict),
        main: check('main', []),
      })
    ).toBe('b2');
    expect(
      firstBranchWithFindings(BRANCHES, {
        b2: check('b2', conflict),
        main: check('main', conflict),
      })
    ).toBe('main');
  });

  it('skips branches missing from byBranch or not checked yet', () => {
    expect(firstBranchWithFindings(BRANCHES, { main: null, b3: check('b3', conflict) })).toBe('b3');
  });

  it('skips a branch without checked rules', () => {
    expect(
      firstBranchWithFindings(BRANCHES, {
        main: { ...check('main', conflict), checkedRules: 0 },
        b2: check('b2', conflict),
      })
    ).toBe('b2');
  });

  it('counts a branch no citizen can meet, or with always-met findings only', () => {
    expect(
      firstBranchWithFindings(BRANCHES, {
        main: check('main', []),
        b2: check('b2', [], { kind: 'none_can_meet', today: false }),
      })
    ).toBe('b2');
    expect(
      firstBranchWithFindings(BRANCHES, { main: check('main', []), b3: check('b3', alwaysMet) })
    ).toBe('b3');
  });

  it('skips a branch whose only notice is that it couldn’t be checked completely', () => {
    expect(
      firstBranchWithFindings(BRANCHES, {
        main: { ...check('main', []), complete: false },
        b2: check('b2', alwaysMet),
      })
    ).toBe('b2');
    expect(
      firstBranchWithFindings(BRANCHES, { main: { ...check('main', []), complete: false } })
    ).toBeNull();
  });

  it('opens the first branch the dialog names', () => {
    const byBranch = {
      main: { ...check('main', []), complete: false },
      b2: { ...check('b2', alwaysMet), checkedRules: 0 },
      b3: check('b3', conflict),
    };
    expect(firstBranchWithFindings(BRANCHES, byBranch)).toBe(
      findingLinesOf(BRANCHES, byBranch, 'en')[0].key
    );
  });
});

describe('findingLinesOf (US4-AS1, AS2, AS4)', () => {
  const duplicate: ItemFinding[] = [
    {
      itemId: 'rule-3',
      kind: 'redundant',
      reason: { type: 'same', item: 'rule-1' },
      today: false,
    },
  ];

  it('is empty without findings', () => {
    expect(findingLinesOf(BRANCHES, {}, 'en')).toEqual([]);
    expect(
      findingLinesOf(BRANCHES, { main: check('main', []), b2: null, b3: check('b3', []) }, 'en')
    ).toEqual([]);
  });

  it('gives one line per branch with findings, in tab order, under the name the tab shows', () => {
    const lines = findingLinesOf(
      [branch('main', 'Standard'), branch('b2', ' Ambulance ')],
      {
        b2: check('b2', conflict),
        main: check('main', duplicate),
      },
      'en'
    );
    expect(lines).toEqual([
      { key: 'main', text: 'Standard: 1 rule is a duplicate.', tone: 'info' },
      { key: 'b2', text: 'Ambulance: 2 rules contradict each other.', tone: 'warning' },
    ]);
  });

  it('adds the notice of a branch no citizen can meet, in the warning style', () => {
    expect(
      findingLinesOf(
        BRANCHES,
        {
          b2: check('b2', conflict, { kind: 'none_can_meet', today: false }),
          b3: check('b3', [], { kind: 'none_can_meet', today: true }),
        },
        'en'
      )
    ).toEqual([
      {
        key: 'b2',
        text: 'Ambulance: no citizen can meet these rules. 2 rules contradict each other.',
        tone: 'warning',
      },
      { key: 'b3', text: 'Taxi: right now no citizen can meet these rules.', tone: 'warning' },
    ]);
  });

  it('shows duplicate, always-met and all-meet findings in the info style', () => {
    expect(
      findingLinesOf(
        BRANCHES,
        {
          main: check('main', alwaysMet),
          b2: check('b2', [], { kind: 'all_meet', today: false }),
        },
        'en'
      )
    ).toEqual([
      { key: 'main', text: 'Standard: 1 rule every citizen meets.', tone: 'info' },
      { key: 'b2', text: 'Ambulance: every citizen meets these rules.', tone: 'info' },
    ]);
  });

  it('takes the warning style for a conflict next to info findings', () => {
    expect(
      findingLinesOf(BRANCHES, { main: check('main', [...conflict, ...duplicate]) }, 'en')
    ).toEqual([
      {
        key: 'main',
        text: 'Standard: 2 rules contradict each other, and 1 rule is a duplicate.',
        tone: 'warning',
      },
    ]);
  });

  it('leaves out branches without checked rules or only checked incompletely', () => {
    expect(
      findingLinesOf(
        BRANCHES,
        {
          main: { ...check('main', conflict), checkedRules: 0 },
          b2: { ...check('b2', []), complete: false },
          b3: { ...check('b3', duplicate), complete: false },
        },
        'en'
      )
    ).toEqual([{ key: 'b3', text: 'Taxi: 1 rule is a duplicate.', tone: 'info' }]);
  });
});

describe('the test step (spec 004, S2, S8)', () => {
  // Spec 008 cosmetic 12, C2 (U65 7057:58714)
  const TEST_TITLE = {
    title: 'Test rules with sample citizen data',
    hint: 'Choose a sample citizen to check that your rules work as intended. See which rules they meet and which message they’d see. The data is made up.',
  };

  it('titles the test step with the intro, in both modes (FR-004)', () => {
    expect(pageTitleOf('test', 'create', 'en')).toEqual(TEST_TITLE);
    expect(pageTitleOf('test', 'edit', 'en')).toEqual(TEST_TITLE);
  });

  it('publishes without rules while no branch has a rule (FR-001)', () => {
    expect(rulesNextActionOf(initialRulesState())).toBe('publishWithoutRules');
  });

  it('tests the rules when only a based variant has one (W2)', () => {
    const rules = initialRulesState({
      ...LOADED,
      branches: [
        { ...STANDARD, items: [] },
        {
          ...STANDARD,
          id: 'ambulance',
          name: 'Ambulance',
          origin: 'based',
          is_main: false,
        },
      ],
    });
    expect(rulesNextActionOf(rules)).toBe('test');
  });

  it('tests the rules while the first rule is open in the editor, until it is discarded', () => {
    const empty = initialRulesState();
    const editing = rulesReducer(empty, {
      type: 'addRule',
      branchKey: empty.branches[0].key,
      parentId: null,
    });
    expect(rulesNextActionOf(editing)).toBe('test');
    // EC "The first rule discarded"
    const discarded = rulesReducer(editing, { type: 'closeEditor' });
    expect(rulesNextActionOf(discarded)).toBe('publishWithoutRules');
  });
});

describe('problemPlaceOf (spec 004, FR-002; W3)', () => {
  const rules = initialRulesState(LOADED);
  const [standard] = rules.branches;
  const ruleId = standard.items[0].id;

  it('opens the branch the problem names and focuses its rule, then the message', () => {
    const problem = {
      code: 'noMessage' as const,
      message: 'Rule 01 in Standard has no error message.',
      branchIndex: 0,
      itemId: ruleId,
    };
    expect(problemPlaceOf(rules.branches, problem)).toEqual({
      branchKey: standard.key,
      focusIds: [`rule-${standard.key}-${ruleId}`, 'rules-problem'],
    });
  });

  it('focuses the message when the problem names a branch but no rule', () => {
    const problem = {
      code: 'variantNameMissing' as const,
      message: 'Enter a name for the variant.',
      branchIndex: 0,
      itemId: null,
    };
    expect(problemPlaceOf(rules.branches, problem)).toEqual({
      branchKey: standard.key,
      focusIds: ['rules-problem'],
    });
  });

  it('keeps the open branch when the problem names none', () => {
    const problem = {
      code: 'tooManyBranches' as const,
      message: 'There can be at most 10 variants.',
      branchIndex: null,
      itemId: null,
    };
    expect(problemPlaceOf(rules.branches, problem)).toEqual({
      branchKey: null,
      focusIds: ['rules-problem'],
    });
  });
});

describe('localContentOf (FR-002, FR-015; R9)', () => {
  const state = {
    ...INITIAL_EDITOR_STATE,
    step: 'rules' as const,
    name: '  Passenger transport licence ',
    description: ' PT-1',
    documents: [{ document_type: 'pid', fields: ['birthdate'] }],
  };

  it('takes the name and the description as typed, the documents, the branches and the counters', () => {
    const rules = initialRulesState(LOADED);
    expect(localContentOf(state, rules)).toEqual({
      name: '  Passenger transport licence ',
      description: ' PT-1',
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
      branches: [{ ...mainBranch(US1_RULES), id: 'main' }],
      numberingBase: { rule: 4, group: 1 },
      counters: { rule: 4, group: 1 },
    });
  });

  it('leaves out the step’s keys and pull URLs', () => {
    const [branch] = localContentOf(state, initialRulesState(LOADED)).branches;
    expect(branch).not.toHaveProperty('key');
    expect(branch).not.toHaveProperty('pull_url');
    expect(branch).not.toHaveProperty('is_main');
  });

  it('keeps a new rule open in the editor, incomplete as it is', () => {
    const empty = initialRulesState();
    const editing = rulesReducer(empty, {
      type: 'addRule',
      branchKey: empty.branches[0].key,
      parentId: null,
    });
    const content = localContentOf(state, editing);
    expect(content.branches[0].id).toBe(empty.branches[0].key);
    expect(content.branches[0].items).toEqual([
      {
        type: 'rule',
        id: 'rule-1',
        name: 'Rule 01',
        mark: null,
        target: null,
        condition: null,
        message: '',
      },
    ]);
    expect(content.counters).toEqual({ rule: 2, group: 1 });
    expect(content.numberingBase).toEqual({ rule: 1, group: 1 });
    // The step's own state is left as it is: the rule stays open
    expect(editing.editing).not.toBeNull();
  });

  it('keeps the changes to a saved rule open in the editor', () => {
    const rules = rulesReducer(initialRulesState(LOADED), {
      type: 'editRule',
      branchKey: 'main',
      ruleId: 'rule-2',
    });
    const draft = { ...US1_RULES[1], message: 'You need a class B licence.', condition: null };
    const changed = rulesReducer(rules, { type: 'changeDraft', draft });
    const content = localContentOf(state, changed);
    expect(content.branches[0].items).toEqual([US1_RULES[0], draft, US1_RULES[2]]);
    expect(content.counters).toEqual({ rule: 4, group: 1 });
  });
});

describe('draftPayload (R12)', () => {
  const content: LocalDraftContent = {
    name: '  Passenger transport licence ',
    description: ' PT-1 ',
    documents: [{ document_type: 'pid', fields: [] }],
    branches: [mainBranch()],
    numberingBase: { rule: 1, group: 1 },
    counters: { rule: 4, group: 2 },
  };

  it('trims the name and the description, and sends the branches, the numbering base and the step', () => {
    expect(draftPayload(content, 'documents')).toEqual({
      name: 'Passenger transport licence',
      description: 'PT-1',
      documents: [{ document_type: 'pid', fields: [] }],
      rules: { branches: [mainBranch()], numbering_base: { rule: 1, group: 1 } },
      step: 'documents',
    });
  });

  it('sends an empty description as empty', () => {
    expect(draftPayload({ ...content, description: '   ' }, 'connection')).toMatchObject({
      description: '',
      step: 'connection',
    });
  });
});

describe('openingStepOf (FR-008; R12)', () => {
  const withRules = initialRulesState(LOADED);
  const withoutRules = initialRulesState();

  it('opens the connection, documents and rules steps as saved', () => {
    for (const step of ['connection', 'documents', 'rules'] as const) {
      expect(openingStepOf(step, withRules)).toBe(step);
      expect(openingStepOf(step, withoutRules)).toBe(step);
    }
  });

  it('opens the test step with a rule, and the rules step without any', () => {
    expect(openingStepOf('test', withRules)).toBe('test');
    expect(openingStepOf('test', withoutRules)).toBe('rules');
  });

  it('counts a rule in any variant', () => {
    const rules = {
      ...withoutRules,
      branches: [
        withoutRules.branches[0],
        { ...mainBranch(US1_RULES), key: 'new-1', name: 'Taxi', origin: 'empty' as const },
      ],
    };
    expect(openingStepOf('test', rules)).toBe('test');
  });
});

describe('initialStatesFromDraft (FR-008; R12)', () => {
  function variant(name: string, items: BranchInput['items'] = []): BranchInput {
    return { ...mainBranch(items), id: crypto.randomUUID(), name, origin: 'based' };
  }

  /** A field as the API shows it; one the catalog dropped has its key as its label */
  function field(key: string, label: string = key): DocumentField {
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

  const DRAFT: FormConnectionDraft = {
    status: 'draft',
    state: 'draft',
    id: 'draft-1',
    name: 'Passenger transport licence',
    description: 'PT-1',
    documents: [
      {
        document_type: 'pid',
        label: 'Personal ID',
        fields: [field('birthdate', 'Date of birth')],
      },
    ],
    branches: [{ ...mainBranch(), id: MAIN_ID }],
    next_rule_number: 4,
    next_group_number: 2,
    step: 'test',
    version: 3,
    created_at: '2026-11-04T10:00:00Z',
    updated_at: '2026-11-04T10:30:00Z',
    last_activity: null,
  };

  it('takes the name, the description and the documents by key, at the saved step', () => {
    const { editor } = initialStatesFromDraft(DRAFT);
    expect(editor).toEqual({
      ...INITIAL_EDITOR_STATE,
      step: 'test',
      name: 'Passenger transport licence',
      description: 'PT-1',
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
    });
  });

  it('keeps an empty description, and a document with a field the catalog dropped', () => {
    const draft = {
      ...DRAFT,
      description: '',
      documents: [
        {
          document_type: 'pid',
          label: 'Personal ID',
          fields: [field('birthdate', 'Date of birth'), field('shoe_size')],
        },
        { document_type: 'gone', label: 'gone', fields: [] },
      ],
    };
    const { editor } = initialStatesFromDraft(draft, 'documents');
    expect(editor.description).toBe('');
    expect(editor.step).toBe('documents');
    expect(editor.documents).toEqual([
      { document_type: 'pid', fields: ['birthdate', 'shoe_size'] },
      { document_type: 'gone', fields: [] },
    ]);
  });

  it('keys Standard by its stored id, with the draft’s counters and no rule set', () => {
    const { rules } = initialStatesFromDraft(DRAFT);
    expect(rules).toEqual({
      ...initialRulesState(),
      branches: [{ ...mainBranch(), id: MAIN_ID, key: MAIN_ID }],
      openBranch: MAIN_ID,
      counters: { rule: 4, group: 2 },
      numberingBase: { rule: 4, group: 2 },
      ruleSetVersion: null,
    });
  });

  it('keys the variants by their stored ids, in order, keeping their content', () => {
    const variants = [variant('Taxi'), variant('Ambulance', US1_RULES), variant('Limousine')];
    const draft = { ...DRAFT, branches: [DRAFT.branches[0], ...variants] };
    const { rules } = initialStatesFromDraft(draft);
    expect(rules.branches.map((branch) => branch.key)).toEqual(
      draft.branches.map((branch) => branch.id)
    );
    expect(rules.branches.slice(1).map(({ key: _key, ...branch }) => branch)).toEqual(variants);
    expect(rules.openBranch).toBe(MAIN_ID);
  });

  it('gives a variant without a usable id a new one, which a save then sends', () => {
    const variants = [
      { ...variant('Taxi'), id: null },
      { ...variant('Bus'), id: MAIN_ID },
    ];
    const draft = { ...DRAFT, branches: [DRAFT.branches[0], ...variants] };
    const { rules } = initialStatesFromDraft(draft);
    const [main, taxi, bus] = rules.branches.map((branch) => branch.key);
    expect(main).toBe(MAIN_ID);
    expect(new Set([main, taxi, bus]).size).toBe(3);
    expect(rules.branches.map((branch) => branch.id)).toEqual([MAIN_ID, null, MAIN_ID]);
  });

  it('opens a test step without any rule at the rules step', () => {
    const draft = { ...DRAFT, branches: [mainBranch([]), variant('Taxi')] };
    expect(initialStatesFromDraft(draft).editor.step).toBe('rules');
    expect(initialStatesFromDraft(draft, 'documents').editor.step).toBe('documents');
  });

  it('falls back to an empty Standard for a draft without branches', () => {
    const { rules, editor } = initialStatesFromDraft({ ...DRAFT, branches: [] });
    expect(rules.branches).toEqual([
      { ...initialRulesState().branches[0], key: rules.branches[0].key },
    ]);
    expect(rules.openBranch).toBe(rules.branches[0].key);
    expect(rules.counters).toEqual({ rule: 4, group: 2 });
    expect(editor.step).toBe('rules');
  });

  it('starts states that make the draft’s content again', () => {
    const { editor, rules } = initialStatesFromDraft(DRAFT);
    expect(draftPayload(localContentOf(editor, rules), editor.step)).toEqual({
      name: DRAFT.name,
      description: DRAFT.description,
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
      rules: { branches: DRAFT.branches, numbering_base: { rule: 4, group: 2 } },
      step: 'test',
    });
  });
});

const DRAFT_ID = '0b6f1c2e-3d4a-4b5c-8d9e-0f1a2b3c4d5e';
const LOCAL_VARIANT_ID = '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';
const NEW_KEY = newFlowKey('7c9e6679-7425-40de-944b-e07fc1f90ae7');
const DRAFT_KEY = flowKeyOfDraft(DRAFT_ID);

/** A record of a new connection, at the rules step: Standard and Taxi with rules, Ambulance empty */
function localRecord(overrides: Partial<LocalDraftRecord> = {}): LocalDraftRecord {
  return {
    format: 2,
    flowKey: NEW_KEY,
    draftId: null,
    draftVersion: null,
    changedAt: '2026-11-04T14:32:00Z',
    step: 'rules',
    content: {
      name: 'Passenger transport licence',
      description: '',
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
      branches: [
        { ...mainBranch(US1_RULES), id: MAIN_ID },
        { ...mainBranch(US1_RULES), id: VARIANT_ID, name: 'Taxi', origin: 'based' },
        { ...mainBranch([]), id: LOCAL_VARIANT_ID, name: 'Ambulance', origin: 'empty' },
      ],
      numberingBase: { rule: 1, group: 1 },
      counters: { rule: 4, group: 2 },
    },
    ...overrides,
  };
}

describe('initialStatesFromLocal (FR-017; R10)', () => {
  it('takes the name, the description and the documents, at the record’s step', () => {
    const { editor } = initialStatesFromLocal(localRecord());
    expect(editor).toEqual({
      ...INITIAL_EDITOR_STATE,
      step: 'rules',
      name: 'Passenger transport licence',
      description: '',
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
    });
  });

  it('opens the test step with a rule, and the rules step without any', () => {
    expect(initialStatesFromLocal(localRecord({ step: 'test' })).editor.step).toBe('test');
    const record = localRecord({ step: 'test' });
    const empty = { ...record, content: { ...record.content, branches: [mainBranch([])] } };
    expect(initialStatesFromLocal(empty).editor.step).toBe('rules');
  });

  it('keys the variants by their ids in order, Standard open, without a rule set', () => {
    const record = localRecord();
    const { rules } = initialStatesFromLocal(record);
    expect(rules.branches.map((branch) => branch.key)).toEqual([
      MAIN_ID,
      VARIANT_ID,
      LOCAL_VARIANT_ID,
    ]);
    expect(rules.branches.map(({ key: _key, ...branch }) => branch)).toEqual(
      record.content.branches
    );
    expect(rules.openBranch).toBe(MAIN_ID);
    expect(rules.ruleSetVersion).toBeNull();
  });

  it('gives a record saved before variants had ids new ones, which its next write keeps', () => {
    const record = localRecord();
    const older = {
      ...record,
      content: {
        ...record.content,
        branches: record.content.branches.map((branch) => ({ ...branch, id: null })),
      },
    };
    const { editor, rules } = initialStatesFromLocal(older);
    const keys = rules.branches.map((branch) => branch.key);
    expect(new Set(keys).size).toBe(3);
    expect(rules.openBranch).toBe(keys[0]);
    const content = localContentOf(editor, rules);
    expect(content.branches.map((branch) => branch.id)).toEqual(keys);
    expect(content.branches.map(({ id: _id, ...branch }) => branch)).toEqual(
      older.content.branches.map(({ id: _id, ...branch }) => branch)
    );
    expect(draftPayload(content, 'rules').rules.branches.map((branch) => branch.id)).toEqual(keys);
  });

  it('gives a repeated or malformed id a new one', () => {
    const record = localRecord();
    const [main, taxi, ambulance] = record.content.branches;
    const content = {
      ...record.content,
      branches: [main, { ...taxi, id: MAIN_ID }, { ...ambulance, id: 'ambulance' }],
    };
    const { rules } = initialStatesFromLocal({ ...record, content });
    const keys = rules.branches.map((branch) => branch.key);
    expect(keys[0]).toBe(MAIN_ID);
    expect(new Set(keys).size).toBe(3);
    expect(keys[2]).not.toBe('ambulance');
  });

  it('takes the counters and the numbering base from the record', () => {
    const { rules } = initialStatesFromLocal(localRecord());
    expect(rules.counters).toEqual({ rule: 4, group: 2 });
    expect(rules.numberingBase).toEqual({ rule: 1, group: 1 });
  });

  it('starts states that make the record’s content again', () => {
    for (const record of [localRecord(), localRecord({ flowKey: DRAFT_KEY, draftId: DRAFT_ID })]) {
      const { editor, rules } = initialStatesFromLocal(record);
      expect(sameContent(localContentOf(editor, rules), record.content)).toBe(true);
    }
  });
});

describe('originOfRecord (R10)', () => {
  it('makes a new connection’s record a new flow under its key', () => {
    expect(originOfRecord(localRecord())).toEqual({ kind: 'new', flowKey: NEW_KEY });
  });

  it('makes a stored draft’s record a draft flow at the version it loaded', () => {
    const record = localRecord({ flowKey: DRAFT_KEY, draftId: DRAFT_ID, draftVersion: 3 });
    expect(originOfRecord(record)).toEqual({
      kind: 'draft',
      draftId: DRAFT_ID,
      draftVersion: 3,
      flowKey: DRAFT_KEY,
    });
  });

  it('gives a stored draft’s record without a version one that no draft has', () => {
    const record = localRecord({ flowKey: DRAFT_KEY, draftId: DRAFT_ID, draftVersion: null });
    expect(originOfRecord(record)).toEqual({
      kind: 'draft',
      draftId: DRAFT_ID,
      draftVersion: 0,
      flowKey: DRAFT_KEY,
    });
  });
});

describe('entryOf (contracts/local-drafts.md, rule 1; R10)', () => {
  it('starts a fresh flow without a parameter, also when a record is passed', () => {
    expect(entryOf(null, null)).toEqual({ kind: 'fresh' });
    expect(entryOf(null, localRecord())).toEqual({ kind: 'fresh' });
  });

  it('starts a fresh flow for a parameter that is no flow key', () => {
    for (const param of ['', 'new-', 'new-1', 'draft-abc', 'published-' + DRAFT_ID, DRAFT_ID]) {
      expect(entryOf(param, null)).toEqual({ kind: 'fresh' });
    }
    expect(entryOf('new-1', localRecord())).toEqual({ kind: 'fresh' });
  });

  it('opens the record of a new connection’s key', () => {
    const record = localRecord();
    expect(entryOf(NEW_KEY, record)).toEqual({ kind: 'local', record });
  });

  it('opens the record of a stored draft’s key, without going to its edit route', () => {
    const record = localRecord({ flowKey: DRAFT_KEY, draftId: DRAFT_ID, draftVersion: 3 });
    expect(entryOf(DRAFT_KEY, record)).toEqual({ kind: 'local', record });
  });

  it('goes to the stored draft for a draft key without a record', () => {
    expect(entryOf(DRAFT_KEY, null)).toEqual({ kind: 'missingDraft', draftId: DRAFT_ID });
  });

  it('starts empty under a new connection’s key without a record', () => {
    expect(entryOf(NEW_KEY, null)).toEqual({ kind: 'empty', flowKey: NEW_KEY });
  });
});

describe('startOfEntry (contracts/local-drafts.md, rule 1; R10; data-model.md section 6)', () => {
  const UUID = '9f1d2c3b-4a5e-4f60-8a7b-1c2d3e4f5a6b';

  it('starts a fresh flow empty under a new key, which goes into the URL', () => {
    const start = startOfEntry({ kind: 'fresh' }, () => UUID);
    const mainKey = start.kind === 'open' ? start.initialStates.rules.branches[0].key : '';
    const empty = initialRulesState();
    expect(start).toEqual({
      kind: 'open',
      origin: { kind: 'new', flowKey: newFlowKey(UUID) },
      initialStates: {
        editor: initialEditorState({ initialStep: 'connection' }),
        rules: {
          ...empty,
          branches: [{ ...empty.branches[0], key: mainKey }],
          openBranch: mainKey,
        },
      },
      baseline: emptyContent(mainKey),
      urlFlowKey: newFlowKey(UUID),
    });
  });

  it('takes the fresh flow’s own content for its baseline, its Standard’s id included', () => {
    const start = startOfEntry({ kind: 'fresh' }, () => UUID);
    if (start.kind !== 'open') {
      throw new Error('not open');
    }
    const { editor, rules } = start.initialStates;
    expect(start.baseline).toEqual(localContentOf(editor, rules));
  });

  it('starts empty under a new connection’s key without a record, leaving the URL alone', () => {
    const start = startOfEntry({ kind: 'empty', flowKey: NEW_KEY }, () => UUID);
    const mainKey = start.kind === 'open' ? start.initialStates.rules.branches[0].key : '';
    expect(start).toMatchObject({
      kind: 'open',
      origin: { kind: 'new', flowKey: NEW_KEY },
      baseline: emptyContent(mainKey),
      urlFlowKey: null,
    });
  });

  it('asks for a new key only for a fresh flow', () => {
    const record = localRecord();
    const newUuid = () => {
      throw new Error('no new key expected');
    };
    expect(() => startOfEntry({ kind: 'empty', flowKey: NEW_KEY }, newUuid)).not.toThrow();
    expect(() => startOfEntry({ kind: 'local', record }, newUuid)).not.toThrow();
    expect(() => startOfEntry({ kind: 'missingDraft', draftId: DRAFT_ID }, newUuid)).not.toThrow();
  });

  it('resumes a new connection’s record against the empty flow, not its own content', () => {
    const record = localRecord();
    const start = startOfEntry({ kind: 'local', record }, () => UUID);
    expect(start).toEqual({
      kind: 'open',
      origin: { kind: 'new', flowKey: NEW_KEY },
      initialStates: initialStatesFromLocal(record),
      baseline: emptyContent(MAIN_ID),
      urlFlowKey: null,
    });
  });

  it('resumes a stored draft’s record as a draft flow without a baseline', () => {
    const record = localRecord({ flowKey: DRAFT_KEY, draftId: DRAFT_ID, draftVersion: 3 });
    const start = startOfEntry({ kind: 'local', record }, () => UUID);
    expect(start).toEqual({
      kind: 'open',
      origin: { kind: 'draft', draftId: DRAFT_ID, draftVersion: 3, flowKey: DRAFT_KEY },
      initialStates: initialStatesFromLocal(record),
      baseline: null,
      urlFlowKey: null,
    });
  });

  it('sends a stored draft’s key without a record to the draft', () => {
    expect(startOfEntry({ kind: 'missingDraft', draftId: DRAFT_ID }, () => UUID)).toEqual({
      kind: 'missingDraft',
      draftId: DRAFT_ID,
    });
  });

  it('opens a fresh flow at the step asked for', () => {
    const start = startOfEntry({ kind: 'fresh' }, () => UUID, 'documents');
    expect(start.kind === 'open' && start.initialStates.editor.step).toBe('documents');
  });
});

describe('startOfOrigin (data-model.md section 6)', () => {
  const DRAFT_ORIGIN = {
    kind: 'draft',
    draftId: DRAFT_ID,
    draftVersion: 3,
    flowKey: DRAFT_KEY,
  } as const;

  it('takes a stored draft as loaded for its baseline', () => {
    const states = initialStatesFromLocal(localRecord());
    const start = startOfOrigin({ origin: DRAFT_ORIGIN, initialStates: states });
    expect(start.initialStates).toBe(states);
    expect(start.baseline).toEqual(localContentOf(states.editor, states.rules));
    expect(start.urlFlowKey).toBeNull();
  });

  it('takes the baseline given, as after “Restore changes”', () => {
    const states = initialStatesFromLocal(localRecord());
    const loaded = { ...emptyContent(), name: 'Stored' };
    const start = startOfOrigin({ origin: DRAFT_ORIGIN, initialStates: states, baseline: loaded });
    expect(start.baseline).toBe(loaded);
  });

  it('gives a published connection its states and no baseline', () => {
    const start = startOfOrigin({
      origin: { kind: 'published', formConnection: LOADED },
      initialStep: 'rules',
    });
    expect(start.initialStates).toEqual({
      editor: initialEditorState({ formConnection: LOADED, initialStep: 'rules' }),
      rules: initialRulesState(LOADED),
    });
    expect(start.baseline).toBeNull();
  });

  it('gives a new connection the empty flow', () => {
    const start = startOfOrigin({ origin: { kind: 'new', flowKey: NEW_KEY } });
    expect(start.baseline).toEqual(emptyContent(start.initialStates.rules.branches[0].key));
    expect(start.initialStates.editor.step).toBe('connection');
  });
});

describe('step 1 and the header (S7; T049, U19, U98)', () => {
  const STEP_1 = {
    title: 'Name your connection',
    hint: 'Link a service to the EUDI Wallet so citizens can share verified data.',
  };

  it('titles step 1 as U19 draws it, also for the first connection (U18 6793:47711)', () => {
    expect(pageTitleOf('connection', 'create', 'en')).toEqual(STEP_1);
    expect(pageTitleOf('connection', 'first', 'en')).toEqual(STEP_1);
  });

  it('titles the edit flow’s step 1 "Connection details" (U98, build note U05 #27)', () => {
    expect(pageTitleOf('connection', 'edit', 'en')).toEqual({
      title: 'Connection details',
      hint: 'Rename this connection or update its description.',
    });
  });

  it('reads "New connection" on a new connection’s step 1, the name after it (U19 6699:45350)', () => {
    const named = { ...INITIAL_EDITOR_STATE, name: ' Taxi licence ' };
    expect(headerTitleOf(INITIAL_EDITOR_STATE, 'en')).toBe('New connection');
    expect(headerTitleOf(named, 'en')).toBe('New connection');
    expect(headerTitleOf({ ...named, step: 'documents' }, 'en')).toBe('Taxi licence');
  });

  it('names a stored draft on step 1 too, the adopted header of U19 6716:40925', () => {
    const named = { ...INITIAL_EDITOR_STATE, name: 'Taxi licence' };
    expect(headerTitleOf(named, 'en', undefined, true)).toBe('Taxi licence');
    expect(headerTitleOf({ ...named, name: '  ' }, 'en', undefined, true)).toBe('New connection');
  });

  it('names a published connection by the name as typed, or its saved one', () => {
    expect(headerTitleOf({ ...INITIAL_EDITOR_STATE, name: 'Taxi' }, 'en', LOADED)).toBe('Taxi');
    expect(headerTitleOf(INITIAL_EDITOR_STATE, 'en', LOADED)).toBe(LOADED.name);
  });
});

describe('validateConnection (FR-002, FR-003)', () => {
  const NAME = 'Passenger transport licence';

  it('takes an empty or space-only description', () => {
    expect(validateConnection(NAME, '', 'en')).toEqual({});
    expect(validateConnection(NAME, '   ', 'en')).toEqual({});
  });

  it('takes 500 characters and refuses 501', () => {
    expect(validateConnection(NAME, 'a'.repeat(500), 'en')).toEqual({});
    expect(validateConnection(NAME, ` ${'a'.repeat(500)} `, 'en')).toEqual({});
    const errors = validateConnection(NAME, 'a'.repeat(501), 'en');
    expect(errors).toEqual({ description: 'The description can have at most 500 characters.' });
    expect(firstInvalidElementId(errors)).toBe('connection-description');
  });

  it('still gives the name’s error first', () => {
    expect(validateConnection('', '', 'en')).toEqual({ name: 'Enter a name for the connection.' });
    const errors = validateConnection('  ', 'a'.repeat(501), 'en');
    expect(errors).toEqual({
      name: 'Enter a name for the connection.',
      description: 'The description can have at most 500 characters.',
    });
    expect(firstInvalidElementId(errors)).toBe('connection-name');
  });
});

describe('draftNameErrors (R12)', () => {
  it('asks for a name', () => {
    expect(draftNameErrors('', 'en')).toEqual({ name: 'Enter a name for the connection.' });
    expect(draftNameErrors('   ', 'en')).toEqual({ name: 'Enter a name for the connection.' });
  });

  it('takes 200 characters and refuses 201', () => {
    expect(draftNameErrors('a'.repeat(200), 'en')).toEqual({});
    expect(draftNameErrors('a'.repeat(201), 'en')).toEqual({
      name: 'The name can have at most 200 characters.',
    });
  });

  it('never asks for a description', () => {
    expect(draftNameErrors('Passenger transport licence', 'en')).toEqual({});
  });
});

describe('draftSaveErrorOf (S1.5, W3)', () => {
  const NETWORK = 'Couldn’t save. Check your internet connection and try again.';

  it('shows a 400’s message, without "Try again"', () => {
    const error = new ApiError(400, {
      error: 'validation_error',
      message: 'The name can have at most 200 characters.',
    });
    expect(draftSaveErrorOf(error, 'en')).toEqual({
      notice: { message: 'The name can have at most 200 characters.' },
      retryable: false,
    });
  });

  it('shows a 404’s message, without "Try again"', () => {
    const error = new ApiError(404, { error: 'not_found', message: 'Draft not found.' });
    expect(draftSaveErrorOf(error, 'en')).toEqual({
      notice: { message: 'Draft not found.' },
      retryable: false,
    });
  });

  it('shows U28’s text with a 500’s error ID, and "Try again"', () => {
    const error = new ApiError(500, {
      error: 'internal_error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(draftSaveErrorOf(error, 'en')).toEqual({
      notice: { message: NETWORK, error_id: 'abc123' },
      retryable: true,
    });
  });

  it('shows U28’s text for a 502 without a JSON body, and "Try again"', async () => {
    const response = new Response('<html>502 Bad Gateway</html>', { status: 502 });
    const error: unknown = await handleResponse(response).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(draftSaveErrorOf(error, 'en')).toEqual({
      notice: { message: NETWORK },
      retryable: true,
    });
  });

  it('shows U28’s text for a network failure, and "Try again"', () => {
    expect(draftSaveErrorOf(new TypeError('Failed to fetch'), 'en')).toEqual({
      notice: { message: NETWORK },
      retryable: true,
    });
  });
});

describe('data the catalog dropped (S8; FR-003 edge case)', () => {
  function catalogField(key: string, label: string): DocumentField {
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

  const CATALOG: DocumentType[] = [
    {
      key: 'pid',
      label: 'Personal ID',
      fields: [
        catalogField('birthdate', 'Date of birth'),
        catalogField('nationalities', 'Nationalities'),
      ],
    },
    {
      key: 'mdl',
      label: 'Driving licence',
      fields: [catalogField('driving_privileges', 'Driving privileges')],
    },
  ];
  const documents = [
    { document_type: 'pid', fields: ['eye_colour', 'birthdate', 'shoe_size'] },
    { document_type: 'residence_permit', fields: ['valid_until'] },
    { document_type: 'mdl', fields: ['driving_privileges'] },
  ];
  const EYE_COLOUR: DroppedData = {
    documentType: 'pid',
    field: 'eye_colour',
    label: 'Personal ID – eye_colour',
  };
  const SHOE_SIZE: DroppedData = {
    documentType: 'pid',
    field: 'shoe_size',
    label: 'Personal ID – shoe_size',
  };
  const PERMIT: DroppedData = {
    documentType: 'residence_permit',
    field: null,
    label: 'residence_permit',
  };

  it('shows a card only the fields the catalog offers', () => {
    expect(offeredFieldsOf(documents[0].fields, CATALOG[0])).toEqual(['birthdate']);
  });

  it('moves a flow that opens elsewhere to the documents step, only with dropped data', () => {
    expect(stepForDroppedData('connection', [PERMIT])).toBe('documents');
    expect(stepForDroppedData('rules', [EYE_COLOUR])).toBe('documents');
    expect(stepForDroppedData('test', [EYE_COLOUR])).toBe('documents');
    expect(stepForDroppedData('documents', [EYE_COLOUR])).toBeNull();
    expect(stepForDroppedData('rules', [])).toBeNull();
  });

  it('removes every dropped document and field at once, without a toast', () => {
    const state = {
      ...INITIAL_EDITOR_STATE,
      step: 'documents' as const,
      documents,
    };
    const removal = droppedRemovalOf([EYE_COLOUR, SHOE_SIZE, PERMIT]);
    expect(removalAction(removal)).toEqual({
      type: 'removeDropped',
      items: [EYE_COLOUR, SHOE_SIZE, PERMIT],
    });
    const removed = editorReducer(state, removalAction(removal));
    expect(removed.documents).toEqual([
      { document_type: 'pid', fields: ['birthdate'] },
      { document_type: 'mdl', fields: ['driving_privileges'] },
    ]);
    expect(removed.toast).toBeNull();
    expect(removed.removed).toBeNull();
    expect(droppedDataOf(removed.documents, CATALOG)).toEqual([]);
  });

  it('applies the removal once the dialog is confirmed', () => {
    const state = { ...INITIAL_EDITOR_STATE, documents };
    const removal = droppedRemovalOf([PERMIT]);
    const asked = editorReducer(state, { type: 'askRemoval', removal });
    const confirmed = editorReducer(asked, { type: 'confirmRemoval' });
    expect(confirmed.pendingRemoval).toBeNull();
    expect(confirmed.documents.map((document) => document.document_type)).toEqual(['pid', 'mdl']);
  });

  describe('the rules that check it, named first', () => {
    const rules = initialRulesState(LOADED);
    const named = (items: DroppedData[], requested = documents) =>
      removedDataRulesOf(droppedRemovalOf(items), rules.branches, requested).map(
        ({ ruleName, branchName }) => `${ruleName} in ${branchName}`
      );

    it('names the rules of a dropped field, and nothing for unchecked data', () => {
      const birthdate: DroppedData = { ...EYE_COLOUR, field: 'birthdate' };
      expect(named([birthdate])).toEqual(['Rule 01 in Standard']);
      expect(named([EYE_COLOUR, PERMIT])).toEqual([]);
    });

    it('names a dropped document’s rules on its requested fields, in tree order', () => {
      const mdl: DroppedData = { documentType: 'mdl', field: null, label: 'mdl' };
      const birthdate: DroppedData = { ...EYE_COLOUR, field: 'birthdate' };
      expect(named([mdl, birthdate])).toEqual([
        'Rule 01 in Standard',
        'Rule 02 in Standard',
        'Rule 03 in Standard',
      ]);
      expect(named([mdl], [{ document_type: 'mdl', fields: [] }])).toEqual([]);
    });

    it('names each rule once per variant', () => {
      const twice = [
        rules.branches[0],
        { ...rules.branches[0], key: 'ambulance', name: 'Ambulance' },
      ];
      const mdl: DroppedData = { documentType: 'mdl', field: null, label: 'mdl' };
      const keys = removedDataRulesOf(droppedRemovalOf([mdl]), twice, documents).map(
        ({ key }) => key
      );
      expect(keys).toHaveLength(4);
      expect(new Set(keys).size).toBe(4);
    });
  });

  it('names every dropped item in the removal', () => {
    const removal = droppedRemovalOf([EYE_COLOUR, PERMIT]);
    expect(removal).toEqual({
      type: 'dropped',
      items: [EYE_COLOUR, PERMIT],
      label: 'Personal ID – eye_colour, residence_permit',
    });
  });
});

describe('warningsFirst (FR-044c)', () => {
  it('puts the warning lines first and keeps each kind in tab order', () => {
    const lines = [
      { key: 'main', text: 'Standard: 1 rule is a duplicate.', tone: 'info' as const },
      { key: 'b2', text: 'Ambulance: 2 rules contradict each other.', tone: 'warning' as const },
      { key: 'b3', text: 'Taxi: 1 rule every citizen meets.', tone: 'info' as const },
      { key: 'b4', text: 'Bus: no citizen can meet these rules.', tone: 'warning' as const },
    ];
    expect(warningsFirst(lines).map((line) => line.key)).toEqual(['b2', 'b4', 'main', 'b3']);
    expect(lines.map((line) => line.key)).toEqual(['main', 'b2', 'b3', 'b4']);
  });
});

describe('the wizard in the language of the moment (spec 009, FR-003, FR-006)', () => {
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

  // The catalog as `useDocumentTypes` delivers it in German (glossary G§4)
  const GERMAN_CATALOG: DocumentType[] = [
    { key: 'pid', label: 'Personalausweis', fields: [field('birthdate', 'Geburtsdatum')] },
    { key: 'mdl', label: 'Führerschein', fields: [] },
  ];
  const ENGLISH_CATALOG: DocumentType[] = [
    { key: 'pid', label: 'Personal ID', fields: [field('birthdate', 'Date of birth')] },
    { key: 'mdl', label: 'Driving licence', fields: [] },
  ];

  it('titles step 1 and the documents step in German', () => {
    expect(pageTitleOf('connection', 'create', 'de')).toEqual({
      title: 'Benennen Sie Ihre Anbindung',
      hint: 'Verbinden Sie einen Dienst mit der EUDI-Wallet, damit Bürgerinnen und Bürger geprüfte Daten teilen können.',
    });
    expect(pageTitleOf('connection', 'edit', 'de').title).toBe('Details der Anbindung');
    expect(pageTitleOf('documents', 'create', 'de').title).toBe('Dokumente und Daten auswählen');
    expect(pageTitleOf('rules', 'edit', 'de')).toEqual({
      title: RULES_STEP_COPY.de.title,
      hint: RULES_STEP_COPY.de.hint,
    });
  });

  it('names a new connection in German, and a name as typed in both', () => {
    expect(headerTitleOf(INITIAL_EDITOR_STATE, 'de')).toBe('Neue Anbindung');
    const named = { ...INITIAL_EDITOR_STATE, name: 'Taxi licence', step: 'documents' as const };
    expect(headerTitleOf(named, 'de')).toBe('Taxi licence');
  });

  it('refuses step 1 with the server’s German messages, word for word', () => {
    expect(validateConnection('', 'a'.repeat(501), 'de')).toEqual({
      name: 'Geben Sie einen Namen für die Anbindung ein.',
      description: 'Die Beschreibung darf höchstens 500 Zeichen lang sein.',
    });
    expect(draftNameErrors('a'.repeat(201), 'de')).toEqual({
      name: 'Der Name darf höchstens 200 Zeichen lang sein.',
    });
  });

  it('words the messages shown again in the language of the moment, only where there are any', () => {
    const shown = validateConnection('', 'a'.repeat(501), 'en');
    expect(connectionErrorsOf(shown, '', 'a'.repeat(501), 'de')).toEqual({
      name: 'Geben Sie einen Namen für die Anbindung ein.',
      description: 'Die Beschreibung darf höchstens 500 Zeichen lang sein.',
    });
    expect(connectionErrorsOf(shown, '', 'a'.repeat(501), 'en')).toEqual(shown);
    // "Save and exit" checks the name only: a long description gets no message
    const nameOnly = draftNameErrors('', 'de');
    expect(connectionErrorsOf(nameOnly, '', 'a'.repeat(501), 'en')).toEqual({
      name: 'Enter a name for the connection.',
      description: undefined,
    });
    expect(connectionErrorsOf({}, '', '', 'de')).toEqual({
      name: undefined,
      description: undefined,
    });
  });

  it('names the data of an open removal question from the catalog of the moment', () => {
    const asked: PendingRemoval = {
      type: 'field',
      documentType: 'pid',
      field: 'birthdate',
      label: 'Date of birth',
    };
    expect(removalInLanguage(asked, GERMAN_CATALOG, 'de')).toEqual({
      ...asked,
      label: 'Geburtsdatum',
    });
    expect(removalInLanguage(asked, ENGLISH_CATALOG, 'en')).toEqual(asked);
    const document: PendingRemoval = { type: 'document', documentType: 'mdl', label: 'x' };
    expect(removalInLanguage(document, GERMAN_CATALOG, 'de').label).toBe('Führerschein');
    const all: PendingRemoval = { type: 'allFields', documentType: 'pid', label: 'x' };
    expect(removalInLanguage(all, GERMAN_CATALOG, 'de').label).toBe('Personalausweis');
    // A key the catalog lacks keeps its key, as the catalog has no name for it
    const unknown: PendingRemoval = { type: 'document', documentType: 'permit', label: 'permit' };
    expect(removalInLanguage(unknown, GERMAN_CATALOG, 'de').label).toBe('permit');
  });

  it('names the dropped data of the note’s question in the language of the moment', () => {
    const dropped = droppedRemovalOf([
      { documentType: 'pid', field: 'eye_colour', label: 'Personal ID – eye_colour' },
      { documentType: 'residence_permit', field: null, label: 'residence_permit' },
    ]);
    expect(removalInLanguage(dropped, GERMAN_CATALOG, 'de')).toEqual({
      type: 'dropped',
      items: [
        { documentType: 'pid', field: 'eye_colour', label: 'Personalausweis – eye_colour' },
        { documentType: 'residence_permit', field: null, label: 'residence_permit' },
      ],
      label: 'Personalausweis – eye_colour, residence_permit',
    });
    expect(removalInLanguage(dropped, ENGLISH_CATALOG, 'en')).toEqual(dropped);
  });

  it('words the documents’ toast as it shows, keeping its id', () => {
    const removed = editorReducer(
      { ...INITIAL_EDITOR_STATE, documents: [{ document_type: 'mdl', fields: [] }] },
      { type: 'removeDocument', documentType: 'mdl', label: 'Driving licence' }
    );
    expect(documentsToastOf(removed.toast, removed.removed, GERMAN_CATALOG, 'de')).toEqual({
      id: removed.toast?.id,
      message: 'Führerschein entfernt.',
      actionLabel: 'Rückgängig',
    });
    expect(documentsToastOf(removed.toast, removed.removed, ENGLISH_CATALOG, 'en')).toEqual(
      removed.toast
    );
    expect(documentsToastOf(null, null, GERMAN_CATALOG, 'de')).toBeNull();
  });

  it('counts the publish dialog’s summary in German', () => {
    const documents = [
      { document_type: 'pid', fields: ['birthdate'] },
      { document_type: 'mdl', fields: ['a', 'b'] },
    ];
    expect(documentLines(documents, GERMAN_CATALOG, 'de')).toEqual([
      'Personalausweis · 1 Feld',
      'Führerschein · 2 Felder',
    ]);
    expect(documentLines(documents, ENGLISH_CATALOG, 'en')).toEqual([
      'Personal ID · 1 data item',
      'Driving licence · 2 data items',
    ]);
    const rules = initialRulesState(LOADED);
    expect(ruleLines(rules, false, 'de')).toEqual([
      `Standard · ${countRules(rules.branches[0].items)} Regeln`,
    ]);
    expect(ruleLines(rules, true, 'de')).toEqual(['Keine Regeln']);
    expect(ruleLines(initialRulesState(), false, 'de')).toEqual(['Standard · Keine Regeln']);
  });

  it('gives the findings’ lines in German, the variants’ names as they are', () => {
    expect(
      findingLinesOf(
        [branch('main', 'Standard'), branch('b2', ' Ambulance ')],
        { main: check('main', []), b2: check('b2', conflict) },
        'de'
      )
    ).toEqual([
      {
        key: 'b2',
        text: 'Ambulance: 2 Regeln widersprechen einander.',
        tone: 'warning',
      },
    ]);
  });

  it('words a failed save in German, and keeps the server’s message', () => {
    const network = draftSaveErrorOf(new TypeError('Failed to fetch'), 'de');
    expect(saveFailureToastOf(network, -1, 'de')).toEqual({
      id: -1,
      message:
        'Der Entwurf konnte nicht gespeichert werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
      actionLabel: 'Erneut versuchen',
      errorId: undefined,
    });
    // A switch while it shows: the website's own sentence follows the language
    expect(saveFailureToastOf(network, -1, 'en')).toMatchObject({
      message: DRAFT_COPY.en.saveNetworkError,
      actionLabel: 'Try again',
    });
    const refused = draftSaveErrorOf(
      new ApiError(400, {
        error: 'invalid',
        message: 'Der Name darf höchstens 200 Zeichen lang sein.',
      }),
      'en'
    );
    expect(saveFailureToastOf(refused, -2, 'en')).toEqual({
      id: -2,
      message: 'Der Name darf höchstens 200 Zeichen lang sein.',
      actionLabel: undefined,
      errorId: undefined,
    });
  });

  it('gives the deleted draft’s text and the rules’ conflict hint in German', () => {
    const deleted = new ApiError(404, { error: 'not_found', message: 'Entwurf nicht gefunden.' });
    const origin: EditorOrigin = {
      kind: 'draft',
      draftId: 'd1',
      draftVersion: 1,
      flowKey: flowKeyOfDraft('d1'),
    };
    expect(conflictOf(deleted, origin, 'publish', 'de')?.message).toBe(
      'Dieser Entwurf wurde gelöscht, nachdem Sie ihn geöffnet haben. Speichern Sie Ihre Arbeit als neuen Entwurf, um sie zu behalten.'
    );
    expect(publishErrorNotice(rulesChangedError(), true, 'de').message).toBe(
      `${RULES_CHANGED_MESSAGE} ${PUBLISH_DIALOG_COPY.de.rulesChangedHint}`
    );
  });
});

describe('publishDialogReducer: "Active from" (spec 010, S14, C2; FR-001–FR-003, FR-014)', () => {
  const TODAY = '2026-11-11';
  const run = (actions: PublishDialogAction[], start = INITIAL_PUBLISH_DIALOG_STATE) =>
    actions.reduce<PublishDialogState>(publishDialogReducer, start);
  const opened = run([{ type: 'open', from: 'test', withoutRules: false }]);
  const onDate = (text: string) =>
    run(
      [
        { type: 'chooseActiveFrom', choice: 'date' },
        { type: 'typeStartDate', text },
      ],
      opened
    );

  it('opens with "Now", an empty field and no error, also after a scheduled attempt', () => {
    expect(opened).toMatchObject({
      phase: 'summary',
      activeFrom: 'now',
      startDateText: '',
      dateError: false,
      dateRefusals: 0,
    });
    const reopened = run(
      [
        { type: 'dateRefused' },
        { type: 'close' },
        { type: 'open', from: 'test', withoutRules: false },
      ],
      onDate('31.02.2027')
    );
    expect(reopened).toMatchObject({ activeFrom: 'now', startDateText: '', dateError: false });
  });

  it('sends no date with "Now" and in the edit flow, the day with "On a date"', () => {
    expect(publishStartDateOf(opened, false, TODAY)).toEqual({ ok: true, date: null });
    expect(publishStartDateOf(onDate('1.12.2026'), false, TODAY)).toEqual({
      ok: true,
      date: '2026-12-01',
    });
    // "Save changes?" has no "Active from" (F9), whatever the state holds
    expect(publishStartDateOf(onDate('11.11.2026'), true, TODAY)).toEqual({
      ok: true,
      date: null,
    });
  });

  it('refuses an empty field, today, the past and no date (startDateOf)', () => {
    for (const text of ['', '11.11.2026', '10.11.2026', '31.02.2027', 'abc']) {
      expect(publishStartDateOf(onDate(text), false, TODAY)).toEqual({ ok: false });
    }
  });

  it("shows the field's error on a refusal and drops it when the text or the choice changes", () => {
    const refused = run([{ type: 'dateRefused' }], onDate('10.11.2026'));
    expect(refused).toMatchObject({
      phase: 'summary',
      dateError: true,
      dateRefusals: 1,
      activeFrom: 'date',
      startDateText: '10.11.2026',
    });
    expect(run([{ type: 'dateRefused' }], refused).dateRefusals).toBe(2);
    // A date that passed the check is sent: the error goes while it publishes and after a failure
    expect(
      run([{ type: 'publish' }, { type: 'failed', failure: { kind: 'general' } }], refused)
    ).toMatchObject({ phase: 'failed', dateError: false, startDateText: '10.11.2026' });
    expect(run([{ type: 'typeStartDate', text: '12.11.2026' }], refused).dateError).toBe(false);
    expect(run([{ type: 'chooseActiveFrom', choice: 'now' }], refused)).toMatchObject({
      dateError: false,
      startDateText: '10.11.2026',
    });
  });

  it("shows the server's 400 invalid_start_date as the same field error, not as a failure", () => {
    const error = new ApiError(400, {
      error: 'invalid_start_date',
      message: 'Enter a date after today.',
    });
    expect(isInvalidStartDate(error)).toBe(true);
    expect(isInvalidStartDate(new ApiError(400, { error: 'invalid', message: 'No.' }))).toBe(false);
    expect(isInvalidStartDate(new TypeError('Failed to fetch'))).toBe(false);
    // Midnight passed during the publish: the summary again, without a failure, with the error
    const refused = run([{ type: 'publish' }, { type: 'dateRefused' }], onDate('12.11.2026'));
    expect(refused).toMatchObject({
      phase: 'summary',
      failure: null,
      dateError: true,
      startDateText: '12.11.2026',
    });
    // "Publish without rules?" stays itself
    const withoutRules = run(
      [
        { type: 'open', from: 'rules', withoutRules: true },
        { type: 'chooseActiveFrom', choice: 'date' },
        { type: 'publish' },
        { type: 'dateRefused' },
      ],
      INITIAL_PUBLISH_DIALOG_STATE
    );
    expect(withoutRules).toMatchObject({ phase: 'noRules', withoutRules: true, dateError: true });
  });

  it('keeps the choice and the text through a failure, so "Try again" sends the same', () => {
    const failed = run(
      [{ type: 'publish' }, { type: 'failed', failure: { kind: 'general' } }],
      onDate('01.12.2026')
    );
    expect(failed).toMatchObject({
      phase: 'failed',
      activeFrom: 'date',
      startDateText: '01.12.2026',
      dateError: false,
    });
    expect(publishStartDateOf(failed, false, TODAY)).toEqual({ ok: true, date: '2026-12-01' });
    const retried = run([{ type: 'publish' }], failed);
    expect(retried).toMatchObject({ phase: 'publishing', activeFrom: 'date' });
    expect(publishStartDateOf(retried, false, TODAY)).toEqual({ ok: true, date: '2026-12-01' });
    // A conflict keeps them too, for "Replace their changes"
    const conflict = run(
      [{ type: 'conflict', conflict: { kind: 'rules_changed', message: 'Changed.' } }],
      retried
    );
    expect(publishStartDateOf(conflict, false, TODAY)).toEqual({ ok: true, date: '2026-12-01' });
    // After "Schedule" the status stays "Publishing…", then "Published" (FR-014)
    expect(run([{ type: 'published', connectionId: 'fc-1' }], retried)).toMatchObject({
      phase: 'published',
      connectionId: 'fc-1',
    });
  });
});

describe('publishFailureOf: the no-answer sentence only when no answer came (FR-014, F2, W8)', () => {
  it("gives the sentence for a network failure and a 5xx without the API's envelope", () => {
    expect(publishFailureOf(new TypeError('Failed to fetch'), false, 'en')).toEqual({
      kind: 'general',
    });
    expect(
      publishFailureOf(
        new ApiError(502, { error: 'Unknown error', message: 'An unexpected error occurred' }),
        false,
        'en'
      )
    ).toEqual({ kind: 'general' });
  });

  it('shows a server failure with its message and error ID', () => {
    const error = new ApiError(500, {
      error: 'internal_error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(publishFailureOf(error, false, 'en')).toEqual({
      kind: 'refused',
      notice: { message: 'Something went wrong.', error_id: 'abc123' },
    });
  });

  it("keeps spec 008's look in the edit flow: the sentence with the error ID", () => {
    const error = new ApiError(500, {
      error: 'internal_error',
      message: 'Something went wrong.',
      error_id: 'abc123',
    });
    expect(publishFailureOf(error, true, 'en')).toEqual({ kind: 'general', errorId: 'abc123' });
  });

  it("shows any other refusal with the server's message", () => {
    const error = new ApiError(409, { error: 'unavailable', message: 'Not possible.' });
    expect(publishFailureOf(error, false, 'en')).toEqual({
      kind: 'refused',
      notice: { message: 'Not possible.', error_id: undefined },
    });
  });
});
