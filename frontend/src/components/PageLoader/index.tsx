import { KERN_TRANSLATIONS } from '../../constants';
import { useCopy } from '../../hooks/useLanguage';
import FeedbackLoader from '../FeedbackLoader';
import type { FeedbackLoaderProps } from '../FeedbackLoader/types';

/**
 * A page that is only loading, as Figma U10 6401:28567 "After log in: loading your workspace"
 * draws it: the 56 px loader and what is loading, centred in the window on the white page. Shown
 * while the app finds out whether someone is signed in ("Loading…"), and with "Loading your
 * connections…" while the overview loads.
 */
export default function PageLoader({ label }: Partial<Pick<FeedbackLoaderProps, 'label'>>) {
  const kernCopy = useCopy(KERN_TRANSLATIONS);

  return (
    <div className="bg-kern-layout-background-default flex min-h-screen items-center justify-center px-16">
      <FeedbackLoader label={label ?? kernCopy.loading} />
    </div>
  );
}
