import type { ErrorNotice } from '@konnekt/api-types/api';
import type {
  ActivityEntry,
  ActivityPage,
  Branch,
  BranchInput,
  ConnectionState,
  FormConnection,
  FormConnectionDraft,
  FormConnectionOrDraft,
  RequestedDocumentView,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import type { RuleContext, RuleDocument } from '@konnekt/rules/types';
import type { ReactNode, Ref } from 'react';

import type { ActiveFrom } from '../../components/ActiveFromChoice/types';
import type { ToastContent } from '../../components/Toast/types';
import type { ConnectionPdf } from '../../hooks/types';

/** How the screen was reached: right after publishing, after saving an edit, or otherwise */
export type Arrival = 'published' | 'saved' | null;

/** What the status band's actions do; each asks first, in its confirmation (S17) */
export type StatusAction = 'deactivate' | 'activate' | 'delete';
export type ConfirmedAction = StatusAction;

/**
 * The page's dialogs: a confirmation (S17), or "Change start date" (S15, FR-008, FR-009), which
 * the ⋯ menu opens for a scheduled and an active connection (`StartDateDialog`)
 */
export type ActionDialog = ConfirmedAction | 'startDate';

/** A call the page runs: a confirmed action, or "Save date" of "Change start date" (S15) */
export type RunningAction = StatusAction | 'startDate';

/** An entry of the ⋯ menu on the date pill (S15; U88 6417:31045) */
export type ConnectionMenuEntry = 'startDate' | 'deactivate' | 'delete';

export interface ActionsState {
  /** The dialog to show; a confirmation keeps its texts while it closes */
  dialog: ActionDialog;
  dialogOpen: boolean;
  /** The action whose call is running */
  running: RunningAction | null;
  /** Why the last action failed, shown in its dialog until it closes or retries */
  error: ErrorNotice | null;
  /**
   * The last failure got no answer (a network failure, or a `5xx` without the API's envelope):
   * "Change start date" then shows its sentence instead of the message (FR-014, F2, W8)
   */
  noAnswer: boolean;
  /**
   * "Active from" of the dialog that has it (C2): the choice and the date field's text, set when
   * the dialog opens and kept through a failure, so that "Try again" repeats them (FR-014)
   */
  activeFrom: ActiveFrom;
  startDateText: string;
  /** The date field's error state (FR-003, W1): a day that isn't after today, or the server's */
  dateError: boolean;
  /** How often a date was refused, so that each refusal moves the focus to the field */
  dateRefusals: number;
  toast: ToastContent | null;
}

export type ActionsAction =
  /** `activeFrom` and `startDateText` are the dialog's first choice ("Now" and empty if left out) */
  | { type: 'openDialog'; dialog: ActionDialog; activeFrom?: ActiveFrom; startDateText?: string }
  | { type: 'closeDialog' }
  | { type: 'start'; action: RunningAction }
  | { type: 'succeeded'; message: string }
  | { type: 'failed'; error: ErrorNotice; noAnswer?: boolean }
  /** A radio of "Active from" */
  | { type: 'chooseActiveFrom'; choice: ActiveFrom }
  /** The date field's text changed */
  | { type: 'typeStartDate'; text: string }
  /** A day that isn't after today, by `startDateOf()` or the server's `400 invalid_start_date` */
  | { type: 'dateRefused' }
  | { type: 'dismissToast' };

/**
 * What "Save date" does (S15; FR-008, FR-009): the field's error for a day that isn't after
 * today; nothing for an active connection's "Now" or a scheduled one's own date; otherwise it
 * sends the day, or null for "Now"
 */
export type StartDatePlan =
  { kind: 'refused' } | { kind: 'unchanged' } | { kind: 'send'; startDate: string | null };

/**
 * What "Activate" or "Schedule" does when reactivating (S17; FR-011): the field's error for a day
 * that isn't after today; otherwise it sends the day, or null for "Now"
 */
export type ReactivatePlan = { kind: 'refused' } | { kind: 'send'; startDate: string | null };

/** "Activate this connection again?" (S17; U89 7173:52959), rendered from the page's state */
export interface ReactivateDialogProps {
  /** The deactivated connection, whose documents and rules the summary names */
  formConnection: FormConnection;
  /** The page's actions state, which holds the dialog's choice, text, error and failure */
  state: ActionsState;
  onChoiceChange: (choice: ActiveFrom) => void;
  onTextChange: (text: string) => void;
  /** "Cancel", the ×, Escape and the scrim */
  onCancel: () => void;
  /** "Activate", "Schedule" and "Try again" */
  onConfirm: () => void;
}

/**
 * The failure's alert of the dialogs with "Active from" (FR-014, F2, W8): `noAnswerText` when no
 * answer came, the server's message with its error ID for a `5xx`, `title` with the server's
 * message for any other refusal
 */
export interface DialogFailureAlertProps {
  notice: ErrorNotice;
  noAnswer: boolean;
  /** "Couldn’t save the start date", "Couldn’t reactivate" */
  title: string;
  /** "Couldn’t …, so nothing has changed. Check your internet connection and try again." */
  noAnswerText: string;
}

export interface StartDateDialogProps {
  /** The connection the dialog changes: scheduled or active */
  formConnection: FormConnection;
  /** The page's actions state, which holds the dialog's choice, text, error and failure */
  state: ActionsState;
  onChoiceChange: (choice: ActiveFrom) => void;
  onTextChange: (text: string) => void;
  /** "Cancel", the ×, Escape and the scrim */
  onCancel: () => void;
  /** "Save date" and "Try again" */
  onSave: () => void;
}

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
  /**
   * "Download PDF" (spec 011): the page's `useConnectionPdf()`, kept by the page so that a run
   * survives the swap from a draft's details to these (FR-005)
   */
  pdf: ConnectionPdf;
}

export interface DetailFooterProps {
  /** Once the connection is there, the footer leads to editing it, from step 1 */
  formConnectionId?: string;
  /** A draft's: "Edit connection" opens its flow at the step it was saved in (spec 005, S6) */
  draft?: Pick<FormConnectionDraft, 'step'>;
  /** A published connection's: "Edit connection" asks "Edit “<name>”?" first (F48, T083) */
  onEdit?: () => void;
}

/**
 * The details' accordions (spec 008 FR-046, spec 010 FR-022): Links, Summary and Activity; one is
 * open at a time, or none. A draft's Links card has no toggle, so a draft's are Summary and Activity
 */
export type DetailAccordionName = 'links' | 'summary' | 'activity';

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
  /**
   * Under the header row, inside the header, open or closed: the Summary's version strip with
   * "Download PDF" (spec 011, design-notes §2; V5 7603:61502)
   */
  strip?: ReactNode;
  /** Under the header, open or closed, full width: the PDF's failure (design-notes §3) */
  notice?: ReactNode;
  children: ReactNode;
}

/**
 * The Summary's version strip with "Download PDF" (spec 011, FR-001, FR-032; design-notes §2, §3):
 * the version alone without `pdf` (both details pass it; the approval page shows neither)
 */
export interface PdfDownloadProps {
  /** The content's version, `XXXX-XXXX-XXXX` (`version_fingerprint`) */
  version: string;
  /** The page's download: its state and its start */
  pdf?: ConnectionPdf;
  /** The button, which "Try again" focuses before it goes */
  buttonRef?: Ref<HTMLButtonElement>;
}

/** The PDF's failure under the Summary's header (FR-004; design-notes §3) */
export interface PdfFailureProps {
  /** The server's message with a 5xx's error ID, or "Check your connection and try again." */
  notice: ErrorNotice;
  /** "Try again": a new run */
  onRetry: () => void;
}

export interface ConnectionLinksProps {
  formConnection: FormConnection;
  /** Whether the accordion is open: right after publishing, or once the member opens it */
  open: boolean;
  onToggle: () => void;
}

/** The status band's state: a published connection's by its state, or a draft's (S16; C1) */
export type StatusBandTone = 'active' | 'scheduled' | 'deactivated' | 'draft';

export interface StatusBandToneLook {
  /** The band's background */
  band: string;
  /** The 32px circle behind the status icon; empty for a bare glyph */
  iconCircle: string;
  /**
   * The status icon: an exported image, or KERN's glyph drawn in white (the scheduled band's
   * calendar, U94 7355:60683)
   */
  icon: { src: string } | { kern: string };
  /** The status icon's size in its circle: the active check 24px, the other glyphs 20px */
  iconSize: string;
  /**
   * The band's picture (241 × 320, bug new-visuals B2), one per state, at the band's top right
   * and cut at the band's height
   */
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
  /**
   * The date pill's line, 20px under the sub-line (FR-015, data-model §1.4): "Active since
   * <date>, <time>", "Active from <date>, 00:00", "Deactivated since <date>, <time>", a draft's
   * "Edited <date>, <time>"
   */
  dateLine: string;
  /**
   * Inside the pill, after the date (FR-016): the ⋯ menu, a published connection's or a draft's
   * with "Delete draft" (F56, bug new-visuals B2)
   */
  actions?: ReactNode;
  /** Next to the pill, 16px from it (FR-016, U89 7355:61542): while deactivated, "Activate again" */
  pillAction?: ReactNode;
}

/** The date pill (U80 7355:61155; U93 7362:54709): its line and, on a published connection, the ⋯ */
export interface DatePillProps {
  line: string;
  actions?: ReactNode;
}

/** What the date pill's line is read from (data-model §1.4): a connection or a draft */
export type DatePillSource = Pick<FormConnectionOrDraft, 'state' | 'updated_at'> &
  Partial<Pick<FormConnection, 'published_at' | 'activated_at' | 'deactivated_at' | 'start_date'>>;

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
  /**
   * The content's version (`version_fingerprint`; spec 011, FR-032), shown beside "Download PDF"
   * in the header; the details pass it, the approval page doesn't (FR-006)
   */
  version?: string;
  /** The page's download (`useConnectionPdf()`): "Download PDF" shows only with it and `version` */
  pdf?: ConnectionPdf;
}

/** `RulesSummaryBody`'s props: what the open part shows, never the page's download (T050) */
export interface RulesSummaryBodyProps {
  branches: BranchInput[];
  documents: RequestedDocumentView[];
  draft: boolean;
  /** `RulesSummary`'s memoised context of the statements */
  context: RuleContext;
  /** `RulesSummary`'s memoised documents the checks read, or null */
  checkDocuments: RuleDocument[] | null;
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

/**
 * A PDF run's fetch answered 404 (spec 011, design-notes §3 "Gone"): the details show "Page not
 * found" for this id while the page still holds the connection it had then; another id, or a
 * newer load of it, shows again
 */
export interface PdfGoneMark {
  id: string;
  /** The connection or draft loaded when the run found it gone; null when none was */
  formConnection: FormConnectionOrDraft | null;
}

export interface DraftDetailsProps {
  draft: FormConnectionDraft;
  /** Loads the details again: after "Open the connection", once the draft was published */
  onReload: () => void;
  /**
   * "Download PDF" (spec 011, FR-001): the page's `useConnectionPdf()`, as `ConnectionDetails`
   * gets it, kept by the page so that a run survives the swap to the published details (FR-005)
   */
  pdf: ConnectionPdf;
}

/**
 * The Activity card's list (S15 "The Activity card"; FR-022, FR-023): `closed` until the card first
 * opens (nothing loaded); `loading` the first page; `loaded` with the pages so far, newest first;
 * `loadingMore` the page after them; `failed` with the pages loaded before the failure (none when
 * the first page failed) and why
 */
export type ActivityCardState =
  | { kind: 'closed' }
  | { kind: 'loading' }
  | { kind: 'loaded'; pages: ActivityPage[] }
  | { kind: 'loadingMore'; pages: ActivityPage[] }
  | { kind: 'failed'; pages: ActivityPage[]; error: ErrorNotice };

export type ActivityCardAction =
  /** The card opened for the first time, or after `reset`: the first page */
  | { type: 'load' }
  /** The list's end came into view while there is an older page */
  | { type: 'loadMore' }
  /** "Try again": the page that failed, the first or the next */
  | { type: 'retry' }
  | { type: 'pageLoaded'; page: ActivityPage }
  | { type: 'pageFailed'; error: ErrorNotice }
  /** The connection changed on the page: the list loads again from the newest entry */
  | { type: 'reset' };

/** What the card asks for next: the first page, the page after a cursor, or nothing */
export type ActivityRequest = { cursor: string | null } | null;

export interface ActivityCardProps {
  /** The connection or draft whose activity it shows */
  formConnectionId: string;
  /** The closed card's line (FR-024, FR-032), from the connection's `last_activity` */
  lastActivity: ActivityEntry | null;
  /** The connection's state, for "Deactivated by …" while it is deactivated */
  state: ConnectionState;
  /** Whether the card is open, kept by the page's accordion (FR-022: one card open at a time) */
  open: boolean;
  onToggle: () => void;
  /**
   * Changes when an action on the page changed the connection (a status or start date change):
   * the list loads again, at once while open, otherwise when the card next opens
   */
  reloadKey?: string | number;
}

/** One entry of the open list: "date and time · event · person" (U86 6396:48528) */
export interface ActivityRowProps {
  entry: ActivityEntry;
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
