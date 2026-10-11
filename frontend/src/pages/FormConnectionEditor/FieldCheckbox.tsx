import Checkbox from '../../components/Checkbox';
import type { FieldCheckboxProps } from './types';

/** One field of a document, in a column 236px wide as in the design. */
export default function FieldCheckbox({ id, label, checked, onChange }: FieldCheckboxProps) {
  return (
    <li className="w-full sm:w-236">
      <Checkbox id={id} label={label} checked={checked} onChange={onChange} />
    </li>
  );
}
