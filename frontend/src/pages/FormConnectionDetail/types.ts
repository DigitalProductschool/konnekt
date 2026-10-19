import type { Ref } from 'react';

import type { ToastContent } from '../../components/Toast/types';
import type { ErrorNotice } from '../../types/api';
import type { FormConnection, RequestedDocumentView } from '../../types/form-connections';

/** How the screen was reached: right after publishing, after saving an edit, or otherwise */
export type Arrival = 'published' | 'saved' | null;

/** What the status card can do; deactivating and deleting ask first */
export type StatusAction = 'deactivate' | 'activate' | 'delete';
export type ConfirmedAction = Exclude<StatusAction, 'activate'>;

export interface ActionsState {
  /** The confirmation to show; it keeps its texts while the dialog closes */
  dialog: ConfirmedAction;
  dialogOpen: boolean;
  /** The action whose call is running */
  running: StatusAction | null;
  /** Why the last action failed: in its dialog, or for reactivating in the status card */
  error: ErrorNotice | null;
  toast: ToastContent | null;
}

export type ActionsAction =
  | { type: 'openDialog'; dialog: ConfirmedAction }
  | { type: 'closeDialog' }
  | { type: 'start'; action: StatusAction }
  | { type: 'succeeded'; message: string }
  | { type: 'failed'; error: ErrorNotice }
  | { type: 'dismissToast' };

export interface ConnectionDetailsProps {
  formConnection: FormConnection;
  arrival: Arrival;
  /** Takes the connection as an action left it */
  onChange: (formConnection: FormConnection) => void;
}

export interface DetailFooterProps {
  /** Once the connection is there, the footer leads to editing its documents */
  formConnectionId?: string;
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

export interface ConnectionStatusProps {
  isActive: boolean;
  /** Reactivating, which asks nothing, is running */
  activating: boolean;
  /** Why reactivating failed */
  error: ErrorNotice | null;
  onToggle: () => void;
  onDelete: () => void;
}
