import ValueChip from '../../components/RuleRow/ValueChip';
import type { SummaryFieldProps } from './types';

/**
 * One requested field of a document in the Summary, as Figma "Rules/Value chip" (6082:3447; U82
 * 6396:48206): `label/small` on white, 1px `decorative-border`, radius 4, padding 2 8.
 */
export default function SummaryField({ label }: SummaryFieldProps) {
  return (
    <li className="flex">
      <ValueChip value={label} />
    </li>
  );
}
