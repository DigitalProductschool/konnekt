import type { EditLocationState } from '@connection-portal/api-types/routing';
import { generatePath, Link } from 'react-router';

import { ROUTES } from '../../constants';
import { EDIT_ENTRY_STATE } from '../FormConnectionEdit/constants';
import { DETAIL_COPY } from './constants';
import type { DetailFooterProps } from './types';

/**
 * The actions of Figma "Shell/Footer" on the details (U80 6424:34839) and a draft's (U93
 * 7362:54919, FR-049): "Edit connection" (secondary, the pencil) at the left and "Go to
 * connections →" (primary) at the right; no "Create new connection" (FR-046). A draft's "Edit
 * connection" opens its flow at the step it was saved in (spec 005, S6: "Continue", relabelled by
 * Q39). A published connection's (`onEdit`) asks "Edit “<name>”?" first, and the details open the
 * flow at step 1 from that question (F48). While the connection loads (T080), "Go to connections
 * →" alone, where it will stay. The footer wraps where they don't fit.
 */
export default function DetailFooter({ formConnectionId, draft, onEdit }: DetailFooterProps) {
  const editState: EditLocationState = draft ? { step: draft.step } : EDIT_ENTRY_STATE;
  // Only a published connection asks first: a draft was never live (F48, T081)
  const asksFirst = onEdit !== undefined && !draft;
  const editContent = (
    <>
      <span aria-hidden="true" className="kern-icon kern-icon--edit" />
      <span className="kern-label">{DETAIL_COPY.editConnection}</span>
    </>
  );
  return (
    <>
      {formConnectionId && asksFirst && (
        <button type="button" onClick={onEdit} className="kern-btn kern-btn--secondary">
          {editContent}
        </button>
      )}
      {formConnectionId && !asksFirst && (
        <Link
          to={generatePath(ROUTES.editFormConnection, { id: formConnectionId })}
          state={editState}
          className="kern-btn kern-btn--secondary"
        >
          {editContent}
        </Link>
      )}
      <Link to={ROUTES.overview} className="kern-btn kern-btn--primary ml-auto">
        <span className="kern-label">{DETAIL_COPY.goToConnections}</span>
        <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
      </Link>
    </>
  );
}
