import type { DetailState } from './types';

export const DETAIL_COPY = {
  formId: (form: string) => `Form ID ${form}`,
  loading: 'Loading the connection…',
  errorTitle: 'Couldn’t load the connection',
  errorText: 'Check your connection and try again.',
  retry: 'Try again',
  backToList: 'Go to your connections',
  // Figma "Publish/Success card" (22 Published), shown right after publishing
  published: 'Published',
  liveTitle: 'Your connection is live',
  linksTitle: 'Links for your form',
  linksLead: 'Add both links to your form. Each one goes in its own field.',
  requestLink: 'Request link',
  requestLinkInfoLabel: 'About the request link',
  requestLinkInfo:
    'serviceBW calls this link to start a request. It answers with the wallet link, the QR code and a reference.',
  resultLink: 'Result link',
  resultLinkInfoLabel: 'About the result link',
  resultLinkInfo:
    'serviceBW calls this link with the request’s reference. It answers with the status and, once the applicant has shared it, the data.',
  resultLinkHint: 'serviceBW puts the request’s reference in place of {reference}.',
  // Webhook address, which the design has no frame for
  webhookTitle: 'Updates by webhook',
  webhookHint:
    'Optional. With an address, serviceBW gets every update of a request there, including the data, and the result link answers without data.',
  mode: 'Mode:',
  modes: { pull: 'Pull', webhook: 'Webhook' },
  modeHints: {
    pull: 'serviceBW calls the result link.',
    webhook: 'Updates go to the webhook address.',
  },
  webhookLabel: 'Webhook address',
  webhookPlaceholder: 'https://',
  saveWebhook: 'Save address',
  removeWebhook: 'Remove address',
  saving: 'Saving…',
  webhookRequired: 'Enter the webhook address.',
  webhookSaved: 'Webhook address saved. New requests use webhook mode.',
  webhookRemoved: 'Webhook address removed. New requests use pull mode.',
  saveFailed: 'Saving didn’t work. Check your connection and try again.',
  // The configuration summary, which the design has no frame for
  documentsTitle: 'Documents',
  documentsHint: 'Applicants share this data from their EUDI Wallet.',
  items: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
};

export const INITIAL_DETAIL_STATE: DetailState = { status: 'loading', attempt: 0 };
