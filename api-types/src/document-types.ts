// Mirrors FieldPart, DocumentField and DocumentType in backend/app/schemas.py, with the kinds of
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
}

/** A catalog entry: a kind of document and its fields, in catalog order */
export interface DocumentType {
  key: string;
  label: string;
  fields: DocumentField[];
}
