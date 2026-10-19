import type { DetailState } from './types';

export const DETAIL_COPY = {
  // Figma "App/Header" on "22 Published": the status after the name, the form before the user
  live: 'Live',
  formId: (form: string) => `Form ID ${form}`,
  // Figma "App/Footer" on "22 Published"; "Home" stands in for "Edit documents" until T074
  home: 'Home',
  newConnection: 'Create new connection',
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
    'Your form management system calls this link to start a request. It answers with the wallet link, the QR code and a reference.',
  resultLink: 'Result link',
  resultLinkInfoLabel: 'About the result link',
  resultLinkInfo:
    'Your form management system calls this link with the request’s reference. It answers with the status and, once the applicant has shared it, the data.',
  // The configuration summary, which the design has no frame for
  documentsTitle: 'Documents',
  documentsHint: 'Applicants share this data from their EUDI Wallet.',
  items: (count: number) => `${count} ${count === 1 ? 'item' : 'items'}`,
};

export const INITIAL_DETAIL_STATE: DetailState = { status: 'loading', attempt: 0 };
