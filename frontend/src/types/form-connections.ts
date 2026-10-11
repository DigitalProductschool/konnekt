// Mirrors the form connection schemas in backend/app/schemas.py
import type { DocumentField } from './document-types';

/** Pull mode without a webhook address, webhook mode with one */
export type FormConnectionMode = 'pull' | 'webhook';

/** A document to request, with the keys of its selected fields (input) */
export interface RequestedDocument {
  document_type: string;
  fields: string[];
}

/** A requested document with its labels (output) */
export interface RequestedDocumentView {
  document_type: string;
  label: string;
  fields: DocumentField[];
}

export interface FormConnectionSummary {
  id: string;
  name: string;
  servicebw_form: string;
  is_active: boolean;
  mode: FormConnectionMode;
  updated_at: string;
}

export interface FormConnection {
  id: string;
  name: string;
  servicebw_form: string;
  is_active: boolean;
  mode: FormConnectionMode;
  webhook_url: string | null;
  documents: RequestedDocumentView[];
  trigger_url: string;
  /** Contains the placeholder `{reference}` literally */
  pull_url: string;
  created_at: string;
  updated_at: string;
}

export interface FormConnectionCreate {
  name: string;
  servicebw_form: string;
  documents: RequestedDocument[];
  webhook_url?: string | null;
}

/** An absent field stays unchanged; `webhook_url: null` removes the address */
export interface FormConnectionUpdate {
  name?: string;
  servicebw_form?: string;
  documents?: RequestedDocument[];
  webhook_url?: string | null;
}
