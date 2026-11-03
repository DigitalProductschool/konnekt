// The announcement of a change of outcome (specs/004-rule-test-personas, FR-017, F2;
// data-model.md "Announcements"). Pure; the text goes to an invisible polite status region, never
// to a toast.
//
// Bundle (research R9, R16): this module is in the main bundle, so it never imports `checks/*`,
// `evaluation.ts`, `personas/fields.ts` or `personas/results.ts` (type-only imports are fine).
import { noLongerMeetsOf, nowMeetsOf } from './messages';
import type { Persona } from './types';

/** A persona's `met` per branch, by branch key (`PersonaBranchResult.met`) */
export type MetByBranch = Readonly<Record<string, boolean | undefined>>;

/** What the sentences need of a branch: its key and its name, as the tabs show them */
export interface AnnouncedBranch {
  key: string;
  name: string;
}

/**
 * One sentence per branch whose outcome for the persona changed between `before` and `after`, in
 * the order of `branches` (the tabs'), joined with a space; '' when nothing changed. A branch
 * without an outcome on either side (not evaluable) is left out.
 */
export function announcementOf(
  before: MetByBranch,
  after: MetByBranch,
  persona: Pick<Persona, 'name'>,
  branches: readonly AnnouncedBranch[]
): string {
  const sentences: string[] = [];
  for (const { key, name } of branches) {
    const was = before[key];
    const is = after[key];
    if (was === undefined || is === undefined || was === is) {
      continue;
    }
    sentences.push(is ? nowMeetsOf(persona, name) : noLongerMeetsOf(persona, name));
  }
  return sentences.join(' ');
}
