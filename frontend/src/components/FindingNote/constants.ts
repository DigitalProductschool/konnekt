import type { ItemFindingKind } from '../../utils/rules/checks/types';
import type { FindingLook } from './types';

// The look of each kind (F4; design-notes.md §7, "Colours" and "Icons"): conflicts in KERN's
// warning colour with its warning triangle, redundant and always-met items less prominently in
// KERN's info colour with its info icon (FR-019). Spec 002's problems keep their red look
export const FINDING_LOOKS: Record<ItemFindingKind, FindingLook> = {
  conflicting: {
    text: 'text-kern-feedback-warning',
    icon: 'kern-icon--warning bg-kern-feedback-warning!',
    outline: 'border-kern-feedback-warning',
  },
  redundant: {
    text: 'text-kern-feedback-info',
    icon: 'kern-icon--info bg-kern-feedback-info!',
    outline: 'border-kern-feedback-info',
  },
  always_met: {
    text: 'text-kern-feedback-info',
    icon: 'kern-icon--info bg-kern-feedback-info!',
    outline: 'border-kern-feedback-info',
  },
};

// Appended to a rule row's or group frame's id for its note's id, which describes it
export const FINDING_NOTE_ID_SUFFIX = '-finding';
