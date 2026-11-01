import { tabLabelOf } from '../../utils/rules/checks/findingMessages';
import InfoTooltip from '../InfoTooltip';
import { BRANCH_NAME_COPY, FINDINGS_ICONS } from './constants';
import FindingsSegment from './FindingsSegment';
import type { BranchNameProps } from './types';

/**
 * A variant's name and, when it has a description, the (i) right after it that shows the
 * description on hover and on keyboard focus (FR-020, F31; Figma U17 6134:8719). A variant
 * without a description shows no (i). Given `children`, they show the name, such as a tab or a
 * heading: the (i) sits beside them, so that it stays out of their name.
 *
 * With `findings` (spec 003, S4; A6, W20; FR-014), the (i) becomes the findings icon, merged with
 * the description's: KERN's warning triangle, or its info icon, in the feedback colour, named
 * "Ambulance has findings". Its tooltip shows the description, if any, then the findings segment.
 * Only the rules step's tabs pass them (FR-020).
 */
export default function BranchName({ name, description, findings, children }: BranchNameProps) {
  const text = description?.trim();
  const label = name.trim();
  return (
    <div className="flex min-w-0 items-center gap-4">
      {children ?? <span className="min-w-0 break-words">{name}</span>}
      {findings ? (
        <InfoTooltip
          label={tabLabelOf(label)}
          icon={FINDINGS_ICONS[findings.kind]}
          iconSize="small"
          text={
            <span className="flex flex-col gap-8">
              {text && <span>{text}</span>}
              <FindingsSegment findings={findings} divided={Boolean(text)} />
            </span>
          }
        />
      ) : (
        text && <InfoTooltip label={BRANCH_NAME_COPY.about(label)} text={text} iconSize="small" />
      )}
    </div>
  );
}
