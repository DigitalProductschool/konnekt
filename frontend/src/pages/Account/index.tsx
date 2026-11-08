import type { AgentAccessItem } from '@connection-portal/api-types/agent-access';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useCallback, useEffect, useReducer, useRef } from 'react';

import { listAgentAccess } from '../../api/agent-access';
import { errorNoticeOf } from '../../api/client';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import FeedbackLoader from '../../components/FeedbackLoader';
import PageTitle from '../../components/PageTitle';
import Toast from '../../components/Toast';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import AccessLevelDialog from './AccessLevelDialog';
import AgentAccessList from './AgentAccessList';
import { ACCOUNT_COPY, INITIAL_ACCOUNT_STATE, MCP_README_URL } from './constants';
import CreateTokenDialog from './CreateTokenDialog';
import RevokeDialog from './RevokeDialog';
import TokenCreatedDialog from './TokenCreatedDialog';
import { accountReducer } from './utils';

/**
 * The user page (S2; FR-004, FR-006): the signed-in team member's agent connections and personal
 * access tokens, and only theirs, each with its access level and dates, to change the level of or
 * revoke. Tokens are created here and shown once. When a dialog closes, the focus goes back to
 * the control that opened it, as in `UserMenu`, or, when its row is gone, to the page's heading.
 */
export default function AccountPage() {
  useDocumentTitle(ACCOUNT_COPY.title);
  const { user } = useCurrentUser();
  const handleUnauthorized = useSignOutOnUnauthorized();
  const [state, dispatch] = useReducer(accountReducer, INITIAL_ACCOUNT_STATE);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  // The ⋯ button or "Create token" that opened the dialog; focused again once it has closed
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let ignore = false;
    listAgentAccess().then(
      (list) => {
        if (!ignore) dispatch({ type: 'loaded', list, now: new Date() });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) {
          dispatch({ type: 'loadFailed', error: errorNoticeOf(error, ACCOUNT_COPY.loadFailed) });
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [handleUnauthorized]);

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
    return <FeedbackLoader label={ACCOUNT_COPY.loading} />;
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
        title={ACCOUNT_COPY.title}
        hint={user ? ACCOUNT_COPY.signedInAs(user.username) : undefined}
      />

      {state.status === 'failed' && state.loadError && (
        <KernAlert variant="danger" title={ACCOUNT_COPY.loadFailedTitle} className="w-full">
          <ErrorNoticeText notice={state.loadError} />
        </KernAlert>
      )}

      {state.status === 'loaded' && state.now && (
        <div className="flex flex-col gap-40">
          <AgentAccessList
            heading={ACCOUNT_COPY.agentsHeading}
            empty={
              <>
                {ACCOUNT_COPY.agentsEmpty}{' '}
                <a href={MCP_README_URL} className="kern-link">
                  {ACCOUNT_COPY.agentsEmptyLink}
                </a>{' '}
                {ACCOUNT_COPY.agentsEmptyEnd}
              </>
            }
            items={state.items.filter((item) => item.kind === 'oauth')}
            levels={state.levels}
            now={state.now}
            onChangeLevel={changeLevel}
            onRevoke={revoke}
          />
          <AgentAccessList
            heading={ACCOUNT_COPY.tokensHeading}
            empty={ACCOUNT_COPY.tokensEmpty}
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
                <span className="kern-label">{ACCOUNT_COPY.createToken}</span>
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
