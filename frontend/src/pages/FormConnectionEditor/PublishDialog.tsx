import ConfirmDialog from '../../components/ConfirmDialog';
import { DRAFT_COPY, PUBLISH_COPY } from './constants';
import PublishFindingLine from './PublishFindingLine';
import PublishSummaryRow from './PublishSummaryRow';
import type { DraftConflict, PublishDialogProps } from './types';
import { findingLinesOf } from './utils';

/**
 * Figma "Dialog: Ready to publish?" (U33 6376:25536; S5): the last check before publishing, or
 * before saving an edited connection (W7), with a summary of the documents and of each
 * branch's rules. From the documents step, while no branch has rules, it asks "Publish without
 * rules?" (U36 6376:27630), and its secondary action goes on to the rules. No go-live choice
 * (F22) and no warnings line (F21): problems refuse publishing beforehand (F11). While the
 * connection is being saved it can't be closed. If that fails, it stays open with the API's
 * message and offers "Try again", and nothing has changed (U35 6376:27178; F23). If another team
 * member saved the rules meanwhile, the same alert says so, and the dialog offers "Reload" or
 * "Replace their changes" instead (W9, FR-028).
 *
 * Spec 003 (S5; A8, W10; FR-016, FR-017, FR-019): below the summary, where spec 002's warnings
 * line would be (research R11), one line per branch with findings, in tab order. "Check rules
 * again" then leads back to them. Without findings nothing is added (US4-AS4), and findings never
 * disable "Publish" or "Save" nor ask anything more (US4-AS5).
 *
 * Spec 005 (S2, W4; FR-022 to FR-024): if publishing a draft met another team member's save, the
 * same alert shows the conflict's title, message and hint, and its buttons replace "Publish". A
 * conflict wins over a stale `error` or `rulesChanged`; without one, nothing changes (FR-026).
 */
export default function PublishDialog({
  open,
  editing,
  withoutRules,
  documentLines,
  ruleLines,
  branches,
  checks,
  publishing,
  error,
  rulesChanged,
  onCancel,
  onClose,
  onConfirm,
  onReload,
  onReplace,
  conflict,
  onOpenConnection,
  onSaveAsNew,
}: PublishDialogProps) {
  const title = withoutRules
    ? editing
      ? PUBLISH_COPY.saveWithoutRulesTitle
      : PUBLISH_COPY.publishWithoutRulesTitle
    : editing
      ? PUBLISH_COPY.saveTitle
      : PUBLISH_COPY.publishTitle;
  const intro = withoutRules
    ? PUBLISH_COPY.withoutRulesIntro
    : editing
      ? PUBLISH_COPY.saveIntro
      : PUBLISH_COPY.publishIntro;
  const errorTitle = rulesChanged
    ? PUBLISH_COPY.rulesChangedTitle
    : editing
      ? PUBLISH_COPY.saveErrorTitle
      : PUBLISH_COPY.publishErrorTitle;
  const cancelLabel = rulesChanged
    ? PUBLISH_COPY.reload
    : withoutRules
      ? PUBLISH_COPY.addRules
      : PUBLISH_COPY.checkRulesAgain;
  // Publishing without rules has no rules to have findings
  const findingLines = withoutRules ? [] : findingLinesOf(branches, checks);
  const actions = conflict
    ? conflictActionsOf(conflict, { onReload, onReplace, onOpenConnection, onSaveAsNew })
    : null;
  return (
    <ConfirmDialog
      open={open}
      title={title}
      text={intro}
      textClassName="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
      confirmLabel={editing ? PUBLISH_COPY.save : PUBLISH_COPY.publish}
      cancelLabel={actions ? DRAFT_COPY.cancel : cancelLabel}
      busyLabel={
        // "Save as new draft" saves a draft and publishes nothing (S0's "Saving…")
        conflict?.kind === 'draft_deleted'
          ? DRAFT_COPY.saving
          : editing
            ? PUBLISH_COPY.saving
            : PUBLISH_COPY.publishing
      }
      busy={publishing}
      error={actions ? { message: actions.message } : error}
      errorTitle={actions ? actions.title : errorTitle}
      retryLabel={
        actions
          ? actions.confirmLabel
          : rulesChanged
            ? PUBLISH_COPY.replaceTheirChanges
            : PUBLISH_COPY.retry
      }
      secondaryLabel={actions?.secondary?.label}
      onSecondary={actions?.secondary?.onClick}
      onCancel={actions ? onClose : rulesChanged ? onReload : onCancel}
      onClose={onClose}
      dismissOnScrim={false}
      onConfirm={actions ? actions.onConfirm : rulesChanged ? onReplace : onConfirm}
    >
      {/* "Dialog content/Publish · summary": a two-column table, documents then rules */}
      <dl className="rounded-kern-large flex w-full flex-col overflow-clip border border-(--kern-color-decorative-border-default)">
        <PublishSummaryRow label={PUBLISH_COPY.documents} values={documentLines} divided />
        <PublishSummaryRow label={PUBLISH_COPY.rules} values={ruleLines} />
      </dl>
      {findingLines.length > 0 && (
        <ul className="flex w-full flex-col gap-8">
          {findingLines.map((line) => (
            <PublishFindingLine key={line.key} line={line} />
          ))}
        </ul>
      )}
    </ConfirmDialog>
  );
}

interface ConflictHandlers {
  onReload: () => void;
  onReplace: () => void;
  onOpenConnection: () => void;
  onSaveAsNew: () => void;
}

interface ConflictActions {
  title: string;
  /** The conflict's message, then its hint (S2) */
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** "Reload", only in `draft_changed` */
  secondary?: { label: string; onClick: () => void };
}

/**
 * The alert and the buttons of a draft conflict (S2): "Cancel" closes the dialog, and in
 * `draft_changed` it turns tertiary beside "Reload"
 */
function conflictActionsOf(conflict: DraftConflict, handlers: ConflictHandlers): ConflictActions {
  switch (conflict.kind) {
    case 'draft_changed':
      return {
        title: DRAFT_COPY.draftChangedTitle,
        message: `${conflict.message} ${DRAFT_COPY.draftChangedHint}`,
        confirmLabel: DRAFT_COPY.replaceTheirChanges,
        onConfirm: handlers.onReplace,
        secondary: { label: DRAFT_COPY.reload, onClick: handlers.onReload },
      };
    case 'draft_published':
      return {
        title: DRAFT_COPY.draftPublishedTitle,
        message: `${conflict.message} ${DRAFT_COPY.draftPublishedHint}`,
        confirmLabel: DRAFT_COPY.openConnection,
        onConfirm: handlers.onOpenConnection,
      };
    case 'draft_deleted':
      // Its message already is the deleted text
      return {
        title: DRAFT_COPY.draftDeletedTitle,
        message: conflict.message,
        confirmLabel: DRAFT_COPY.saveAsNewDraft,
        onConfirm: handlers.onSaveAsNew,
      };
  }
}
