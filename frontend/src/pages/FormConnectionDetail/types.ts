import type { ErrorNotice } from '@connection-portal/api-types/api';
import type {
  Branch,
  BranchInput,
  FormConnection,
  FormConnectionDraft,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { RuleContext, RuleDocument } from '@connection-portal/rules/types';
import type { ReactNode, Ref } from 'react';

import type { ToastContent } from '../../components/Toast/types';

/** How the screen was reached: right after publishing, after saving an edit, or otherwise */
export type Arrival = 'published' | 'saved' | null;

/** What the status band's actions do; each asks first, in its confirmation (S17) */
export type StatusAction = 'deactivate' | 'activate' | 'delete';
export type ConfirmedAction = StatusAction;

export interface ActionsState {
  /** The confirmation to show; it keeps its texts while the dialog closes */
  dialog: ConfirmedAction;
  dialogOpen: boolean;
  /** The action whose call is running */
  running: StatusAction | null;
  /** Why the last action failed, shown in its dialog until it closes or retries */
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

/** A confirmation's texts and look (S17), for `ConfirmDialog` */
export interface ActionDialogCopy {
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  busyLabel: string;
  errorTitle: string;
  /** Deleting: the filled danger button */
  danger: boolean;
  /** Reactivating: the 600px dialog with the summary (U89 7173:52959) */
  wide: boolean;
}

/** The reactivate dialog's summary (FR-051 (40)): one line per document and per variant */
export interface ReactivateSummary {
  documentLines: string[];
  ruleLines: string[];
}

export interface ConnectionDetailsProps {
  formConnection: FormConnection;
  arrival: Arrival;
  /** Takes the connection as an action left it */
  onChange: (formConnection: FormConnection) => void;
}

export interface DetailFooterProps {
  /** Once the connection is there, the footer leads to editing it, from step 1 */
  formConnectionId?: string;
  /** A draft's: "Edit connection" opens its flow at the step it was saved in (spec 005, S6) */
  draft?: Pick<FormConnectionDraft, 'step'>;
  /** A published connection's: "Edit connection" asks "Edit “<name>”?" first (F48, T083) */
  onEdit?: () => void;
}

/** The details' accordions (FR-046): one is open at a time, or none */
export type DetailAccordionName = 'links' | 'summary';

export interface DetailAccordionProps {
  /** The heading, such as "Links for your service" */
  title: string;
  /** The line under it, such as "1 request link · 3 result links" (FR-052f) */
  counts: string;
  /** The toggle's labels: "View links" / "Hide links" */
  viewLabel: string;
  hideLabel: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

export interface ConnectionLinksProps {
  formConnection: FormConnection;
  /** Whether the accordion is open: right after publishing, or once the member opens it */
  open: boolean;
  onToggle: () => void;
}

/** The status band's state: a published connection's, or a draft's (S16) */
export type StatusBandTone = 'active' | 'deactivated' | 'draft';

export interface StatusBandToneLook {
  /** The band's background */
  band: string;
  /** The 32px circle behind the status icon; empty for a bare glyph */
  iconCircle: string;
  /** The status icon's image */
  icon: string;
  /** The status icon's size in its circle: the active check 24px, the other glyphs 20px */
  iconSize: string;
  /** The picture at the bottom right, in colour or grey */
  picture: string;
}

export interface StatusBandProps {
  tone: StatusBandTone;
  /** The status sentence, the page's one h1 (FR-046) */
  title: string;
  /** The sub-line, 4px under it */
  text: string;
  /** The h1, which takes the focus right after publishing */
  headingRef?: Ref<HTMLHeadingElement>;
  /** At the band's right end (F66, #52), in the white chip: the ⋯ menu */
  actions?: ReactNode;
  /**
   * Before the chip, on the band (16px apart): while deactivated, "Activate again" (U89); on a
   * draft's, "Delete draft" (F56)
   */
  mainAction?: ReactNode;
  /** 20px under the sub-line: a draft's "Edited <date>" pill (U93 7362:54709) */
  meta?: ReactNode;
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
  /** While the connection is deactivated: the copy buttons are off and say why (FR-046, W21) */
  deactivated?: boolean;
}

export interface LinkCardUrlProps {
  link: LinkCardLink;
  /** The id of the card's title, which describes each copy button with the variant's name */
  titleId: string;
  deactivated?: boolean;
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

export interface RulesSummaryProps {
  /** Main branch first; a draft's have no id */
  branches: BranchInput[];
  /** The requested documents, which the documents part lists and the statements name */
  documents: RequestedDocumentView[];
  /**
   * Whether the accordion is open, and its toggle (FR-046: one accordion open at a time, kept by
   * the page). Without them, it keeps its own state and starts open
   */
  open?: boolean;
  onToggle?: () => void;
  /**
   * A draft's: its rules, maybe incomplete, and its documents, maybe without data (S6); its rules
   * may check data it doesn't request (FR-004), which the catalog names. A draft's rules aren't
   * checked: the checks run on a published connection's rules only (FR-047)
   */
  draft?: boolean;
}

export interface RulesSummaryContentProps {
  branches: BranchInput[];
  context: RuleContext;
  /**
   * The requested documents with only their requested fields, from the catalog
   * (`requestedRuleDocuments()`), which the rule checks read (FR-047); null or left out while the
   * catalog loads, when it failed, or when the rules aren't checked (a draft's, the approval page's)
   */
  checkDocuments?: RuleDocument[] | null;
}

export interface SummaryBranchProps {
  /** A published connection's branch, or a draft's, which has no id */
  branch: BranchInput;
  context: RuleContext;
  /** The panel's id, which its tab controls, and the tab's id, which names the panel */
  panelId: string;
  tabId: string;
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
