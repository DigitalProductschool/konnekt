// The data a connection requests that the catalog no longer offers (spec 005, S8; FR-003 edge
// case): the editor's documents step notes it, and the MCP server's `get_connection` lists it
// (spec 007, contracts/mcp-tools.md "Reading"), both from `droppedDataOf()`
import type { DocumentType } from '@konnekt/api-types/document-types';
import type { RequestedDocument } from '@konnekt/api-types/form-connections';

import { DEFAULT_LANGUAGE, defineTexts, type Language } from './language';

/** A document type, or a field of a known one, that is requested and the catalog no longer offers */
export interface DroppedData {
  documentType: string;
  /** The field's key; null when the catalog lacks the whole document type */
  field: string | null;
  /** "Personal ID – eye_colour", or a whole document's key, as the catalog has no label for it */
  label: string;
}

// A dropped field's label, in each language: German writes it alike, with the dash the
// statements use between a field and its part (glossary G§4 „Geburtsort – Ort“)
export const DROPPED_TEXTS = defineTexts<{
  fieldLabel: (documentLabel: string, field: string) => string;
}>(
  { fieldLabel: (documentLabel, field) => `${documentLabel} – ${field}` },
  { fieldLabel: (documentLabel, field) => `${documentLabel} – ${field}` }
);

/**
 * A dropped field's label: its document's label and the field's key, "Personal ID – eye_colour",
 * "Personalausweis – eye_colour".
 */
export function droppedFieldLabel(
  documentLabel: string,
  field: string,
  language: Language = DEFAULT_LANGUAGE
): string {
  return DROPPED_TEXTS[language].fieldLabel(documentLabel, field);
}

/**
 * The data requested that the catalog no longer offers, in document order: a document type the
 * catalog lacks is one item, labelled with its key, since the catalog has no label for it any
 * more; a field a known document lacks is "Personal ID – eye_colour", with the field's key. Empty
 * when the catalog offers everything. The labels are the catalog's, in the language it was
 * fetched in; pass that language too. The MCP server passes none: English (FR-017).
 */
export function droppedDataOf(
  documents: RequestedDocument[],
  documentTypes: DocumentType[],
  language: Language = DEFAULT_LANGUAGE
): DroppedData[] {
  return documents.flatMap((document): DroppedData[] => {
    const documentType = documentTypes.find((type) => type.key === document.document_type);
    if (!documentType) {
      return [{ documentType: document.document_type, field: null, label: document.document_type }];
    }
    return document.fields
      .filter((field) => !documentType.fields.some((offered) => offered.key === field))
      .map((field) => ({
        documentType: documentType.key,
        field,
        label: droppedFieldLabel(documentType.label, field, language),
      }));
  });
}
