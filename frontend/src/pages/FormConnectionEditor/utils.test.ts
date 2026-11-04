import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import type { Branch, FormConnection } from '../../types/form-connections';
import type { BranchCheck, BranchNotice, ItemFinding } from '../../utils/rules/checks/types';
import { US1_RULES } from '../../utils/rules/testData';
import { INITIAL_EDITOR_STATE, PUBLISH_COPY } from './constants';
import type { RulesBranch } from './RulesStep/types';
import { initialRulesState, rulesReducer } from './RulesStep/utils';
import type { PendingRemoval } from './types';
import {
  createPayload,
  editorReducer,
  findingLinesOf,
  firstBranchWithFindings,
  initialEditorState,
  isRulesChanged,
  pageTitleOf,
  problemPlaceOf,
  publishErrorNotice,
  removalAction,
  removalCopyOf,
  rulesChanged,
  rulesCheckingRemoval,
  rulesNextActionOf,
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
