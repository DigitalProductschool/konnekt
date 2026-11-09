import doneWhiteIcon from '../../assets/icons/done-white.svg';
import editWhiteSmallIcon from '../../assets/icons/edit-white-small.svg';
import linkOffIcon from '../../assets/icons/link-off.svg';
import linkOffWhiteIcon from '../../assets/icons/link-off-white.svg';
import publishedArt from '../../assets/illustrations/published-art@2x.png';
import publishedArtGrey from '../../assets/illustrations/published-art-grey@2x.png';
import type { ActionsState, DraftDeleteState, StatusBandTone, StatusBandToneLook } from './types';

export const DETAIL_COPY = {
  // Figma "Shell/Footer" on the details (U80 6424:34839) and the draft's (U93 7362:54919; FR-049)
  editConnection: 'Edit connection',
  goToConnections: 'Go to connections',
  // The status band (U80 7355:61145, U81 7355:61817; U07 #6)
  activeTitle: 'Your connection is active',
  activeText: 'Citizens can now share their data with you. Add the links below to your service.',
  // The deactivated band (U89 7355:61540, 7355:61541, 7355:61549; U96, U97 the same)
  deactivatedTitle: 'Connection deactivated',
  deactivatedText: 'Citizens can’t start a new request. Your settings are saved.',
  activateAgain: 'Activate again',
  // The band's ⋯ (U88 6417:31045, "More · connection actions"): "Change start date" is F1
  connectionActions: 'Connection actions',
  // The Links accordion (U91 7246:51437; FR-052f: "1 request link · 3 result links")
  linksTitle: 'Links for your service',
  // Only the approval page's lead now (S21, ApprovalUrls; T088 rebuilds it)
  linksLead: 'Add both links to your form. Each one goes in its own field.',
  linksCounts: (resultLinks: number) =>
    `1 request link · ${resultLinks} ${resultLinks === 1 ? 'result link' : 'result links'}`,
  viewLinks: 'View links',
  hideLinks: 'Hide links',
  requestLink: 'Request link',
  requestLinkInfoLabel: 'About the request link',
  // U80 6809:46501 (the frame's hidden text 6809:46453)
  requestLinkInfo:
    'This link is used by your service to generate a QR code for citizens to share their data using the EUDI Wallet. There’s one link for all variants.',
  resultLink: 'Result link',
  resultLinkInfoLabel: 'About the result link',
  // U81 6809:46590 (Clarification #49)
  resultLinkInfo:
    'Your service gets the citizen’s shared data from this link. Each variant has its own.',
  // The Summary accordion (U82 6396:48191; FR-046 (i)): "2 documents · 9 data items · 3 variants ·
  // 4 rules", its Documents and Rules parts headed in action blue (U03 #28)
  summaryTitle: 'Summary',
  summaryCounts: (documents: number, dataItems: number, rulesCounts: string) =>
    `${documents} ${documents === 1 ? 'document' : 'documents'} · ${dataItems} ${dataItems === 1 ? 'data item' : 'data items'} · ${rulesCounts}`,
  viewSummary: 'View summary',
  hideSummary: 'Hide summary',
  documentsTitle: 'Documents',
  // A document's count, "7 data items" (U82 6396:48204)
  items: (count: number) => `${count} ${count === 1 ? 'data item' : 'data items'}`,
  rulesTitle: 'Rules',
  // The rules part of the counts, e.g. "3 variants · 4 rules" (B8)
  rulesCounts: (variants: number, rules: number) =>
    `${variants} ${variants === 1 ? 'variant' : 'variants'} · ${rules} ${rules === 1 ? 'rule' : 'rules'}`,
  // The variant tabs' list, as on the rules and test steps
  variants: 'Variants',
  // Proposed, after the Rules step's empty state (design-notes.md §2)
  noRules: 'No rules. Anyone who shares the requested documents can apply.',
  loadingRules: 'Loading the rules…',
  rulesErrorTitle: 'Couldn’t load the rules',
  rulesErrorText: 'Check your connection and try again.',
  // The ⋯ menu's entries (U88 6417:31045)
  deactivate: 'Deactivate',
  delete: 'Delete connection',
  // The confirmations (S17). Deactivating (U88 6417:31206): the design's title and buttons, F13's
  // body (the backend cancels the requests in progress); "Deactivate" is the blue primary button
  deactivateTitle: 'Deactivate this connection?',
  deactivateText:
    'The connection will be deactivated and its links will stop working at once. Requests in progress are cancelled. Remember to remove the wallet connection from your service.',
  keepActive: 'Keep active',
  deactivating: 'Deactivating…',
  // Reactivating (U89 7173:52959): the documents and rules summary (FR-051 (40)); "Active from"
  // is F1. "Activating…" isn't drawn (FR-008)
  activateTitle: 'Activate this connection again?',
  activateText:
    'Check the summary below. Once it’s active, citizens can share their data again, so make sure your service is ready to receive it.',
  activate: 'Activate',
  activating: 'Activating…',
  cancel: 'Cancel',
  // Deleting takes the overview's dialog (`DELETE_DIALOG_COPY`: U14 6699:44480, U90 6417:31599)
  retry: 'Try again',
  deactivateError: 'Couldn’t deactivate',
  activateError: 'Couldn’t reactivate',
  deleteError: 'Couldn’t delete',
  actionErrorText: 'Nothing changed. Check your connection and try again.',
  // Success toasts after an action (FR-051 (42); U89 6417:31447 without its Undo, F54), and after
  // saving an edit
  deactivated: 'Connection deactivated.',
  activated: 'Connection reactivated.',
  // U99 6730:39732 #19, FR-051 (42)
  saved: 'Changes saved.',
  // A draft's details (S16; U93 7362:54691): the tab title "<name> (Draft) · Konnekt", the draft
  // band (7362:54697) with its date pill (7362:54709), and the Links card without links
  // (7362:54905)
  draftTabTitle: (name: string) => `${name} (Draft)`,
  draftTitle: 'This connection is a draft',
  draftText:
    'The links can’t be added to your services yet. They become active when this connection is published.',
  edited: (date: string) => `Edited ${date}`,
  draftLinksText: 'Created when the connection is published and active.',
  // A draft's empty parts in the Summary (spec 005: S6, W8), which U93 doesn't draw
  noDocumentsYet: 'No documents yet',
  noDataYet: 'No data chosen yet',
  // Visible on the draft's details (F56; spec 005, S6), without a frame; it opens the overview's
  // delete dialog with the draft's body (`DELETE_DIALOG_COPY`, F55)
  deleteDraft: 'Delete draft',
  // The delete confirmation's errors (S6): published or deleted meanwhile
  draftPublishedSince: 'This draft has been published since you opened it.',
  openConnection: 'Open the connection',
  draftAlreadyDeleted: 'This draft has already been deleted.',
  toOverview: 'Go to overview',
};

export const INITIAL_ACTIONS_STATE: ActionsState = {
  dialog: 'deactivate',
  dialogOpen: false,
  running: null,
  error: null,
  toast: null,
};

export const INITIAL_DRAFT_DELETE_STATE: DraftDeleteState = {
  dialogOpen: false,
  deleting: false,
  failure: null,
};

// "14:32": the 24-hour time in the browser's time zone, after a date (the draft band's "Edited
// 03.10.2026, 14:32", U93 7362:54712; design-notes §3 "Dates")
export const SAVED_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/**
 * The status band's looks (U07 #6): the band's colour, the 32px status icon in its circle and the
 * picture at the bottom right. Active ("Status band · active" U80 7355:61767): green, the white
 * check 24px in a green circle, the colour picture. Deactivated ("Status band · deactivated" U89
 * 7355:61530): `layout-background-hued` #f2f5fb, the white "Icon/Link off" 20px (7355:61536, the
 * export) in a `layout-text-muted` #4a5468 circle (7355:61535), the grey picture (7355:61552, the
 * same crop). Draft ("Status band · draft" U93 7362:54697; U07 #23): the gradient from
 * `feedback-info-background` (21.6 %) to `layout-background-hued` (75.9 %) at 113.27°, the white
 * "icon-edit-small" 20px (7362:54702, the export) in a `feedback-info` circle (7362:54701, at the
 * overlay's AA value), the grey picture
 */
export const STATUS_BAND_TONES: Record<StatusBandTone, StatusBandToneLook> = {
  active: {
    band: 'bg-kern-feedback-success-background',
    iconCircle: 'bg-kern-feedback-success',
    icon: doneWhiteIcon,
    iconSize: 'size-24',
    picture: publishedArt,
  },
  deactivated: {
    band: 'bg-kern-layout-background-hued',
    iconCircle: 'bg-kern-layout-text-muted',
    icon: linkOffWhiteIcon,
    iconSize: 'size-20',
    picture: publishedArtGrey,
  },
  draft: {
    band: 'bg-[linear-gradient(113.27deg,var(--kern-color-feedback-info-background)_21.638%,var(--kern-color-layout-background-hued)_75.912%)]',
    iconCircle: 'bg-kern-feedback-info',
    icon: editWhiteSmallIcon,
    iconSize: 'size-20',
    picture: publishedArtGrey,
  },
};

/**
 * The reactivate dialog (U89 7173:52959) as the publish dialog draws it: the intro in
 * body/default, muted, and "Dialog content/Publish · summary" (the 8px-round table with the
 * decorative border, its rows `PublishSummaryRow`)
 */
export const SUMMARY_INTRO_CLASSES =
  'text-kern-static-medium text-kern-layout-text-muted leading-(--kern-typography-line-height-medium-static)';
export const SUMMARY_TABLE_CLASSES =
  'rounded-kern-default flex w-full flex-col overflow-clip border border-(--kern-color-decorative-border-default)';

/** The ⋯ menu's "Deactivate" glyph (U88 6417:31045, "Icon/Link off"), which KERN lacks */
export const LINK_OFF_ICON = { src: linkOffIcon };
export const DELETE_ICON = { kern: 'kern-icon--delete' };
