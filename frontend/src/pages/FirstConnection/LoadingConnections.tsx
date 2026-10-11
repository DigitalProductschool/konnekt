import AppLayout from '../../components/AppLayout';
import FeedbackLoader from '../../components/FeedbackLoader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { FIRST_CONNECTION_COPY } from './constants';

/**
 * Figma "L1 Loading": the app frame with the loader centred in the page, without the
 * overview's title and actions. It sets the tab title only while it is shown, so the
 * wizard's takes over.
 */
export default function LoadingConnections() {
  useDocumentTitle(FIRST_CONNECTION_COPY.loading);

  return (
    <AppLayout>
      <div className="flex flex-1 flex-col items-center justify-center">
        <FeedbackLoader label={FIRST_CONNECTION_COPY.loading} />
      </div>
    </AppLayout>
  );
}
