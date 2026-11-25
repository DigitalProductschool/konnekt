import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import type { FormEvent } from 'react';

import AccessLevelChoice from '../../components/AccessLevelChoice';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import { useCopy } from '../../hooks/useLanguage';
import { CONSENT_COPY, DECISION_ACTIONS_CLASSES, SMALL_TEXT } from './constants';
import type { ConsentFormProps } from './types';

/**
 * The consent form (spec 007 S1, spec 008 S19): the step-up line as the info strip (design-notes
 * §3 "Info strip"), the access levels on the kit's radios with the page's preselection checked
 * ("Read only" for a first connection, else the requested level), a failure to send in the
 * design's danger alert with the server's message and its error ID (F22), and "Deny" and "Allow"
 * as the kit's dialog actions. While a decision is on its way, and
 * once the browser is leaving, both buttons are `aria-disabled` and ignore clicks. The levels stay
 * enabled (the reducer keeps the level once the browser is leaving): disabled radios would drop
 * the focus of a decision sent with Enter from a radio, and the page can stay while an app's own
 * redirect scheme opens the agent. The status line under the buttons is rendered empty from the
 * start, so that "You can go back to …" is announced after "Allow".
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
  const copy = useCopy(CONSENT_COPY);
  const busy = sending || leaving !== null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!busy) onDecide('allow');
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-24">
      {stepUp && (
        <p
          className={`rounded-kern-default bg-kern-feedback-info-background text-kern-layout-text-default flex items-start gap-8 px-16 py-8 ${SMALL_TEXT}`}
        >
          <span
            aria-hidden="true"
            className="kern-icon kern-icon--info kern-icon--small bg-kern-feedback-info! mt-2 shrink-0"
          />
          {copy.stepUp(clientName)}
        </p>
      )}
      <AccessLevelChoice
        value={level}
        onChange={onLevelChange}
        name="consent-access-level"
        legend={copy.levelLegend}
      />
      {error && (
        <KernAlert variant="danger" title={copy.sendErrorTitle} className="w-full">
          <ErrorNoticeText notice={error} />
        </KernAlert>
      )}
      {/* The container the actions' layout follows: the card's inner width */}
      <div className="@container">
        <div className={DECISION_ACTIONS_CLASSES}>
          <button
            type="button"
            aria-disabled={busy}
            onClick={busy ? undefined : () => onDecide('deny')}
            className="kern-btn kern-btn--secondary"
          >
            <span className="kern-label">{copy.deny}</span>
          </button>
          <button type="submit" aria-disabled={busy} className="kern-btn kern-btn--primary">
            <span className="kern-label">{copy.allow}</span>
          </button>
        </div>
      </div>
      {/* Empty, it leaves the flow (no gap) but stays rendered, so its text is announced */}
      <p
        role="status"
        className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) empty:absolute"
      >
        {leaving === 'allow' && copy.goBack(clientName)}
      </p>
    </form>
  );
}
