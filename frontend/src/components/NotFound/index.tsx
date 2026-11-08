import { Link } from 'react-router';

import walletStar from '../../assets/illustrations/wallet-star@2x.png';
import { ROUTES } from '../../constants';
import PageTitle from '../PageTitle';
import { NOT_FOUND_COPY } from './constants';

/**
 * "Page not found" (S22) as the design's empty state (design-notes §3 "Empty state", the anatomy
 * of U11 6699:44481): the page title as the one heading (heading/x-large, 6699:44486), then the
 * light blue card (layout-background-hued, radius 12, 48px padding and gap; 6699:44488) with one
 * sentence (body/default, muted; 6699:44492), the one primary action, the way back to the
 * overview with its forward arrow (6699:44508), 32px under it, and the wallet star at 200 × 193
 * (6699:44509; decorative, U02 build note 12). Narrower than 768px the card keeps 24px padding
 * and the picture goes, so that the text and the action keep the width (FR-010).
 */
export default function NotFound() {
  return (
    <>
      <PageTitle title={NOT_FOUND_COPY.title} size="x-large" />
      <div className="bg-kern-layout-background-hued rounded-kern-large flex w-full items-center gap-48 p-24 md:p-48">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-32">
          <p className="text-kern-static-medium text-kern-layout-text-muted max-w-578 break-words">
            {NOT_FOUND_COPY.text}
          </p>
          <Link to={ROUTES.overview} className="kern-btn kern-btn--primary">
            <span className="kern-label">{NOT_FOUND_COPY.action}</span>
            <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
          </Link>
        </div>
        {/* Wrapped: kern.css's unlayered `img { display: block }` beats `hidden` on the image */}
        <div className="hidden flex-none md:block">
          <img src={walletStar} alt="" className="h-193 w-200" />
        </div>
      </div>
    </>
  );
}
