import type { OverviewLocationState } from '@connection-portal/api-types/routing';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { deleteDraft } from '../../api/form-connections';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import WizardLayout from '../../components/WizardLayout';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { DELETE_CONNECTION_COPY } from '../FormConnectionList/constants';
import { CONNECTION_DETAIL_COPY, INITIAL_DRAFT_DELETE_STATE } from './constants';
import DetailFooter from './DetailFooter';
import DraftCard from './DraftCard';
import RulesSummary from './RulesSummary';
import StatusBand from './StatusBand';
import type { DetailAccordionName, DraftDetailsProps } from './types';
import {
  datePillOf,
  deleteDraftDialogOf,
  deleteDraftErrorOf,
  deleteDraftNoticeOf,
  draftDeleteReducer,
  toggleAccordion,
} from './utils';

/**
 * A stored draft's details (S16; U93 7362:54691, U07 #22–#27) in the details' frame (L4): the
 * header pill names it with the "Draft" badge and its description (W10), the tab title "<name>
 * (Draft)"; no step line (FR-025e). The draft band's "This connection is a draft" is the page's
 * one h1 (FR-049), with its sub-line and the date pill "Edited 03.10.2026, 14:32"; no ⋯, but a
 * visible "Delete draft" at the band's right end (F56), which asks in the overview's one delete
 * dialog with the draft's body (S17: "Delete “<name>”?", F55, "Keep connection" / "Delete
 * connection", the scrim not closing it) and returns to the overview with the toast "“<name>”
 * deleted." (no Undo, F4), or, if the draft was published or deleted meanwhile, says so in the
 * dialog's alert (W8): "Open the connection" loads the details again, "Go to overview" leaves. Then the Summary,
 * open first (its documents and rules, incomplete parts with the placeholders, unchecked), and
 * the Links card without links: the draft isn't live, so no connection URL shows anywhere
 * (FR-006). The footer's "Edit connection" opens its flow at the step it was saved in. No
 * Activity (F2), no PDF (F53); the view-only variant (U93 7362:54923) isn't built (F12).
 */
export default function DraftDetails({ draft, onReload }: DraftDetailsProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const deleteCopy = DELETE_CONNECTION_COPY[language];
  // A delete in flight during a switch: its failure takes the language it arrives in
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const [state, dispatch] = useReducer(draftDeleteReducer, INITIAL_DRAFT_DELETE_STATE);
  // The Summary opens first (U07 #24); the Links card has nothing to open
  const [openAccordion, setOpenAccordion] = useState<DetailAccordionName | null>('summary');
  const navigate = useNavigate();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { id, name } = draft;

  useDocumentTitle(copy.draftTabTitle(name));

  async function remove() {
    dispatch({ type: 'start' });
    try {
      await deleteDraft(id);
      const overviewState: OverviewLocationState = { deleted: name };
      navigate(ROUTES.overview, { replace: true, state: overviewState });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'failed', failure: deleteDraftErrorOf(error, languageRef.current) });
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

  const dialog = deleteDraftDialogOf(state.failure, language);
  return (
    <WizardLayout
      variant="details"
      title={name}
      badge={<ConnectionStatusBadge state="draft" />}
      meta={draft.description || undefined}
      footer={<DetailFooter formConnectionId={id} draft={draft} />}
      overlay={
        <ConfirmDialog
          open={state.dialogOpen}
          title={deleteCopy.title(name)}
          text={deleteCopy.draft(name)}
          confirmLabel={deleteCopy.confirm}
          cancelLabel={deleteCopy.cancel}
          danger={dialog.danger}
          busyLabel={deleteCopy.busy}
          busy={state.deleting}
          error={deleteDraftNoticeOf(state.failure, language)}
          errorTitle={dialog.errorTitle}
          retryLabel={dialog.retryLabel}
          dismissOnScrim={false}
          onCancel={() => dispatch({ type: 'closeDialog' })}
          onConfirm={confirm}
        />
      }
    >
      {/* The band and the cards 16px apart (U93 7362:54696: 208 → 224, 956 → 972) */}
      <div className="flex flex-col gap-16">
        <StatusBand
          tone="draft"
          title={copy.draftTitle}
          text={copy.draftText}
          dateLine={datePillOf(draft, language)}
          mainAction={
            <button
              type="button"
              onClick={() => dispatch({ type: 'openDialog' })}
              className="kern-btn kern-btn--tertiary"
            >
              <span aria-hidden="true" className="kern-icon kern-icon--delete" />
              <span className="kern-label">{copy.deleteDraft}</span>
            </button>
          }
        />
        <RulesSummary
          branches={draft.branches}
          documents={draft.documents}
          draft
          open={openAccordion === 'summary'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'summary'))}
        />
        <DraftCard />
      </div>
    </WizardLayout>
  );
}
