import { type FormEvent, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';

import { updateFormConnection } from '../../api/form-connections';
import checkCircleIcon from '../../assets/icons/check-circle.svg';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import TextField from '../../components/TextField';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import type { ErrorNotice } from '../../types/api';
import { DETAIL_COPY } from './constants';
import type { WebhookCardProps } from './types';
import { saveErrorNotice, webhookReducer } from './utils';

const SMALL_TEXT = 'text-kern-static-small leading-(--kern-typography-line-height-medium-static)';

/**
 * The webhook address (FR-014), which the design has no frame for: the card pattern of
 * "UseCase/Create card" with a KERN input. Saving an address switches new requests to
 * webhook mode, removing it back to pull mode. The result is announced.
 */
export default function WebhookCard({ formConnection, onSaved }: WebhookCardProps) {
  const [state, dispatch] = useReducer(webhookReducer, {
    value: formConnection.webhook_url ?? '',
    saving: false,
    error: null,
    announcement: '',
  });
  const handleUnauthorized = useSignOutOnUnauthorized();
  const inputRef = useRef<HTMLInputElement>(null);

  /** Shows the message next to the field and moves the focus there. */
  function refuse(error: ErrorNotice) {
    flushSync(() => dispatch({ type: 'failed', error }));
    inputRef.current?.focus();
  }

  async function save(webhookUrl: string | null) {
    dispatch({ type: 'save' });
    try {
      const updated = await updateFormConnection(formConnection.id, { webhook_url: webhookUrl });
      onSaved(updated);
      dispatch({
        type: 'saved',
        value: updated.webhook_url ?? '',
        announcement: webhookUrl === null ? DETAIL_COPY.webhookRemoved : DETAIL_COPY.webhookSaved,
      });
    } catch (error) {
      if (!handleUnauthorized(error)) {
        refuse(saveErrorNotice(error));
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.saving) {
      return;
    }
    const value = state.value.trim();
    if (!value) {
      refuse({ message: DETAIL_COPY.webhookRequired });
      return;
    }
    void save(value);
  }

  const mode = formConnection.mode;
  return (
    <section
      aria-labelledby="webhook-title"
      className="rounded-kern-large border-kern-neutral-100 bg-kern-layout-background-default border"
    >
      <div className="border-kern-neutral-100 flex flex-col gap-2 border-b px-24 pt-24 pb-20">
        <h2
          id="webhook-title"
          className="text-kern-adaptive-medium text-kern-layout-text-default font-semibold"
        >
          {DETAIL_COPY.webhookTitle}
        </h2>
        <p className={`${SMALL_TEXT} text-kern-layout-text-muted`}>{DETAIL_COPY.webhookHint}</p>
      </div>
      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-24 p-24">
        <p className={`${SMALL_TEXT} text-kern-layout-text-default`}>
          <span className="font-semibold">
            {DETAIL_COPY.mode} {DETAIL_COPY.modes[mode]}
          </span>{' '}
          – {DETAIL_COPY.modeHints[mode]}
        </p>
        <TextField
          ref={inputRef}
          id="webhook-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          label={DETAIL_COPY.webhookLabel}
          placeholder={DETAIL_COPY.webhookPlaceholder}
          value={state.value}
          maxLength={2000}
          error={state.error && <ErrorNoticeText notice={state.error} />}
          onChange={(event) => dispatch({ type: 'change', value: event.target.value })}
        />
        <div className="flex flex-wrap items-center gap-16">
          <button type="submit" aria-disabled={state.saving} className="kern-btn kern-btn--primary">
            <span className="kern-label">
              {state.saving ? DETAIL_COPY.saving : DETAIL_COPY.saveWebhook}
            </span>
          </button>
          {formConnection.webhook_url && (
            <button
              type="button"
              aria-disabled={state.saving}
              onClick={state.saving ? undefined : () => void save(null)}
              className="kern-btn kern-btn--secondary"
            >
              <span className="kern-label">{DETAIL_COPY.removeWebhook}</span>
            </button>
          )}
          <p
            role="status"
            className={`${SMALL_TEXT} text-kern-feedback-success flex items-center gap-8 font-semibold`}
          >
            {state.announcement && (
              <>
                <img src={checkCircleIcon} alt="" className="size-20" />
                {state.announcement}
              </>
            )}
          </p>
        </div>
      </form>
    </section>
  );
}
