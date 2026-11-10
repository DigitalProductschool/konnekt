import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { type SyntheticEvent, useEffect, useLayoutEffect, useRef } from 'react';

import ConfirmDialog from '../../components/ConfirmDialog';
import type { ConfirmDialogProps } from '../../components/ConfirmDialog/types';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FeedbackLoader from '../../components/FeedbackLoader';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { DRAFT_COPY, PUBLISH_DIALOG_COPY, PUBLISH_STATUS_DIALOG_CLASSES } from './constants';
import PublishFindingLine from './PublishFindingLine';
import PublishSummaryRow from './PublishSummaryRow';
import type {
  FindingLine,
  PublishConflict,
  PublishDialogProps,
  PublishDialogState,
  PublishFailure,
  PublishStatusDialogProps,
} from './types';
import { findingLinesOf, warningsFirst } from './utils';

/** The intro's look in the summary (U73 6374:25448: body/default, muted) */
const INTRO_CLASSES =
  'text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)';

/**
 * S14, the publish and save dialog (Figma U73 7058:62120 from the test step, U75 6376:25536
 * Standard only, U77 6760:47979 warnings per variant, U63 7112:48859 after renaming Standard, U78
 * 6376:26326 / 6376:26662 publishing and published, U79 6376:26984 couldn't publish; kit P12
 * Dialog): the last step before publishing, or before saving an edited connection (W7). It
 * renders by its own state's phase (`PublishDialogState`, `publishDialogReducer()` in the editor):
 *
 * - `summary`: "Ready to publish?" ("Save changes?"), the intro, "Dialog content/Publish ·
 *   summary" with the counts per document and per variant (FR-044b), the findings lines warnings
 *   first (FR-044c), then "Back to test" and "Publish connection". No "Active from" (F1).
 *   "Back to test" closes the dialog to the test step that opened it (FR-044a); opened from
 *   another step, the cancel button keeps the baseline's "Check rules again". Findings never
 *   disable "Publish connection" nor ask anything more (spec 003, US4-AS5).
 * - `noRules`: from "Publish without rules" on the rules step (or the edit flow's "Save"), while no
 *   variant has rules, "Publish without rules?"
 *   (002-S5.6) with "Add rules", which goes on to the rules.
 * - `publishing` and `published`: the small status dialog in place of the summary (U78
 *   "Dialog/Status"): "Publishing… This takes a few seconds." with the 56 px loader, no buttons, no
 *   ×, and neither Escape nor the scrim close it (FR-051 (41)); then "Published" with the success
 *   tick and "Opening your connection page…" until the editor opens the details 0.5 s later.
 * - `failed`: the summary again, under the danger alert "Couldn't publish, so nothing has
 *   changed. Check your internet connection and try again." with the error ID of a `5xx` (F46,
 *   FR-008), or "Couldn't publish" with the server's message for any other refusal; "Try again"
 *   publishes again, and the cancel button and the × close it as from the summary.
 * - `conflict`: U90's dialog anatomy (480 wide, the title, the message, the buttons; W3, W7):
 *   after `409 rules_changed` "Reload" or "Replace their changes" (W9); after a stored draft's
 *   conflict its title, message and hint with "Cancel" and the answers of spec 005, S2.
 *
 * The summary, the failure and the conflict are one native modal dialog (`ConfirmDialog`), the
 * status another; the one closes before the other opens, so that the focus moves from the
 * footer's "Publish" into the one shown and comes back to it when the dialog closes.
 *
 * Its words, the findings' lines and the deleted draft's text are in the language of the moment,
 * so a switch while it is open words it anew (spec 009, FR-003); the server's messages keep the
 * language they came in, and the variants' names are content.
 */
export default function PublishDialog({
  dialog,
  editing,
  documentLines,
  ruleLines,
  branches,
  checks,
  busy,
  onCancel,
  onClose,
  onConfirm,
  onReload,
  onReplace,
  onOpenConnection,
  onSaveAsNew,
}: PublishDialogProps) {
  const { language } = useLanguage();
  const copy = PUBLISH_DIALOG_COPY[language];
  const draftCopy = DRAFT_COPY[language];
  const open =
    dialog.phase === 'summary' ||
    dialog.phase === 'noRules' ||
    dialog.phase === 'failed' ||
    dialog.phase === 'conflict';
  // What shows is what the last attempt met, also while the dialog closes or publishes again, so
  // that its words don't change while it fades out (the reducer keeps them until the next one)
  const { conflict, failure } = dialog;
  const view: DialogView = conflict
    ? conflictViewOf(
        conflict,
        { onClose, onReload, onReplace, onOpenConnection, onSaveAsNew },
        copy,
        draftCopy
      )
    : {
        wide: true,
        title: titleOf(dialog, editing, copy),
        // After a failure the alert comes first, so the intro moves under it (U79 6376:27178)
        text: failure ? '' : introOf(dialog, editing, copy),
        textClassName: INTRO_CLASSES,
        cancelLabel: cancelLabelOf(dialog, copy),
        onCancel,
        confirmLabel: failure ? copy.retry : editing ? copy.save : copy.publish,
        onConfirm,
        children: (
          <>
            {failure && (
              <>
                <PublishFailureAlert failure={failure} editing={editing} />
                <p className={INTRO_CLASSES}>{introOf(dialog, editing, copy)}</p>
              </>
            )}
            <PublishSummary
              documentLines={documentLines}
              ruleLines={ruleLines}
              // Publishing without rules has no rules to have findings
              findingLines={
                dialog.withoutRules ? [] : warningsFirst(findingLinesOf(branches, checks, language))
              }
            />
          </>
        ),
      };
  return (
    <>
      {/* One dialog for the summary, the failure and the conflict: it stays open from one to the
          other, as when "Save as new draft" fails */}
      <ConfirmDialog
        {...view}
        open={open}
        busy={busy}
        busyLabel={draftCopy.saving}
        dismissOnScrim={false}
        onClose={onClose}
      />
      <PublishStatusDialog phase={dialog.phase} editing={editing} />
    </>
  );
}

/** What the dialog shows besides its state: one of the summary's, the failure's or a conflict's */
type DialogView = Pick<
  ConfirmDialogProps,
  | 'wide'
  | 'title'
  | 'text'
  | 'textClassName'
  | 'children'
  | 'cancelLabel'
  | 'onCancel'
  | 'secondaryLabel'
  | 'onSecondary'
  | 'confirmLabel'
  | 'onConfirm'
>;

/** The dialog's copy in one language: a column of `PUBLISH_DIALOG_COPY` */
type PublishCopy = (typeof PUBLISH_DIALOG_COPY)['en'];

/** The conflicts' copy in one language: a column of `DRAFT_COPY` */
type DraftCopy = (typeof DRAFT_COPY)['en'];

function titleOf(dialog: PublishDialogState, editing: boolean, copy: PublishCopy): string {
  if (dialog.withoutRules) {
    return editing ? copy.saveWithoutRulesTitle : copy.publishWithoutRulesTitle;
  }
  return editing ? copy.saveTitle : copy.publishTitle;
}

function introOf(dialog: PublishDialogState, editing: boolean, copy: PublishCopy): string {
  if (dialog.withoutRules) {
    return copy.withoutRulesIntro;
  }
  return editing ? copy.saveIntro : copy.publishIntro;
}

function cancelLabelOf(dialog: PublishDialogState, copy: PublishCopy): string {
  if (dialog.withoutRules) {
    return copy.addRules;
  }
  return dialog.from === 'test' ? copy.backToTest : copy.checkRulesAgain;
}

/** "Dialog content/Publish · summary" (a two-column table, documents then rules), then findings */
function PublishSummary({
  documentLines,
  ruleLines,
  findingLines,
}: {
  documentLines: string[];
  ruleLines: string[];
  findingLines: FindingLine[];
}) {
  const copy = useCopy(PUBLISH_DIALOG_COPY);
  return (
    <>
      <dl className="rounded-kern-default flex w-full flex-col overflow-clip border border-(--kern-color-decorative-border-default)">
        <PublishSummaryRow label={copy.documents} values={documentLines} divided />
        <PublishSummaryRow label={copy.rules} values={ruleLines} />
      </dl>
      {findingLines.length > 0 && (
        // "Rule findings" (6760:47353): 4 between the lines
        <ul className="flex w-full flex-col gap-4">
          {findingLines.map((line) => (
            <PublishFindingLine key={line.key} line={line} />
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The failure's alert ("Dialog content/Publish · failed", U79 6376:27178: KERN's danger alert):
 * the design's sentence as the slim alert's title, with the error ID of a `5xx` as its body
 * (F46; the §3 "Alert, page level" pattern keeps the body for it); any other refusal under
 * "Couldn't publish" with the server's message, which says what went wrong (002-S5.3, FR-008)
 */
function PublishFailureAlert({ failure, editing }: { failure: PublishFailure; editing: boolean }) {
  const copy = useCopy(PUBLISH_DIALOG_COPY);
  if (failure.kind === 'general') {
    return (
      <KernAlert
        variant="danger"
        title={editing ? copy.saveFailed : copy.publishFailed}
        className="w-full"
      >
        {failure.errorId && <ErrorNoticeText notice={{ message: '', error_id: failure.errorId }} />}
      </KernAlert>
    );
  }
  return (
    <KernAlert
      variant="danger"
      title={editing ? copy.saveErrorTitle : copy.publishErrorTitle}
      className="w-full"
    >
      <ErrorNoticeText notice={failure.notice} />
    </KernAlert>
  );
}

interface ConflictHandlers {
  onClose: () => void;
  onReload: () => void;
  onReplace: () => void;
  onOpenConnection: () => void;
  onSaveAsNew: () => void;
}

/**
 * The conflict in U90's dialog anatomy (6417:31453, 480 wide; W3, W7), as the conflict dialog
 * after "Save and exit" (`DraftConflictDialog`): its title, the server's message, the hint, and
 * its answers. After `rules_changed` "Reload" and "Replace their changes" (W9); after a draft's
 * conflict "Cancel" and spec 005's answers, "Reload" turning the cancel button tertiary beside
 * "Replace their changes". While "Save as new draft" runs (`busy`) it reads "Saving…".
 */
function conflictViewOf(
  conflict: PublishConflict,
  handlers: ConflictHandlers,
  copy: PublishCopy,
  draftCopy: DraftCopy
): DialogView {
  const hint = (text: string) => <p className="kern-body kern-body--large">{text}</p>;
  switch (conflict.kind) {
    case 'rules_changed':
      return {
        title: copy.rulesChangedTitle,
        text: conflict.message,
        children: hint(copy.rulesChangedHint),
        cancelLabel: copy.reload,
        onCancel: handlers.onReload,
        confirmLabel: copy.replaceTheirChanges,
        onConfirm: handlers.onReplace,
      };
    case 'draft_changed':
      return {
        title: draftCopy.draftChangedTitle,
        text: conflict.message,
        children: hint(draftCopy.draftChangedHint),
        cancelLabel: draftCopy.cancel,
        onCancel: handlers.onClose,
        secondaryLabel: draftCopy.reload,
        onSecondary: handlers.onReload,
        confirmLabel: draftCopy.replaceTheirChanges,
        onConfirm: handlers.onReplace,
      };
    case 'draft_published':
      return {
        title: draftCopy.draftPublishedTitle,
        text: conflict.message,
        children: hint(draftCopy.draftPublishedHint),
        cancelLabel: draftCopy.cancel,
        onCancel: handlers.onClose,
        confirmLabel: draftCopy.openConnection,
        onConfirm: handlers.onOpenConnection,
      };
    case 'draft_deleted':
      // Its message is the deleted text, the website's own: in the language of the moment
      return {
        title: draftCopy.draftDeletedTitle,
        text: draftCopy.draftDeletedText,
        cancelLabel: draftCopy.cancel,
        onCancel: handlers.onClose,
        confirmLabel: draftCopy.saveAsNewDraft,
        onConfirm: handlers.onSaveAsNew,
      };
  }
}

/**
 * "Dialog/Status" (U78 6387:65280 publishing, 6387:65289 published; 400 × 232, the same size for
 * both): a native modal dialog without title bar, ×, or buttons. Publishing: `FeedbackLoader`'s
 * 56 px loader with "Publishing…" ("Saving…") and the muted "This takes a few seconds."; published:
 * the success tick ("Icon/Success tick 56": a 3 px success ring on the light success fill, the
 * check 28 px), "Published" ("Saved") and "Opening your connection page…", announced by the
 * polite status that holds both states (T095).
 * Nothing closes it (FR-051 (41)): Escape is ignored, the scrim does nothing, and if the browser
 * closes it anyway (Chrome closes a modal dialog on a second Escape without user activation), it
 * opens again. It closes before the summary opens and opens after the summary closed, so the
 * focus moves from one to the other without a stop on the page (layout and passive effects).
 */
function PublishStatusDialog({ phase, editing }: PublishStatusDialogProps) {
  const copy = useCopy(PUBLISH_DIALOG_COPY);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = phase === 'publishing' || phase === 'published';
  const published = phase === 'published';

  // Closing first, in a layout effect: before the summary's dialog opens after a failure
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Opening last, in a passive effect after the summary's own: once it has closed
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && open && !dialog.open) {
      dialog.showModal();
    }
  }, [open]);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
  }

  function handleClose() {
    const dialog = dialogRef.current;
    if (dialog && open && !dialog.open) {
      dialog.showModal();
    }
  }

  const title = published
    ? editing
      ? copy.saved
      : copy.published
    : editing
      ? copy.saving
      : copy.publishing;
  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      // Nothing in it takes the focus: the dialog itself holds it
      tabIndex={-1}
      onCancel={handleCancel}
      onClose={handleClose}
      className={PUBLISH_STATUS_DIALOG_CLASSES}
    >
      {/* One polite status for both states: it stays in the dialog while "Publishing…" turns into
          "Published", so that the new text is announced as a change (a status that is inserted
          with its text may stay silent). FeedbackLoader's own status inside it never changes */}
      <div
        role="status"
        className="flex min-h-232 flex-col items-center justify-center gap-16 px-32 py-40 text-center"
      >
        {published ? (
          // The same column as FeedbackLoader's
          <div className="flex flex-col items-center gap-16">
            <span className="border-kern-feedback-success bg-kern-feedback-success-background rounded-kern-circle flex size-56 items-center justify-center border-3">
              <span
                aria-hidden="true"
                className="kern-icon kern-icon--check bg-kern-feedback-success! size-28!"
              />
            </span>
            <p className="text-kern-adaptive-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-adaptive) font-semibold">
              {title}
            </p>
            <p className={INTRO_CLASSES}>{copy.openingConnection}</p>
          </div>
        ) : (
          <>
            <FeedbackLoader label={title} />
            <p className={INTRO_CLASSES}>{copy.statusWait}</p>
          </>
        )}
      </div>
    </dialog>
  );
}
