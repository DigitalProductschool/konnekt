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
