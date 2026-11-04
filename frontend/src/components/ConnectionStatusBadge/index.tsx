import { KernBadge } from '@kern-ux-annex/kern-react-kit';

import { STATUS_BADGE_COPY } from './constants';
import type { ConnectionStatusBadgeProps } from './types';

/**
 * Whether a connection is active, as KERN's small badge: "Live" (success) or "Deactivated"
 * (warning). With `draft`, a saved draft that isn't live yet: "Draft" (info), whatever
 * `isActive` says. The text and the icon say it, not the colour alone.
 */
export default function ConnectionStatusBadge({
  isActive,
  draft = false,
}: ConnectionStatusBadgeProps) {
  if (draft) {
    return (
      <KernBadge
        variant="info"
        label={STATUS_BADGE_COPY.draft}
        withIcon
        className="kern-badge--small"
      />
    );
  }
  return (
    <KernBadge
      variant={isActive ? 'success' : 'warning'}
      label={isActive ? STATUS_BADGE_COPY.live : STATUS_BADGE_COPY.deactivated}
      withIcon
      className="kern-badge--small"
    />
  );
}
