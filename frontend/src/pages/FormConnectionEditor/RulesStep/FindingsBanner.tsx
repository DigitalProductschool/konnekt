import { bannerOf } from '@connection-portal/rules/checks/findingMessages';

import expandLessIcon from '../../../assets/icons/expand-less-action-small.svg';
import expandMoreIcon from '../../../assets/icons/expand-more-action-small.svg';
import { useLanguage } from '../../../hooks/useLanguage';
import {
  BANNER_LOOKS,
  FINDINGS_BANNER_WRAP_CLASSES,
  FINDINGS_TOGGLE_CLASSES,
  findingsListId,
  RULES_STEP_COPY,
} from './constants';
import FindingsBannerLine from './FindingsBannerLine';
import type { FindingsBannerProps } from './types';
import { bannerViewOf } from './utils';

/**
 * The findings banner (S12; spec 003 S2, S7; FR-013, FR-022, FR-041; Figma `Rules/Findings banner`
 * 6750:40865: U44 6750:40882 single warning, 6750:40933 and 6750:41008 collapsed, U45 6750:41077,
 * 6753:40514, 6753:40851 single info, 6753:40144 expanded), first in the rules card after the link
 * strip, the selection bar and the unrequested-data banner (which then takes the same 8px inset),
 * 8px inside the card: the warning
 * background with its 1px border when the variant has a conflict or no citizen can meet it, the
 * info one otherwise (a duplicate, covered or always-met item alone, or the notice that every
 * citizen meets the variant); padding 8 8 8 16, gap 8, body/small text and no title. It draws what `bannerOf()`
 * returns and builds no text (C4: the sentences are `findingMessages.ts`'s): *single*, one line
 * with its sentence (U44 6750:40882), or the notice or the incomplete sentence alone; *collapsed*, the default with
 * two or more lines: the counts row (U44 6750:40933) and the
 * chevron "Show findings"; *expanded*, the counts row, the chevron "Hide findings", then
 * one sentence per line with its own kind icon, 24px in, the notice and the incomplete sentence
 * (without links). Whether a variant's banner is expanded is kept in the step's state while the
 * editor is open, never stored. Nothing is shown before the variant's first check, without
 * checked rules or without findings (W13). It updates in place; it isn't a live region: the
 * status region (`FindingsAnnouncer`) announces the changes (FR-015).
 */
export default function FindingsBanner({
  check,
  branch,
  names,
  expanded,
  dispatch,
  plainItemId,
}: FindingsBannerProps) {
  const { language } = useLanguage();
  const banner = check ? bannerOf(check, branch, names, language) : null;
  if (!banner) {
    return null;
  }
  const copy = RULES_STEP_COPY[language];
  const view = bannerViewOf(banner, expanded, language);
  const listId = findingsListId(branch.key);
  const toggleable = view.state !== 'single';

  return (
    <div data-findings-banner="" className={FINDINGS_BANNER_WRAP_CLASSES}>
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
              className={FINDINGS_TOGGLE_CLASSES.button}
            >
              <span className={FINDINGS_TOGGLE_CLASSES.box}>
                <img src={expanded ? expandLessIcon : expandMoreIcon} alt="" className="size-20" />
              </span>
              <span className="sr-only">{expanded ? copy.hideFindings : copy.showFindings}</span>
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
