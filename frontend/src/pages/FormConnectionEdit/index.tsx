import { useState } from 'react';
import { useLocation, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { useFormConnection } from '../../hooks/useFormConnection';
import FormConnectionEditorPage from '../FormConnectionEditor';
import type { EditorStep } from '../FormConnectionEditor/types';
import { initialStepOf } from './utils';

/**
 * The edit screen at /form-connections/:id/edit: the create wizard, filled in with the
 * connection's details and documents. Until the connection is there, the wizard's frame says
 * that it is loading, or why it can't be edited. "Reload", after another team member saved the
 * rules (W9), fetches it again and opens a new wizard at the Rules step: the key changes with
 * each load, so the unsaved changes go.
 */
export default function FormConnectionEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  // Read once, so that going back to step 1 isn't undone by a re-render
  const [initialStep, setInitialStep] = useState<EditorStep>(() => initialStepOf(location.state));
  const [reloaded, setReloaded] = useState(false);
  const { state, retry } = useFormConnection(id);

  function handleReload() {
    setInitialStep('rules');
    setReloaded(true);
    retry();
  }

  if (state.status !== 'loaded') {
    return <FormConnectionLoadState state={state} onRetry={retry} />;
  }
  // Only a published connection is edited here: a draft is not found, until drafts are routed to
  // the editor
  if (state.formConnection.status !== 'published') {
    return (
      <FormConnectionLoadState
        state={{ status: 'notFound', attempt: state.attempt }}
        onRetry={retry}
      />
    );
  }
  return (
    <FormConnectionEditorPage
      key={`${state.formConnection.id}:${state.attempt}`}
      formConnection={state.formConnection}
      initialStep={initialStep}
      onReload={handleReload}
      reloaded={reloaded}
    />
  );
}
