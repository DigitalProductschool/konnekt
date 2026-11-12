import { useEffect, useRef } from 'react';

import ActiveFromChoice from '../../components/ActiveFromChoice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
import { CONNECTION_DETAIL_COPY, SUMMARY_INTRO_CLASSES } from './constants';
import DialogFailureAlert from './DialogFailureAlert';
import type { StartDateDialogProps } from './types';
import { startDateHintOf, startDateNowLabelOf } from './utils';

/**
 * "Change start date" (S15; FR-008, FR-009; U87 6396:48860 in P12 6396:48739): KERN's 480 px
 * dialog with the title, "Choose when citizens can use this connection.", "Active from" (C2),
 * "Cancel" and "Save date". A scheduled connection's opens with "On a date" and its start date,
 * and "Now" makes it active at once (W2); an active one's opens with "Now (active since <date>,
 * <time>)", and with "On a date" the hint that requests in progress are cancelled (F10). The scrim
 * closes it, as Escape, the × and "Cancel" do, except while it saves ("Saving…").
 *
 * A day that isn't after today, or the server's `400 invalid_start_date` (the day changed while
 * it was open), shows the field's error, announced, with the focus on the field (FR-003, W1). A
 * failure keeps the choice and the text and shows above the intro, as the publish dialog's (T024;
 * FR-014, F2, W8): the sentence "Couldn’t save the start date, so nothing has changed. …" only
 * when no answer came; a `5xx` the slim alert with the server's message and its error ID; any
 * other refusal "Couldn’t save the start date" with the server's message. "Try again" saves the
 * same choice again. The page keeps the state (`actionsReducer`); this only renders it.
 */
export default function StartDateDialog({
  formConnection,
  state,
  onChoiceChange,
  onTextChange,
  onCancel,
  onSave,
}: StartDateDialogProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const fieldRef = useRef<HTMLInputElement>(null);
  // The refusals whose focus has moved, so that reopening the dialog leaves the focus alone
  const focusedRefusals = useRef(state.dateRefusals);
  const open = state.dialogOpen && state.dialog === 'startDate';
  const busy = state.running === 'startDate';
  const { dateRefusals } = state;
  // Only this dialog's failure: a confirmation's stays in its own dialog
  const failed = state.dialog === 'startDate' && state.error !== null;

  // A refused date moves the focus to the field, which names its error (W1). While closed it
  // follows the count, so that a refusal in "Activate this connection again?" doesn't move the
  // focus when this one opens
  useEffect(() => {
    if (!open) {
      focusedRefusals.current = dateRefusals;
      return;
    }
    if (dateRefusals === focusedRefusals.current) {
      return;
    }
    focusedRefusals.current = dateRefusals;
    fieldRef.current?.focus();
  }, [open, dateRefusals]);

  const intro = copy.startDateText;
  return (
    <ConfirmDialog
      open={open}
      title={copy.changeStartDate}
      // After a failure the alert comes first, so the intro moves under it (as U79 6376:27178)
      text={failed ? '' : intro}
      textClassName={SUMMARY_INTRO_CLASSES}
      cancelLabel={copy.cancel}
      confirmLabel={failed ? copy.retry : copy.saveDate}
      busy={busy}
      busyLabel={copy.savingDate}
      onCancel={onCancel}
      onConfirm={onSave}
    >
      {failed && state.error && (
        <>
          <DialogFailureAlert
            notice={state.error}
            noAnswer={state.noAnswer}
            title={copy.startDateError}
            noAnswerText={copy.startDateNoAnswer}
          />
          <p className={SUMMARY_INTRO_CLASSES}>{intro}</p>
        </>
      )}
      <ActiveFromChoice
        choice={state.activeFrom}
        text={state.startDateText}
        error={state.dateError}
        errorRole="alert"
        hint={startDateHintOf(formConnection.state, state.activeFrom, language)}
        nowLabel={startDateNowLabelOf(formConnection, language)}
        disabled={busy}
        fieldRef={fieldRef}
        onChoiceChange={onChoiceChange}
        onTextChange={onTextChange}
      />
    </ConfirmDialog>
  );
}
