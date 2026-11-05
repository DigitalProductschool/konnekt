import type { OverviewLocationState } from '@connection-portal/api-types/routing';
import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { listFormConnections } from '../../api/form-connections';
import FeedbackLoader from '../../components/FeedbackLoader';
import LocalDraftsOffer from '../../components/LocalDraftsOffer';
import PageTitle from '../../components/PageTitle';
import { LIVE_REGION_DELAY_MS, ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useLocalDrafts } from '../../hooks/useLocalDrafts';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { INITIAL_LIST_STATE, LIST_COPY } from './constants';
import EmptyConnections from './EmptyConnections';
import FormConnectionRow from './FormConnectionRow';
import { hintOf, listReducer } from './utils';

/**
 * The overview at "/" (Figma "S3 Your connections"): every connection that isn't deleted,
 * drafts included. After "Save and exit" it confirms the saved draft in a polite status (W1),
 * which mounts empty so that screen readers announce the text. Above the list, also while it
 * loads, is empty or failed, it offers the unsaved work on this device (S4), which counts for the
 * hint (S3).
 */
export default function FormConnectionListPage() {
  useDocumentTitle(LIST_COPY.pageTitle);
  const [state, dispatch] = useReducer(listReducer, INITIAL_LIST_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();
  const location = useLocation();
  const navigate = useNavigate();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const { drafts: localDrafts } = useLocalDrafts();
  // Read once: the router state is cleared below, so the status goes at the next navigation
  const [draftSaved] = useState(
    () => (location.state as OverviewLocationState | null)?.draftSaved ?? null
  );

  useEffect(() => {
    if (draftSaved !== null) {
      navigate(location.pathname, { replace: true });
    }
  }, [draftSaved, navigate, location.pathname]);

  // A region that appears with its text is often not announced: it mounts empty, and the text
  // follows a moment later
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    if (draftSaved === null) return;
    const timer = window.setTimeout(() => setAnnounced(true), LIVE_REGION_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [draftSaved]);

  useEffect(() => {
    let ignore = false;
    listFormConnections().then(
      (formConnections) => {
        if (!ignore) dispatch({ type: 'loaded', formConnections });
      },
      (error: unknown) => {
        if (!ignore && !handleUnauthorized(error)) dispatch({ type: 'failed' });
      }
    );
    return () => {
      ignore = true;
    };
  }, [state.attempt, handleUnauthorized]);

  return (
    <>
      <PageTitle
        ref={titleRef}
        title={LIST_COPY.title}
        hint={hintOf(state.status === 'loaded' ? state.formConnections : [], localDrafts.length)}
      />
      {/* Empty, it leaves the flow (no gap) but stays rendered: `display: none` would take it out
          of the accessibility tree, and its text would then appear with it, unannounced */}
      <p
        role="status"
        className="text-kern-static-medium text-kern-layout-text-default empty:absolute"
      >
        {announced && draftSaved !== null && LIST_COPY.draftSaved(draftSaved)}
      </p>
      <div>
        <Link to={ROUTES.newFormConnection} className="kern-btn kern-btn--primary">
          <span aria-hidden="true" className="kern-icon kern-icon--add" />
          <span className="kern-label">{LIST_COPY.newConnection}</span>
        </Link>
      </div>

      <LocalDraftsOffer emptyFocusRef={titleRef} />

      {state.status === 'loading' && <FeedbackLoader label={LIST_COPY.loading} />}

      {state.status === 'failed' && (
        <div className="flex flex-col items-start gap-16">
          <KernAlert variant="danger" title={LIST_COPY.errorTitle} className="w-full">
            {LIST_COPY.errorText}
          </KernAlert>
          <button
            type="button"
            onClick={() => dispatch({ type: 'retry' })}
            className="kern-btn kern-btn--secondary"
          >
            <span className="kern-label">{LIST_COPY.retry}</span>
          </button>
        </div>
      )}

      {state.status === 'loaded' && state.formConnections.length === 0 && <EmptyConnections />}

      {state.status === 'loaded' && state.formConnections.length > 0 && (
        <section aria-labelledby="connections-caption" className="flex flex-col gap-8">
          <h2
            id="connections-caption"
            className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)"
          >
            {LIST_COPY.caption(state.formConnections.length)}
          </h2>
          <ul className="flex flex-col gap-8">
            {state.formConnections.map((formConnection) => (
              <FormConnectionRow key={formConnection.id} formConnection={formConnection} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
