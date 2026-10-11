import type { DocumentType } from '../types/document-types';
import { apiFetch } from './client';

export function getDocumentTypes(): Promise<DocumentType[]> {
  return apiFetch<DocumentType[]>('/document-types');
}
