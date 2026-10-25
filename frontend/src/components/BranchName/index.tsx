import InfoTooltip from '../InfoTooltip';
import { BRANCH_NAME_COPY } from './constants';
import type { BranchNameProps } from './types';

/**
 * A variant's name and, when it has a description, the (i) right after it that shows the
 * description on hover and on keyboard focus (FR-020, F31; Figma U17 6134:8719). A variant
 * without a description shows no (i). Given `children`, they show the name, such as a tab or a
 * heading: the (i) sits beside them, so that it stays out of their name.
 */
export default function BranchName({ name, description, children }: BranchNameProps) {
  const text = description?.trim();
  return (
    <div className="flex min-w-0 items-center gap-4">
      {children ?? <span className="min-w-0 break-words">{name}</span>}
      {text && (
        <InfoTooltip label={BRANCH_NAME_COPY.about(name.trim())} text={text} iconSize="small" />
      )}
    </div>
  );
}
