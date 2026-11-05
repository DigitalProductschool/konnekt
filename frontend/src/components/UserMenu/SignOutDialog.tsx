import ConfirmDialog from '../ConfirmDialog';
import { SIGN_OUT_COPY } from './constants';
import type { SignOutDialogProps } from './types';

/**
 * The warning before "Log out" discards the account's local drafts on this device (S7, W8;
 * FR-019). It gets the names from `UserMenu` and never touches the store itself.
 */
export default function SignOutDialog({ names, busy, onCancel, onConfirm }: SignOutDialogProps) {
  return (
    <ConfirmDialog
      open={names !== null}
      title={SIGN_OUT_COPY.title}
      text={SIGN_OUT_COPY.text(names ?? '')}
      confirmLabel={SIGN_OUT_COPY.confirm}
      cancelLabel={SIGN_OUT_COPY.cancel}
      danger
      busy={busy}
      busyLabel={SIGN_OUT_COPY.confirm}
      onCancel={busy ? () => undefined : onCancel}
      onConfirm={onConfirm}
    />
  );
}
