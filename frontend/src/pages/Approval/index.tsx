import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useReducer, useRef } from 'react';
import { Link, useParams } from 'react-router';

import { approveRequest, declineRequest, getApprovalRequest } from '../../api/approvals';
import ErrorNoticeText from '../../components/ErrorNoticeText';
import NotFound from '../../components/NotFound';
import { NOT_FOUND_COPY } from '../../components/NotFound/constants';
import PageLoader from '../../components/PageLoader';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLanguage } from '../../hooks/useLanguage';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { CONNECTION_DETAIL_COPY } from '../FormConnectionDetail/constants';
import ApprovalActions from './ApprovalActions';
import ApprovalOutcome from './ApprovalOutcome';
import ApprovalSummary from './ApprovalSummary';
import { APPROVAL_COPY, INITIAL_APPROVAL_STATE } from './constants';
import type { ApprovalCall, ApprovalScreenProps } from './types';
import {
  approvalReducer,
  callFailureOf,
  doneShowsUrls,
  loadFailureActionOf,
  outcomeOfError,
  outcomeViewOf,
  subtitleOf,
  titleOf,
} from './utils';

/**
 * S21, one approval request (spec 007, S3; FR-023 to FR-027), built without frames (W16) from the
 * patterns of design-notes §3 in `AppLayout`'s column: the page title (heading/x-large, as the
 * overview's) by action with who asked and until when, what it acts on (`ApprovalSummary`), and
 * "Approve" and "Decline". A request that isn't waiting any more, or turns out not to be when a
 * call answers `409 approval_<status>`, shows its outcome in place of the body and the actions,
 * under the same title. A failed approve leaves the request waiting: the page keeps the body,
 * shows the failure with its error ID above it and offers "Try again". Another team member's
 * request and one that isn't there show no preview; a failed load shows the §3 "Error state of a
 * page" with the way back to the connections.
 */
function ApprovalScreen({ id }: ApprovalScreenProps) {
  const [state, dispatch] = useReducer(approvalReducer, INITIAL_APPROVAL_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();
  const { language } = useLanguage();
  const copy = APPROVAL_COPY[language];
  // A load or call in flight during a switch: its failure takes the language it arrives in
  const languageRef = useRef(language);
  useEffect(() => {
    languageRef.current = language;
  }, [language]);
  const request = state.status === 'loaded' ? state.preview.request : null;
  const title = request ? titleOf(request.action, request.connection_name, language) : null;

  useDocumentTitle(
    title ?? (state.status === 'notFound' ? NOT_FOUND_COPY[language].title : copy.fallbackTitle)
  );

  useEffect(() => {
    let ignore = false;
    getApprovalRequest(id).then(
      (preview) => {
        if (!ignore) dispatch({ type: 'loaded', preview });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) {
          dispatch(loadFailureActionOf(error, languageRef.current));
        }
      }
    );
    return () => {
      ignore = true;
    };
  }, [id, handleUnauthorized]);

  async function run(call: ApprovalCall) {
    if (state.status !== 'loaded' || state.running !== null) return;
    dispatch({ type: 'started', call });
    try {
      const preview = await (call === 'approve' ? approveRequest(id) : declineRequest(id));
      dispatch({ type: 'succeeded', preview });
    } catch (error) {
      if (handleUnauthorized(error)) return;
      const outcome = outcomeOfError(error);
      dispatch(
        outcome
          ? { type: 'conflicted', outcome }
          : { type: 'callFailed', failure: callFailureOf(call, error, languageRef.current) }
      );
    }
  }

  switch (state.status) {
    case 'loading':
      return <PageLoader />;
    case 'notFound':
      return <NotFound />;
    case 'notYours':
      return (
        <>
          <PageTitle title={copy.fallbackTitle} size="x-large" />
          <KernAlert variant="info" title={copy.notYours} className="w-full" />
        </>
      );
    case 'failed':
      // design-notes §3 "Error state of a page": the reason with a 5xx's error ID, the way back
      return (
        <>
          <PageTitle title={copy.fallbackTitle} size="x-large" />
          <KernAlert variant="danger" title={copy.loadFailedTitle} className="w-full">
            <ErrorNoticeText notice={state.notice} />
            <span className="mt-10 flex flex-wrap items-center gap-x-24 gap-y-8">
              <Link to={ROUTES.overview} className="kern-link">
                {CONNECTION_DETAIL_COPY[language].goToConnections}
              </Link>
            </span>
          </KernAlert>
        </>
      );
  }

  const { preview, running, retry } = state;
  const { action } = preview.request;
  const view = outcomeViewOf(state, language);
  return (
    <>
      <PageTitle title={title ?? ''} hint={subtitleOf(preview.request, language)} size="x-large" />
      {view?.kind === 'final' ? (
        <ApprovalOutcome
          view={view}
          urls={doneShowsUrls(action) ? preview.urls : null}
          formConnectionId={preview.request.form_connection_id}
          deactivated={preview.connection ? !preview.connection.is_active : false}
        />
      ) : (
        <div className="flex flex-col gap-24">
          {view && <ApprovalOutcome view={view} />}
          <ApprovalSummary
            action={action}
            draft={preview.draft}
            connection={preview.connection}
            urls={preview.urls}
          />
          <ApprovalActions
            action={action}
            running={running}
            retry={retry}
            onApprove={() => void run('approve')}
            onDecline={() => void run('decline')}
          />
        </div>
      )}
    </>
  );
}

/**
 * The approval page at `/approvals/:id`, keyed by the request's id, so that opening another
 * request starts from its own loading state and never acts on the one shown before.
 */
export default function ApprovalPage() {
  const { id = '' } = useParams();
  return <ApprovalScreen key={id} id={id} />;
}
