import type { ItemFindingKind } from '@connection-portal/rules/checks/types';

import type { FindingLook } from './types';

// The look of each kind (A3, A4; design-notes.md §7, "Update 2026-11-01" and "Icons"): a conflict
// with KERN's warning triangle in the warning colour and a warning outline; a redundant or
// always-met item, less prominently (FR-019), with KERN's info icon in `layout-text-muted`, the
// colour the notes' `icon-info-small` takes (U02 6171:7510), and an info outline. The note's text
// is the default text colour for every kind. Spec 002's problems keep their red look (W11)
export const FINDING_LOOKS: Record<ItemFindingKind, FindingLook> = {
  conflicting: {
    icon: 'kern-icon--warning bg-kern-feedback-warning!',
    outline: 'border-kern-feedback-warning',
  },
  redundant: {
    icon: 'kern-icon--info bg-kern-layout-text-muted!',
    outline: 'border-kern-feedback-info',
  },
  always_met: {
    icon: 'kern-icon--info bg-kern-layout-text-muted!',
    outline: 'border-kern-feedback-info',
  },
};

// Appended to a rule row's or group frame's id for its note's id, which describes it
export const FINDING_NOTE_ID_SUFFIX = '-finding';
