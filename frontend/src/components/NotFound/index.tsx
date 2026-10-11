import { Link } from 'react-router';

import { ROUTES } from '../../constants';
import { NOT_FOUND_COPY } from './constants';

/** Figma "E1 Page not found (404)", centred in the page; its title is the page's h1. */
export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-24">
      <div className="flex flex-col items-center gap-8 text-center">
        <p className="text-kern-static-medium text-kern-layout-text-muted">
          {NOT_FOUND_COPY.eyebrow}
        </p>
        <h1 className="text-kern-adaptive-2x-large text-kern-layout-text-default font-medium">
          {NOT_FOUND_COPY.title}
        </h1>
        <p className="text-kern-static-medium text-kern-layout-text-muted max-w-480">
          {NOT_FOUND_COPY.text}
        </p>
      </div>
      <Link to={ROUTES.overview} className="kern-btn kern-btn--primary">
        <span className="kern-label">{NOT_FOUND_COPY.action}</span>
      </Link>
    </div>
  );
}
