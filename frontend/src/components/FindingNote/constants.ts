import type { ItemFindingKind } from '@konnekt/rules/checks/types';

import type { FindingLook } from './types';

// The look of each kind, as Figma "Rules/Problem note" draws its finding levels (6177:7837; U44
// 6171:7489, 6171:7509, 6750:41109; U45 6753:40823): a conflict with the warning triangle
// (`icon-warning-small`) in `feedback-warning` and a warning outline; a redundant or always-met
// item, less prominently (FR-019), with the info icon (`icon-info-small`) in `feedback-info` and an
// info outline. The note's text is the default text colour for every kind. Spec 002's problems
// keep their red look (W11)
export const FINDING_LOOKS: Record<ItemFindingKind, FindingLook> = {
  conflicting: {
    icon: 'kern-icon--warning bg-kern-feedback-warning!',
    outline: 'border-kern-feedback-warning',
  },
  redundant: {
    icon: 'kern-icon--info bg-kern-feedback-info!',
    outline: 'border-kern-feedback-info',
  },
  always_met: {
    icon: 'kern-icon--info bg-kern-feedback-info!',
    outline: 'border-kern-feedback-info',
  },
};

// Appended to a rule row's or group frame's id for its note's id, which describes it
export const FINDING_NOTE_ID_SUFFIX = '-finding';
