import ConfirmDialog from '../../components/ConfirmDialog';
import { PUBLISH_COPY } from './constants';
import PublishSummaryRow from './PublishSummaryRow';
import type { PublishDialogProps } from './types';

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
 */
export default function PublishDialog({
  open,
  editing,
  withoutRules,
  documentLines,
  ruleLines,
  publishing,
  error,
  rulesChanged,
  onCancel,
  onClose,
  onConfirm,
  onReload,
  onReplace,
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
  return (
    <ConfirmDialog
      open={open}
      title={title}
      text={intro}
      textClassName="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
      confirmLabel={editing ? PUBLISH_COPY.save : PUBLISH_COPY.publish}
      cancelLabel={cancelLabel}
      busyLabel={editing ? PUBLISH_COPY.saving : PUBLISH_COPY.publishing}
      busy={publishing}
      error={error}
      errorTitle={errorTitle}
      retryLabel={rulesChanged ? PUBLISH_COPY.replaceTheirChanges : PUBLISH_COPY.retry}
      onCancel={rulesChanged ? onReload : onCancel}
      onClose={onClose}
      onConfirm={rulesChanged ? onReplace : onConfirm}
    >
      {/* "Dialog content/Publish · summary": a two-column table, documents then rules */}
      <dl className="rounded-kern-large flex w-full flex-col overflow-clip border border-(--kern-color-decorative-border-default)">
        <PublishSummaryRow label={PUBLISH_COPY.documents} values={documentLines} divided />
        <PublishSummaryRow label={PUBLISH_COPY.rules} values={ruleLines} />
      </dl>
    </ConfirmDialog>
  );
}
