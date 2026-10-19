import type { EditorState } from './types';

export const NAME_MAX_LENGTH = 200;
export const SERVICEBW_FORM_MAX_LENGTH = 500;

export const EDITOR_COPY = {
  headerTitle: 'New connection',
  // Step 1, Figma "02d Create a connection"
  connectionTitle: 'Create a connection',
  // Step 1 at /get-started, Figma "02 Create connection"
  firstConnectionTitle: 'Create your first connection',
  connectionHint:
    'Connect any form to the EUDI Wallet for applicants to share verified information.',
  formCardTitle: 'Which form are you connecting?',
  formCardHint: 'You can change these details later.',
  nameLabel: 'Form name',
  namePlaceholder: 'e.g. Residents’ parking permit',
  nameInfoLabel: 'About the form name',
  nameInfo:
    'Use the official name of the form so your team can find it easily. Applicants never see this name.',
  formIdLabel: 'Form ID',
  formIdPlaceholder: 'e.g. PK-30051',
  formIdInfoLabel: 'About the form ID',
  formIdInfo:
    'Copy the ID from your form management system. It makes sure the verified data reaches the right form. Applicants never see it.',
  // V2 says "Starts as a draft." first; connections have no drafts
  formCardNote: 'Nothing goes live until you publish.',
  continue: 'Continue',
  // Step 2, Figma "03 Documents"
  documentsTitle: 'Add documents',
  documentsHint: 'Choose which wallet documents applicants share, and which data from each.',
  available: 'Available in the wallet',
  add: 'Add',
  added: 'Added',
  remove: 'Remove',
  removeLabel: (document: string) => `Remove ${document}`,
  upcoming: (count: number) => `Coming to the wallet (${count})`,
  upcomingNote: 'You can add these once the wallet supports them.',
  emptyTitle: 'No documents yet',
  emptyText:
    'Add a document from the list on the left. Its data shows up here, and you choose what to ask for.',
  allData: 'All data',
  shared: (selected: number, total: number) => `${selected} of ${total} shared`,
  removed: (document: string) => `${document} removed`,
  undo: 'Undo',
  loadingCatalog: 'Loading the wallet documents…',
  catalogErrorTitle: 'Couldn’t load the wallet documents',
  catalogErrorText: 'Check your connection and try again.',
  retry: 'Try again',
  back: 'Back',
  publish: 'Publish',
  // Figma "06d Documents – ready to publish?"
  dialogTitle: 'Is this all the data you need?',
  checkAgain: 'Check again',
  confirm: 'Confirm and publish',
  publishing: 'Publishing…',
  publishErrorTitle: 'Couldn’t publish',
  publishErrorText: 'Nothing went live. Check your connection and try again.',
  // Editing a connection (no frames): the same steps, saving instead of publishing (FR-005)
  editConnectionTitle: 'Edit the connection',
  editConnectionHint: 'Change the form’s name or ID, or go on to the documents.',
  editDocumentsTitle: 'Edit documents',
  editNote: 'Requests already in progress keep their previous data.',
  save: 'Save',
  confirmSave: 'Confirm and save',
  saving: 'Saving…',
  saveErrorTitle: 'Couldn’t save',
  saveErrorText: 'Nothing was saved. Check your connection and try again.',
};

// Validation messages; the API answers with the same ones (data-model.md, FR-003)
export const VALIDATION_MESSAGES = {
  nameRequired: 'Enter a name.',
  nameTooLong: `The name can have at most ${NAME_MAX_LENGTH} characters.`,
  servicebwFormRequired: 'Enter the form ID.',
  servicebwFormTooLong: `The form ID can have at most ${SERVICEBW_FORM_MAX_LENGTH} characters.`,
  noDocuments: 'Add at least one document.',
  noFields: (document: string) => `Select at least one field for '${document}'.`,
};

// Documents the wallet doesn't hold yet (Figma "Nav/Coming soon"); they can't be added
export const UPCOMING_DOCUMENTS = [
  'Certificate of good conduct',
  'Proof of expertise',
  'Eye test certificate',
  'Medical fitness certificate',
  'Residence permit',
  'Vehicle registration',
];

// Element ids that validation moves the focus to
export const ELEMENT_IDS = {
  form: 'connection-form',
  name: 'connection-name',
  servicebwForm: 'connection-form-id',
  documentsError: 'documents-error',
  pickerButton: (documentType: string) => `document-picker-${documentType}`,
  allData: (documentType: string) => `document-${documentType}-all`,
  fieldsError: (documentType: string) => `document-${documentType}-error`,
  field: (documentType: string, field: string) => `document-${documentType}-${field}`,
  title: (documentType: string) => `document-${documentType}-title`,
};

export const INITIAL_EDITOR_STATE: EditorState = {
  step: 'connection',
  name: '',
  servicebwForm: '',
  documents: [],
  errors: {},
  publishError: null,
  dialogOpen: false,
  publishing: false,
  removed: null,
  toast: null,
};
