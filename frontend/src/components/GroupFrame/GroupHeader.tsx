import { useCopy } from '../../hooks/useLanguage';
import BranchMark from '../BranchMark';
import { INACTIVE_OPACITY } from '../BranchMark/constants';
import { GROUP_FRAME_COPY, GROUP_HEADER_DIVIDERS } from './constants';
import type { GroupHeaderProps } from './types';

/**
 * Figma "Rules/Group header" (6082:3513; U34 6094:6413, sub-group 6094:6320) in the frame's
 * "Header": 24px in, 16px from the right, 8px above the 1px `decorative-border` divider. The name
 * in the action colour, `title/default` (18/24) for a group and `title/small` (16/24) for a
 * sub-group, over its subtitle in `body/small` muted, which says how its members combine; then
 * its variant mark and the ⋯ slot, 8px apart (FR-023). On the details, the identifier follows
 * the name (W1). Removed, dissolved or inside a removed group, the name and subtitle fade to 40%
 * and the name is struck through, while the mark and the ⋯ keep their colour (U47 6185:41167).
 * Given an `id`, it can take the focus from script, described by the group's note: the findings
 * banner's name links move the focus to it (spec 003, W19).
 */
export default function GroupHeader({
  id,
  describedBy,
  name,
  subGroup,
  operator,
  nameSlot,
  identifier,
  actions,
  mark = null,
  inactive = false,
  faded = false,
}: GroupHeaderProps) {
  const copy = useCopy(GROUP_FRAME_COPY);
  const nameSize = subGroup
    ? 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)'
    : 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)';
  const divider = faded ? GROUP_HEADER_DIVIDERS.faded : GROUP_HEADER_DIVIDERS.default;
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-describedby={describedBy}
      className={`${divider} focus-visible:outline-kern-action-focus-default narrow:flex-wrap flex items-center gap-8 border-b pr-16 pb-8 pl-24 focus-visible:outline-4 focus-visible:outline-offset-2`}
    >
      {/* Under 320 CSS px the mark and the actions take a line under the text (T096) */}
      <div
        className={`narrow:basis-full flex min-w-0 flex-1 flex-col ${inactive ? INACTIVE_OPACITY : ''}`}
      >
        {nameSlot ?? (
          <p className={`${nameSize} flex flex-wrap items-baseline gap-x-8`}>
            <span
              className={`text-kern-action-default font-semibold break-words ${inactive ? 'line-through' : ''}`}
            >
              {name}
            </span>
            {identifier && (
              <span className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
                <span className="sr-only">{copy.identifier} </span>
                {identifier}
              </span>
            )}
          </p>
        )}
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {copy.subtitles[operator]}
        </p>
      </div>
      {(mark || actions) && (
        <div className="narrow:ml-auto narrow:flex-wrap flex shrink-0 items-center justify-end gap-8">
          {mark && <BranchMark mark={mark} />}
          {actions}
        </div>
      )}
    </div>
  );
}
