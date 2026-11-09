import { LICENCE_CLASSES_SET } from '@connection-portal/rules/constants';

import ChoiceField from './ChoiceField';
import DateOfBirthField from './DateOfBirthField';
import type { EditorFieldProps } from './types';
import { ageDraftKey, ageTextOf, editorLabelOf, entryTextOf } from './utils';
import ValueField from './ValueField';
import ValuesField from './ValuesField';

/**
 * The field for one value in the edit-data dialog, by its kind (S8.5; FR-006, F12; spec 008 F40):
 * a date of birth with "Age today", text, a whole number or a date as typed, one value of a set as
 * a select (Nationality), several as a picker (licence classes by code). A field shows its draft's
 * text while it has one, otherwise the dialog's value; its label is `editorLabelOf()`'s ("Date of
 * birth", "Class B since")
 */
export default function EditorField({
  field,
  value,
  choices,
  today,
  drafts,
  id,
  onText,
  onAge,
  onValue,
}: EditorFieldProps) {
  const draft = drafts[field.key];
  const label = editorLabelOf(field);
  const text = draft?.text ?? entryTextOf(field.kind, value);
  if (field.kind === 'enum') {
    return field.multiple ? (
      <ValuesField
        id={id}
        label={label}
        choices={choices}
        classes={field.optionSet === LICENCE_CLASSES_SET}
        value={value}
        onChange={(values) => onValue(field, values)}
      />
    ) : (
      <ChoiceField
        id={id}
        label={label}
        choices={choices}
        value={value}
        onChange={(chosen) => onValue(field, chosen)}
      />
    );
  }
  if (field.kind === 'date' && field.dateOfBirth) {
    const age = drafts[ageDraftKey(field.key)];
    return (
      <DateOfBirthField
        id={id}
        label={label}
        dateText={text}
        dateError={draft?.error ?? null}
        ageText={age?.text ?? ageTextOf(value, today)}
        ageError={age?.error ?? null}
        onDateChange={(entry) => onText(field, entry)}
        onAgeChange={(entry) => onAge(field, entry)}
      />
    );
  }
  return (
    <ValueField
      id={id}
      label={label}
      text={text}
      kind={field.kind}
      error={draft?.error ?? null}
      onChange={(entry) => onText(field, entry)}
    />
  );
}
