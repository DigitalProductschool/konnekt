import type { FormConnectionSummary } from '@connection-portal/api-types/form-connections';

export type ListState =
  | { status: 'loading'; attempt: number }
  | { status: 'failed'; attempt: number }
  | { status: 'loaded'; attempt: number; formConnections: FormConnectionSummary[] };

export type ListAction =
  | { type: 'loaded'; formConnections: FormConnectionSummary[] }
  | { type: 'failed' }
  | { type: 'retry' };

export interface FormConnectionRowProps {
  formConnection: FormConnectionSummary;
}
