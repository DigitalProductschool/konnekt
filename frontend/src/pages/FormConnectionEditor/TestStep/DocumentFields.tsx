import { optionsOf } from '@connection-portal/rules/conditions';

import { ELEMENT_IDS } from '../constants';
import EditorField from './EditorField';
import type { DocumentFieldsProps } from './types';

/**
 * One document's fields in edit mode (S8.5; F9; Figma "Personal ID" 7058:60653, "Driving licence"
 * 7058:60658): its heading (title/small, as in read mode), then 16px below it a field for every
 * value `shownFieldsOf()` keeps, in catalog order: the class dates only for the classes held
 * (W4), given and family name fields of their own where rules check them (W12)
 */
export default function DocumentFields({
  group,
  persona,
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
      {group.fields.map((field) => (
        <EditorField
          key={field.key}
          id={ELEMENT_IDS.personaField(persona.id, field.key)}
          field={field}
          value={persona.values[field.key]}
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
      ))}
    </div>
  );
}
