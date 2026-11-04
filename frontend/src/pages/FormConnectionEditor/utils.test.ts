import { describe, expect, it } from 'vitest';

import { ApiError, handleResponse } from '../../api/client';
import type { DocumentField, DocumentType } from '../../types/document-types';
import type {
  Branch,
  BranchInput,
  FormConnection,
  FormConnectionDraft,
} from '../../types/form-connections';
import type { LocalDraftContent } from '../../utils/localDrafts/types';
import type { BranchCheck, BranchNotice, ItemFinding } from '../../utils/rules/checks/types';
import { mainBranch, US1_RULES } from '../../utils/rules/testData';
import { DRAFT_COPY, INITIAL_EDITOR_STATE, PUBLISH_COPY } from './constants';
import type { RulesBranch } from './RulesStep/types';
import { initialRulesState, rulesReducer } from './RulesStep/utils';
import type { DraftSaveError, DroppedData, PendingRemoval } from './types';
import {
  createPayload,
  draftNameErrors,
  draftPayload,
  draftSaveErrorOf,
  droppedDataOf,
  droppedRemovalOf,
  editorReducer,
  findingLinesOf,
  firstBranchWithFindings,
  initialEditorState,
  initialStatesFromDraft,
  isRulesChanged,
  localContentOf,
  offeredFieldsOf,
  openingStepOf,
  pageTitleOf,
  problemPlaceOf,
  publishErrorNotice,
  removalAction,
  removalCopyOf,
  rulesChanged,
  rulesCheckingRemoval,
  rulesNextActionOf,
  stepForDroppedData,
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
  servicebw_form: 'PT-1',
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
};

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

  it('always sends the rules of a new connection', () => {
    const payload = createPayload(INITIAL_EDITOR_STATE, initialRulesState());

    expect(payload.rules).toEqual({
      branches: [
        {
          id: null,
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
      servicebw_form: 'PT-1',
      documents: [],
    });
    expect('rules' in payload).toBe(false);
  });

  it('sends changed rules with the rule set they were loaded from', () => {
    const payload = createPayload(state, withMessage('Applicants must be 21.'), {
      loaded: LOADED,
    });

    expect(payload.rules?.base_version).toBe(3);
    expect(payload.rules?.numbering_base).toEqual({ rule: 4, group: 1 });
    expect(payload.rules?.replace).toBe(false);
    expect(payload.rules?.branches[0].items[0].message).toBe('Applicants must be 21.');
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

  it('replaces the other team member’s rules on request', () => {
    const payload = createPayload(state, withMessage('Applicants must be 21.'), {
      loaded: LOADED,
      replace: true,
    });

    expect(payload.rules?.replace).toBe(true);
  });
});

describe('rulesChanged', () => {
  it('compares the branches, so that a change undone by hand counts as none', () => {
    expect(rulesChanged(withMessage('Applicants must be 21.'), LOADED)).toBe(true);
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
    expect(publishErrorNotice(rulesChangedError(), true)).toEqual({
      message: `${RULES_CHANGED_MESSAGE} ${PUBLISH_COPY.rulesChangedHint}`,
    });
  });
});

describe('editorReducer and rules_changed', () => {
  const failed = editorReducer(
    { ...INITIAL_EDITOR_STATE, dialogOpen: true, publishing: true },
    {
      type: 'publishFailed',
      error: publishErrorNotice(rulesChangedError(), true),
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
    notice: { message: DRAFT_COPY.saveNetworkError, error_id: 'abc123' },
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
      rulesCheckingRemoval(removal, rules.branches, documents).map(
        ({ ruleName, branchName }) => `${ruleName} in ${branchName}`
      );
    expect(named(DOCUMENT)).toEqual(['Rule 02 in Standard', 'Rule 03 in Standard']);
    expect(named(FIELD)).toEqual(['Rule 01 in Standard']);
    expect(named(ALL)).toEqual(['Rule 01 in Standard']);
    expect(named({ ...FIELD, field: 'nationalities' })).toEqual([]);
  });

  it('leaves out rules on data already not requested, which the Rules step flags', () => {
    const withoutBirthdate = [{ document_type: 'pid', fields: ['nationalities'] }];
    expect(rulesCheckingRemoval(ALL, rules.branches, withoutBirthdate)).toEqual([]);
    expect(
      rulesCheckingRemoval({ ...DOCUMENT, documentType: 'pid' }, rules.branches, withoutBirthdate)
    ).toEqual([]);
  });

  it('gives each named rule a key of its own in every variant', () => {
    const twice = {
      ...rules,
      branches: [rules.branches[0], { ...rules.branches[0], key: 'ambulance', name: 'Ambulance' }],
    };
    const keys = rulesCheckingRemoval(FIELD, twice.branches, documents).map(({ key }) => key);
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
    expect(removed.toast?.message).toBe('Driving licence removed');

    const cleared = editorReducer(editorReducer(state, { type: 'askRemoval', removal: ALL }), {
      type: 'confirmRemoval',
    });
    expect(cleared.documents[0].fields).toEqual([]);
  });

  it('words the dialog as designed, "before you save" when editing', () => {
    expect(removalCopyOf(DOCUMENT, 3, false)).toEqual({
      title: 'Remove Driving licence?',
      text: '3 rules check data from this document:',
      after: 'After removing it, edit or delete these rules before you publish.',
      confirmLabel: 'Remove document',
    });
    expect(removalCopyOf(FIELD, 2, true)).toEqual({
      title: 'Stop requesting Date of birth?',
      text: '2 rules check it:',
      after: 'After this, edit or delete these rules before you save.',
      confirmLabel: 'Stop requesting',
    });
    expect(removalCopyOf(ALL, 1, false)).toEqual({
      title: 'Stop requesting all data from Personal ID?',
      text: '1 rule checks this data:',
      after: 'After this, edit or delete this rule before you publish.',
      confirmLabel: 'Stop requesting',
    });
    expect(removalCopyOf(null, 0, false).title).toBe('');
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

  it('counts a branch no applicant can meet, or with always-met findings only', () => {
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
      findingLinesOf(BRANCHES, byBranch)[0].key
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
    expect(findingLinesOf(BRANCHES, {})).toEqual([]);
    expect(
      findingLinesOf(BRANCHES, { main: check('main', []), b2: null, b3: check('b3', []) })
    ).toEqual([]);
  });

  it('gives one line per branch with findings, in tab order, under the name the tab shows', () => {
    const lines = findingLinesOf([branch('main', 'Standard'), branch('b2', ' Ambulance ')], {
      b2: check('b2', conflict),
      main: check('main', duplicate),
    });
    expect(lines).toEqual([
      { key: 'main', text: 'Standard: 1 duplicate rule', tone: 'info' },
      { key: 'b2', text: 'Ambulance: 2 rules can’t be met together', tone: 'warning' },
    ]);
  });

  it('adds the notice of a branch no applicant can meet, in the warning style', () => {
    expect(
      findingLinesOf(BRANCHES, {
        b2: check('b2', conflict, { kind: 'none_can_meet', today: false }),
        b3: check('b3', [], { kind: 'none_can_meet', today: true }),
      })
    ).toEqual([
      {
        key: 'b2',
        text: 'Ambulance: 2 rules can’t be met together. No applicant can meet the rules of Ambulance.',
        tone: 'warning',
      },
      { key: 'b3', text: 'Right now, no applicant can meet the rules of Taxi.', tone: 'warning' },
    ]);
  });

  it('shows duplicate, always-met and all-meet findings in the info style', () => {
    expect(
      findingLinesOf(BRANCHES, {
        main: check('main', alwaysMet),
        b2: check('b2', [], { kind: 'all_meet', today: false }),
      })
    ).toEqual([
      { key: 'main', text: 'Standard: 1 rule every applicant meets', tone: 'info' },
      { key: 'b2', text: 'Every applicant meets the rules of Ambulance.', tone: 'info' },
    ]);
  });

  it('takes the warning style for a conflict next to info findings', () => {
    expect(findingLinesOf(BRANCHES, { main: check('main', [...conflict, ...duplicate]) })).toEqual([
      {
        key: 'main',
        text: 'Standard: 2 rules can’t be met together · 1 duplicate rule',
        tone: 'warning',
      },
    ]);
  });

  it('leaves out branches without checked rules or only checked incompletely', () => {
    expect(
      findingLinesOf(BRANCHES, {
        main: { ...check('main', conflict), checkedRules: 0 },
        b2: { ...check('b2', []), complete: false },
        b3: { ...check('b3', duplicate), complete: false },
      })
    ).toEqual([{ key: 'b3', text: 'Taxi: 1 duplicate rule', tone: 'info' }]);
  });
});

describe('the test step (spec 004, S2, S8)', () => {
  const TEST_HINT =
    'Choose a sample applicant to see which rules they meet and which messages they’d see. The data is made up, and nothing is shared.';

  it('titles the test step "Test rules" with the intro, in both modes (FR-004)', () => {
    expect(pageTitleOf('test', 'create')).toEqual({ title: 'Test rules', hint: TEST_HINT });
    expect(pageTitleOf('test', 'edit')).toEqual({ title: 'Test rules', hint: TEST_HINT });
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
    const problem = { message: 'Enter a name for the variant.', branchIndex: 0, itemId: null };
    expect(problemPlaceOf(rules.branches, problem)).toEqual({
      branchKey: standard.key,
      focusIds: ['rules-problem'],
    });
  });

  it('keeps the open branch when the problem names none', () => {
    const problem = {
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
    servicebwForm: ' PT-1',
    documents: [{ document_type: 'pid', fields: ['birthdate'] }],
  };

  it('takes the name and the form ID as typed, the documents, the branches and the counters', () => {
    const rules = initialRulesState(LOADED);
    expect(localContentOf(state, rules)).toEqual({
      name: '  Passenger transport licence ',
      servicebwForm: ' PT-1',
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
    const editing = rulesReducer(empty, { type: 'addRule', branchKey: 'main', parentId: null });
    const content = localContentOf(state, editing);
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
    servicebwForm: ' PT-1 ',
    documents: [{ document_type: 'pid', fields: [] }],
    branches: [mainBranch()],
    numberingBase: { rule: 1, group: 1 },
    counters: { rule: 4, group: 2 },
  };

  it('trims the name and the form ID, and sends the branches, the numbering base and the step', () => {
    expect(draftPayload(content, 'documents')).toEqual({
      name: 'Passenger transport licence',
      servicebw_form: 'PT-1',
      documents: [{ document_type: 'pid', fields: [] }],
      rules: { branches: [mainBranch()], numbering_base: { rule: 1, group: 1 } },
      step: 'documents',
    });
  });

  it('sends an empty form ID as empty', () => {
    expect(draftPayload({ ...content, servicebwForm: '   ' }, 'connection')).toMatchObject({
      servicebw_form: '',
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
    return { ...mainBranch(items), name, origin: 'based' };
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
    id: 'draft-1',
    name: 'Passenger transport licence',
    servicebw_form: 'PT-1',
    documents: [
      {
        document_type: 'pid',
        label: 'Personal ID',
        fields: [field('birthdate', 'Date of birth')],
      },
    ],
    branches: [mainBranch()],
    next_rule_number: 4,
    next_group_number: 2,
    step: 'test',
    version: 3,
    created_at: '2026-11-04T10:00:00Z',
    updated_at: '2026-11-04T10:30:00Z',
  };

  it('takes the name, the form ID and the documents by key, at the saved step', () => {
    const { editor } = initialStatesFromDraft(DRAFT);
    expect(editor).toEqual({
      ...INITIAL_EDITOR_STATE,
      step: 'test',
      name: 'Passenger transport licence',
      servicebwForm: 'PT-1',
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
    });
  });

  it('keeps an empty form ID, and a document with a field the catalog dropped', () => {
    const draft = {
      ...DRAFT,
      servicebw_form: '',
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
    expect(editor.servicebwForm).toBe('');
    expect(editor.step).toBe('documents');
    expect(editor.documents).toEqual([
      { document_type: 'pid', fields: ['birthdate', 'shoe_size'] },
      { document_type: 'gone', fields: [] },
    ]);
  });

  it('gives Standard alone the main key, the draft’s counters and no rule set', () => {
    const { rules } = initialStatesFromDraft(DRAFT);
    expect(rules).toEqual({
      ...initialRulesState(),
      branches: [{ ...mainBranch(), key: 'main' }],
      openBranch: 'main',
      counters: { rule: 4, group: 2 },
      numberingBase: { rule: 4, group: 2 },
      ruleSetVersion: null,
    });
  });

  it('gives one variant beside Standard the editor’s next key', () => {
    const draft = { ...DRAFT, branches: [mainBranch(), variant('Taxi')] };
    const { rules } = initialStatesFromDraft(draft);
    expect(rules.branches.map((branch) => [branch.key, branch.name])).toEqual([
      ['main', 'Standard'],
      ['new-1', 'Taxi'],
    ]);
    expect(rules.openBranch).toBe('main');
  });

  it('keys three variants beside Standard in order, keeping their content', () => {
    const variants = [variant('Taxi'), variant('Ambulance', US1_RULES), variant('Limousine')];
    const draft = { ...DRAFT, branches: [mainBranch(), ...variants] };
    const { rules } = initialStatesFromDraft(draft);
    expect(rules.branches.map((branch) => branch.key)).toEqual(['main', 'new-1', 'new-2', 'new-3']);
    expect(rules.branches.slice(1).map(({ key: _key, ...branch }) => branch)).toEqual(variants);
  });

  it('opens a test step without any rule at the rules step', () => {
    const draft = { ...DRAFT, branches: [mainBranch([]), variant('Taxi')] };
    expect(initialStatesFromDraft(draft).editor.step).toBe('rules');
    expect(initialStatesFromDraft(draft, 'documents').editor.step).toBe('documents');
  });

  it('falls back to an empty Standard for a draft without branches', () => {
    const { rules, editor } = initialStatesFromDraft({ ...DRAFT, branches: [] });
    expect(rules.branches).toEqual(initialRulesState().branches);
    expect(rules.openBranch).toBe('main');
    expect(rules.counters).toEqual({ rule: 4, group: 2 });
    expect(editor.step).toBe('rules');
  });

  it('starts states that make the draft’s content again', () => {
    const { editor, rules } = initialStatesFromDraft(DRAFT);
    expect(draftPayload(localContentOf(editor, rules), editor.step)).toEqual({
      name: DRAFT.name,
      servicebw_form: DRAFT.servicebw_form,
      documents: [{ document_type: 'pid', fields: ['birthdate'] }],
      rules: { branches: DRAFT.branches, numbering_base: { rule: 4, group: 2 } },
      step: 'test',
    });
  });
});

describe('draftNameErrors (R12)', () => {
  it('asks for a name', () => {
    expect(draftNameErrors('')).toEqual({ name: 'Enter a name.' });
    expect(draftNameErrors('   ')).toEqual({ name: 'Enter a name.' });
  });

  it('takes 200 characters and refuses 201', () => {
    expect(draftNameErrors('a'.repeat(200))).toEqual({});
    expect(draftNameErrors('a'.repeat(201))).toEqual({
      name: 'The name can have at most 200 characters.',
    });
  });

  it('never asks for the form ID', () => {
    expect(draftNameErrors('Passenger transport licence')).toEqual({});
  });
});

describe('draftSaveErrorOf (S1.5, W3)', () => {
  const NETWORK = 'Couldn’t save. Check your internet connection and try again.';

  it('shows a 400’s message, without "Try again"', () => {
    const error = new ApiError(400, {
      error: 'validation_error',
      message: 'The name can have at most 200 characters.',
    });
    expect(draftSaveErrorOf(error)).toEqual({
      notice: { message: 'The name can have at most 200 characters.' },
      retryable: false,
    });
  });

  it('shows a 404’s message, without "Try again"', () => {
    const error = new ApiError(404, { error: 'not_found', message: 'Draft not found.' });
    expect(draftSaveErrorOf(error)).toEqual({
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
    expect(draftSaveErrorOf(error)).toEqual({
      notice: { message: NETWORK, error_id: 'abc123' },
      retryable: true,
    });
  });

  it('shows U28’s text for a 502 without a JSON body, and "Try again"', async () => {
    const response = new Response('<html>502 Bad Gateway</html>', { status: 502 });
    const error: unknown = await handleResponse(response).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(draftSaveErrorOf(error)).toEqual({ notice: { message: NETWORK }, retryable: true });
  });

  it('shows U28’s text for a network failure, and "Try again"', () => {
    expect(draftSaveErrorOf(new TypeError('Failed to fetch'))).toEqual({
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

  it('lists a dropped field with its document’s label, and a dropped document by its key', () => {
    expect(droppedDataOf(documents, CATALOG)).toEqual([EYE_COLOUR, SHOE_SIZE, PERMIT]);
  });

  it('lists nothing while the catalog offers everything', () => {
    expect(droppedDataOf([{ document_type: 'pid', fields: ['birthdate'] }], CATALOG)).toEqual([]);
    expect(droppedDataOf([], CATALOG)).toEqual([]);
  });

  it('lists a dropped document once, even without fields', () => {
    expect(droppedDataOf([{ document_type: 'gone', fields: [] }], CATALOG)).toEqual([
      { documentType: 'gone', field: null, label: 'gone' },
    ]);
  });

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
      errors: { fields: { residence_permit: 'x', mdl: 'y' } },
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
    expect(removed.errors).toEqual({ fields: { mdl: 'y' } });
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
      rulesCheckingRemoval(droppedRemovalOf(items), rules.branches, requested).map(
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
      const keys = rulesCheckingRemoval(droppedRemovalOf([mdl]), twice, documents).map(
        ({ key }) => key
      );
      expect(keys).toHaveLength(4);
      expect(new Set(keys).size).toBe(4);
    });
  });

  it('words the dialog with every dropped item', () => {
    const removal = droppedRemovalOf([EYE_COLOUR, PERMIT]);
    expect(removal).toEqual({
      type: 'dropped',
      items: [EYE_COLOUR, PERMIT],
      label: 'Personal ID – eye_colour, residence_permit',
    });
    expect(removalCopyOf(removal, 2, false)).toEqual({
      title: 'Stop requesting Personal ID – eye_colour, residence_permit?',
      text: '2 rules check this data:',
      after: 'After this, edit or delete these rules before you publish.',
      confirmLabel: 'Stop requesting',
    });
  });
});
