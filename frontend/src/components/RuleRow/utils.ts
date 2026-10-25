import { DOCUMENT_GLYPHS, GENERIC_DOCUMENT_GLYPH } from './constants';

/** The glyph that marks a statement's document type. */
export function glyphOf(documentType: string): string {
  return DOCUMENT_GLYPHS[documentType] ?? GENERIC_DOCUMENT_GLYPH;
}
