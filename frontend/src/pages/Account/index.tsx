import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import type { AgentAccessItem } from '@konnekt/api-types/agent-access';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router';

import { listAgentAccess } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FeedbackLoader from '../../components/FeedbackLoader';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import { ROUTES } from '../../constants';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import AccessLevelDialog from './AccessLevelDialog';
import AgentAccessList from './AgentAccessList';
import { ACCOUNT_COPY, INITIAL_ACCOUNT_STATE, MCP_GUIDE_URL } from './constants';
import CreateTokenDialog from './CreateTokenDialog';
import RevokeDialog from './RevokeDialog';
import TokenCreatedDialog from './TokenCreatedDialog';
import type { AccountViewProps } from './types';
import { accountReducer } from './utils';

/**
 * The account page (S20; 007-S2, FR-004, FR-006; W16): the signed-in team member's agent
 * connections and personal access tokens, and only theirs, each with its access level and dates,
 * to change the level of or revoke. Tokens are created here and shown once. When a dialog
 * closes, the focus goes back to the control that opened it, as in `UserMenu`, or, when its row
 * is gone, to the page's heading. If the list can't be loaded, the page shows §3's "Error state
 * of a page", whose "Try again" loads it anew. A switch of the language, once the list is there,
 * asks the server again for the access levels' names and descriptions, which it words in the
 * request's language (spec 009, R6): the rows and an open dialog keep the earlier words until
 * the answer is there, and a failure of that request keeps them.
 */
function AccountView({ onRetry, retried }: AccountViewProps) {
  const { language } = useLanguage();
  const copy = ACCOUNT_COPY[language];
  useDocumentTitle(copy.title);
  const { user } = useCurrentUser();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const [state, dispatch] = useReducer(accountReducer, INITIAL_ACCOUNT_STATE);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  // The ⋯ button or "Create token" that opened the dialog; focused again once it has closed
  const returnFocus = useRef<HTMLElement | null>(null);
  // Where the first load is: once the list is there, a switch of the language loads the levels'
  // words again; after a failure only "Try again" loads
  const loadPhase = useRef<'loading' | 'loaded' | 'failed'>('loading');

  useEffect(() => {
    if (loadPhase.current === 'failed') {
      return;
    }
    let ignore = false;
    const refresh = loadPhase.current === 'loaded';
    listAgentAccess().then(
      (list) => {
        if (ignore) return;
        if (refresh) {
          dispatch({ type: 'levelsLoaded', levels: list.levels });
          return;
        }
        loadPhase.current = 'loaded';
        dispatch({ type: 'loaded', list, now: new Date() });
      },
      (error: unknown) => {
        if (ignore || handleUnauthorized(error) || refresh) return;
        loadPhase.current = 'failed';
        dispatch({
          type: 'loadFailed',
          error: errorNoticeOf(error, ACCOUNT_COPY[language].loadFailed),
        });
      }
    );
    return () => {
      ignore = true;
    };
  }, [handleUnauthorized, language]);

  // "Try again" went with the loader: once the new attempt is done, the heading takes the focus
  useEffect(() => {
    if (retried && state.status !== 'loading') {
      titleRef.current?.focus();
    }
  }, [retried, state.status]);

  // Runs after ConfirmDialog's effect has closed the native dialog, so the focus stays here
  useEffect(() => {
    if (state.dialog === null && returnFocus.current) {
      const target = returnFocus.current;
      returnFocus.current = null;
      (target.isConnected ? target : titleRef.current)?.focus();
    }
  }, [state.dialog]);

  const dismissToast = useCallback(() => dispatch({ type: 'toastDismissed' }), []);
  const closeDialog = useCallback(() => dispatch({ type: 'dialogClosed' }), []);

  // ActionMenu gives the focus back to its ⋯ before it runs the action
  function changeLevel(item: AgentAccessItem) {
    returnFocus.current = document.activeElement as HTMLElement | null;
    dispatch({ type: 'levelDialogOpened', item });
  }

  function revoke(item: AgentAccessItem) {
    returnFocus.current = document.activeElement as HTMLElement | null;
    dispatch({ type: 'revokeDialogOpened', item });
  }

  function openCreateToken() {
    returnFocus.current = createButtonRef.current;
    dispatch({ type: 'createDialogOpened' });
  }

  if (state.status === 'loading') {
    return <FeedbackLoader label={copy.loading} />;
  }

  const dialogProps = {
    dialog: state.dialog,
    busy: state.busy,
    error: state.error,
    dispatch,
  };
  return (
    <>
      <PageTitle
        ref={titleRef}
        size="x-large"
        title={copy.title}
        hint={user ? copy.signedInAs(user.username) : undefined}
      />

      {state.status === 'failed' && (
        <KernAlert variant="danger" title={copy.loadFailedTitle} className="w-full">
          {state.loadError && <ErrorNoticeText notice={state.loadError} />}
          <span
            className={`flex flex-wrap items-center gap-x-24 gap-y-8 ${state.loadError ? 'mt-10' : ''}`}
          >
            <button
              type="button"
              onClick={onRetry}
              className="kern-btn kern-btn--secondary kern-btn--small"
            >
              <span className="kern-label">{copy.retry}</span>
            </button>
            <Link to={ROUTES.overview} className="kern-link">
              {copy.backToList}
            </Link>
          </span>
        </KernAlert>
      )}

      {state.status === 'loaded' && state.now && (
        <div className="mt-16 flex flex-col gap-40">
          <AgentAccessList
            heading={copy.agentsHeading}
            empty={
              <>
                {copy.agentsEmpty}{' '}
                <a href={MCP_GUIDE_URL} className="kern-link">
                  {copy.agentsEmptyLink}
                </a>{' '}
                {copy.agentsEmptyEnd}
              </>
            }
            items={state.items.filter((item) => item.kind === 'oauth')}
            levels={state.levels}
            now={state.now}
            onChangeLevel={changeLevel}
            onRevoke={revoke}
          />
          <AgentAccessList
            heading={copy.tokensHeading}
            empty={copy.tokensEmpty}
            items={state.items.filter((item) => item.kind === 'token')}
            levels={state.levels}
            now={state.now}
            action={
              <button
                ref={createButtonRef}
                type="button"
                onClick={openCreateToken}
                className="kern-btn kern-btn--secondary"
              >
                <span aria-hidden="true" className="kern-icon kern-icon--add" />
                <span className="kern-label">{copy.createToken}</span>
              </button>
            }
            onChangeLevel={changeLevel}
            onRevoke={revoke}
          />
        </div>
      )}

      <AccessLevelDialog {...dialogProps} levels={state.levels} />
      <RevokeDialog {...dialogProps} />
      <CreateTokenDialog {...dialogProps} levels={state.levels} />
      <TokenCreatedDialog dialog={state.dialog} onClose={closeDialog} />
      <Toast toast={state.toast} onDismiss={dismissToast} noFooter />
    </>
  );
}

/**
 * The account page's route: "Try again" after a failed load mounts the page anew, so that it
 * starts from loading with a fresh state
 */
export default function AccountPage() {
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((current) => current + 1), []);
  return <AccountView key={attempt} onRetry={retry} retried={attempt > 0} />;
}
