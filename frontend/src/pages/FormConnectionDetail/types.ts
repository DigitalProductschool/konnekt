import type { Ref } from 'react';

import type { FormConnection, RequestedDocumentView } from '../../types/form-connections';

export type DetailState =
  | { status: 'loading'; attempt: number }
  | { status: 'notFound'; attempt: number }
  | { status: 'failed'; attempt: number }
  | { status: 'loaded'; attempt: number; formConnection: FormConnection };

export type DetailAction =
  | { type: 'loaded'; formConnection: FormConnection }
  | { type: 'notFound' }
  | { type: 'failed' }
  | { type: 'retry' };

export interface DetailFailedProps {
  onRetry: () => void;
}

export interface ConnectionLinksProps {
  formConnection: FormConnection;
  /** Right after publishing: the card confirms that the connection is live */
  published: boolean;
  /** The heading, which takes the focus right after publishing */
  headingRef: Ref<HTMLHeadingElement>;
}

export interface LinkCardProps {
  number: number;
  title: string;
  url: string;
  infoLabel: string;
  info: string;
}

export interface DocumentsSummaryProps {
  documents: RequestedDocumentView[];
}

export interface SummaryDocumentProps {
  document: RequestedDocumentView;
}

export interface SummaryFieldProps {
  label: string;
}
