import ConfirmDialog from '../../components/ConfirmDialog';
import ConnectionStatusBadge from '../../components/ConnectionStatusBadge';
import WizardLayout from '../../components/WizardLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { RESTORE_COPY } from './constants';
import type { RestoreDialogProps } from './types';

/**
 * The restore question of a stored draft (S5, W4/W6; FR-016), in the wizard's frame with the
 * "Draft" badge, before the editor mounts. `ConfirmDialog`, so it has the anatomy of U17's
 * dialog (7173:52681): 480 wide, the title, the ×, the text, "Discard them" (secondary) and
 * "Restore changes" (primary); a native modal, the page behind it inert. "Discard them" is the
 * only answer that removes the local draft. Escape, the × and the scrim answer neither: the page
 * leaves for the draft's details and keeps the local draft, which is offered again the next time
 * (FR-049, F57). The header's connection name is the page's `h1`, as the screen has no title of
 * its own.
 */
export default function RestoreDialog({
  title,
  name,
  changedAt,
  onRestore,
  onDiscard,
  onEscape,
}: RestoreDialogProps) {
  useDocumentTitle(RESTORE_COPY.restoreTitle);

  return (
    <WizardLayout
      title={title}
      titleAsHeading
      badge={<ConnectionStatusBadge isActive draft />}
      footer={null}
      overlay={
        <ConfirmDialog
          open
          title={RESTORE_COPY.restoreTitle}
          text={RESTORE_COPY.restoreText(name, changedAt)}
          secondaryLabel={RESTORE_COPY.discardThem}
          onSecondary={onDiscard}
          confirmLabel={RESTORE_COPY.restore}
          onConfirm={onRestore}
          // No cancel button: the ×, Escape and the scrim open the details (F57)
          onCancel={onEscape}
        />
      }
    >
      {null}
    </WizardLayout>
  );
}
