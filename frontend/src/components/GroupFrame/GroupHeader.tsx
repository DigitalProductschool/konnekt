import BranchMark from '../BranchMark';
import { INACTIVE_OPACITY } from '../BranchMark/constants';
import { GROUP_FRAME_COPY } from './constants';
import type { GroupHeaderProps } from './types';

/**
 * Figma "Rules/Group header" (U14 6094:6413; sub-group 6094:6320): the name in the action
 * colour, title/default for a group and title/small for a sub-group, how its members combine,
 * its variant mark (FR-023) and the ⋯ slot. On the details, the identifier follows the name
 * (W1). Removed, or dissolved in its variant, its text fades and its name is struck through.
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
}: GroupHeaderProps) {
  const nameSize = subGroup
    ? 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)'
    : 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)';
  return (
    <div
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-describedby={describedBy}
      className="focus-visible:outline-kern-action-focus-default flex items-center gap-8 border-b border-(--kern-color-decorative-border-default) pr-16 pb-8 pl-24 focus-visible:outline-4 focus-visible:outline-offset-2"
    >
      <div className={`flex min-w-0 flex-1 flex-col ${inactive ? INACTIVE_OPACITY : ''}`}>
        {nameSlot ?? (
          <p className={`${nameSize} flex flex-wrap items-baseline gap-x-8`}>
            <span
              className={`text-kern-action-default font-semibold break-words ${inactive ? 'line-through' : ''}`}
            >
              {name}
            </span>
            {identifier && (
              <span className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
                <span className="sr-only">{GROUP_FRAME_COPY.identifier} </span>
                {identifier}
              </span>
            )}
          </p>
        )}
        <p className="text-kern-static-small text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)">
          {GROUP_FRAME_COPY.subtitles[operator]}
        </p>
      </div>
      {(mark || actions) && (
        <div className="flex shrink-0 items-center gap-8">
          {mark && <BranchMark mark={mark} />}
          {actions}
        </div>
      )}
    </div>
  );
}
