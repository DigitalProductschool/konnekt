// Mirrors FieldPart, DocumentField, FieldGroup and DocumentType in backend/app/schemas.py, with the kinds of
// FieldKind and PartKind in backend/app/catalog.py

/** A field's kind of value, which decides what a rule can check on it. Images can't be checked */
export type FieldKind = 'text' | 'number' | 'date' | 'enum' | 'image' | 'parts';

export type PartKind = 'text' | 'enum' | 'date';

/** A part of a field that rules check on its own, such as the licence classes held */
export interface FieldPart {
  key: string;
  label: string;
  kind: PartKind;
  /** Enum parts: the key of their value set */
  option_set: string | null;
  /** One part per licence class, such as "Licence class B – Issue date" */
  per_licence_class: boolean;
  /** Whether a document can give several values for it: true for the licence classes held only */
  multiple_values: boolean;
}

export interface DocumentField {
  key: string;
  label: string;
  kind: FieldKind;
  /** Enum fields: the key of their value set */
  option_set: string | null;
  /** A date worded as an age: "is at least 21 years old" */
  date_of_birth: boolean;
  /** Fields of kind 'parts' only */
  parts: FieldPart[] | null;
  /**
   * Whether a document can give several values for it: true for the Personal ID's nationalities
   * only. A field made of parts declares it on its parts (the driving licence's classes)
   */
  multiple_values: boolean;
  /**
   * The key of its data group (FR-078): GET /api/document-types gives it for a document with
   * groups; null there for one without, and in every other answer. Optional, as the backend's
   * default, so that a field built elsewhere needs none
   */
  group?: string | null;
}

/** A data group of the documents step's panel, such as "Address" (FR-077) */
export interface FieldGroup {
  key: string;
  label: string;
}

/** A catalog entry: a kind of document and its fields, in catalog order */
export interface DocumentType {
  key: string;
  label: string;
  fields: DocumentField[];
  /**
   * Its data groups in the panel's order; empty for a document with 10 fields or fewer (FR-077,
   * FR-078). Optional, as the backend's default: GET /api/document-types always gives it
   */
  field_groups?: FieldGroup[];
}
