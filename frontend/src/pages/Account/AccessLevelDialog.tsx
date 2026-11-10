import { changeAccessLevel } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import AccessLevelChoice from '../../components/AccessLevelChoice';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useLanguage } from '../../hooks/useLanguage';
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
  const { language } = useLanguage();
  const copy = ACCOUNT_COPY[language];
  const handleUnauthorized = useSignOutOnUnauthorized();
  const open = dialog?.type === 'level';

  async function save() {
    if (dialog?.type !== 'level') {
      return;
    }
    dispatch({ type: 'submitted' });
    try {
      const item = await changeAccessLevel(dialog.item.id, { access_level: dialog.level });
      dispatch({ type: 'levelChanged', item, language });
    } catch (failure) {
      if (!handleUnauthorized(failure)) {
        dispatch({ type: 'failed', error: errorNoticeOf(failure, copy.levelFailed) });
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={open ? copy.levelTitle(nameOf(dialog.item, language)) : ''}
      text=""
      confirmLabel={copy.save}
      cancelLabel={copy.cancel}
      busyLabel={copy.saving}
      busy={busy}
      error={open ? error : null}
      errorTitle={copy.levelFailedTitle}
      retryLabel={copy.retry}
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
          legend={copy.accessLevel}
          disabled={busy}
        />
      )}
    </ConfirmDialog>
  );
}
