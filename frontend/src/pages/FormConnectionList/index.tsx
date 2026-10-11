import { KernAlert } from '@kern-ux-annex/kern-react-kit';
import { useEffect, useReducer } from 'react';
import { Link } from 'react-router';

import { listFormConnections } from '../../api/form-connections';
import FeedbackLoader from '../../components/FeedbackLoader';
import PageTitle from '../../components/PageTitle';
import { ROUTES } from '../../constants';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useSignOutOnUnauthorized } from '../../hooks/useSignOutOnUnauthorized';
import { INITIAL_LIST_STATE, LIST_COPY } from './constants';
import EmptyConnections from './EmptyConnections';
import FormConnectionRow from './FormConnectionRow';
import { listReducer } from './utils';

/** The overview at "/" (Figma "S3 Your connections"): every connection that isn't deleted. */
export default function FormConnectionListPage() {
  useDocumentTitle(LIST_COPY.pageTitle);
  const [state, dispatch] = useReducer(listReducer, INITIAL_LIST_STATE);
  const handleUnauthorized = useSignOutOnUnauthorized();

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
      <PageTitle title={LIST_COPY.title} hint={LIST_COPY.hint} />
      <div>
        <Link to={ROUTES.newFormConnection} className="kern-btn kern-btn--primary">
          <span aria-hidden="true" className="kern-icon kern-icon--add" />
          <span className="kern-label">{LIST_COPY.newConnection}</span>
        </Link>
      </div>

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
