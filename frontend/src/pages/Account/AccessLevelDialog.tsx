import { changeAccessLevel } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import AccessLevelChoice from '../../components/AccessLevelChoice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { ACCOUNT_COPY } from './constants';
import type { LevelDialogProps } from './types';
import { nameOf } from './utils';

/**
 * "Change access level" (S20; 007-S2.8, FR-006): T016's radios in T035's dialog at the kit's 600px
 * (P12, as the design's form dialogs), the three levels with what each allows, as on the consent
 * page, the current one selected. "Save" applies the chosen one from the agent's next call; while
 * it saves, the radios are off; a failure stays in the dialog, with a 5xx answer's error ID.
 */
export default function AccessLevelDialog({
  dialog,
  levels,
  busy,
  error,
  dispatch,
}: LevelDialogProps) {
  const handleUnauthorized = useSignOutOnUnauthorized();
  const open = dialog?.type === 'level';

  async function save() {
    if (dialog?.type !== 'level') {
      return;
    }
    dispatch({ type: 'submitted' });
    try {
      const item = await changeAccessLevel(dialog.item.id, { access_level: dialog.level });
      dispatch({ type: 'levelChanged', item });
    } catch (failure) {
      if (!handleUnauthorized(failure)) {
        dispatch({ type: 'failed', error: errorNoticeOf(failure, ACCOUNT_COPY.levelFailed) });
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={open ? ACCOUNT_COPY.levelTitle(nameOf(dialog.item)) : ''}
      text=""
      confirmLabel={ACCOUNT_COPY.save}
      cancelLabel={ACCOUNT_COPY.cancel}
      busyLabel={ACCOUNT_COPY.saving}
      busy={busy}
      error={open ? error : null}
      errorTitle={ACCOUNT_COPY.levelFailedTitle}
      retryLabel={ACCOUNT_COPY.retry}
      onCancel={() => dispatch({ type: 'dialogClosed' })}
      onConfirm={save}
      wide
    >
      {open && (
        <AccessLevelChoice
          levels={levels}
          value={dialog.level}
          onChange={(level) => dispatch({ type: 'levelChosen', level })}
          name="agent-access-level"
          legend={ACCOUNT_COPY.accessLevel}
          disabled={busy}
        />
      )}
    </ConfirmDialog>
  );
}
