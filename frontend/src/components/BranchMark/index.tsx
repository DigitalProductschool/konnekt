import { useCopy } from '../../hooks/useLanguage';
import { BRANCH_MARK_COLOURS, BRANCH_MARK_COPY } from './constants';
import type { BranchMarkProps } from './types';

/**
 * Figma "Rules/Variant status" (6118:3681; U57 6522:32682, U58 6522:32977, U47 6185:8555): how a
 * rule or group of a variant based on Standard differs from Standard's, in its colour and in
 * words, left of the ⋮ menu (FR-023, W4): a 14/24 semibold label on a tag with radius 4 and
 * padding 2/8. It shows whatever mark it gets, also on an item faded inside a removed group, so
 * that "Changed here" stays there (F36, FR-040).
 */
export default function BranchMark({ mark }: BranchMarkProps) {
  const copy = useCopy(BRANCH_MARK_COPY);
  return (
    <span
      className={`${BRANCH_MARK_COLOURS[mark]} rounded-kern-small text-kern-static-small shrink-0 px-8 py-2 leading-(--kern-typography-line-height-medium-static) font-semibold whitespace-nowrap`}
    >
      {copy[mark]}
    </span>
  );
}
