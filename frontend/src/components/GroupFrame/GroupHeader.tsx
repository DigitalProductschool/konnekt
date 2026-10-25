import { GROUP_FRAME_COPY } from './constants';
import type { GroupHeaderProps } from './types';

/**
 * Figma "Rules/Group header" (U14 6094:6413; sub-group 6094:6320): the name in the action
 * colour, title/default for a group and title/small for a sub-group, how its members combine,
 * and the ⋯ slot. On the details, the identifier follows the name (W1).
 */
export default function GroupHeader({
  name,
  subGroup,
  operator,
  nameSlot,
  identifier,
  actions,
}: GroupHeaderProps) {
  const nameSize = subGroup
    ? 'text-kern-static-medium leading-(--kern-typography-line-height-medium-static)'
    : 'text-kern-adaptive-medium leading-(--kern-typography-line-height-medium-adaptive)';
  return (
    <div className="flex items-center gap-8 border-b border-(--kern-color-decorative-border-default) pr-16 pb-8 pl-24">
      <div className="flex min-w-0 flex-1 flex-col">
        {nameSlot ?? (
          <p className={`${nameSize} flex flex-wrap items-baseline gap-x-8`}>
            <span className="text-kern-action-default font-semibold break-words">{name}</span>
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
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  );
}
