import { STATUS_PILL_COPY, STATUS_PILL_TONES } from './constants';
import type { ConnectionStatus, ConnectionStatusBadgeProps } from './types';

/**
 * Figma "Status/Connection" (U07 build note 32, 7370:55180; U11 6699:44264): a connection's
 * status as a tinted pill with an 8px dot and its label, radius 8, no border, 24px high as the
 * rows and the header draw it. "Active" (green) or "Deactivated" (grey); with `draft`, a saved
 * draft that isn't live yet: "Draft" (blue), whatever `isActive` says. The label says it, not
 * the colour alone (005-ACC.1); the dot is decorative.
 */
export default function ConnectionStatusBadge({
  isActive,
  draft = false,
}: ConnectionStatusBadgeProps) {
  const status: ConnectionStatus = draft ? 'draft' : isActive ? 'active' : 'deactivated';
  const tone = STATUS_PILL_TONES[status];
  return (
    <span
      className={`${tone.pill} rounded-kern-default narrow:h-auto narrow:min-h-24 inline-flex h-24 max-w-full shrink-0 items-center gap-6 px-10`}
    >
      <span aria-hidden="true" className={`${tone.dot} rounded-kern-circle size-8 shrink-0`} />
      <span
        className={`${tone.label} text-kern-static-small narrow:whitespace-normal leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap`}
      >
        {STATUS_PILL_COPY[status]}
      </span>
    </span>
  );
}
