// The announcements of the rule checks (specs/003-rule-consistency-checks, FR-015; data-model.md
// "Announcements"; design-notes.md §5): what changed between a branch's previous result and its
// new one, after a change the team member made, worded by `announcementOf()`. Pure, so that the
// run state's reducer can call it. Composed in `context.language` (spec 009, R4), English by
// default: the module has no words of its own, `announcementOf()` words every sentence
import { DEFAULT_LANGUAGE } from '../language';
import { announcementOf } from './findingMessages';
import type {
  AnnouncementContext,
  BranchCheck,
  BranchNotice,
  CheckCause,
  FindingAppeared,
  FindingChange,
  FindingGone,
  ItemFinding,
  NamedBranch,
} from './types';

/** Whether two findings on the same item say the same: kind, reason and `today` */
function sameFinding(a: ItemFinding, b: ItemFinding): boolean {
  return (
    a.kind === b.kind &&
    a.today === b.today &&
    JSON.stringify(a.reason) === JSON.stringify(b.reason)
  );
}

function sameNotice(a: BranchNotice | null, b: BranchNotice | null): boolean {
  return a?.kind === b?.kind && a?.today === b?.today;
}

/**
 * The changes of one item's finding: one going, one appearing, or, when its kind changed, one
 * going and then one appearing. A finding whose reason or `today` changed, with its kind
 * unchanged, appears again with its new wording (design-notes.md §5). Disappearances only when
 * `complete`, since an incomplete result may just not have found the finding again
 */
function itemChanges(
  before: ItemFinding | undefined,
  after: ItemFinding | undefined,
  branch: NamedBranch,
  complete: boolean
): (FindingAppeared | FindingGone)[] {
  if (before && after && sameFinding(before, after)) {
    return [];
  }
  const changes: (FindingAppeared | FindingGone)[] = [];
  if (before && complete && before.kind !== after?.kind) {
    changes.push({ type: 'gone', branch, finding: before });
  }
  if (after) {
    changes.push({ type: 'appeared', branch, finding: after });
  }
  return changes;
}

/**
 * The changes between a branch's previous result and its new one, of every kind of finding
 * (conflicting, redundant, always met) and both notices: per item in the current display order (`names`), the going before the appearing; then the notice.
 * Items without a current name, such as deleted ones, come last; their findings have no text
 */
export function findingChanges(
  previous: BranchCheck,
  next: BranchCheck,
  context: Omit<AnnouncementContext, 'shownBranch' | 'language'>
): FindingChange[] {
  const { branch, names } = context;
  const before = new Map(previous.findings.map((finding) => [finding.itemId, finding]));
  const after = new Map(next.findings.map((finding) => [finding.itemId, finding]));
  const order = [...names.keys()];
  const position = (id: string): number => {
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  const itemIds = [...new Set([...after.keys(), ...before.keys()])].sort(
    (a, b) => position(a) - position(b)
  );
  const changes: FindingChange[] = itemIds.flatMap((id) =>
    itemChanges(before.get(id), after.get(id), branch, next.complete)
  );
  const { notice } = next;
  if (notice && !sameNotice(previous.notice, notice)) {
    changes.push({ type: 'notice', branch, notice });
  }
  return changes;
}

/**
 * The sentences that announce a branch's new result (FR-015), in display order, for the polite
 * status region: '' sentences are left out; the caller joins them with a space. Only after a
 * change the team member made (`'action'`): a branch's first result (`'first'`, or no `previous`)
 * and a new day in Germany (`'new_day'`) announce nothing
 */
export function announcementsFor(
  previous: BranchCheck | null,
  next: BranchCheck,
  cause: CheckCause,
  context: AnnouncementContext
): string[] {
  if (cause !== 'action' || previous === null) {
    return [];
  }
  const language = context.language ?? DEFAULT_LANGUAGE;
  return findingChanges(previous, next, context)
    .map((change) => announcementOf(change, context.names, context.shownBranch, language))
    .filter((sentence) => sentence.length > 0);
}
