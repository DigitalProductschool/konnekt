import type { FormEvent } from 'react';

import AccessLevelChoice from '../../components/AccessLevelChoice';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FormErrorMessage from '../../components/FormErrorMessage';
import { CONSENT_COPY } from './constants';
import type { ConsentFormProps } from './types';

/**
 * The consent form (contracts/ui-screens.md S1): the step-up line, the access levels with the
 * requested one preselected, and "Allow" and "Deny". While a decision is on its way, and once the
 * browser is leaving, both buttons are `aria-disabled` and ignore clicks. The status line under
 * them is rendered empty from the start, so that "You can go back to …" is announced after
 * "Allow".
 */
export default function ConsentForm({
  clientName,
  level,
  onLevelChange,
  stepUp,
  sending,
  leaving,
  error,
  onDecide,
}: ConsentFormProps) {
  const busy = sending || leaving !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) onDecide('allow');
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-24">
      {stepUp && (
        <p className="text-kern-static-medium text-kern-layout-text-default font-semibold">
          {CONSENT_COPY.stepUp(clientName)}
        </p>
      )}
      <AccessLevelChoice
        value={level}
        onChange={onLevelChange}
        name="consent-access-level"
        legend={CONSENT_COPY.levelLegend}
      />
      {error && <FormErrorMessage role="alert" message={<ErrorNoticeText notice={error} />} />}
      <div className="flex flex-wrap gap-16">
        <button type="submit" aria-disabled={busy} className="kern-btn kern-btn--primary">
          <span className="kern-label">{CONSENT_COPY.allow}</span>
        </button>
        <button
          type="button"
          aria-disabled={busy}
          onClick={busy ? undefined : () => onDecide('deny')}
          className="kern-btn kern-btn--secondary"
        >
          <span className="kern-label">{CONSENT_COPY.deny}</span>
        </button>
      </div>
      {/* Empty, it leaves the flow (no gap) but stays rendered, so its text is announced */}
      <p
        role="status"
        className="text-kern-static-medium text-kern-layout-text-default empty:absolute"
      >
        {leaving === 'allow' && CONSENT_COPY.goBack(clientName)}
      </p>
    </form>
  );
}
