import { revokeAgentAccess } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { ACCOUNT_COPY } from './constants';
import type { AccountDialogProps } from './types';
import { nameOf } from './utils';

/**
 * "Revoke" (S2; FR-006), after confirming: the agent's next call is refused and its waiting
 * approval requests are cancelled. On success the row goes; a failure stays in the dialog.
 */
export default function RevokeDialog({ dialog, busy, error, dispatch }: AccountDialogProps) {
  const handleUnauthorized = useSignOutOnUnauthorized();
  const open = dialog?.type === 'revoke';

  async function revoke() {
    if (dialog?.type !== 'revoke') {
      return;
    }
    dispatch({ type: 'submitted' });
    try {
      await revokeAgentAccess(dialog.item.id);
      dispatch({ type: 'revoked', id: dialog.item.id });
    } catch (failure) {
      if (!handleUnauthorized(failure)) {
        dispatch({ type: 'failed', error: errorNoticeOf(failure, ACCOUNT_COPY.revokeFailed) });
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={open ? ACCOUNT_COPY.revokeTitle(nameOf(dialog.item)) : ''}
      text={ACCOUNT_COPY.revokeText}
      confirmLabel={ACCOUNT_COPY.revoke}
      cancelLabel={ACCOUNT_COPY.cancel}
      danger
      busyLabel={ACCOUNT_COPY.revoking}
      busy={busy}
      error={open ? error : null}
      errorTitle={ACCOUNT_COPY.revokeFailedTitle}
      retryLabel={ACCOUNT_COPY.retry}
      onCancel={() => dispatch({ type: 'dialogClosed' })}
      onConfirm={revoke}
    />
  );
}
