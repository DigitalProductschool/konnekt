import { revokeAgentAccess } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { ACCOUNT_COPY } from './constants';
import type { AccountDialogProps } from './types';
import { nameOf } from './utils';

/**
 * "Revoke" (S20; 007-S2.10, S2.11, FR-006), after confirming in T035's 480px dialog with the
 * filled danger button: the agent's next call is refused and its waiting approval requests are
 * cancelled. It takes access away, so a click on the scrim doesn't close it (FR-052a, as the
 * deleting dialogs); Escape, × and "Cancel" do. On success the row goes; a failure stays in the
 * dialog, with a 5xx answer's error ID.
 */
export default function RevokeDialog({ dialog, busy, error, dispatch }: AccountDialogProps) {
  const { language } = useLanguage();
  const copy = ACCOUNT_COPY[language];
  const handleUnauthorized = useSignOutOnUnauthorized();
  const open = dialog?.type === 'revoke';

  async function revoke() {
    if (dialog?.type !== 'revoke') {
      return;
    }
    dispatch({ type: 'submitted' });
    try {
      await revokeAgentAccess(dialog.item.id);
      dispatch({ type: 'revoked', id: dialog.item.id, language });
    } catch (failure) {
      if (!handleUnauthorized(failure)) {
        dispatch({ type: 'failed', error: errorNoticeOf(failure, copy.revokeFailed) });
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={open ? copy.revokeTitle(nameOf(dialog.item, language)) : ''}
      text={copy.revokeText}
      confirmLabel={copy.revoke}
      cancelLabel={copy.cancel}
      danger
      dismissOnScrim={false}
      busyLabel={copy.revoking}
      busy={busy}
      error={open ? error : null}
      errorTitle={copy.revokeFailedTitle}
      retryLabel={copy.retry}
      onCancel={() => dispatch({ type: 'dialogClosed' })}
      onConfirm={revoke}
    />
  );
}
