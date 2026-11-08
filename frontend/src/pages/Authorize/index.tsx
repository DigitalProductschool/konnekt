import type { AccessLevel } from '@connection-portal/api-types/agent-access';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useMemo, useReducer } from 'react';
import { Link, useSearchParams } from 'react-router';

import { errorNoticeOf } from '../../api/client';
import { authorize, getOauthClient } from '../../api/oauth';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FeedbackLoader from '../../components/FeedbackLoader';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import ConsentForm from './ConsentForm';
import { CONSENT_COPY } from './constants';
import InvalidRequestAlert from './InvalidRequestAlert';
import type { ConsentDecision } from './types';
import {
  consentReducer,
  initialConsentState,
  isInvalidRequestError,
  isStepUp,
  preselectedLevelOf,
  requestOf,
} from './utils';

/**
 * The OAuth consent page at `/authorize` (contracts/ui-screens.md S1; FR-002). It reads the
 * agent's authorization request from the query string, which survives a sign-in because the
 * sign-in screen returns to `from.pathname + from.search`, loads the client and preselects the
 * level the request's scope asks for. "Allow" and "Deny" send the decision, and the browser
 * leaves for the redirect URI the server answers with, a URI the client registered.
 */
export default function AuthorizePage() {
  useDocumentTitle(CONSENT_COPY.pageTitle);
  const [searchParams] = useSearchParams();
  const reading = useMemo(() => requestOf(searchParams), [searchParams]);
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
          dispatch({ type: 'failed', notice: errorNoticeOf(error, CONSENT_COPY.loadFailed) });
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
        dispatch({ type: 'sendFailed', notice: errorNoticeOf(error, CONSENT_COPY.sendFailed) });
      }
    }
  }

  const clientName = state.status === 'ready' ? state.client.client_name : null;

  return (
    <>
      <PageTitle
        title={clientName === null ? CONSENT_COPY.fallbackTitle : CONSENT_COPY.title(clientName)}
        hint={clientName === null ? undefined : CONSENT_COPY.intro(clientName)}
      />

      {state.status === 'loading' && <FeedbackLoader label={CONSENT_COPY.loading} />}

      {state.status === 'invalid' && <InvalidRequestAlert message={state.message} />}

      {state.status === 'failed' && (
        <KernAlert variant="danger" title={CONSENT_COPY.loadErrorTitle} className="w-full">
          <ErrorNoticeText notice={state.notice} />
        </KernAlert>
      )}

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
          {user && (
            <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
              {CONSENT_COPY.signedInAs(user.username)} {CONSENT_COPY.changeLater}{' '}
              <Link to={ROUTES.account} className="kern-link kern-link--small">
                {CONSENT_COPY.userPage}
              </Link>
              .
            </p>
          )}
        </>
      )}
    </>
  );
}
