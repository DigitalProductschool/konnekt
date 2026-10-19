import { useCallback, useEffect, useReducer, useRef } from 'react';
import { generatePath, useNavigate } from 'react-router';

import {
  activateFormConnection,
  deactivateFormConnection,
  deleteFormConnection,
} from '../../api/form-connections';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import type { EditLocationState } from '../../types/routing';
import ConnectionLinks from './ConnectionLinks';
import ConnectionStatus from './ConnectionStatus';
import { DETAIL_COPY } from './constants';
import DetailFooter from './DetailFooter';
import DocumentsSummary from './DocumentsSummary';
import type { ConnectionDetailsProps, StatusAction } from './types';
import {
  actionErrorNotice,
  actionsReducer,
  dialogCopyOf,
  initialActionsState,
  successMessageOf,
} from './utils';

/**
 * A loaded connection in the frame of Figma "22 Published": the header names it (the page's
 * h1), its status and form; every step is done and leads to editing it; the body has the links
 * to copy into serviceBW, the requested documents and the status card. Deactivating and
 * deleting ask first; deleting returns to the overview.
 */
export default function ConnectionDetails({
  formConnection,
  arrival,
  onChange,
}: ConnectionDetailsProps) {
  const [state, dispatch] = useReducer(actionsReducer, arrival, initialActionsState);
  const navigate = useNavigate();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { id, is_active: isActive } = formConnection;

  useDocumentTitle(formConnection.name);

  // Right after publishing, the focus goes to "Your connection is live"
  useEffect(() => {
    if (arrival === 'published') {
      headingRef.current?.focus();
    }
  }, [arrival]);

  const dismissToast = useCallback(() => dispatch({ type: 'dismissToast' }), []);

  async function run(action: StatusAction) {
    dispatch({ type: 'start', action });
    try {
      if (action === 'delete') {
        await deleteFormConnection(id);
        navigate(ROUTES.overview, { replace: true });
        return;
      }
      const changed =
        action === 'deactivate'
          ? await deactivateFormConnection(id)
          : await activateFormConnection(id);
      onChange(changed);
      dispatch({ type: 'succeeded', message: successMessageOf(action) });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'failed', error: actionErrorNotice(error) });
      }
    }
  }

  function editAt(step: number) {
    const editState: EditLocationState = { step: step === 0 ? 'connection' : 'documents' };
    navigate(generatePath(ROUTES.editFormConnection, { id }), { state: editState });
  }

  const dialog = dialogCopyOf(state.dialog);
  return (
    <WizardLayout
      title={formConnection.name}
      titleAsHeading
      badge={<ConnectionStatusBadge isActive={isActive} />}
      meta={DETAIL_COPY.formId(formConnection.servicebw_form)}
      head={
        <WizardProgress
          steps={CONNECTION_STEPS}
          current={CONNECTION_STEPS.length}
          onSelect={editAt}
        />
      }
      footer={<DetailFooter formConnectionId={id} />}
      overlay={
        <>
          <ConfirmDialog
            open={state.dialogOpen}
            {...dialog}
            cancelLabel={DETAIL_COPY.cancel}
            busy={state.running !== null}
            error={state.dialogOpen ? state.error : null}
            retryLabel={DETAIL_COPY.retry}
            onCancel={() => dispatch({ type: 'closeDialog' })}
            onConfirm={() => run(state.dialog)}
          />
          <Toast toast={state.toast} onDismiss={dismissToast} />
        </>
      }
    >
      {/* Figma "Publish/Success card" is 900 px wide, centred in the wizard's column */}
      <div className="mx-auto flex w-full max-w-900 flex-col gap-32">
        <ConnectionLinks
          formConnection={formConnection}
          published={arrival === 'published'}
          headingRef={headingRef}
        />
        <DocumentsSummary documents={formConnection.documents} />
        <ConnectionStatus
          isActive={isActive}
          activating={state.running === 'activate'}
          error={state.dialogOpen ? null : state.error}
          onToggle={() =>
            isActive ? dispatch({ type: 'openDialog', dialog: 'deactivate' }) : run('activate')
          }
          onDelete={() => dispatch({ type: 'openDialog', dialog: 'delete' })}
        />
      </div>
    </WizardLayout>
  );
}
