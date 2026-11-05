import { LICENCE_CLASSES_SET } from '@connection-portal/rules/constants';

import ChoiceField from './ChoiceField';
import DateOfBirthField from './DateOfBirthField';
import type { EditorFieldProps } from './types';
import { ageDraftKey, ageTextOf, entryTextOf } from './utils';
import ValueField from './ValueField';
import ValuesField from './ValuesField';

/**
 * The field for one value, by its kind (S8.5; FR-006, F12): a date of birth with "Age today", text,
 * a whole number or a date as typed, one value of a set as a select, several as a picker. A field
 * shows its draft's text while it has one, otherwise the persona's value
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
  const text = draft?.text ?? entryTextOf(field.kind, value);
  if (field.kind === 'enum') {
    return field.multiple ? (
      <ValuesField
        id={id}
        label={field.label}
        choices={choices}
        classes={field.optionSet === LICENCE_CLASSES_SET}
        value={value}
        onChange={(values) => onValue(field, values)}
      />
    ) : (
      <ChoiceField
        id={id}
        label={field.label}
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
        label={field.label}
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
      label={field.label}
      text={text}
      kind={field.kind}
      error={draft?.error ?? null}
      onChange={(entry) => onText(field, entry)}
    />
  );
}
