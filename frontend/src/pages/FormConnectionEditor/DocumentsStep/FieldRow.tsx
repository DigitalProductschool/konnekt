import Checkbox from '../../../components/Checkbox';
import type { FieldRowProps } from './types';

/**
 * Figma "Data/Check item" (U21 7290:61217): one data item of the shown document, in the
 * catalog's order without group rows (F24). Its column keeps it whole; a long label wraps under
 * its text, the box on the first line (T016).
 */
export default function FieldRow({ id, label, checked, onChange }: FieldRowProps) {
  return (
    <li className="break-inside-avoid">
      <Checkbox id={id} label={label} checked={checked} onChange={onChange} />
    </li>
  );
}
