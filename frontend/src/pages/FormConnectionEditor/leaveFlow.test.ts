import { describe, expect, it } from 'vitest';

import { localDraftActionOf } from '../../hooks/utils';
import { emptyContent } from '../../utils/localDrafts/content';
import type { LocalDraftContent } from '../../utils/localDrafts/types';
import { INITIAL_LEAVE_FLOW_STATE } from './constants';
import { hasUnsavedWork, leaveFlowReducer, leaveFlowStep } from './leaveFlow';
import type {
  EditorOrigin,
  LeaveFlowAction,
  LeaveFlowContext,
  LeaveFlowState,
  LeaveFlowStep,
} from './types';

type Origin = EditorOrigin['kind'];

const ORIGINS: Origin[] = ['new', 'draft', 'published'];

function context(origin: Origin, unsaved = true, busy = false): LeaveFlowContext {
  return { origin, unsaved, busy };
}

const IDLE: LeaveFlowState = { status: 'idle' };
const LEAVE_NEW: LeaveFlowState = { status: 'leaveAsked', origin: 'new' };
const LEAVE_DRAFT: LeaveFlowState = { status: 'leaveAsked', origin: 'draft' };
const SAVE_ASKED: LeaveFlowState = { status: 'saveAsked' };
const logoutAsked = (origin: Origin): LeaveFlowState => ({ status: 'logoutAsked', origin });
const saving = (origin: Origin, after: 'leave' | 'logout'): LeaveFlowState => ({
  status: 'saving',
  origin,
  after,
});

/** Every state the model can be in */
const ALL_STATES: LeaveFlowState[] = [
  IDLE,
  LEAVE_NEW,
  LEAVE_DRAFT,
  SAVE_ASKED,
  ...ORIGINS.map(logoutAsked),
  ...ORIGINS.flatMap((origin) => [saving(origin, 'leave'), saving(origin, 'logout')]),
];

const NONE: LeaveFlowStep['effect'] = { type: 'none' };

/** The states other than the given ones: where the action doesn't apply */
function statesExcept(...states: LeaveFlowState[]): LeaveFlowState[] {
  return ALL_STATES.filter(
    (state) => !states.some((other) => JSON.stringify(other) === JSON.stringify(state))
  );
}

/** Runs the actions from `IDLE`, returning the last step */
function run(...actions: LeaveFlowAction[]): LeaveFlowStep {
  let step: LeaveFlowStep = { state: INITIAL_LEAVE_FLOW_STATE, effect: NONE };
  for (const action of actions) {
    step = leaveFlowStep(step.state, action);
  }
  return step;
}

describe('leaveFlowStep', () => {
  it('starts idle', () => {
    expect(INITIAL_LEAVE_FLOW_STATE).toEqual(IDLE);
  });

  describe('askLeave: the product name and "Your connections"', () => {
    it.each(['new', 'draft'] as const)(
      'asks "Leave this connection?" in a %s flow, with or without unsaved work (#8)',
      (origin) => {
        for (const unsaved of [true, false]) {
          expect(
            leaveFlowStep(IDLE, { type: 'askLeave', context: context(origin, unsaved) })
          ).toEqual({ state: { status: 'leaveAsked', origin }, effect: NONE });
        }
      }
    );

    it('asks "Save your changes?" in the edit flow with unsaved changes (#47)', () => {
      expect(leaveFlowStep(IDLE, { type: 'askLeave', context: context('published') })).toEqual({
        state: SAVE_ASKED,
        effect: NONE,
      });
    });

    it('leaves the edit flow at once without unsaved changes, storing and forgetting nothing', () => {
      expect(
        leaveFlowStep(IDLE, { type: 'askLeave', context: context('published', false) })
      ).toEqual({ state: IDLE, effect: { type: 'leave', forget: false } });
    });

    it.each(ORIGINS)('does nothing in a %s flow while a save or a publish runs', (origin) => {
      for (const unsaved of [true, false]) {
        expect(
          leaveFlowStep(IDLE, { type: 'askLeave', context: context(origin, unsaved, true) })
        ).toEqual({ state: IDLE, effect: NONE });
      }
    });

    it.each(statesExcept(IDLE))('does nothing while not idle: %o', (state) => {
      for (const origin of ORIGINS) {
        expect(leaveFlowStep(state, { type: 'askLeave', context: context(origin) })).toEqual({
          state,
          effect: NONE,
        });
      }
    });
  });

  describe('askLogout: "Log out" in the account menu', () => {
    it.each(ORIGINS)('asks "Save before you log out?" in a %s flow with unsaved work', (origin) => {
      expect(leaveFlowStep(IDLE, { type: 'askLogout', context: context(origin) })).toEqual({
        state: { status: 'logoutAsked', origin },
        effect: NONE,
      });
    });

    it.each(ORIGINS)('logs out at once from a %s flow without unsaved work', (origin) => {
      expect(leaveFlowStep(IDLE, { type: 'askLogout', context: context(origin, false) })).toEqual({
        state: IDLE,
        effect: { type: 'logOut', forget: false },
      });
    });

    it.each(ORIGINS)('does nothing in a %s flow while a save or a publish runs', (origin) => {
      for (const unsaved of [true, false]) {
        expect(
          leaveFlowStep(IDLE, { type: 'askLogout', context: context(origin, unsaved, true) })
        ).toEqual({ state: IDLE, effect: NONE });
      }
    });

    it.each(statesExcept(IDLE))('does nothing while not idle: %o', (state) => {
      for (const origin of ORIGINS) {
        for (const unsaved of [true, false]) {
          expect(
            leaveFlowStep(state, { type: 'askLogout', context: context(origin, unsaved) })
          ).toEqual({ state, effect: NONE });
        }
      }
    });
  });

  describe('cancel: the ×, Escape, the scrim and "Cancel"', () => {
    it.each([LEAVE_NEW, LEAVE_DRAFT, SAVE_ASKED])('stays in the flow from %o', (state) => {
      expect(leaveFlowStep(state, { type: 'cancel' })).toEqual({ state: IDLE, effect: NONE });
    });

    it.each(ORIGINS)(
      'stays in a %s flow from the log-out question, the focus back on the account pill (F20)',
      (origin) => {
        expect(leaveFlowStep(logoutAsked(origin), { type: 'cancel' })).toEqual({
          state: IDLE,
          effect: { type: 'focusUserMenu' },
        });
      }
    );

    it.each(statesExcept(LEAVE_NEW, LEAVE_DRAFT, SAVE_ASKED, ...ORIGINS.map(logoutAsked)))(
      'does nothing without a question: %o',
      (state) => {
        expect(leaveFlowStep(state, { type: 'cancel' })).toEqual({ state, effect: NONE });
      }
    );
  });

  describe('saveProgress: "Save progress" and the edit flow\'s "Save"', () => {
    it.each(['new', 'draft'] as const)(
      'stores a %s flow through "Save and exit", then leaves as it does',
      (origin) => {
        expect(leaveFlowStep({ status: 'leaveAsked', origin }, { type: 'saveProgress' })).toEqual({
          state: saving(origin, 'leave'),
          effect: { type: 'store', via: 'saveAndExit' },
        });
      }
    );

    it("opens the edit flow's save dialog, which leaves to the details once saved", () => {
      expect(leaveFlowStep(SAVE_ASKED, { type: 'saveProgress' })).toEqual({
        state: saving('published', 'leave'),
        effect: { type: 'store', via: 'saveDialog' },
      });
    });

    it.each(statesExcept(LEAVE_NEW, LEAVE_DRAFT, SAVE_ASKED))(
      'does nothing elsewhere: %o',
      (state) => {
        expect(leaveFlowStep(state, { type: 'saveProgress' })).toEqual({ state, effect: NONE });
      }
    );
  });

  describe('discard: "Discard connection" and the edit flow\'s "Discard changes"', () => {
    it.each([LEAVE_NEW, LEAVE_DRAFT])(
      "leaves without storing and forgets the flow's local draft from %o",
      (state) => {
        expect(leaveFlowStep(state, { type: 'discard' })).toEqual({
          state: IDLE,
          effect: { type: 'leave', forget: true },
        });
      }
    );

    it('leaves the edit flow without saving; it has no local draft to forget', () => {
      expect(leaveFlowStep(SAVE_ASKED, { type: 'discard' })).toEqual({
        state: IDLE,
        effect: { type: 'leave', forget: false },
      });
    });

    it.each(statesExcept(LEAVE_NEW, LEAVE_DRAFT, SAVE_ASKED))(
      'does nothing elsewhere: %o',
      (state) => {
        expect(leaveFlowStep(state, { type: 'discard' })).toEqual({ state, effect: NONE });
      }
    );
  });

  describe('saveAndLogout: "Save and log out"', () => {
    it.each(['new', 'draft'] as const)(
      'stores a %s flow through "Save and exit", then logs out',
      (origin) => {
        expect(leaveFlowStep(logoutAsked(origin), { type: 'saveAndLogout' })).toEqual({
          state: saving(origin, 'logout'),
          effect: { type: 'store', via: 'saveAndExit' },
        });
      }
    );

    it("opens the edit flow's save dialog, then logs out once saved", () => {
      expect(leaveFlowStep(logoutAsked('published'), { type: 'saveAndLogout' })).toEqual({
        state: saving('published', 'logout'),
        effect: { type: 'store', via: 'saveDialog' },
      });
    });

    it.each(statesExcept(...ORIGINS.map(logoutAsked)))('does nothing elsewhere: %o', (state) => {
      expect(leaveFlowStep(state, { type: 'saveAndLogout' })).toEqual({ state, effect: NONE });
    });
  });

  describe('logoutAnyway: "Log out anyway"', () => {
    it.each(['new', 'draft'] as const)("forgets a %s flow's local draft and logs out", (origin) => {
      expect(leaveFlowStep(logoutAsked(origin), { type: 'logoutAnyway' })).toEqual({
        state: IDLE,
        effect: { type: 'logOut', forget: true },
      });
    });

    it('logs out of the edit flow, which has no local draft', () => {
      expect(leaveFlowStep(logoutAsked('published'), { type: 'logoutAnyway' })).toEqual({
        state: IDLE,
        effect: { type: 'logOut', forget: false },
      });
    });

    it.each(statesExcept(...ORIGINS.map(logoutAsked)))('does nothing elsewhere: %o', (state) => {
      expect(leaveFlowStep(state, { type: 'logoutAnyway' })).toEqual({ state, effect: NONE });
    });
  });

  describe('saved: a save stored the flow', () => {
    it.each(['new', 'draft'] as const)(
      'logs out after "Save and log out" in a %s flow, its local draft forgotten',
      (origin) => {
        expect(leaveFlowStep(saving(origin, 'logout'), { type: 'saved' })).toEqual({
          state: IDLE,
          effect: { type: 'logOut', forget: true },
        });
      }
    );

    it('logs out after "Save and log out" in the edit flow', () => {
      expect(leaveFlowStep(saving('published', 'logout'), { type: 'saved' })).toEqual({
        state: IDLE,
        effect: { type: 'logOut', forget: false },
      });
    });

    it.each(ORIGINS)(
      'lets the save\'s own exit follow after "Save progress" or "Save" in a %s flow',
      (origin) => {
        expect(leaveFlowStep(saving(origin, 'leave'), { type: 'saved' })).toEqual({
          state: IDLE,
          effect: { type: 'exit' },
        });
      }
    );

    it.each(
      statesExcept(
        ...ORIGINS.flatMap((origin) => [saving(origin, 'leave'), saving(origin, 'logout')])
      )
    )("lets the save's own exit follow a save the leave model didn't start: %o", (state) => {
      expect(leaveFlowStep(state, { type: 'saved' })).toEqual({
        state: IDLE,
        effect: { type: 'exit' },
      });
    });
  });

  describe('failed: a save ended without storing', () => {
    it.each(ORIGINS.flatMap((origin) => [saving(origin, 'leave'), saving(origin, 'logout')]))(
      'stays in the flow, ready to ask again: %o',
      (state) => {
        expect(leaveFlowStep(state, { type: 'failed' })).toEqual({ state: IDLE, effect: NONE });
      }
    );

    it.each(
      statesExcept(
        ...ORIGINS.flatMap((origin) => [saving(origin, 'leave'), saving(origin, 'logout')])
      )
    )('does nothing without a save of its own: %o', (state) => {
      expect(leaveFlowStep(state, { type: 'failed' })).toEqual({ state, effect: NONE });
    });
  });

  describe('whole answers', () => {
    it('"Save progress" that fails, then "Discard connection"', () => {
      const failed = run(
        { type: 'askLeave', context: context('new') },
        { type: 'saveProgress' },
        { type: 'failed' }
      );
      expect(failed).toEqual({ state: IDLE, effect: NONE });
      expect(
        run(
          { type: 'askLeave', context: context('new') },
          { type: 'saveProgress' },
          { type: 'failed' },
          { type: 'askLeave', context: context('new') },
          { type: 'discard' }
        )
      ).toEqual({ state: IDLE, effect: { type: 'leave', forget: true } });
    });

    it('"Save and log out" from a stored draft logs out once saved', () => {
      expect(
        run(
          { type: 'askLogout', context: context('draft') },
          { type: 'saveAndLogout' },
          { type: 'saved' }
        )
      ).toEqual({ state: IDLE, effect: { type: 'logOut', forget: true } });
    });

    it('a failed "Save and log out" never logs out at a later save', () => {
      expect(
        run(
          { type: 'askLogout', context: context('new') },
          { type: 'saveAndLogout' },
          { type: 'failed' },
          // The footer's "Save and exit", later
          { type: 'saved' }
        )
      ).toEqual({ state: IDLE, effect: { type: 'exit' } });
    });

    it('the edit flow\'s "Save" leaves to the details once saved', () => {
      expect(
        run(
          { type: 'askLeave', context: context('published') },
          { type: 'saveProgress' },
          { type: 'saved' }
        )
      ).toEqual({ state: IDLE, effect: { type: 'exit' } });
    });
  });
});

describe('leaveFlowReducer', () => {
  it("is the step's state", () => {
    const actions: LeaveFlowAction[] = [
      { type: 'askLeave', context: context('draft') },
      { type: 'askLogout', context: context('published') },
      { type: 'cancel' },
      { type: 'saveProgress' },
      { type: 'discard' },
      { type: 'saveAndLogout' },
      { type: 'logoutAnyway' },
      { type: 'saved' },
      { type: 'failed' },
    ];
    for (const state of ALL_STATES) {
      for (const action of actions) {
        expect(leaveFlowReducer(state, action)).toEqual(leaveFlowStep(state, action).state);
      }
    }
  });
});

describe('hasUnsavedWork', () => {
  const MAIN = 'b3f0d1c2-0000-4000-8000-000000000001';
  const baseline = emptyContent(MAIN);
  const withName: LocalDraftContent = { ...baseline, name: 'Residents’ parking permit' };
  const withDocument: LocalDraftContent = {
    ...baseline,
    documents: [{ document_type: 'pid', fields: ['given_name'] }],
  };
  const countersOnly: LocalDraftContent = { ...baseline, counters: { rule: 3, group: 2 } };
  const withRule: LocalDraftContent = {
    ...baseline,
    branches: [{ ...baseline.branches[0], name: 'Standard 2' }],
  };

  it.each(['new', 'draft'] as const)('is false while a %s flow is its baseline', (origin) => {
    expect(hasUnsavedWork(origin, { ...baseline }, baseline)).toBe(false);
  });

  it.each(['new', 'draft'] as const)('is true for any change in a %s flow', (origin) => {
    for (const content of [withName, withDocument, countersOnly, withRule]) {
      expect(hasUnsavedWork(origin, content, baseline)).toBe(true);
    }
  });

  it('is true for a stored draft resumed without a baseline: its record is the unsaved work', () => {
    expect(hasUnsavedWork('draft', baseline, null)).toBe(true);
    expect(hasUnsavedWork('new', baseline, null)).toBe(true);
  });

  it('agrees with the local draft in a new or draft flow: unsaved exactly while it writes', () => {
    for (const origin of ['new', 'draft'] as const) {
      for (const saved of [baseline, withName, null]) {
        for (const content of [baseline, withName, withDocument, countersOnly, withRule]) {
          expect(hasUnsavedWork(origin, content, saved)).toBe(
            localDraftActionOf(content, saved) === 'write'
          );
        }
      }
    }
  });

  it('is false while a published connection is as loaded, its rule counters aside', () => {
    expect(hasUnsavedWork('published', { ...baseline }, baseline)).toBe(false);
    expect(hasUnsavedWork('published', countersOnly, baseline)).toBe(false);
  });

  it('is true for a changed name, description, document or rule of a published connection', () => {
    for (const content of [
      withName,
      { ...baseline, description: 'PK-30051' },
      withDocument,
      withRule,
    ]) {
      expect(hasUnsavedWork('published', content, baseline)).toBe(true);
    }
  });
});
