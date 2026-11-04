import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

import FormConnectionLoadState from '../../components/FormConnectionLoadState';
import { useFormConnection } from '../../hooks/useFormConnection';
import ConnectionDetails from './ConnectionDetails';
import DetailFooter from './DetailFooter';
import { arrivalOf } from './utils';

/**
 * The details at /form-connections/:id: the connection URLs to copy into serviceBW, the
 * requested documents, the rules of every variant and the connection's status. It is the wizard's last screen (Figma "22
 * Published"), in its frame. Right after publishing it confirms that the connection is live,
 * and after an edit that the changes are saved. Every state keeps the frame, so the header
 * doesn't jump.
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
  // A draft has no details yet: not found here, until drafts are routed to the editor
  if (state.formConnection.status !== 'published') {
    return (
      <FormConnectionLoadState
        state={{ status: 'notFound', attempt: state.attempt }}
        onRetry={retry}
        footer={<DetailFooter />}
      />
    );
  }
  return (
    <ConnectionDetails formConnection={state.formConnection} arrival={arrival} onChange={replace} />
  );
}
