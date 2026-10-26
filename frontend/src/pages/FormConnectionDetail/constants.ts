import type { EditLocationState } from '../../types/routing';
import type { ActionsState } from './types';

export const DETAIL_COPY = {
  // Figma "App/Header" on "22 Published": the form before the user
  formId: (form: string) => `Form ID ${form}`,
  // Figma "App/Footer" on "22 Published"; "Home" while the connection isn't there
  home: 'Home',
  editDocuments: 'Edit documents',
  newConnection: 'Create new connection',
  // Figma "Publish/Success card" (22 Published), shown right after publishing
  published: 'Published',
  liveTitle: 'Your connection is live',
  linksTitle: 'Links for your form',
  linksLead: 'Add both links to your form. Each one goes in its own field.',
  requestLink: 'Request link',
  requestLinkInfoLabel: 'About the request link',
  requestLinkInfo:
    'Your form management system calls this link to start a request. It answers with the wallet link, the QR code and a reference.',
  resultLink: 'Result link',
  resultLinkInfoLabel: 'About the result link',
  resultLinkInfo:
    'Your form management system calls this link with the request’s reference. It answers with the status and, once the applicant has shared it, the data.',
  // The configuration summary, which the design has no frame for
  documentsTitle: 'Documents',
  documentsHint: 'Applicants share this data from their EUDI Wallet.',
  items: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
  // The rules of every variant (S6; FYI #17, F26): a card that opens on request
  rulesTitle: 'Rules',
  // Figma 10.11 (6530:40737): under the closed card's title, e.g. "3 variants · 6 rules" (B8)
  rulesCounts: (variants: number, rules: number) =>
    `${variants} ${variants === 1 ? 'variant' : 'variants'} · ${rules} ${rules === 1 ? 'rule' : 'rules'}`,
  // No frame: the card's way to the edit wizard's Rules step, in Download PDF's place (F25, F27)
  editRules: 'Edit rules',
  viewSummary: 'View summary',
  hideSummary: 'Hide summary',
  // Proposed, after the Rules step's empty state (design-notes.md §2)
  noRules: 'No rules. Anyone who shares the requested documents can apply.',
  loadingRules: 'Loading the rules…',
  rulesErrorTitle: 'Couldn’t load the rules',
  rulesErrorText: 'Check your connection and try again.',
  // The status card and its dialogs, which the design has no frames for (FR-006)
  statusTitle: 'Status',
  statusLive: 'Live: your form can start requests with both links.',
  statusDeactivated:
    'Deactivated: both links answer that the connection is unavailable until you reactivate it.',
  deactivate: 'Deactivate',
  reactivate: 'Reactivate',
  delete: 'Delete connection',
  cancel: 'Cancel',
  deactivateTitle: 'Deactivate this connection?',
  deactivateText:
    'Both links stop working at once, and requests in progress are cancelled. You can reactivate the connection later.',
  deactivating: 'Deactivating…',
  deleteTitle: 'Delete this connection?',
  deleteText:
    'Both links stop working for good, and requests in progress are cancelled. You can’t undo this.',
  deleting: 'Deleting…',
  retry: 'Try again',
  deactivateError: 'Couldn’t deactivate',
  activateError: 'Couldn’t reactivate',
  deleteError: 'Couldn’t delete',
  actionErrorText: 'Nothing changed. Check your connection and try again.',
  // Toasts after an action, and after saving an edit
  deactivated: 'Connection deactivated',
  activated: 'Connection reactivated',
  saved: 'Changes saved',
};

export const INITIAL_ACTIONS_STATE: ActionsState = {
  dialog: 'deactivate',
  dialogOpen: false,
  running: null,
  error: null,
  toast: null,
};

// The rules card's "Edit rules" opens the edit wizard at the Rules step (FR-030)
export const EDIT_RULES_STATE: EditLocationState = { step: 'rules' };
