import { defineTexts } from '@connection-portal/rules/language';

import type { ConnectionStatus, StatusPillTone } from './types';

// Figma "Status/Connection" (7341:101125; U11 6699:44264, 6699:44277, 6699:44290): the label,
// so that the status never rests on colour alone (005-ACC.1); G§2 "active / deactivated"
export const STATUS_PILL_COPY = defineTexts<Record<ConnectionStatus, string>>(
  { active: 'Active', draft: 'Draft', deactivated: 'Deactivated' },
  { active: 'Aktiv', draft: 'Entwurf', deactivated: 'Deaktiviert' }
);

/**
 * The pill's colours as "Status/Connection" draws them (raw hexes in Figma, no variables): where
 * a hex equals an overlay token the token is used, otherwise the hex. Draft's label `#05669e`
 * is the design's own AA-passing blue (5.38:1 on `#e0f2fe`); its dot keeps the Revamp's
 * `#0284c7` (a decorative graphic beside the text).
 */
export const STATUS_PILL_TONES: Record<ConnectionStatus, StatusPillTone> = {
  active: {
    pill: 'bg-kern-feedback-success-background',
    dot: 'bg-kern-feedback-success',
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
