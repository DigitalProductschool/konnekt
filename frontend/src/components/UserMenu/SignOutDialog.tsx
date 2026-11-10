import { useCopy } from '../../hooks/useLanguage';
import ConfirmDialog from '../ConfirmDialog';
import { SIGN_OUT_COPY } from './constants';
import type { SignOutDialogProps } from './types';

/**
 * The warning before "Log out" discards the account's local drafts on this device (S7, W8;
 * FR-019). It gets the names from `UserMenu` and never touches the store itself.
 */
export default function SignOutDialog({ names, busy, onCancel, onConfirm }: SignOutDialogProps) {
  const copy = useCopy(SIGN_OUT_COPY);
  return (
    <ConfirmDialog
      open={names !== null}
      title={copy.title}
      text={copy.text(names ?? '')}
      confirmLabel={copy.confirm}
      cancelLabel={copy.cancel}
      danger
      busy={busy}
      busyLabel={copy.confirm}
      onCancel={busy ? () => undefined : onCancel}
      onConfirm={onConfirm}
    />
  );
}
