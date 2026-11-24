import { formatDate } from '@konnekt/rules/dates';

import { useLanguage } from '../../hooks/useLanguage';
import { STATUS_PILL_COPY, STATUS_PILL_TONES } from './constants';
import type { ConnectionStatusBadgeProps } from './types';

/**
 * Figma "Status/Connection" (U07 build note 32, 7370:55180; U11 6699:44264; U13 6739:40615): a
 * connection's status as a tinted pill with an 8px dot and its label, radius 8, no border, 24px
 * high as the rows and the header draw it. The API's `state` decides (spec 010, C1): "Draft"
 * (blue), "Scheduled" (green, hollow dot), "Active" (green) or "Deactivated" (grey). The header
 * pill passes the start date, so a scheduled connection reads "Scheduled · 01.12.2026" (E6
 * 7114:49835, FR-006, FR-013), the day shown as written. Below md the pill may shrink to its
 * longest word and wrap that label (the header at 320 px); a one-word label never shrinks. The
 * label says it, not the colour alone (005-ACC.1); the dot is decorative.
 */
export default function ConnectionStatusBadge({ state, startDate }: ConnectionStatusBadgeProps) {
  const { language } = useLanguage();
  const copy = STATUS_PILL_COPY[language];
  const tone = STATUS_PILL_TONES[state];
  const label =
    state === 'scheduled' && startDate
      ? copy.scheduledOn(formatDate(startDate, language))
      : copy[state];
  return (
    <span
      className={`${tone.pill} rounded-kern-default narrow:h-auto narrow:min-h-24 inline-flex h-24 max-w-full shrink-0 items-center gap-6 px-10 max-md:h-auto max-md:min-h-24 max-md:shrink`}
    >
      <span aria-hidden="true" className={`${tone.dot} rounded-kern-circle size-8 shrink-0`} />
      <span
        className={`${tone.label} text-kern-static-small narrow:whitespace-normal leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap max-md:whitespace-normal`}
      >
        {label}
      </span>
    </span>
  );
}
