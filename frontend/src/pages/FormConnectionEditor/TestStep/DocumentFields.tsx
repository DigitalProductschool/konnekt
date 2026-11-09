import { optionsOf } from '@connection-portal/rules/conditions';
import { LICENCE_CLASSES_SET } from '@connection-portal/rules/constants';
import type { PersonaField } from '@connection-portal/rules/personas/types';

import { ELEMENT_IDS } from '../constants';
import EditorField from './EditorField';
import type { DocumentFieldsProps } from './types';

/**
 * Where a field sits in the document's two columns: the date of birth takes a row with its "Age
 * today", "Licence classes" starts a row, so that its classes' dates follow beside and under it
 * (U66 7058:60660: "Licence classes" | "Class B since")
 */
function cellClassOf(field: PersonaField): string {
  if (field.dateOfBirth) {
    return 'sm:col-span-2';
  }
  return field.optionSet === LICENCE_CLASSES_SET && field.multiple ? 'sm:col-start-1' : '';
}

/**
 * One document's fields in the edit-data dialog (S8.5; F9; spec 008 FR-042; Figma "Personal ID"
 * 7058:60653, "Driving licence" 7058:60658): its heading (title/small), then 16px below it a field
 * for every value `shownFieldsOf()` keeps, in catalog order, two to a row where the dialog is wide
 * enough (`cellClassOf()`), one per row below `sm`: the class dates only for the classes held (W4), given and
 * family name fields of their own where rules check them (W12)
 */
export default function DocumentFields({
  group,
  personaId,
  values,
  context,
  today,
  drafts,
  onText,
  onAge,
  onValue,
}: DocumentFieldsProps) {
  return (
    <div className="flex flex-col gap-16">
      <h3 className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words">
        {group.documentLabel}
      </h3>
      <div className="grid grid-cols-1 gap-16 sm:grid-cols-2">
        {group.fields.map((field) => (
          <div key={field.key} className={`min-w-0 ${cellClassOf(field)}`}>
            <EditorField
              id={ELEMENT_IDS.personaField(personaId, field.key)}
              field={field}
              value={values[field.key]}
              choices={
                field.kind === 'enum'
                  ? (optionsOf(context.optionSets, field.optionSet) ?? []).map((option) => ({
                      value: option.value,
                      label: option.label,
                      description: option.description,
                    }))
                  : []
              }
              today={today}
              drafts={drafts}
              onText={onText}
              onAge={onAge}
              onValue={onValue}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
