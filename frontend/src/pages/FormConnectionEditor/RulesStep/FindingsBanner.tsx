import expandLessIcon from '../../../assets/icons/expand-less-action-small.svg';
import expandMoreIcon from '../../../assets/icons/expand-more-action-small.svg';
import { bannerOf } from '../../../utils/rules/checks/findingMessages';
import { BANNER_LOOKS, findingsListId, RULES_COPY } from './constants';
import FindingsBannerLine from './FindingsBannerLine';
import type { FindingsBannerProps } from './types';
import { bannerViewOf } from './utils';

/**
 * The findings banner at the top of the open variant's rules (spec 003, S2, S7; A1, A2, A7, W4,
 * W8, W12, W13, W17, W19; FR-005, FR-006, FR-010, FR-013; Figma `Rules/Findings banner`
 * 6750:40865: U01 6750:40882, U02 6750:40933, U04 6750:41077, U05 6753:40144, U06 6753:40514, U07
 * 6753:40851, U08 6753:41324), 8 px inside the rules card: the warning background with its 1 px
 * border when the variant has a conflict or no applicant can meet it, the info one otherwise, as
 * for a duplicate, covered or always-met item alone or "Every applicant meets the rules of …"
 * (FR-019; a variant no applicant can meet has only its conflicts, W4); padding 8 and 16 on the
 * left, body/small text and no title. It draws what `bannerOf()` returns and builds no text
 * (design-notes.md §3.3): *single*, one line with what follows it, or the notice or FR-010's
 * sentence alone; *collapsed*, the default with
 * two or more lines, the counts row and a chevron "Show findings"; *expanded*, the counts row,
 * the chevron "Hide findings", then one item per line, the notice and FR-010's sentence. Whether
 * a variant's banner is expanded is kept in the step's state while the editor is open, never
 * stored. Nothing is shown before the variant's first check, or without checked rules (W13). The
 * banner isn't a live region: the status region announces the changes (FR-015).
 */
export default function FindingsBanner({
  check,
  branch,
  names,
  expanded,
  dispatch,
  plainItemId,
}: FindingsBannerProps) {
  const banner = check ? bannerOf(check, branch, names) : null;
  if (!banner) {
    return null;
  }
  const view = bannerViewOf(banner, expanded);
  const listId = findingsListId(branch.key);
  const toggleable = view.state !== 'single';

  return (
    <div className="p-8">
      <div
        className={`${BANNER_LOOKS[banner.kind]} rounded-kern-default flex flex-col gap-8 border py-8 pr-8 pl-16`}
      >
        <FindingsBannerLine item={view.summary} branchKey={branch.key} plainItemId={plainItemId}>
          {toggleable && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={listId}
              onClick={() => dispatch({ type: 'toggleFindings', branchKey: branch.key })}
              className="group flex size-48 shrink-0 cursor-pointer items-center justify-center focus-visible:outline-none"
            >
              <span className="rounded-kern-default group-focus-visible:outline-kern-action-focus-default flex size-40 items-center justify-center group-focus-visible:outline-4 group-focus-visible:outline-offset-2">
                <img src={expanded ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
              </span>
              <span className="sr-only">
                {expanded ? RULES_COPY.hideFindings : RULES_COPY.showFindings}
              </span>
            </button>
          )}
        </FindingsBannerLine>
        {toggleable && (
          <ul id={listId} hidden={!expanded} className="flex flex-col gap-4 pb-4 pl-24">
            {view.items.map((item) => (
              <li key={item.key}>
                <FindingsBannerLine item={item} branchKey={branch.key} plainItemId={plainItemId} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
