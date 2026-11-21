import { useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { deleteDraft } from '../../api/form-connections';
import ActionMenu from '../../components/ActionMenu';
import type { MenuAction } from '../../components/ActionMenu/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import WizardLayout from '../../components/WizardLayout';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { DELETE_CONNECTION_COPY } from '../FormConnectionList/constants';
import ActivityCard from './ActivityCard';
import { CONNECTION_DETAIL_COPY, DELETE_ICON, INITIAL_DRAFT_DELETE_STATE } from './constants';
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
  overviewStateAfterDeletion,
  toggleAccordion,
} from './utils';

/**
 * A stored draft's details (S16; U93 7362:54691, U07 #22–#27) in the details' frame (L4): the
 * header pill names it with the "Draft" badge and its description (W10), the tab title "<name>
 * (Draft)"; no step line (FR-025e). The draft band's "This connection is a draft" is the page's
 * one h1 (FR-049), with its sub-line and the date pill "Edited 03.10.2026, 14:32" and its ⋯
 * ("Draft actions"), as the published pages have it, whose one entry "Delete draft" (F56, bug
 * new-visuals B2) asks in the overview's one delete dialog with the draft's body (S17: "Delete
 * “<name>”?", F55, "Keep connection" / "Delete
 * connection", the scrim not closing it) and returns to the overview with the toast "“<name>”
 * deleted." and its "Undo" (spec 010, FR-033: the deletion's id goes with it), or, if the draft
 * was published or deleted meanwhile, says so in the dialog's alert (W8): "Open the connection"
 * loads the details again, "Go to overview" leaves.
 * Then the Summary, open first (its documents and rules, incomplete parts with the placeholders,
 * unchecked), the Links card without links and without a toggle: the draft isn't live, so no
 * connection URL shows anywhere (FR-006), and the Activity card (spec 010 S16, FR-022; U93
 * 7362:54915): Summary and Activity are one accordion, one open at a time, or none. The footer's
 * "Edit connection" opens its flow at the step it was saved in, for every team member (F31). The
 * Summary's header shows the draft's version and "Download PDF" (spec 011, FR-001, FR-032; U93
 * #10), the page's download (`pdf`) as on a published connection's details: the draft's PDF,
 * "Draft for review" with no URL in it (FR-013). The view-only variant (U93 7362:54923) isn't
 * built (F12, spec 010 F31).
 */
export default function DraftDetails({ draft, onReload, pdf }: DraftDetailsProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const deleteCopy = DELETE_CONNECTION_COPY[language];
  // A delete in flight during a switch: its failure takes the language it arrives in
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const [state, dispatch] = useReducer(draftDeleteReducer, INITIAL_DRAFT_DELETE_STATE);
  // The Summary opens first (U07 #24, U93 7362:54691); the Links card has nothing to open, so
  // Summary and Activity open one at a time
  const [openAccordion, setOpenAccordion] = useState<DetailAccordionName | null>('summary');
  const navigate = useNavigate();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { id, name } = draft;

  useDocumentTitle(copy.draftTabTitle(name));

  async function remove() {
    dispatch({ type: 'start' });
    try {
      const deletion = await deleteDraft(id);
      navigate(ROUTES.overview, {
        replace: true,
        state: overviewStateAfterDeletion(name, deletion),
      });
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
  // The ⋯ gets the focus back before the dialog opens (ActionMenu), so "Cancel" returns there
  const menuActions: MenuAction[] = [
    {
      label: copy.deleteDraft,
      icon: DELETE_ICON,
      danger: true,
      onSelect: () => dispatch({ type: 'openDialog' }),
    },
  ];
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
          actions={<ActionMenu label={copy.draftActions} actions={menuActions} />}
        />
        <RulesSummary
          branches={draft.branches}
          documents={draft.documents}
          draft
          version={draft.version_fingerprint}
          pdf={pdf}
          open={openAccordion === 'summary'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'summary'))}
        />
        <DraftCard />
        <ActivityCard
          formConnectionId={id}
          lastActivity={draft.last_activity}
          state="draft"
          open={openAccordion === 'activity'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'activity'))}
          reloadKey={draft.updated_at}
        />
      </div>
    </WizardLayout>
  );
}
