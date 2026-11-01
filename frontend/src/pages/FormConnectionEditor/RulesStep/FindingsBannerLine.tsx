import { BANNER_ICONS } from './constants';
import FindingLink from './FindingLink';
import type { FindingsBannerLineProps } from './types';

/**
 * One row of the findings banner (spec 003, S2; A1, W19; Figma `Rules/Finding item` 6750:40604,
 * the banner's summary row 6750:40606): the 20 px kind icon, 8 px, then the text in body/small
 * regular and `layout-text-default`, its names as links (`FindingLink`), except the rule open in
 * the rule editor, which has no row. The icon is hidden from assistive technologies; a line's
 * visually hidden kind text takes its place ("Conflicting: Rule 01 and Rule 02 …"). The summary
 * row passes its chevron as `children`.
 */
export default function FindingsBannerLine({
  item,
  branchKey,
  plainItemId,
  children,
}: FindingsBannerLineProps) {
  return (
    <div className="flex items-center gap-8">
      <span
        aria-hidden="true"
        className={`kern-icon ${BANNER_ICONS[item.tone]} kern-icon--small shrink-0`}
      />
      <p className="text-kern-layout-text-default min-w-px flex-1 text-(length:--kern-font-size-14) leading-(--kern-typography-line-height-medium-static)">
        {item.kindText && <span className="sr-only">{item.kindText} </span>}
        {item.parts.map((part, index) => {
          if (typeof part === 'string') {
            return part;
          }
          if (part.itemId === plainItemId) {
            return part.name;
          }
          return (
            <FindingLink key={`${part.itemId}-${index}`} reference={part} branchKey={branchKey} />
          );
        })}
      </p>
      {children}
    </div>
  );
}
