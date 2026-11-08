// The data a connection requests that the catalog no longer offers (spec 005, S8; FR-003 edge
// case): the editor's documents step notes it, and the MCP server's `get_connection` lists it
// (spec 007, contracts/mcp-tools.md "Reading"), both from `droppedDataOf()`
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { RequestedDocument } from '@connection-portal/api-types/form-connections';

/** A document type, or a field of a known one, that is requested and the catalog no longer offers */
export interface DroppedData {
  documentType: string;
  /** The field's key; null when the catalog lacks the whole document type */
  field: string | null;
  /** "Personal ID – eye_colour", or a whole document's key, as the catalog has no label for it */
  label: string;
}

/** A dropped field's label: its document's label and the field's key, "Personal ID – eye_colour". */
export function droppedFieldLabel(documentLabel: string, field: string): string {
  return `${documentLabel} – ${field}`;
}

/**
 * The data requested that the catalog no longer offers, in document order: a document type the
 * catalog lacks is one item, labelled with its key, since the catalog has no label for it any
 * more; a field a known document lacks is "Personal ID – eye_colour", with the field's key. Empty
 * when the catalog offers everything.
 */
export function droppedDataOf(
  documents: RequestedDocument[],
  documentTypes: DocumentType[]
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
        label: droppedFieldLabel(documentType.label, field),
      }));
  });
}
