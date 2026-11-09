import { useEffect, useId, useRef } from 'react';
import { flushSync } from 'react-dom';

import { createToken } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import AccessLevelChoice from '../../components/AccessLevelChoice';
import ConfirmDialog from '../../components/ConfirmDialog';
import TextField from '../../components/TextField';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { ACCOUNT_COPY, TOKEN_NAME_MAX_LENGTH, TOKEN_VALIDITY_DAYS } from './constants';
import type { LevelDialogProps } from './types';

/**
 * "Create token" (S20; 007-S2.12, FR-004) in T035's dialog at the kit's 600px (P12): a name, an
 * access level (T016's radios, off while it creates) and how long the token is valid, at most 90
 * days. A missing name is refused under the field (§3 "Field error"), announced, and the focus
 * goes back to it. A failure stays in the dialog, with a 5xx answer's error ID. On success the
 * "token created" dialog shows the secret once.
 */
export default function CreateTokenDialog({
  dialog,
  levels,
  busy,
  error,
  dispatch,
}: LevelDialogProps) {
  const handleUnauthorized = useSignOutOnUnauthorized();
  const nameRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const open = dialog?.type === 'createToken';

  // Each opening puts the focus on the name
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => nameRef.current?.focus());
    }
  }, [open]);

  async function create() {
    if (dialog?.type !== 'createToken' || busy) {
      return;
    }
    const { form } = dialog;
    const name = form.name.trim();
    if (name === '') {
      // Rendered first, so that the name is invalid and described when it takes the focus
      flushSync(() => dispatch({ type: 'tokenNameRefused', error: ACCOUNT_COPY.tokenNameMissing }));
      nameRef.current?.focus();
      return;
    }
    dispatch({ type: 'submitted' });
    try {
      const created = await createToken({
        name,
        access_level: form.level,
        expires_in_days: form.days,
      });
      dispatch({ type: 'tokenCreated', created });
    } catch (failure) {
      if (!handleUnauthorized(failure)) {
        dispatch({ type: 'failed', error: errorNoticeOf(failure, ACCOUNT_COPY.createFailed) });
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={ACCOUNT_COPY.createTitle}
      text={ACCOUNT_COPY.createText}
      textClassName="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
      confirmLabel={ACCOUNT_COPY.createToken}
      cancelLabel={ACCOUNT_COPY.cancel}
      busyLabel={ACCOUNT_COPY.creating}
      busy={busy}
      error={open ? error : null}
      errorTitle={ACCOUNT_COPY.createFailedTitle}
      retryLabel={ACCOUNT_COPY.retry}
      onCancel={() => dispatch({ type: 'dialogClosed' })}
      onConfirm={create}
      wide
    >
      {open && (
        <div className="flex flex-col gap-24">
          <TextField
            ref={nameRef}
            id={`${id}-name`}
            label={ACCOUNT_COPY.tokenName}
            value={dialog.form.name}
            required
            maxLength={TOKEN_NAME_MAX_LENGTH}
            autoComplete="off"
            error={dialog.form.nameError}
            errorRole="alert"
            onChange={(event) =>
              dispatch({ type: 'tokenFormChanged', changes: { name: event.target.value } })
            }
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void create();
              }
            }}
          />
          <AccessLevelChoice
            levels={levels}
            value={dialog.form.level}
            onChange={(level) => dispatch({ type: 'levelChosen', level })}
            name="token-access-level"
            legend={ACCOUNT_COPY.accessLevel}
            disabled={busy}
          />
          <div className="kern-form-input">
            <label htmlFor={`${id}-days`} className="kern-label">
              {ACCOUNT_COPY.validFor}
            </label>
            <div className="kern-form-input__select-wrapper">
              <select
                id={`${id}-days`}
                value={String(dialog.form.days)}
                onChange={(event) =>
                  dispatch({
                    type: 'tokenFormChanged',
                    changes: { days: Number(event.target.value) },
                  })
                }
                className="kern-form-input__select"
              >
                {TOKEN_VALIDITY_DAYS.map((days) => (
                  <option key={days} value={String(days)}>
                    {ACCOUNT_COPY.days(days)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialog>
  );
}
