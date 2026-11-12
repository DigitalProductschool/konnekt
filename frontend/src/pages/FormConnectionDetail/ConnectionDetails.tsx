import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { generatePath, useNavigate } from 'react-router';

import {
  activateFormConnection,
  deactivateFormConnection,
  deleteFormConnection,
  setStartDate,
} from '../../api/form-connections';
import ActionMenu from '../../components/ActionMenu';
import type { MenuAction } from '../../components/ActionMenu/types';
import type { ActiveFrom } from '../../components/ActiveFromChoice/types';
import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import Toast from '../../components/Toast';
import WizardLayout from '../../components/WizardLayout';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { useTodayInGermany } from '../../hooks/useTodayInGermany';
import { EDIT_ENTRY_STATE } from '../FormConnectionEdit/constants';
import { isInvalidStartDate } from '../FormConnectionEditor/utils';
import ActivityCard from './ActivityCard';
import ConnectionLinks from './ConnectionLinks';
import {
  CALENDAR_PENCIL_ICON,
  CONNECTION_DETAIL_COPY,
  DELETE_ICON,
  LINK_OFF_ICON,
} from './constants';
import DetailFooter from './DetailFooter';
import ReactivateDialog from './ReactivateDialog';
import RulesSummary from './RulesSummary';
import StartDateDialog from './StartDateDialog';
import StatusBand from './StatusBand';
import type {
  ConnectionDetailsProps,
  ConnectionMenuEntry,
  DetailAccordionName,
  RunningAction,
} from './types';
import {
  actionErrorNotice,
  actionsReducer,
  confirmationOf,
  connectionMenuOf,
  datePillOf,
  dialogCopyOf,
  editEntryCopyOf,
  initialAccordionOf,
  initialActionsState,
  isNoAnswer,
  overviewStateAfterDeletion,
  reactivatePlanOf,
  startDateChoiceOf,
  startDatePlanOf,
  statusBandOf,
  successMessageOf,
  toggleAccordion,
} from './utils';

/**
 * A loaded connection in the details' frame (L4, S15; U80 6396:47648): the header pill names it
 * with its status and description (W10); no step line (FR-025). The status band's sentence is
 * the page's h1 (FR-046), with the date pill under it (C1, FR-015): "Active since <date>,
 * <time>", "Active from <date>, 00:00" or "Deactivated since <date>, <time>", and the ⋯ menu
 * inside the pill (FR-016): "Change start date", "Deactivate", the divider and "Delete
 * connection" while active or scheduled (S15, FR-008, FR-009; U88 6417:31045). Then the Links
 * accordion, open right after publishing or scheduling (the h1 takes the focus then) and after
 * the edit flow's "Save" (spec 010 FR-022, F40), the Summary accordion with the documents, the
 * rules as variant tabs and the rule checks' findings (FR-047), open on every other arrival, as
 * from the overview's "View" (U91), and the Activity card (spec 010 FR-022; U92 7246:51510),
 * which loads its entries again after an action here changed the connection. The three are one
 * accordion: one card is open at a time, or none (FR-046, FR-022). While deactivated (U89, U96,
 * U97), the band is grey with "Activate again" next to the pill, whose menu holds only "Delete
 * connection", and the copy buttons are off with their explanation (FR-046, W21); the Summary
 * stays as it is. A scheduled connection (S15,
 * FR-006, FR-007; U94 7246:52715, 7246:53289) reads "Your connection is scheduled" in the blue
 * band and is otherwise an active connection's details: every link with its copy button on. No
 * "Download PDF" (F12). "Change start date" opens `StartDateDialog` (S15; FR-008, FR-009), whose
 * "Save date" sends the new start, or null for "Now", and shows the answered connection with the
 * toast "Start date saved." (W3), the focus back on the ⋯; an active connection's "Now" and a
 * scheduled one's own date close it without a call. A day that isn't after today, or the
 * server's `400 invalid_start_date`, is the field's error (W1).
 *
 * Each action asks first (S17), in `ConfirmDialog`: deleting in the overview's one delete dialog
 * (FR-029c; danger, the scrim doesn't close it, FR-052a), its body by the state (a scheduled
 * connection's FR-010), which returns to the overview with the toast "“<name>” deleted." and its
 * "Undo" (spec 010, FR-033: the deletion's id goes with it); deactivating with F13's body and "Keep active" (U88), a scheduled connection with
 * copy.md §2's sentence and "Keep scheduled" (FR-012, W5), then the success toast "Connection
 * deactivated." (no Undo, F13, F54) with the focus back on the ⋯; reactivating in
 * `ReactivateDialog` with the documents and rules summary (U89 7173:52959, FR-051 (40)) and
 * "Active from" (FR-011, W4): "Now" and "Activate" then "Connection reactivated."; "On a date"
 * and "Schedule" then the scheduled details and "Connection scheduled for <date>."; either way
 * the focus on the band's new h1, since "Activate again" is gone. While an action runs the dialog
 * is busy; a failure stays in it with the error ID of a 5xx and "Try again" (FR-008, FR-014).
 * Closing returns the focus to the opener (FR-009).
 *
 * The footer's "Edit connection" asks "Edit “<name>”?" first (S17, F48; U87 6396:49030), or "Edit
 * this scheduled connection?" for a scheduled one (FR-013, W7): "Edit connection" opens the edit
 * flow at step 1; "Cancel", the ×, Escape and the scrim stay here.
 */
export default function ConnectionDetails({
  formConnection,
  arrival,
  onChange,
}: ConnectionDetailsProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const editEntryCopy = editEntryCopyOf(formConnection, language);
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
  const today = useTodayInGermany();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Set when reactivating succeeded: once its dialog has closed, the h1 takes the focus
  const focusHeadingAfterDialog = useRef(false);
  // The edit entry question (F48): open, or closed and fading out
  const [editAsked, setEditAsked] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<DetailAccordionName | null>(() =>
    initialAccordionOf(arrival)
  );
  const { id, name } = formConnection;
  const band = statusBandOf(formConnection.state, language);

  useDocumentTitle(formConnection.name);

  // Right after publishing, the focus goes to the band's sentence: "Your connection is active",
  // or, after "Schedule", "Your connection is scheduled"
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

  // `startDate` is what "Save date" or "Schedule" sends: the day, or null for "Now"
  async function run(action: RunningAction, startDate: string | null = null) {
    dispatch({ type: 'start', action });
    try {
      if (action === 'delete') {
        const deletion = await deleteFormConnection(id);
        navigate(ROUTES.overview, {
          replace: true,
          state: overviewStateAfterDeletion(name, deletion),
        });
        return;
      }
      const changed =
        action === 'deactivate'
          ? await deactivateFormConnection(id)
          : action === 'activate'
            ? await (startDate === null
                ? activateFormConnection(id)
                : activateFormConnection(id, startDate))
            : await setStartDate(id, startDate);
      // Deactivating and a new start date return the focus to the ⋯, which stays (the dialog's
      // native return)
      focusHeadingAfterDialog.current = action === 'activate';
      onChange(changed);
      // Reactivated on a date: "Connection scheduled for <date>." with the answered start
      const scheduledFor =
        action === 'activate' && changed.state === 'scheduled' ? changed.start_date : null;
      dispatch({
        type: 'succeeded',
        message: successMessageOf(action, languageRef.current, scheduledFor),
      });
    } catch (error) {
      if (handleUnauthorized(error)) {
        return;
      }
      // The day changed while the dialog was open (W1): the field's error
      if ((action === 'startDate' || action === 'activate') && isInvalidStartDate(error)) {
        dispatch({ type: 'dateRefused' });
        return;
      }
      dispatch({
        type: 'failed',
        error: actionErrorNotice(error, languageRef.current),
        noAnswer: isNoAnswer(error),
      });
    }
  }

  // "Save date" (S15): the field's error, nothing to change, or the call
  function saveStartDate() {
    const plan = startDatePlanOf(formConnection, state.activeFrom, state.startDateText, today);
    switch (plan.kind) {
      case 'refused':
        dispatch({ type: 'dateRefused' });
        return;
      case 'unchanged':
        dispatch({ type: 'closeDialog' });
        return;
      case 'send':
        run('startDate', plan.startDate);
    }
  }

  // "Activate" or "Schedule" (S17; FR-011): the field's error, or the call with the day or "Now"
  function activateAgain() {
    const plan = reactivatePlanOf(state.activeFrom, state.startDateText, today);
    if (plan.kind === 'refused') {
      dispatch({ type: 'dateRefused' });
      return;
    }
    run('activate', plan.startDate);
  }

  // The ⋯ menu's entries by the state (S15); each opens its dialog
  const menuEntries: Record<ConnectionMenuEntry, Omit<MenuAction, 'separated'>> = {
    startDate: {
      label: copy.changeStartDate,
      icon: CALENDAR_PENCIL_ICON,
      onSelect: () =>
        dispatch({ type: 'openDialog', dialog: 'startDate', ...startDateChoiceOf(formConnection) }),
    },
    deactivate: {
      label: copy.deactivate,
      icon: LINK_OFF_ICON,
      onSelect: () => dispatch({ type: 'openDialog', dialog: 'deactivate' }),
    },
    delete: {
      label: copy.delete,
      icon: DELETE_ICON,
      danger: true,
      onSelect: () => dispatch({ type: 'openDialog', dialog: 'delete' }),
    },
  };
  const menuActions: MenuAction[] = connectionMenuOf(formConnection.state).map((entry, index) => ({
    ...menuEntries[entry],
    separated: entry === 'delete' && index > 0,
  }));
  // "Change start date" is no confirmation, and reactivating has its own dialog: the confirmation
  // stays closed while either is open
  const confirmation = confirmationOf(state.dialog);
  const confirmed = confirmation === 'activate' ? null : confirmation;
  const dialog = dialogCopyOf(confirmed ?? 'deactivate', formConnection, language);
  const handleChoiceChange = (choice: ActiveFrom) => dispatch({ type: 'chooseActiveFrom', choice });
  const handleTextChange = (text: string) => dispatch({ type: 'typeStartDate', text });
  const closeDialog = () => dispatch({ type: 'closeDialog' });
  return (
    <WizardLayout
      variant="details"
      title={formConnection.name}
      badge={
        <ConnectionStatusBadge state={formConnection.state} startDate={formConnection.start_date} />
      }
      meta={formConnection.description || undefined}
      footer={<DetailFooter formConnectionId={id} onEdit={() => setEditAsked(true)} />}
      overlay={
        <>
          <ConfirmDialog
            open={state.dialogOpen && confirmed !== null}
            {...dialog}
            busy={state.running !== null}
            error={state.dialogOpen ? state.error : null}
            retryLabel={copy.retry}
            dismissOnScrim={state.dialog !== 'delete'}
            onCancel={closeDialog}
            onConfirm={() => confirmed && run(confirmed)}
          />
          <ReactivateDialog
            formConnection={formConnection}
            state={state}
            onChoiceChange={handleChoiceChange}
            onTextChange={handleTextChange}
            onCancel={closeDialog}
            onConfirm={activateAgain}
          />
          <StartDateDialog
            formConnection={formConnection}
            state={state}
            onChoiceChange={handleChoiceChange}
            onTextChange={handleTextChange}
            onCancel={closeDialog}
            onSave={saveStartDate}
          />
          <ConfirmDialog
            open={editAsked}
            title={editEntryCopy.title}
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
          tone={band.tone}
          title={band.title}
          text={band.text}
          headingRef={headingRef}
          dateLine={datePillOf(formConnection, language)}
          pillAction={
            formConnection.state === 'deactivated' && (
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
        {/* Every action on the page answers the changed connection, whose `updated_at` moved */}
        <ActivityCard
          formConnectionId={id}
          lastActivity={formConnection.last_activity}
          state={formConnection.state}
          open={openAccordion === 'activity'}
          onToggle={() => setOpenAccordion((open) => toggleAccordion(open, 'activity'))}
          reloadKey={formConnection.updated_at}
        />
      </div>
    </WizardLayout>
  );
}
