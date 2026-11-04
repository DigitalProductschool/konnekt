import { useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { useFormConnection } from '../../hooks/useFormConnection';
import FormConnectionEditorPage from '../FormConnectionEditor';
import type { EditorStep } from '../FormConnectionEditor/types';
import { initialStatesFromDraft } from '../FormConnectionEditor/utils';
import { initialStepOf } from './utils';

/**
 * The edit screen at /form-connections/:id/edit. Until the connection or draft is there, the
 * wizard's frame says that it is loading, or why it can't be opened.
 * - A published connection: the edit wizard, filled in with the connection's details and
 *   documents (FR-026). "Reload", after another team member saved the rules (W9), fetches it
 *   again and opens a new wizard at the Rules step: the key changes with each load, so the
 *   unsaved changes go.
 * - A stored draft: the create flow with the draft's content and the "Draft" badge, at the step
 *   its details asked for, the test step included, or else at the step it was saved in (FR-008;
 *   S0, research R10). Its saves and its publishing send the version it was loaded at.
 */
export default function FormConnectionEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  // Read once, so that going back to step 1 isn't undone by a re-render
  const [requested] = useState<unknown>(() => location.state);
  const [initialStep, setInitialStep] = useState<EditorStep>(() => initialStepOf(requested));
  const [reloaded, setReloaded] = useState(false);
  const { state, retry } = useFormConnection(id);
  const draft =
    state.status === 'loaded' && state.formConnection.status === 'draft'
      ? state.formConnection
      : undefined;
  // Once per load: the editor reads its starting states only when it mounts
  const draftStates = useMemo(
    () => draft && initialStatesFromDraft(draft, initialStepOf(requested, draft)),
    [draft, requested]
  );

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
      <FormConnectionEditorPage
        key={`${loaded.id}:${state.attempt}`}
        origin={{ kind: 'draft', draftId: loaded.id, draftVersion: loaded.version }}
        initialStates={draftStates}
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
