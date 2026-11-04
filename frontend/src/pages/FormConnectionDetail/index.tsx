import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { useFormConnection } from '../../hooks/useFormConnection';
import ConnectionDetails from './ConnectionDetails';
import DetailFooter from './DetailFooter';
import DraftDetails from './DraftDetails';
import { arrivalOf } from './utils';

/**
 * The details at /form-connections/:id, in the wizard's frame. Every state keeps the frame, so
 * the header doesn't jump.
 * - A published connection: the connection URLs to copy into serviceBW, the requested documents,
 *   the rules of every variant and the connection's status. It is the wizard's last screen (Figma
 *   "22 Published"). Right after publishing it confirms that the connection is live, and after an
 *   edit that the changes are saved.
 * - A stored draft: its details (S6), without any URL (FR-006), with "Continue" and "Delete
 *   draft". Once the draft turns out to be published, "Open the connection" loads the details
 *   again, which then show the connection.
 */
export default function FormConnectionDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, retry, replace } = useFormConnection(id);
  // Read once: the router state is cleared below, so that a reload shows the plain links
  const [arrival] = useState(() => arrivalOf(location.state));

  useEffect(() => {
    if (arrival) {
      navigate(location.pathname, { replace: true });
    }
  }, [arrival, navigate, location.pathname]);

  if (state.status !== 'loaded') {
    return <FormConnectionLoadState state={state} onRetry={retry} footer={<DetailFooter />} />;
  }
  if (state.formConnection.status === 'draft') {
    return <DraftDetails draft={state.formConnection} onReload={retry} />;
  }
  return (
    <ConnectionDetails formConnection={state.formConnection} arrival={arrival} onChange={replace} />
  );
}
