import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  DraftUpdate,
  EditorStep,
  FormConnection,
  FormConnectionDraft,
  FormConnectionOrDraft,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { addVariant } from '@connection-portal/rules/edits';
import { OPTION_SETS, PID, rule, target } from '@connection-portal/rules/testData';
import { describe, expect, it, vi } from 'vitest';

import type { Caller } from './auth';
import { BackendError, Conflict, NotFound, Refused } from './backend';
import {
  type ApplyChangeFn,
  type DraftBackend,
  draftContentOf,
  editDraft,
  refusalOf,
  withEditState,
} from './draftEdit';
import { connectionLink } from './links';
import { ReferenceNotFound } from './resolve';

const ID = '11111111-1111-4111-8111-111111111111';
const STANDARD = '11111111-1111-4111-8111-1111111111a1';
const NEW_VARIANT = '11111111-1111-4111-8111-1111111111b1';

const PUBLISHED_MESSAGE =
  'The content of a published connection is changed in the Connection Portal. Agents can only ' +
  'change drafts.';

function caller(accessLevel: Caller['accessLevel'] = 'drafts'): Caller {
  return {
    token: 'secret-token',
    username: 'anna',
    clientName: 'Claude Code',
    kind: 'oauth',
    accessLevel,
    levels: [
      { level: 'read', name: 'Read only', allows: 'Every read' },
      { level: 'drafts', name: 'Read and edit drafts', allows: 'Also drafts' },
      {
        level: 'manage',
        name: 'Read, edit drafts and manage live connections',
        allows: 'Also live',
      },
    ],
  };
}

function standard(items: BranchInput['items'] = []): BranchInput {
  return {
    id: STANDARD,
    name: 'Standard',
    description: null,
    origin: 'main',
    operator: 'and',
    operator_mark: null,
    items,
  };
}

/** A draft that requests the birthdate of the Personal ID, without rules */
function draft(overrides: Partial<FormConnectionDraft> = {}): FormConnectionDraft {
  const birthdate = PID.fields.find((field) => field.key === 'birthdate');
  if (!birthdate) throw new Error('No birthdate');
  return {
    status: 'draft',
    id: ID,
    name: 'Resident parking permit',
    description: '',
    documents: [{ document_type: 'pid', label: PID.label, fields: [birthdate] }],
    branches: [standard()],
    next_rule_number: 1,
    next_group_number: 1,
    step: 'documents',
    version: 1,
    created_at: '2026-11-01T09:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
    ...overrides,
  };
}

/**
 * A stub of the management API: answers `GET` with the stored connection and `PUT …/draft` with
 * a version check, or with the failures `failures` queues for the next saves
 */
function stubBackend(initial: FormConnectionOrDraft) {
  let stored: FormConnectionOrDraft = initial;
  const saves: DraftUpdate[] = [];
  const failures: Error[] = [];
  const hooks: (() => void)[] = [];
  const backend = {
    get: vi.fn(async (path: string) => {
      if (path !== `/api/form-connections/${ID}`) throw new NotFound('Form connection not found');
      return stored;
    }),
    put: vi.fn(async (path: string, body: unknown) => {
      expect(path).toBe(`/api/form-connections/${ID}/draft`);
      const update = body as DraftUpdate;
      saves.push(update);
      hooks.shift()?.();
      const failure = failures.shift();
      if (failure) throw failure;
      if (stored.status !== 'draft') {
        throw new Conflict('draft_published', 'This draft has been published since you opened it.');
      }
      if (update.version !== stored.version) {
        throw new Conflict('draft_changed', 'Another team member saved this draft.');
      }
      stored = {
        ...stored,
        name: update.name,
        description: update.description ?? '',
        branches: update.rules.branches,
        step: update.step,
        version: stored.version + 1,
      };
      return stored;
    }),
    documentTypes: vi.fn(async (): Promise<DocumentType[]> => [PID]),
    optionSets: vi.fn(async (): Promise<OptionSet[]> => OPTION_SETS),
  };
  return {
    backend: backend as unknown as DraftBackend & typeof backend,
    saves,
    failures,
    /** Runs before the next save is checked: another team member's save meanwhile */
    beforeNextSave(hook: () => void) {
      hooks.push(hook);
    },
    get stored() {
      return stored;
    },
    set stored(value: FormConnectionOrDraft) {
      stored = value;
    },
  };
}

/** The change of the tests: a variant based on Standard, or the editor's refusal */
const addNightShift: ApplyChangeFn<{ name: string }> = (read) => {
  const content = draftContentOf(read);
  const added = addVariant(
    content,
    { name: 'Night shift', description: null },
    'based',
    NEW_VARIANT
  );
  if (!added.ok) return added;
  return { ok: true, content: withEditState(content, added.state), result: { name: 'added' } };
};

describe('editDraft', () => {
  it('reads, applies and saves the whole content with the version read', async () => {
    const stub = stubBackend(draft({ description: 'For residents' }));
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.result).toEqual({ name: 'added' });
    expect(outcome.draft.version).toBe(2);
    expect(outcome.read.version).toBe(1);
    expect(stub.saves).toEqual([
      {
        name: 'Resident parking permit',
        description: 'For residents',
        documents: [{ document_type: 'pid', fields: ['birthdate'] }],
        rules: {
          branches: [standard(), expect.objectContaining({ id: NEW_VARIANT, origin: 'based' })],
          numbering_base: { rule: 1, group: 1 },
        },
        step: 'documents',
        version: 1,
        replace: false,
      },
    ]);
  });

  it('accepts a link to the connection', async () => {
    const stub = stubBackend(draft());
    const outcome = await editDraft(stub.backend, caller(), connectionLink(ID), addNightShift);
    expect(outcome.ok).toBe(true);
  });

  it('builds the context from the draft documents and the catalog', async () => {
    const stub = stubBackend(draft());
    const apply = vi.fn<ApplyChangeFn<null>>((read) => ({
      ok: true,
      content: draftContentOf(read),
      result: null,
    }));
    await editDraft(stub.backend, caller(), ID, apply);
    const context = apply.mock.calls[0][1];
    expect(context.allDocuments).toEqual([PID]);
    expect(context.optionSets).toEqual(OPTION_SETS);
    expect(context.documents).toHaveLength(1);
    expect(context.documents[0].fields.map((field) => field.key)).toEqual(['birthdate']);
  });

  it("applies the change again to the newer draft after a 409, keeping the other save's change", async () => {
    const stub = stubBackend(draft());
    stub.beforeNextSave(() => {
      const current = stub.stored as FormConnectionDraft;
      stub.stored = { ...current, name: 'Parking permit', version: current.version + 1 };
    });
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(outcome.ok).toBe(true);
    expect(stub.saves.map((save) => save.version)).toEqual([1, 2]);
    expect(stub.saves[1].name).toBe('Parking permit');
    expect(stub.saves[1].rules.branches.map((branch) => branch.name)).toEqual([
      'Standard',
      'Night shift',
    ]);
    if (outcome.ok) {
      expect(outcome.read.version).toBe(2);
      expect(outcome.draft.version).toBe(3);
    }
  });

  it('answers conflict after three 409s, without a fourth attempt', async () => {
    const stub = stubBackend(draft());
    for (let attempt = 0; attempt < 3; attempt += 1) {
      stub.failures.push(new Conflict('draft_changed', 'Another team member saved this draft.'));
    }
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(outcome).toEqual({
      ok: false,
      error: expect.objectContaining({
        isError: true,
        structuredContent: {
          code: 'conflict',
          message: 'The draft keeps changing while this change is applied. Try again.',
        },
      }),
    });
    expect(stub.saves).toHaveLength(3);
    expect(stub.backend.get).toHaveBeenCalledTimes(3);
  });

  it('refuses a published connection before applying anything', async () => {
    const published = {
      ...draft(),
      status: 'published',
      is_active: true,
    } as unknown as FormConnection;
    const stub = stubBackend(published);
    const apply = vi.fn(addNightShift);
    const outcome = await editDraft(stub.backend, caller('manage'), ID, apply);
    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.error.structuredContent).toEqual({
      code: 'published_read_only',
      message: PUBLISHED_MESSAGE,
    });
    expect(apply).not.toHaveBeenCalled();
    expect(stub.saves).toEqual([]);
  });

  it('refuses a draft published between the read and the save', async () => {
    const stub = stubBackend(draft());
    stub.failures.push(new Conflict('draft_published', 'This draft has been published.'));
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(!outcome.ok && outcome.error.structuredContent).toEqual({
      code: 'published_read_only',
      message: PUBLISHED_MESSAGE,
    });
  });

  it('answers not_found for a draft deleted before the read or the save', async () => {
    const missing = stubBackend(draft());
    const other = '99999999-9999-4999-8999-999999999999';
    const unread = await editDraft(missing.backend, caller(), other, addNightShift);
    expect(!unread.ok && unread.error.structuredContent).toEqual({
      code: 'not_found',
      message: 'This draft has been deleted.',
    });
    const stub = stubBackend(draft());
    stub.failures.push(new NotFound('Form connection not found'));
    const unsaved = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(!unsaved.ok && unsaved.error.structuredContent).toEqual({
      code: 'not_found',
      message: 'This draft has been deleted.',
    });
  });

  it("answers the server's 400 as validation with its message", async () => {
    const stub = stubBackend(draft());
    stub.failures.push(new Refused("Unknown document type 'eye_test'."));
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(!outcome.ok && outcome.error.structuredContent).toEqual({
      code: 'validation',
      message: "Unknown document type 'eye_test'.",
    });
  });

  it("answers the editor's refusal as validation and saves nothing", async () => {
    const stub = stubBackend(
      draft({ branches: [standard(), { ...standard(), id: NEW_VARIANT, name: 'night shift' }] })
    );
    const outcome = await editDraft(stub.backend, caller(), ID, addNightShift);
    expect(!outcome.ok && outcome.error.structuredContent).toEqual({
      code: 'validation',
      message: 'Another variant is already called night shift.',
    });
    expect(stub.saves).toEqual([]);
  });

  it('answers a refusal with its code', async () => {
    const stub = stubBackend(draft());
    const outcome = await editDraft(stub.backend, caller(), ID, () =>
      refusalOf('Standard is the main variant and can’t be deleted.', 'not_allowed')
    );
    expect(!outcome.ok && outcome.error.structuredContent).toEqual({
      code: 'not_allowed',
      message: 'Standard is the main variant and can’t be deleted.',
    });
  });

  it('throws what the registry answers: a reference apply cannot resolve, a 5xx', async () => {
    const stub = stubBackend(draft());
    await expect(
      editDraft(stub.backend, caller(), ID, () => {
        throw new ReferenceNotFound('This variant no longer exists.');
      })
    ).rejects.toBeInstanceOf(ReferenceNotFound);
    stub.failures.push(new BackendError('error-1'));
    await expect(editDraft(stub.backend, caller(), ID, addNightShift)).rejects.toBeInstanceOf(
      BackendError
    );
  });

  it('refuses a read-only caller before reading', async () => {
    const stub = stubBackend(draft());
    const outcome = await editDraft(stub.backend, caller('read'), ID, addNightShift);
    expect(!outcome.ok && outcome.error.structuredContent).toMatchObject({
      code: 'insufficient_access',
      needs_access_level: 'drafts',
    });
    expect(stub.backend.get).not.toHaveBeenCalled();
  });

  it.each<[string, RequestedDocumentView[], RuleTreeItem[], EditorStep]>([
    ['no document and no rule', [], [], 'connection'],
    [
      'a document and no rule',
      [{ document_type: 'pid', label: PID.label, fields: [] }],
      [],
      'documents',
    ],
    [
      'a rule',
      [],
      [
        rule(
          1,
          target('pid', 'birthdate'),
          { operator: 'at_least_years_ago', years: 18 },
          'Too young.'
        ),
      ],
      'rules',
    ],
  ])('saves the step of a draft with %s', async (_case, documents, items, step) => {
    const stub = stubBackend(draft({ documents, branches: [standard(items)], step: 'test' }));
    await editDraft(stub.backend, caller(), ID, (read) => ({
      ok: true,
      content: draftContentOf(read),
      result: null,
    }));
    expect(stub.saves[0].step).toBe(step);
  });
});
