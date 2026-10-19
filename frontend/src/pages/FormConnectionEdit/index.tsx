import { useState } from 'react';
import { useLocation, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { useFormConnection } from '../../hooks/useFormConnection';
import FormConnectionEditorPage from '../FormConnectionEditor';
import { initialStepOf } from './utils';

/**
 * The edit screen at /form-connections/:id/edit: the create wizard, filled in with the
 * connection's details and documents. Until the connection is there, the wizard's frame says
 * that it is loading, or why it can't be edited.
 */
export default function FormConnectionEditPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  // Read once, so that going back to step 1 isn't undone by a re-render
  const [initialStep] = useState(() => initialStepOf(location.state));
  const { state, retry } = useFormConnection(id);

  if (state.status !== 'loaded') {
    return <FormConnectionLoadState state={state} onRetry={retry} />;
  }
  return (
    <FormConnectionEditorPage
      key={state.formConnection.id}
      formConnection={state.formConnection}
      initialStep={initialStep}
    />
  );
}
