import FeedbackLoader from '../../components/FeedbackLoader';
import WizardLayout from '../../components/WizardLayout';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useCopy } from '../../hooks/useLanguage';
import { FIRST_CONNECTION_COPY } from './constants';

/**
 * The first-connection flow while it checks the list: the wizard's shell (L3, T033) with only the
 * header pills, and the 56px loader with "Loading your connections…" (T018) centred in the page,
 * so that step 1 replaces it in the same frame, without a second fade. The h1 is there for
 * screen readers (FR-012). It sets the tab title only while it is shown, so the wizard's takes
 * over.
 */
export default function LoadingConnections() {
  const copy = useCopy(FIRST_CONNECTION_COPY);
  useDocumentTitle(copy.loading);

  return (
    <WizardLayout footer={null}>
      <h1 className="sr-only">{copy.title}</h1>
      <div className="flex flex-1 flex-col items-center justify-center">
        <FeedbackLoader label={copy.loading} />
      </div>
    </WizardLayout>
  );
}
