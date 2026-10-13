import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { DETAIL_COPY } from './constants';

/**
 * The actions of Figma "App/Footer" on "22 Published". Editing doesn't exist yet (T074), so
 * "Home" takes the place of "Edit documents". On phones "Home" shows only its icon, so that
 * both actions fit.
 */
export default function DetailFooter() {
  return (
    <>
      <Link to={ROUTES.overview} className="kern-btn kern-btn--tertiary">
        <span aria-hidden="true" className="kern-icon kern-icon--home" />
        <span className="kern-label max-sm:sr-only">{DETAIL_COPY.home}</span>
      </Link>
      {/* A margin rather than a spacer, which would add a second gap: on phones every pixel counts */}
      <Link to={ROUTES.newFormConnection} className="kern-btn kern-btn--secondary ml-auto">
        <span aria-hidden="true" className="kern-icon kern-icon--add" />
        <span className="kern-label">{DETAIL_COPY.newConnection}</span>
      </Link>
    </>
  );
}
