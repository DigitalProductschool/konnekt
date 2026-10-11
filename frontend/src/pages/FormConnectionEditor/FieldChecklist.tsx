import Checkbox from '../../components/Checkbox';
import { EDITOR_COPY, ELEMENT_IDS } from './constants';
import FieldCheckbox from './FieldCheckbox';
import type { FieldChecklistProps } from './types';

/**
 * The fields of one document as KERN checkboxes, with "All data", which is mixed while only
 * some of them are selected. The items wrap: three per row on desktop, fewer on narrow
 * screens.
 */
export default function FieldChecklist({
  documentType,
  selected,
  errorId,
  onSetField,
  onSetAllFields,
}: FieldChecklistProps) {
  const allKeys = documentType.fields.map((field) => field.key);
  const allSelected = selected.length === allKeys.length;

  return (
    <div role="group" aria-labelledby={ELEMENT_IDS.title(documentType.key)}>
      <div className="border-kern-neutral-100 border-b px-24 pt-4 pb-8">
        <Checkbox
          id={ELEMENT_IDS.allData(documentType.key)}
          label={EDITOR_COPY.allData}
          checked={allSelected}
          indeterminate={selected.length > 0 && !allSelected}
          describedBy={errorId}
          onChange={(checked) => onSetAllFields(checked ? allKeys : [])}
        />
      </div>
      <ul className="flex flex-wrap gap-x-16 gap-y-8 px-24 pt-16 pb-24">
        {documentType.fields.map((field) => (
          <FieldCheckbox
            key={field.key}
            id={ELEMENT_IDS.field(documentType.key, field.key)}
            label={field.label}
            checked={selected.includes(field.key)}
            onChange={(checked) => onSetField(field.key, checked)}
          />
        ))}
      </ul>
    </div>
  );
}
