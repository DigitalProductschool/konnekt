import { useEffect, useReducer, useState } from 'react';
import { generatePath, useLocation, useNavigate, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { formatChangedAt } from '../../components/LocalDraftsOffer/utils';
import { ROUTES } from '../../constants';
import { useFormConnection } from '../../hooks/useFormConnection';
import { useLocalDraftStore } from '../../hooks/useLocalDraftStore';
import { displayNameOf } from '../../utils/localDrafts/content';
import { flowKeyOfDraft } from '../../utils/localDrafts/keys';
import FormConnectionEditorPage from '../FormConnectionEditor';
import type { EditorStep } from '../FormConnectionEditor/types';
import {
  headerTitleOf,
  initialStatesFromDraft,
  initialStatesFromLocal,
  originOfRecord,
} from '../FormConnectionEditor/utils';
import RestoreDialog from './RestoreDialog';
import type { DraftEditFlowProps } from './types';
import {
  draftFlowReducer,
  initialDraftFlowState,
  initialStepOf,
  restoreChoiceOf,
  storedContentOf,
} from './utils';

/**
 * The edit screen at /form-connections/:id/edit. Until the connection or draft is there, the
 * wizard's frame says that it is loading, or why it can't be opened.
 * - A published connection: the edit wizard, filled in with the connection's details and
 *   documents (FR-026). "Reload", after another team member saved the rules (W9), fetches it
 *   again and opens a new wizard at the Rules step: the key changes with each load, so the
 *   unsaved changes go. Its flow never reads, writes or offers a local draft (FR-014); a
 *   `draft-<id>` local draft left from before it was published is removed when it loads
 *   (contracts/local-drafts.md "Rules for callers" 3).
 * - A stored draft: the create flow with the draft's content and the "Draft" badge, at the step
 *   its details asked for, the test step included, or else at the step it was saved in (FR-008;
 *   S0, research R10). Its saves and its publishing send the version it was loaded at. If this
 *   device holds unsaved changes to it (its `draft-<id>` local draft), the page first asks
 *   whether to restore them (S5, W6; FR-016; "Rules for callers" 2).
 */
export default function FormConnectionEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  // Read once, so that going back to step 1 isn't undone by a re-render
  const [requested] = useState<unknown>(() => location.state);
  const [initialStep, setInitialStep] = useState<EditorStep>(() => initialStepOf(requested));
  const [reloaded, setReloaded] = useState(false);
  const { state, retry } = useFormConnection(id);
  const { store, username } = useLocalDraftStore();
  const publishedId =
    state.status === 'loaded' && state.formConnection.status === 'published'
      ? state.formConnection.id
      : null;

  // A published connection has no local draft: one left from its draft goes (rule 3)
  useEffect(() => {
    if (publishedId !== null && username !== null) {
      store.remove(username, flowKeyOfDraft(publishedId));
    }
  }, [publishedId, store, username]);

  function handleReload() {
    setInitialStep('rules');
    setReloaded(true);
    retry();
  }

  if (state.status !== 'loaded') {
    return <FormConnectionLoadState state={state} onRetry={retry} />;
  }
  const loaded = state.formConnection;
  if (loaded.status === 'draft') {
    return (
      <DraftEditFlow
        key={`${loaded.id}:${state.attempt}`}
        draft={loaded}
        initialStep={initialStepOf(requested, loaded)}
      />
    );
  }
  return (
    <FormConnectionEditorPage
      key={`${loaded.id}:${state.attempt}`}
      origin={{ kind: 'published', formConnection: loaded }}
      initialStep={initialStep}
      onReload={handleReload}
      reloaded={reloaded}
    />
  );
}

/**
 * A loaded draft's flow. It reads the draft's local draft once, when it mounts: without one it
 * opens the stored draft; one with the stored draft's own content goes silently; one with changes
 * brings the restore question before the editor mounts, so that the editor's autosave can't write
 * over it until the team member has answered.
 */
function DraftEditFlow({ draft, initialStep }: DraftEditFlowProps) {
  const { store, username } = useLocalDraftStore();
  const navigate = useNavigate();
  const flowKey = flowKeyOfDraft(draft.id);
  // Once per load: the editor reads its starting states only when it mounts
  const [stored] = useState(() => {
    // Nobody signed in can't happen behind RequireSignIn; it reads as no record
    const record = username !== null ? store.read(username, flowKey) : null;
    return {
      record,
      choice: restoreChoiceOf(record, draft),
      states: initialStatesFromDraft(draft, initialStep),
    };
  });
  const [flow, dispatch] = useReducer(draftFlowReducer, null, () =>
    initialDraftFlowState(stored.record, stored.choice)
  );

  // The stored draft's own content holds no unsaved work
  useEffect(() => {
    if (stored.choice === 'same' && username !== null) {
      store.remove(username, flowKey);
    }
  }, [stored.choice, store, username, flowKey]);

  function handleDiscard() {
    if (username !== null) {
      store.remove(username, flowKey);
    }
    dispatch({ type: 'discard' });
  }

  function handleEscape() {
    navigate(generatePath(ROUTES.formConnection, { id: draft.id }), { replace: true });
  }

  if (flow.kind === 'asking') {
    return (
      <RestoreDialog
        title={headerTitleOf(stored.states.editor)}
        name={displayNameOf(storedContentOf(draft))}
        changedAt={formatChangedAt(flow.record.changedAt)}
        onRestore={() => dispatch({ type: 'restore' })}
        onDiscard={handleDiscard}
        onEscape={handleEscape}
      />
    );
  }
  // After an answer to the question, the dialog that had the focus is gone: as after Reload, the
  // focus starts on the page title
  const answered = stored.choice === 'ask';
  if (flow.restored) {
    // At the version the record was loaded at, so a save meets the conflict if the draft changed
    // since (US3); the stored draft as loaded stays the baseline (data-model.md section 6)
    return (
      <FormConnectionEditorPage
        origin={originOfRecord(flow.restored)}
        initialStates={initialStatesFromLocal(flow.restored)}
        baseline={storedContentOf(draft)}
        reloaded={answered}
      />
    );
  }
  return (
    <FormConnectionEditorPage
      origin={{
        kind: 'draft',
        draftId: draft.id,
        draftVersion: draft.version,
        flowKey,
      }}
      initialStates={stored.states}
      reloaded={answered}
    />
  );
}
