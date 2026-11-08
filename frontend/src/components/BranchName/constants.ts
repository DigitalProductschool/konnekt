import type { FindingTone } from '@connection-portal/rules/checks/types';

export const BRANCH_NAME_COPY = {
  // The (i)'s accessible name
  about: (name: string) => `About ${name}`,
};

/**
 * The 20 px icons of a variant with findings, on its tab and before its tooltip's findings
 * segment (spec 003, A6; design-notes.md §4, §7 "Icons"): KERN's warning triangle when the variant
 * has a conflict or no citizen can meet it, its info icon otherwise, both in their feedback
 * colour, as at the variant level everywhere (the banner, the dialog's lines)
 */
export const FINDINGS_ICONS: Record<FindingTone, string> = {
  warning: 'kern-icon--warning bg-kern-feedback-warning!',
  info: 'kern-icon--info bg-kern-feedback-info!',
};
