// The documents a persona stands for (specs/004-rule-test-personas, data-model.md "The documents a
// persona stands for"; research R4; FR-014): the evaluator's `Applicant`, built from the persona's
// values of the current fields only, with empty values left out so that the evaluator reads them as
// missing. Pure. Only types come from `evaluation.ts`, so this module brings none of its code
import type { Applicant } from '../evaluation';
import type { Persona, PersonaField, PersonaValue } from './types';
import { isEmptyValue } from './values';

/** The field whose parts form one object, and the field whose parts form one entry per class */
const PLACE_OF_BIRTH = 'place_of_birth';
const DRIVING_PRIVILEGES = 'driving_privileges';
/** The part of `driving_privileges` that lists the classes held */
const CLASSES = 'classes';
/** The key of the class code in each `driving_privileges` entry (ISO/IEC 18013-5) */
const CLASS_CODE = 'vehicle_category_code';

/**
 * The documents that give the persona's values and no others (FR-014), by document type, then
 * field key:
 * - a field without parts: its value;
 * - `place_of_birth`: one object of the parts that are fields and not empty;
 * - `driving_privileges`: one entry per class held, `{ vehicle_category_code, issue_date?,
 *   expiry_date? }`, with a class's date only where it is a field and not empty. An empty list of
 *   classes delivers `[]`, which the evaluator reads as missing.
 *
 * Values of fields not in `fields` (hidden ones) are never delivered, nor are the dates of classes
 * the persona doesn't hold. A document or object without values is left out
 */
export function applicantOf(persona: Persona, fields: readonly PersonaField[]): Applicant {
  const documents: Record<string, Record<string, unknown>> = {};
  const deliver = (documentType: string, field: string, value: unknown): void => {
    documents[documentType] ??= {};
    documents[documentType][field] = value;
  };
  for (const field of fields) {
    const value = persona.values[field.key];
    if (field.part === null) {
      if (!isEmptyValue(value)) {
        deliver(field.documentType, field.field, value);
      }
    } else if (field.field === PLACE_OF_BIRTH) {
      if (!isEmptyValue(value)) {
        const place = (documents[field.documentType]?.[field.field] ?? {}) as Record<
          string,
          unknown
        >;
        deliver(field.documentType, field.field, { ...place, [field.part]: value });
      }
    } else if (field.field === DRIVING_PRIVILEGES && field.part === CLASSES) {
      deliver(field.documentType, field.field, privilegesOf(persona, fields, field, value));
    }
    // A class's date is delivered inside its class's entry, by `privilegesOf()`
  }
  return documents;
}

/** One `driving_privileges` entry per class held, in the order of the persona's list */
function privilegesOf(
  persona: Persona,
  fields: readonly PersonaField[],
  classesField: PersonaField,
  classes: PersonaValue | undefined
): Record<string, unknown>[] {
  if (!Array.isArray(classes)) {
    return [];
  }
  const dates = fields.filter(
    (field) =>
      field.documentType === classesField.documentType &&
      field.field === classesField.field &&
      field.licenceClass !== null
  );
  return classes.map((held) => {
    const code = String(held);
    const entry: Record<string, unknown> = { [CLASS_CODE]: code };
    for (const date of dates) {
      const value = persona.values[date.key];
      if (date.licenceClass === code && date.part !== null && !isEmptyValue(value)) {
        entry[date.part] = value;
      }
    }
    return entry;
  });
}
