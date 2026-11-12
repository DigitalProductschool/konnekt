import { useEffect, useRef } from 'react';

import ActiveFromChoice from '../../components/ActiveFromChoice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
import PublishSummaryRow from '../FormConnectionEditor/PublishSummaryRow';
import { CONNECTION_DETAIL_COPY, SUMMARY_INTRO_CLASSES, SUMMARY_TABLE_CLASSES } from './constants';
import DialogFailureAlert from './DialogFailureAlert';
import type { ReactivateDialogProps } from './types';
import { dialogCopyOf, reactivateHintOf, reactivateSummaryOf } from './utils';

/**
 * "Activate this connection again?" (S17; FR-011, W4; U89 7173:52959 in P16b 7173:52874): the
 * 600 px dialog with the intro, "Dialog content/Publish · summary" (the documents and the
 * variants' rules, FR-051 (40)) and "Active from" (C2) as the publish dialog draws it under its
 * summary (design-notes §1), "Cancel" and "Activate". "On a date" shows the date field, copy.md
 * §2's hint and "Schedule", busy "Scheduling…". The scrim closes it, as Escape, the × and
 * "Cancel" do, except while it runs.
 *
 * As "Change start date" (T026): a day that isn't after today, or the server's `400
 * invalid_start_date`, shows the field's error, announced, with the focus on the field (FR-003,
 * W1). A failure leaves the connection as it was, keeps the choice and the text and shows above
 * the intro (FR-014, F2, W8): "Couldn’t reactivate, so nothing has changed. …" only when no answer
 * came; a `5xx` the slim alert with the server's message and its error ID; any other refusal
 * "Couldn’t reactivate" with the server's message. "Try again" sends the same choice again. The
 * page keeps the state (`actionsReducer`); this only renders it.
 */
export default function ReactivateDialog({
  formConnection,
  state,
  onChoiceChange,
  onTextChange,
  onCancel,
  onConfirm,
}: ReactivateDialogProps) {
  const { language } = useLanguage();
  const copy = CONNECTION_DETAIL_COPY[language];
  const fieldRef = useRef<HTMLInputElement>(null);
  // The refusals whose focus has moved, so that reopening the dialog leaves the focus alone
  const focusedRefusals = useRef(state.dateRefusals);
  const open = state.dialogOpen && state.dialog === 'activate';
  const busy = state.running === 'activate';
  const { dateRefusals } = state;
  // Only this dialog's failure: another dialog's stays in its own
  const failed = state.dialog === 'activate' && state.error !== null;
  const dialog = dialogCopyOf('activate', formConnection, language, state.activeFrom);
  const summary = reactivateSummaryOf(formConnection, language);

  // A refused date moves the focus to the field, which names its error (W1); while closed the
  // ref follows the count, so that another dialog's refusal doesn't move it when this one opens
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

  return (
    <ConfirmDialog
      open={open}
      title={dialog.title}
      // After a failure the alert comes first, so the intro moves under it (as U79 6376:27178)
      text={failed ? '' : dialog.text}
      textClassName={SUMMARY_INTRO_CLASSES}
      cancelLabel={dialog.cancelLabel}
      confirmLabel={failed ? copy.retry : dialog.confirmLabel}
      busy={busy}
      busyLabel={dialog.busyLabel}
      wide
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      {failed && state.error && (
        <>
          <DialogFailureAlert
            notice={state.error}
            noAnswer={state.noAnswer}
            title={dialog.errorTitle}
            noAnswerText={copy.activateNoAnswer}
          />
          <p className={SUMMARY_INTRO_CLASSES}>{dialog.text}</p>
        </>
      )}
      {/* "Dialog content/Publish · summary" */}
      <dl className={SUMMARY_TABLE_CLASSES}>
        <PublishSummaryRow label={copy.documentsTitle} values={summary.documentLines} divided />
        <PublishSummaryRow label={copy.rulesTitle} values={summary.ruleLines} />
      </dl>
      <ActiveFromChoice
        choice={state.activeFrom}
        text={state.startDateText}
        error={state.dateError}
        errorRole="alert"
        hint={reactivateHintOf(state.activeFrom, language)}
        disabled={busy}
        fieldRef={fieldRef}
        onChoiceChange={onChoiceChange}
        onTextChange={onTextChange}
      />
    </ConfirmDialog>
  );
}
