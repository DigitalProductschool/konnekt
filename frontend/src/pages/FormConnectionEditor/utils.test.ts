import { describe, expect, it } from 'vitest';

import { ApiError } from '../../api/client';
import type { Branch, FormConnection } from '../../types/form-connections';
import { US1_RULES } from '../../utils/rules/testData';
import { INITIAL_EDITOR_STATE, PUBLISH_COPY } from './constants';
import { initialRulesState } from './RulesStep/utils';
import {
  createPayload,
  editorReducer,
  initialEditorState,
  isRulesChanged,
  publishErrorNotice,
  rulesChanged,
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
