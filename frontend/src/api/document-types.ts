import type { DocumentType } from '@connection-portal/api-types/document-types';
import type { Language } from '@connection-portal/rules/language';

import { apiFetch } from './client';

/** The document type catalog, its labels in `language` (default: the website's language). */
export function getDocumentTypes(language?: Language): Promise<DocumentType[]> {
  return apiFetch<DocumentType[]>('/document-types', { language });
}
