import { BRANCH_MARK_COLOURS, BRANCH_MARK_COPY } from './constants';
import type { BranchMarkProps } from './types';

/**
 * Figma "Rules/Variant status" (U17 6134:9009, 6134:9064; U18 6163:5856, 6163:5440): how a rule
 * or group of a variant based on Standard differs from Standard's, in its colour and in words,
 * left of the ⋯ menu (FR-023, W4).
 */
export default function BranchMark({ mark }: BranchMarkProps) {
  return (
    <span
      className={`${BRANCH_MARK_COLOURS[mark]} rounded-kern-small text-kern-static-small shrink-0 px-8 py-2 leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap`}
    >
      {BRANCH_MARK_COPY[mark]}
    </span>
  );
}
