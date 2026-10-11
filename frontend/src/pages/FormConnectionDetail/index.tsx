import { useEffect, useReducer, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';

import { ApiError } from '../../api/client';
import { getFormConnection } from '../../api/form-connections';
import FeedbackLoader from '../../components/FeedbackLoader';
import NotFound from '../../components/NotFound';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import ConnectionLinks from './ConnectionLinks';
import { DETAIL_COPY, INITIAL_DETAIL_STATE } from './constants';
import DocumentsSummary from './DocumentsSummary';
import { detailReducer, documentTitleOf, isPublishedState } from './utils';

/**
 * The details at /form-connections/:id: the connection URLs to copy into serviceBW and the
 * requested documents. Right after publishing it confirms that the connection is live
 * (Figma "22 Published").
 */
export default function FormConnectionDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [state, dispatch] = useReducer(detailReducer, INITIAL_DETAIL_STATE);
  // Read once: the router state is cleared below, so that a reload shows the plain links
  const [published] = useState(() => isPublishedState(location.state));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const handleUnauthorized = useSignOutOnUnauthorized();

  useDocumentTitle(documentTitleOf(state));

  useEffect(() => {
    let ignore = false;
    getFormConnection(id).then(
      (formConnection) => {
        if (!ignore) dispatch({ type: 'loaded', formConnection });
      },
      (error: unknown) => {
        if (ignore || handleUnauthorized(error)) return;
        dispatch(
          error instanceof ApiError && error.status === 404
            ? { type: 'notFound' }
            : { type: 'failed' }
        );
      }
    );
    return () => {
      ignore = true;
    };
  }, [id, state.attempt, handleUnauthorized]);

  useEffect(() => {
    if (published) {
      navigate(location.pathname, { replace: true });
    }
  }, [published, navigate, location.pathname]);

  // Right after publishing, the focus goes to "Your connection is live"
  const loaded = state.status === 'loaded';
  useEffect(() => {
    if (published && loaded) {
      headingRef.current?.focus();
    }
  }, [published, loaded]);

  if (state.status === 'loading') {
    return <FeedbackLoader label={DETAIL_COPY.loading} />;
  }
  if (state.status === 'notFound') {
    return <NotFound />;
  }
  if (state.status === 'failed') {
    return (
      <>
        <PageTitle title={DETAIL_COPY.errorTitle} hint={DETAIL_COPY.errorText} />
        <div className="flex flex-wrap gap-16">
          <button
            type="button"
            onClick={() => dispatch({ type: 'retry' })}
            className="kern-btn kern-btn--primary"
          >
            <span className="kern-label">{DETAIL_COPY.retry}</span>
          </button>
          <Link to={ROUTES.overview} className="kern-btn kern-btn--secondary">
            <span className="kern-label">{DETAIL_COPY.backToList}</span>
          </Link>
        </div>
      </>
    );
  }

  const { formConnection } = state;
  return (
    <>
      <PageTitle
        title={formConnection.name}
        hint={DETAIL_COPY.formId(formConnection.servicebw_form)}
      />
      <ConnectionLinks
        formConnection={formConnection}
        published={published}
        headingRef={headingRef}
      />
      <DocumentsSummary documents={formConnection.documents} />
    </>
  );
}
