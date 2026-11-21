import { Link } from 'react-router';

import chainErrorBroken from '../../assets/illustrations/chain-error-broken@2x.webp';
import { ROUTES } from '../../constants';
import { useCopy } from '../../hooks/useLanguage';
import { NOT_FOUND_COPY } from './constants';

/**
 * "Page not found" (S22; Figma "New visuals" 7786:63039, its card 7786:63047 and surface 7786:63040;
 * bug new-visuals B5): one light blue card (layout-background-hued, radius 12, padding 36 / 48),
 * at least 296px high and its content centred vertically, laid out as the welcome card. In a
 * column of at most 560px: the title, the page's one h1 (heading/x-large, focusable from script
 * as `PageTitle`'s), the sentence 8px under it (body/default, muted) and, 32px under that, the
 * one primary action, the way back to the overview with its forward arrow. The broken chain
 * (`chain-error-broken`, 392 × 296, decorative) lies in a box at the card's top right at its
 * natural size; the card keeps its visible part plus 24px (355px) free at its right, so that the
 * column wraps before the chain where the card is narrower than the frame's 1120px, such as in
 * the details' 832px column. The card never clips its text: its height grows with it. Narrower
 * than 768px the card keeps 24px padding and the picture goes, so that the text and the action
 * keep the width (FR-010).
 */
export default function NotFound() {
  const copy = useCopy(NOT_FOUND_COPY);
  return (
    <div className="bg-kern-layout-background-hued rounded-kern-large relative flex w-full items-center p-24 md:min-h-296 md:py-36 md:pr-355 md:pl-48">
      {/* The picture's clip layer, so that the card clips no focus ring */}
      <div
        aria-hidden="true"
        className="rounded-kern-large pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
      >
        <img
          src={chainErrorBroken}
          alt=""
          aria-hidden="true"
          width={392}
          height={296}
          className="absolute top-0 right-0 h-296! w-392 max-w-none!"
        />
      </div>
      {/* Positioned, so that it paints over the clip layer */}
      <div className="relative flex w-full max-w-560 min-w-0 flex-col items-start gap-32">
        <div className="flex flex-col gap-8">
          <h1 tabIndex={-1} className="kern-heading-x-large py-0! break-words outline-none">
            {copy.title}
          </h1>
          <p className="text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static) break-words">
            {copy.text}
          </p>
        </div>
        <Link to={ROUTES.overview} className="kern-btn kern-btn--primary">
          <span className="kern-label">{copy.action}</span>
          <span aria-hidden="true" className="kern-icon kern-icon--arrow-forward" />
        </Link>
      </div>
    </div>
  );
}
