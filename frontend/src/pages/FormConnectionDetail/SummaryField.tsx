import type { SummaryFieldProps } from './types';

/** One requested field, in the column layout of the data card's checkboxes. */
export default function SummaryField({ label }: SummaryFieldProps) {
  return (
    <li className="text-kern-static-medium text-kern-layout-text-default w-full sm:w-236">
      {label}
    </li>
  );
}
