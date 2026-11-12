import Checkbox from '../../../components/Checkbox';
import { ELEMENT_IDS } from '../constants';
import FieldRow from './FieldRow';
import type { FieldGroupProps } from './types';
import { groupCheckStateOf } from './utils';

/**
 * Figma "Group · Name" (U21 7290:61214, U98 7296:52342; S8 "Data groups", FR-077, FR-079): one
 * data group of the shown document, kept whole in its column (`break-inside: avoid`, R15 V8) and
 * 16px above the next. Its heading is a "Data/Check item" with the group's name as its 16px
 * semibold label, ticked while all of its data items are chosen and mixed while some are; using
 * it chooses or clears them all (`onToggle`). Its data items follow 24px in, in the catalog's
 * order, as the list without groups shows them.
 */
export default function FieldGroup({
  documentType,
  group,
  chosen,
  onSetField,
  onToggle,
}: FieldGroupProps) {
  const state = groupCheckStateOf(group, chosen);
  return (
    <li className="mb-16 break-inside-avoid last:mb-0">
      <div className="[&_.kern-label]:text-kern-static-medium! [&_.kern-label]:font-semibold!">
        <Checkbox
          id={ELEMENT_IDS.group(documentType, group.key)}
          label={group.label}
          checked={state === 'all'}
          indeterminate={state === 'some'}
          onChange={onToggle}
        />
      </div>
      <ul aria-label={group.label} className="pl-24">
        {group.fields.map((field) => (
          <FieldRow
            key={field.key}
            id={ELEMENT_IDS.field(documentType, field.key)}
            label={field.label}
            checked={chosen.includes(field.key)}
            onChange={(checked) => onSetField(field.key, checked)}
          />
        ))}
      </ul>
    </li>
  );
}
