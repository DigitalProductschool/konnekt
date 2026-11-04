import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import type { EditLocationState } from '../../types/routing';
import { DETAIL_COPY } from './constants';
import type { DetailFooterProps } from './types';

const EDIT_DOCUMENTS: EditLocationState = { step: 'documents' };

/**
 * The actions of Figma "App/Footer" on "22 Published": "Edit documents" and "Create new
 * connection". While the connection isn't there, "Home" takes the place of "Edit documents", and
 * for a draft "Continue", to its flow at the step it was saved in (spec 005, S6). On phones the
 * first action shows only its icon, so that both fit.
 */
export default function DetailFooter({ formConnectionId, draft }: DetailFooterProps) {
  const continueState: EditLocationState | undefined = draft && { step: draft.step };
  return (
    <>
      {formConnectionId && draft ? (
        <Link
          to={generatePath(ROUTES.editFormConnection, { id: formConnectionId })}
          state={continueState}
          className="kern-btn kern-btn--tertiary"
        >
          <span className="kern-label max-sm:sr-only">
            {DETAIL_COPY.continue}
            {/* "Continue" alone doesn't say which connection */}
            <span className="sr-only"> {draft.name}</span>
          </span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </Link>
      ) : formConnectionId ? (
        <Link
          to={generatePath(ROUTES.editFormConnection, { id: formConnectionId })}
          state={EDIT_DOCUMENTS}
          className="kern-btn kern-btn--tertiary"
        >
          <span aria-hidden="true" className="kern-icon kern-icon--edit" />
          <span className="kern-label max-sm:sr-only">{DETAIL_COPY.editDocuments}</span>
        </Link>
      ) : (
        <Link to={ROUTES.overview} className="kern-btn kern-btn--tertiary">
          <span aria-hidden="true" className="kern-icon kern-icon--home" />
          <span className="kern-label max-sm:sr-only">{DETAIL_COPY.home}</span>
        </Link>
      )}
      {/* A margin rather than a spacer, which would add a second gap: on phones every pixel counts */}
      <Link to={ROUTES.newFormConnection} className="kern-btn kern-btn--secondary ml-auto">
        <span aria-hidden="true" className="kern-icon kern-icon--add" />
        <span className="kern-label">{DETAIL_COPY.newConnection}</span>
      </Link>
    </>
  );
}
