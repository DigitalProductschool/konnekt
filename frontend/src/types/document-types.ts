// Mirrors DocumentField and DocumentType in backend/app/schemas.py

export interface DocumentField {
  key: string;
  label: string;
}

/** A catalog entry: a kind of document and its fields, in catalog order */
export interface DocumentType {
  key: string;
  label: string;
  fields: DocumentField[];
}
