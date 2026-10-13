import { KernBadge } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useReducer, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import { ApiError } from '../../api/client';
import { getFormConnection } from '../../api/form-connections';
import FeedbackLoader from '../../components/FeedbackLoader';
import NotFound from '../../components/NotFound';
import WizardLayout from '../../components/WizardLayout';
import WizardProgress from '../../components/WizardProgress';
import { CONNECTION_STEPS } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import ConnectionLinks from './ConnectionLinks';
import { DETAIL_COPY, INITIAL_DETAIL_STATE } from './constants';
import DetailFailed from './DetailFailed';
import DetailFooter from './DetailFooter';
import DocumentsSummary from './DocumentsSummary';
import { detailReducer, documentTitleOf, isPublishedState } from './utils';

/**
 * The details at /form-connections/:id: the connection URLs to copy into serviceBW and the
 * requested documents. It is the wizard's last screen (Figma "22 Published"), in its frame:
 * the header names the connection (the page's h1), its status and form, every step is done,
 * and the footer leads home or to a new connection. Right after publishing it confirms that
 * the connection is live. Every state keeps the frame, so the header doesn't jump.
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

  if (state.status !== 'loaded') {
    return (
      <WizardLayout footer={<DetailFooter />}>
        {state.status === 'loading' && (
          <div className="flex flex-1 flex-col items-center justify-center">
            <FeedbackLoader label={DETAIL_COPY.loading} />
          </div>
        )}
        {state.status === 'notFound' && <NotFound />}
        {state.status === 'failed' && <DetailFailed onRetry={() => dispatch({ type: 'retry' })} />}
      </WizardLayout>
    );
  }

  const { formConnection } = state;
  return (
    <WizardLayout
      title={formConnection.name}
      titleAsHeading
      badge={
        formConnection.is_active ? (
          <KernBadge
            variant="success"
            label={DETAIL_COPY.live}
            withIcon
            className="kern-badge--small"
          />
        ) : undefined
      }
      meta={DETAIL_COPY.formId(formConnection.servicebw_form)}
      head={<WizardProgress steps={CONNECTION_STEPS} current={CONNECTION_STEPS.length} />}
      footer={<DetailFooter />}
    >
      {/* Figma "Publish/Success card" is 900 px wide, centred in the wizard's column */}
      <div className="mx-auto flex w-full max-w-900 flex-col gap-32">
        <ConnectionLinks
          formConnection={formConnection}
          published={published}
          headingRef={headingRef}
        />
        <DocumentsSummary documents={formConnection.documents} />
      </div>
    </WizardLayout>
  );
}
