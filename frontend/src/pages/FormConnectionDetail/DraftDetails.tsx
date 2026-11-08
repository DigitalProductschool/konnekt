import type { EditLocationState } from '@connection-portal/api-types/routing';
import { useReducer } from 'react';
import { generatePath, useNavigate } from 'react-router';

import { deleteDraft } from '../../api/form-connections';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDocumentTypes } from '../../hooks/useDocumentTypes';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { DETAIL_COPY, DRAFT_STEPS, INITIAL_DRAFT_DELETE_STATE } from './constants';
import DetailFooter from './DetailFooter';
import DocumentsSummary from './DocumentsSummary';
import DraftCard from './DraftCard';
import RulesSummary from './RulesSummary';
import type { DraftDetailsProps } from './types';
import {
  deleteDraftDialogOf,
  deleteDraftErrorOf,
  draftDeleteReducer,
  reachedStepsOf,
} from './utils';

/**
 * A stored draft's details (spec 005, S6, W7) in the wizard's frame: the header names it (the
 * page's h1) with the "Draft" badge and its description, if it has one; Publish is the current
 * step, and the steps up to the one it was saved in are reached and lead to its flow there, while
 * the steps between are to do. The draft isn't live, so it shows no
 * connection URL anywhere (FR-006): an info note in KERN's alert style, which isn't a live
 * region, says so, then the documents and rules it holds, incomplete parts included, and the
 * draft card. "Delete draft" asks first and returns to the overview; if the draft was published
 * meanwhile, "Open the connection" loads the details again.
 */
export default function DraftDetails({ draft, onReload }: DraftDetailsProps) {
  const [state, dispatch] = useReducer(draftDeleteReducer, INITIAL_DRAFT_DELETE_STATE);
  const navigate = useNavigate();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { id, name } = draft;
  const editPath = generatePath(ROUTES.editFormConnection, { id });
  // Names the data that rules check but the draft doesn't request; until it loads, or if it
  // fails, the rules card names only the requested documents
  const { documentTypes } = useDocumentTypes();

  useDocumentTitle(name);

  function continueAt(index: number) {
    const editState: EditLocationState = { step: DRAFT_STEPS[index] };
    navigate(editPath, { state: editState });
  }

  async function remove() {
    dispatch({ type: 'start' });
    try {
      await deleteDraft(id);
      navigate(ROUTES.overview, { replace: true });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'failed', failure: deleteDraftErrorOf(error) });
      }
    }
  }

  function confirm() {
    switch (state.failure?.kind) {
      case 'published':
        dispatch({ type: 'closeDialog' });
        onReload();
        return;
      case 'deleted':
        navigate(ROUTES.overview, { replace: true });
        return;
      default:
        void remove();
    }
  }

  const dialog = deleteDraftDialogOf(state.failure);
  return (
    <WizardLayout
      title={name}
      titleAsHeading
      badge={<ConnectionStatusBadge isActive draft />}
      meta={draft.description || undefined}
      head={
        // No step is current (Publish is a dialog, FR-025): the steps the draft reached are done
        <WizardProgress
          steps={CONNECTION_STEPS}
          current={CONNECTION_STEPS.length}
          reached={reachedStepsOf(draft.step)}
          onSelect={continueAt}
        />
      }
      footer={<DetailFooter formConnectionId={id} draft={draft} />}
      overlay={
        <ConfirmDialog
          open={state.dialogOpen}
          title={DETAIL_COPY.deleteDraftTitle}
          text={DETAIL_COPY.deleteDraftText(name)}
          confirmLabel={DETAIL_COPY.deleteDraft}
          cancelLabel={DETAIL_COPY.cancel}
          danger={dialog.danger}
          busyLabel={DETAIL_COPY.deleting}
          busy={state.deleting}
          error={state.failure?.notice ?? null}
          errorTitle={dialog.errorTitle}
          retryLabel={dialog.retryLabel}
          onCancel={() => dispatch({ type: 'closeDialog' })}
          onConfirm={confirm}
        />
      }
    >
      <div className="mx-auto flex w-full max-w-900 flex-col gap-32">
        {/* KERN's info alert, built from its classes: `KernAlert` is always role="alert", which
            would interrupt the page's announcement with a note that never changes */}
        <div className="kern-alert kern-alert--info w-full">
          <div className="kern-alert__header">
            <span aria-hidden="true" className="kern-icon kern-icon--info kern-icon--small" />
            <p className="kern-title">{DETAIL_COPY.draftNotLive}</p>
          </div>
        </div>
        <DocumentsSummary documents={draft.documents} draft />
        <RulesSummary
          formConnectionId={id}
          branches={draft.branches}
          documents={draft.documents}
          draft
          catalog={documentTypes}
        />
        <DraftCard
          name={name}
          editPath={editPath}
          step={draft.step}
          updatedAt={draft.updated_at}
          onDelete={() => dispatch({ type: 'openDialog' })}
        />
      </div>
    </WizardLayout>
  );
}
