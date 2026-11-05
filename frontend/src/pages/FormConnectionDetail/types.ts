import type { Ref } from 'react';

import type { ToastContent } from '../../components/Toast/types';
import type { ErrorNotice } from '../../types/api';
import type { DocumentType } from '../../types/document-types';
import type {
  Branch,
  BranchInput,
  EditorStep,
  FormConnection,
  FormConnectionDraft,
  RequestedDocumentView,
  RuleTreeItem,
} from '../../types/form-connections';
import type { RuleContext } from '../../utils/rules/types';

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
  /** A draft's: "Continue" to the flow at its stored step, in place of "Edit documents" */
  draft?: Pick<FormConnectionDraft, 'name' | 'step'>;
}

export interface ConnectionLinksProps {
  formConnection: FormConnection;
  /** Right after publishing: the card confirms that the connection is live */
  published: boolean;
  /** The heading, which takes the focus right after publishing */
  headingRef: Ref<HTMLHeadingElement>;
}

/** One URL of a link card; with several, each is labelled with its variant (FR-026) */
export interface LinkCardLink {
  key: string;
  url: string;
  /** The variant whose pull URL it is; null for the trigger URL, and with only Standard (W2) */
  branch: Pick<Branch, 'name' | 'description'> | null;
}

export interface LinkCardProps {
  number: number;
  title: string;
  links: LinkCardLink[];
  infoLabel: string;
  info: string;
}

export interface LinkCardUrlProps {
  link: LinkCardLink;
  /** The id of the card's title, which describes each copy button with the variant's name */
  titleId: string;
}

export interface DocumentsSummaryProps {
  documents: RequestedDocumentView[];
  /** A draft's documents: none reads "No documents yet" (S6) */
  draft?: boolean;
}

export interface SummaryDocumentProps {
  document: RequestedDocumentView;
  /** A draft's document: without fields it reads "No data chosen yet" (S6) */
  draft?: boolean;
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

export interface RulesSummaryProps {
  /** "Edit rules" opens the edit wizard of this connection at its Rules step (FR-030) */
  formConnectionId: string;
  /** Main branch first; a draft's have no id */
  branches: BranchInput[];
  /** The requested documents, which the statements name */
  documents: RequestedDocumentView[];
  /** A draft's rules, maybe incomplete: no "Edit rules", since the draft's progress leads there */
  draft?: boolean;
  /**
   * A draft's: the catalog, so that rules on data the draft doesn't request name it (FR-004);
   * empty while it loads or when it failed
   */
  catalog?: DocumentType[];
}

export interface RulesSummaryContentProps {
  branches: BranchInput[];
  context: RuleContext;
}

export interface SummaryBranchProps {
  /** A published connection's branch, or a draft's, which has no id */
  branch: BranchInput;
  context: RuleContext;
}

export interface SummaryItemProps {
  item: RuleTreeItem;
  context: RuleContext;
  /** 0 at the top level, 1 in a group, where a group is a sub-group */
  depth: number;
  /** Whether the branch is based on the main branch, whose items carry marks (F26) */
  based: boolean;
  /** An inherited group dissolved in the branch, shown as removed (F13) */
  dissolved?: boolean;
  /** In a removed or dissolved group, which fades what it holds */
  faded?: boolean;
}

export interface DraftDetailsProps {
  draft: FormConnectionDraft;
  /** Loads the details again: after "Open the connection", once the draft was published */
  onReload: () => void;
}

export interface DraftCardProps {
  name: string;
  /** The edit route of the draft */
  editPath: string;
  /** Where "Continue" opens the flow: the step the draft was saved in */
  step: EditorStep;
  /** The draft's last save */
  updatedAt: string;
  onDelete: () => void;
}

/** Why deleting a draft failed: published or deleted meanwhile, or anything else */
export interface DeleteDraftFailure {
  kind: 'published' | 'deleted' | 'failed';
  notice: ErrorNotice;
}

export interface DraftDeleteState {
  dialogOpen: boolean;
  deleting: boolean;
  /** Why the last attempt failed, shown in the dialog until it closes or retries */
  failure: DeleteDraftFailure | null;
}

export type DraftDeleteAction =
  | { type: 'openDialog' }
  | { type: 'closeDialog' }
  | { type: 'start' }
  | { type: 'failed'; failure: DeleteDraftFailure };
