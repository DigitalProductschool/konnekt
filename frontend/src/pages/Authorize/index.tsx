import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import type { AccessLevel } from '@konnekt/api-types/agent-access';
import { useEffect, useMemo, useReducer, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { errorNoticeOf } from '../../api/client';
import { authorize, getOauthClient } from '../../api/oauth';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FeedbackLoader from '../../components/FeedbackLoader';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy, useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import ConsentForm from './ConsentForm';
import { ALERT_ACTIONS_CLASSES, CONSENT_CARD_CLASSES, CONSENT_COPY, SMALL_TEXT } from './constants';
import InvalidRequestAlert from './InvalidRequestAlert';
import type { ConsentDecision, LoadFailedAlertProps } from './types';
import {
  consentReducer,
  initialConsentState,
  isInvalidRequestError,
  isStepUp,
  preselectedLevelOf,
  requestOf,
} from './utils';

/**
 * The client couldn't be loaded for another reason than the request (no answer, a 5xx): the
 * design's danger alert under the card's h1 (design-notes §3 "Error state of a page"), its title
 * what failed, its body the server's message with the error ID (F22), then the way back
 */
function LoadFailedAlert({ notice }: LoadFailedAlertProps) {
  const copy = useCopy(CONSENT_COPY);
  return (
    <KernAlert variant="danger" title={copy.loadErrorTitle} className="w-full">
      <ErrorNoticeText notice={notice} />
      <span className={ALERT_ACTIONS_CLASSES}>
        <Link to={ROUTES.overview} className="kern-link">
          {copy.backToList}
        </Link>
      </span>
    </KernAlert>
  );
}

/**
 * The OAuth consent page at `/authorize` (spec 007 S1, FR-002; spec 008 S19, W16). It reads the
 * agent's authorization request from the query string, which survives a sign-in because the
 * sign-in screen returns to `from.pathname + from.search`, loads the client and preselects the
 * level the request's scope asks for. "Allow" and "Deny" send the decision, and the browser
 * leaves for the redirect URI the server answers with, a URI the client registered. Every state
 * is one card (kit P10) under the header pills: the h1 and the sentence (title/large with
 * body/default 8px under it, as the §3 card heading), then the loader, the alert of an invalid
 * request or a failed load, or the form and the footer line. A switch of the language words the
 * page anew, the reason a request can't be used included; a message from the server keeps its
 * language until the next request.
 */
export default function AuthorizePage() {
  const { language } = useLanguage();
  const copy = CONSENT_COPY[language];
  useDocumentTitle(copy.pageTitle);
  // The client loads once per request, not per language: a failure's fallback text takes the
  // language of the moment it fails
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const [searchParams] = useSearchParams();
  const reading = useMemo(() => requestOf(searchParams, language), [searchParams, language]);
  const [state, dispatch] = useReducer(consentReducer, reading, initialConsentState);
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { user } = useCurrentUser();
  const request = reading.ok ? reading.request : null;
  const clientId = request?.client_id ?? null;
  const requested = preselectedLevelOf(request?.scope);

  useEffect(() => {
    if (clientId === null) return;
    let ignore = false;
    getOauthClient(clientId).then(
      (client) => {
        if (!ignore) dispatch({ type: 'loaded', client, level: requested });
      },
      (error: unknown) => {
        if (ignore || handleUnauthorized(error)) return;
        if (isInvalidRequestError(error)) {
          dispatch({ type: 'invalid', message: error.data.message });
        } else {
          dispatch({
            type: 'failed',
            notice: errorNoticeOf(error, CONSENT_COPY[languageRef.current].loadFailed),
          });
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [clientId, requested, handleUnauthorized]);

  async function decide(decision: ConsentDecision) {
    if (state.status !== 'ready' || state.sending || state.leaving !== null || request === null) {
      return;
    }
    dispatch({ type: 'send' });
    try {
      const { redirect_to } = await authorize(
        decision === 'allow'
          ? { ...request, decision, access_level: state.level }
          : { ...request, decision }
      );
      dispatch({ type: 'sent', decision });
      window.location.assign(redirect_to);
    } catch (error) {
      if (handleUnauthorized(error)) return;
      if (isInvalidRequestError(error)) {
        dispatch({ type: 'invalid', message: error.data.message });
      } else {
        dispatch({ type: 'sendFailed', notice: errorNoticeOf(error, copy.sendFailed) });
      }
    }
  }

  const clientName = state.status === 'ready' ? state.client.client_name : null;

  return (
    <div className={CONSENT_CARD_CLASSES}>
      <div className="flex flex-col gap-8">
        <PageTitle
          size="large"
          title={clientName === null ? copy.fallbackTitle : copy.title(clientName)}
        />
        {clientName !== null && (
          <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) text-pretty break-words">
            {copy.intro(clientName)}
          </p>
        )}
      </div>

      {state.status === 'loading' && <FeedbackLoader label={copy.loading} />}

      {/* A request the page itself can't use stays so, and its reason follows the language; the
          server's reason keeps the language it came in */}
      {state.status === 'invalid' && (
        <InvalidRequestAlert message={reading.ok ? state.message : reading.message} />
      )}

      {state.status === 'failed' && <LoadFailedAlert notice={state.notice} />}

      {state.status === 'ready' && (
        <>
          <ConsentForm
            clientName={state.client.client_name}
            level={state.level}
            onLevelChange={(level: AccessLevel) => dispatch({ type: 'choose', level })}
            stepUp={isStepUp(state.client.current_access_level, requested)}
            sending={state.sending}
            leaving={state.leaving}
            error={state.error}
            onDecide={(decision) => void decide(decision)}
          />
          {/* The link inline in the sentence: without KERN's baseline paddings, so that a wrapped
              line keeps the 24px line height */}
          {user && (
            <p className={`text-kern-layout-text-muted text-pretty ${SMALL_TEXT}`}>
              {copy.signedInAs(user.username)} {copy.changeLater}{' '}
              <Link to={ROUTES.account} className="kern-link kern-link--small py-0!">
                {copy.userPage}
              </Link>
              {copy.changeLaterEnd}
            </p>
          )}
        </>
      )}
    </div>
  );
}
