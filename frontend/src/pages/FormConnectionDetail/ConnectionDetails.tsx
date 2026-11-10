import type { OverviewLocationState } from '@connection-portal/api-types/routing';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { generatePath, useNavigate } from 'react-router';

import {
  activateFormConnection,
  deactivateFormConnection,
  deleteFormConnection,
} from '../../api/form-connections';
import ActionMenu from '../../components/ActionMenu';
import type { MenuAction } from '../../components/ActionMenu/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { EDIT_ENTRY_DIALOG_COPY, EDIT_ENTRY_STATE } from '../FormConnectionEdit/constants';
import PublishSummaryRow from '../FormConnectionEditor/PublishSummaryRow';
import ConnectionLinks from './ConnectionLinks';
import {
  CONNECTION_DETAIL_COPY,
  DELETE_ICON,
  LINK_OFF_ICON,
  SUMMARY_INTRO_CLASSES,
  SUMMARY_TABLE_CLASSES,
} from './constants';
import DetailFooter from './DetailFooter';
import RulesSummary from './RulesSummary';
import StatusBand from './StatusBand';
import type { ConnectionDetailsProps, DetailAccordionName, StatusAction } from './types';
import {
  actionErrorNotice,
  actionsReducer,
  dialogCopyOf,
  initialAccordionOf,
  initialActionsState,
  reactivateSummaryOf,
  successMessageOf,
  toggleAccordion,
} from './utils';

/**
 * A loaded connection in the details' frame (L4, S15; U80 6396:47648): the header pill names it
 * with its status and description (W10); no step line (FR-025). The status band's sentence is
 * the page's h1 (FR-046), with the ⋯ menu at its right end (F66): "Deactivate" and "Delete
 * connection". Then the Links accordion, open right after publishing (the h1 takes the focus
 * then), and the Summary accordion with the documents, the rules as variant tabs and the rule
 * checks' findings (FR-047), open on every other arrival, as from the overview's "View" (U91);
 * one accordion is open at a time (FR-046). While deactivated (U89, U96, U97), the band is grey
 * with "Activate again" before the ⋯, whose menu holds only "Delete connection", and the copy
 * buttons are off with their explanation (FR-046, W21); the Summary stays as it is.
 *
 * Each action asks first (S17), in `ConfirmDialog`: deleting in the overview's one delete dialog
 * (FR-029c; danger, the scrim doesn't close it, FR-052a), which returns to the overview with the
 * toast "“<name>” deleted." (no Undo, F4); deactivating with F13's body and "Keep active" (U88),
 * then the success toast "Connection deactivated." (no Undo, F54) with the focus back on the ⋯;
 * reactivating with the documents and rules summary (U89 7173:52959, FR-051 (40)), then
 * "Connection reactivated." with the focus on the band's new h1, since "Activate again" is gone.
 * While an action runs the dialog is busy; a failure stays in it with the error ID of a 5xx and
 * "Try again" (FR-008). Closing returns the focus to the opener (FR-009).
 *
 * The footer's "Edit connection" asks "Edit “<name>”?" first (S17, F48; U87 6396:49030): "Edit
 * connection" opens the edit flow at step 1; "Cancel", the ×, Escape and the scrim stay here.
 */
export default function ConnectionDetails({
  formConnection,
  arrival,
  onChange,
}: ConnectionDetailsProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const editEntryCopy = EDIT_ENTRY_DIALOG_COPY[language];
  // The toast after saving an edit in the language of the arrival; a later switch words the next
  const [state, dispatch] = useReducer(actionsReducer, arrival, (first) =>
    initialActionsState(first, language)
  );
  // A request in flight during a switch: its toast or failure takes the language it arrives in
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const navigate = useNavigate();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set when reactivating succeeded: once its dialog has closed, the h1 takes the focus
  const focusHeadingAfterDialog = useRef(false);
  // The edit entry question (F48): open, or closed and fading out
  const [editAsked, setEditAsked] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<DetailAccordionName | null>(() =>
    initialAccordionOf(arrival)
  );
  const { id, name, is_active: isActive } = formConnection;

  useDocumentTitle(formConnection.name);

  // Right after publishing, the focus goes to "Your connection is active"
  useEffect(() => {
    if (arrival === 'published') {
      headingRef.current?.focus();
    }
  }, [arrival]);

  // After the dialog closed (a child's effect, which runs first): the opener "Activate again" is
  // gone with the deactivated band, so the focus goes to the band's new sentence, "Your
  // connection is active", rather than to the page's start
  useEffect(() => {
    if (!state.dialogOpen && focusHeadingAfterDialog.current) {
      focusHeadingAfterDialog.current = false;
      headingRef.current?.focus();
    }
  }, [state.dialogOpen]);

  const dismissToast = useCallback(() => dispatch({ type: 'dismissToast' }), []);

  async function run(action: StatusAction) {
    dispatch({ type: 'start', action });
    try {
      if (action === 'delete') {
        await deleteFormConnection(id);
        const overviewState: OverviewLocationState = { deleted: name };
        navigate(ROUTES.overview, { replace: true, state: overviewState });
        return;
      }
      const changed =
        action === 'deactivate'
          ? await deactivateFormConnection(id)
          : await activateFormConnection(id);
      // Deactivating returns the focus to the ⋯, which stays (the dialog's native return)
      focusHeadingAfterDialog.current = action === 'activate';
      onChange(changed);
      dispatch({ type: 'succeeded', message: successMessageOf(action, languageRef.current) });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        dispatch({ type: 'failed', error: actionErrorNotice(error, languageRef.current) });
      }
    }
  }

  const menuActions: MenuAction[] = [
    ...(isActive
      ? [
          {
            label: copy.deactivate,
            icon: LINK_OFF_ICON,
            onSelect: () => dispatch({ type: 'openDialog', dialog: 'deactivate' }),
          },
        ]
      : []),
    {
      label: copy.delete,
      icon: DELETE_ICON,
      danger: true,
      separated: isActive,
      onSelect: () => dispatch({ type: 'openDialog', dialog: 'delete' }),
    },
  ];
  const dialog = dialogCopyOf(state.dialog, formConnection, language);
  const summary = reactivateSummaryOf(formConnection, language);
  return (
    <WizardLayout
      variant="details"
      title={formConnection.name}
      badge={<ConnectionStatusBadge isActive={isActive} />}
      meta={formConnection.description || undefined}
      footer={<DetailFooter formConnectionId={id} onEdit={() => setEditAsked(true)} />}
      overlay={
        <>
          <ConfirmDialog
            open={state.dialogOpen}
            {...dialog}
            textClassName={state.dialog === 'activate' ? SUMMARY_INTRO_CLASSES : undefined}
            busy={state.running !== null}
            error={state.dialogOpen ? state.error : null}
            retryLabel={copy.retry}
            dismissOnScrim={state.dialog !== 'delete'}
            onCancel={() => dispatch({ type: 'closeDialog' })}
            onConfirm={() => run(state.dialog)}
          >
            {state.dialog === 'activate' && (
              // "Dialog content/Publish · summary" without "Active from" (F1)
              <dl className={SUMMARY_TABLE_CLASSES}>
                <PublishSummaryRow
                  label={copy.documentsTitle}
                  values={summary.documentLines}
                  divided
                />
                <PublishSummaryRow label={copy.rulesTitle} values={summary.ruleLines} />
              </dl>
            )}
          </ConfirmDialog>
          <ConfirmDialog
            open={editAsked}
            title={editEntryCopy.title(name)}
            text={editEntryCopy.text}
            cancelLabel={editEntryCopy.cancel}
            confirmLabel={editEntryCopy.confirm}
            onCancel={() => setEditAsked(false)}
            onConfirm={() =>
              navigate(generatePath(ROUTES.editFormConnection, { id }), {
                state: EDIT_ENTRY_STATE,
              })
            }
          />
          <Toast toast={state.toast} onDismiss={dismissToast} />
        </>
      }
    >
      {/* The band and the cards 16px apart (U80 6396:47661: 192 → 208, 699 → 715) */}
      <div className="flex flex-col gap-16">
        <StatusBand
          tone={isActive ? 'active' : 'deactivated'}
          title={isActive ? copy.activeTitle : copy.deactivatedTitle}
          text={isActive ? copy.activeText : copy.deactivatedText}
          headingRef={headingRef}
          mainAction={
            !isActive && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'openDialog', dialog: 'activate' })}
                className="kern-btn kern-btn--primary"
              >
                <span className="kern-label">{copy.activateAgain}</span>
              </button>
            )
          }
          actions={<ActionMenu label={copy.connectionActions} actions={menuActions} />}
        />
        <ConnectionLinks
          formConnection={formConnection}
          open={openAccordion === 'links'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'links'))}
        />
        <RulesSummary
          branches={formConnection.branches}
          documents={formConnection.documents}
          open={openAccordion === 'summary'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'summary'))}
        />
      </div>
    </WizardLayout>
  );
}
