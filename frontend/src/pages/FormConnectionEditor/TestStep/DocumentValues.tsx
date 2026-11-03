import { changedKeys } from '../../../utils/rules/personas/values';
import type { DocumentValuesProps } from './types';
import { valueTextOf } from './utils';
import ValueRow from './ValueRow';

/**
 * One document's values in the data card (S8.4; F9): its heading, "Personal ID" or "Driving
 * licence" (title/small, as the edit dialog's document headings, Figma U02 7058:60654,
 * 7058:60659), then a row per shown field, in catalog order, labelled without the document
 */
export default function DocumentValues({
  group,
  persona,
  context,
  today,
  failingFields,
}: DocumentValuesProps) {
  const changed = changedKeys(persona, group.fields);
  return (
    <div className="flex flex-col gap-8">
      <h3 className="text-kern-static-medium text-kern-layout-text-default leading-(--kern-typography-line-height-medium-static) font-semibold break-words">
        {group.documentLabel}
      </h3>
      <dl className="flex flex-col">
        {group.fields.map((field) => (
          <ValueRow
            key={field.key}
            field={field}
            text={valueTextOf(field, persona.values[field.key], context.optionSets, today)}
            failing={failingFields.includes(field.key)}
            changed={changed.includes(field.key)}
          />
        ))}
      </dl>
    </div>
  );
}
