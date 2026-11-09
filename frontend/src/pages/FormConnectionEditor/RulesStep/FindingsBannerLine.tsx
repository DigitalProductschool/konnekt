import { BANNER_ICONS } from './constants';
import FindingLink from './FindingLink';
import type { FindingsBannerLineProps } from './types';

/**
 * One row of the findings banner (S12; spec 003 S2; Figma `Rules/Finding item` 6750:40604 and the
 * banner's summary row 6750:40606; U45 6753:40144): the 20px kind icon (the warning triangle for a
 * conflict, the info icon for a duplicate, covered or always-met item, U45 #30), 8px, then the
 * sentence in body/small regular and `layout-text-default`, its names as links (`FindingLink`,
 * F39), except the rule open in the rule editor, which has no row. The icon is hidden from
 * assistive technologies; a line's visually hidden kind text takes its place ("Conflicting: Rule
 * 01 and Rule 02 …", W13). The summary row passes its chevron as `children`.
 */ export default function FindingsBannerLine({
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
      <p className="text-kern-layout-text-default min-w-px flex-1 text-(length:--kern-font-size-14) leading-(--kern-typography-line-height-medium-static) wrap-anywhere">
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
