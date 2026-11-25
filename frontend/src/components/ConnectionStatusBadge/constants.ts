import type { ConnectionState } from '@konnekt/api-types/form-connections';
import { defineTexts } from '@konnekt/rules/language';

import type { StatusPillCopy, StatusPillTone } from './types';

// Figma "Status/Connection" (7341:101125; U11 6699:44264, 6699:44277, 6699:44290; U13
// 6739:40615 "Scheduled"; the header pill E6 7114:49835 "Scheduled · 01.12.2026"): the label,
// so that the status never rests on colour alone (005-ACC.1); G§2 "active / deactivated", and
// spec 010's "scheduled" row ("Geplant", "Geplant · 01.12.2026"). A no-break space keeps the
// "·" with the status where the header pill wraps below md (T014), so the date takes the 2nd line
export const STATUS_PILL_COPY = defineTexts<StatusPillCopy>(
  {
    draft: 'Draft',
    scheduled: 'Scheduled',
    live: 'Active',
    deactivated: 'Deactivated',
    scheduledOn: (date) => `Scheduled\u00a0· ${date}`,
  },
  {
    draft: 'Entwurf',
    scheduled: 'Geplant',
    live: 'Aktiv',
    deactivated: 'Deaktiviert',
    scheduledOn: (date) => `Geplant\u00a0· ${date}`,
  }
);

/**
 * The pill's colours as "Status/Connection" draws them (raw hexes in Figma, no variables): where
 * a hex equals an overlay token the token is used, otherwise the hex. Draft's label `#05669e`
 * is the design's own AA-passing blue (5.38:1 on `#e0f2fe`); its dot keeps the Revamp's
 * `#0284c7` (a decorative graphic beside the text). Scheduled has active's tint and label and a
 * hollow dot: a 1.5 px ring in `#1d7a2e` (the "Dot" vector, r 3.25 with a 1.5 stroke, 8 × 8),
 * drawn as an inset shadow because browsers round a 1.5 px border down to 1 px.
 */
export const STATUS_PILL_TONES: Record<ConnectionState, StatusPillTone> = {
  live: {
    pill: 'bg-kern-feedback-success-background',
    dot: 'bg-kern-feedback-success',
    label: 'text-kern-feedback-success',
  },
  scheduled: {
    pill: 'bg-kern-feedback-success-background',
    dot: 'shadow-[inset_0_0_0_1.5px_var(--kern-color-feedback-success)]',
    label: 'text-kern-feedback-success',
  },
  draft: {
    pill: 'bg-kern-feedback-info-background',
    dot: 'bg-[#0284c7]',
    label: 'text-[#05669e]',
  },
  deactivated: {
    pill: 'bg-[#eff1f4]',
    dot: 'bg-[#8c94a1]',
    label: 'text-kern-layout-text-muted',
  },
};
