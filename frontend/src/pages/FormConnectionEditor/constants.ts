import type { EditorState, EditorStep } from './types';

export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 500;

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
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'e.g. serviceBW form PK-30051',
  descriptionInfoLabel: 'About the description',
  descriptionInfo:
    'A note for your team, such as the form’s ID in your form management system. Applicants never see it.',
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
  // Starts with the visible "Added", for speech input (WCAG 2.5.3); "Remove" shows on focus
  removeLabel: (document: string) => `Added, remove ${document}`,
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
  // The documents step goes on to the rules (U09 6235:18684, F17)
  addRules: 'Add rules',
  publishWithoutRules: 'Publish without rules',
  saveWithoutRules: 'Save without rules',
  publishErrorText: 'Nothing went live. Check your connection and try again.',
  // Editing a connection (no frames): the same steps, saving instead of publishing (FR-005)
  editConnectionTitle: 'Edit the connection',
  editConnectionHint: 'Change the form name or description, or go on to the documents.',
  editDocumentsTitle: 'Edit documents',
  editNote: 'Requests already in progress keep their previous data.',
  save: 'Save',
  // The test step (spec 004, S2, S8; FR-004)
  testRules: 'Test rules',
  testRulesHint:
    'Choose a sample applicant to see which rules they meet and which messages they’d see. The data is made up, and nothing is shared.',
  saveErrorText: 'Nothing was saved. Check your connection and try again.',
};

// Drafts (spec 005, contracts/ui-screens.md "Copy")
export const DRAFT_COPY = {
  saveAndExit: 'Save and exit',
  saving: 'Saving…',
  savingStatus: 'Saving draft…',
  saveErrorTitle: 'Couldn’t save your draft',
  saveNetworkError: 'Couldn’t save. Check your internet connection and try again.',
  tryAgain: 'Try again',
  draftBadge: 'Draft',
  untitled: 'Untitled connection',
  draftSaved: (name: string) => `Draft ${name} saved.`,
  // The note on data the catalog no longer offers (S8; W10); its labels come from
  // `droppedDataOf()` in @connection-portal/rules/dropped
  catalogDroppedTitle: 'The wallet no longer offers some data of this draft',
  removeIt: 'Remove it',
  // The conflict dialog after "Save and exit", and the publish dialog's conflicts (S2; W4)
  draftChangedTitle: 'This draft has changed',
  draftChangedHint:
    'Reload shows the draft as they saved it and drops your changes. Replace their changes saves your version of the whole draft.',
  draftPublishedTitle: 'This draft has been published',
  draftPublishedHint: 'Your changes weren’t saved. Open the connection to see it.',
  draftDeletedTitle: 'This draft has been deleted',
  draftDeletedText:
    'This draft has been deleted since you opened it. Save your work as a new draft to keep it.',
  reload: 'Reload',
  replaceTheirChanges: 'Replace their changes',
  openConnection: 'Open the connection',
  saveAsNewDraft: 'Save as new draft',
  cancel: 'Cancel',
};

// The publish and save dialog (S5): U33 6376:25536, U35 6376:27178, U36 6376:27630, and
// design-notes.md §6
export const PUBLISH_COPY = {
  publishTitle: 'Ready to publish?',
  saveTitle: 'Ready to save?',
  publishWithoutRulesTitle: 'Publish without rules?',
  saveWithoutRulesTitle: 'Save without rules?',
  publishIntro: 'Once you publish, the connection goes live and you can add it to your form.',
  // F27: the message of "Edit this live connection?" (U38) moves here
  saveIntro:
    'Applicants keep using the current version until you save. Requests already in progress keep the data and rules they started with.',
  withoutRulesIntro: 'Without rules, anyone who shares these documents can apply.',
  documents: 'Documents',
  rules: 'Rules',
  documentLine: (document: string, count: number) =>
    `${document} · ${count} ${count === 1 ? 'data item' : 'data items'}`,
  ruleLine: (branch: string, count: number) =>
    `${branch} · ${count === 0 ? 'No rules' : `${count} ${count === 1 ? 'rule' : 'rules'}`}`,
  noRules: 'No rules',
  checkRulesAgain: 'Check rules again',
  addRules: 'Add rules',
  publish: 'Publish',
  save: 'Save',
  publishing: 'Publishing…',
  saving: 'Saving…',
  publishErrorTitle: 'Couldn’t publish',
  saveErrorTitle: 'Couldn’t save',
  retry: 'Try again',
  // W9: another team member saved the rules after the editor opened them (design-notes.md §6)
  rulesChangedTitle: 'The rules changed since you opened them',
  rulesChangedHint:
    'Reload to see their changes; your unsaved changes are lost. Or replace their changes with yours.',
  reload: 'Reload',
  replaceTheirChanges: 'Replace their changes',
};

// The question before data that rules check goes (F18): U10 6324:40071 for a document and
// 6324:40396 for a field. The rules are listed, one per line, between the dialog's two
// sentences; "All data" and the singular are proposed (design-notes.md §2)
const rulesCheck = (count: number) => `${count} ${count === 1 ? 'rule checks' : 'rules check'}`;
const editThem = (count: number, editing: boolean) =>
  `edit or delete ${count === 1 ? 'this rule' : 'these rules'} before you ${editing ? 'save' : 'publish'}.`;

export const REMOVE_DATA_COPY = {
  documentTitle: (document: string) => `Remove ${document}?`,
  fieldTitle: (field: string) => `Stop requesting ${field}?`,
  allFieldsTitle: (document: string) => `Stop requesting all data from ${document}?`,
  documentText: (count: number) => `${rulesCheck(count)} data from this document:`,
  fieldText: (count: number) => `${rulesCheck(count)} it:`,
  allFieldsText: (count: number) => `${rulesCheck(count)} this data:`,
  documentAfter: (count: number, editing: boolean) =>
    `After removing it, ${editThem(count, editing)}`,
  fieldAfter: (count: number, editing: boolean) => `After this, ${editThem(count, editing)}`,
  rule: (rule: string, branch: string) => `${rule} in ${branch}`,
  cancel: 'Cancel',
  removeDocument: 'Remove document',
  stopRequesting: 'Stop requesting',
};

/** The API's answer to a save over rules another team member saved meanwhile (FR-028) */
export const RULES_CHANGED_ERROR = 'rules_changed';

/** The API's answers to a draft save or publish over another team member's save (S2; R6) */
export const DRAFT_CHANGED_ERROR = 'draft_changed';
export const DRAFT_PUBLISHED_ERROR = 'draft_published';

// Validation messages; the API answers with the same ones (data-model.md, FR-003)
export const VALIDATION_MESSAGES = {
  nameRequired: 'Enter a name.',
  nameTooLong: `The name can have at most ${NAME_MAX_LENGTH} characters.`,
  descriptionTooLong: `The description can have at most ${DESCRIPTION_MAX_LENGTH} characters.`,
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

/**
 * A branch id as the server takes it (spec 007, research R10): a UUID in its canonical form, as
 * `crypto.randomUUID()` makes it. A loaded branch whose id isn't one gets a new id
 */
export const BRANCH_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Element ids that validation moves the focus to
export const ELEMENT_IDS = {
  form: 'connection-form',
  rulesProblem: 'rules-problem',
  // A rule's row or a group's frame
  rule: (branchKey: string, itemId: string) => `rule-${branchKey}-${itemId}`,
  // "Add rule" at the end of the top level, or of a group (null for the top level)
  addRule: (branchKey: string, parentId: string | null = null) =>
    parentId === null ? `add-rule-${branchKey}` : `add-rule-${branchKey}-${parentId}`,
  selectBox: (branchKey: string, ruleId: string) => `select-${branchKey}-${ruleId}`,
  groupMessage: (branchKey: string, groupId: string) => `group-message-${branchKey}-${groupId}`,
  // A variant's tab, and its panel (S2, F16)
  branchTab: (branchKey: string) => `branch-tab-${branchKey}`,
  branchPanel: (branchKey: string) => `branch-panel-${branchKey}`,
  addVariant: 'add-variant',
  name: 'connection-name',
  description: 'connection-description',
  documentsError: 'documents-error',
  pickerButton: (documentType: string) => `document-picker-${documentType}`,
  allData: (documentType: string) => `document-${documentType}-all`,
  fieldsError: (documentType: string) => `document-${documentType}-error`,
  field: (documentType: string, field: string) => `document-${documentType}-${field}`,
  title: (documentType: string) => `document-${documentType}-title`,
  // The test step (S8): a variant's tab and its panel, a persona's chip, its panel with the
  // heading "Mia’s data", and a field of its data
  testTab: (branchKey: string) => `test-tab-${branchKey}`,
  testPanel: (branchKey: string) => `test-panel-${branchKey}`,
  personaChip: (personaId: string) => `persona-chip-${personaId}`,
  personaPanel: (personaId: string) => `persona-panel-${personaId}`,
  personaHeading: (personaId: string) => `persona-heading-${personaId}`,
  personaField: (personaId: string, fieldKey: string) => `persona-${personaId}-${fieldKey}`,
};

// The wizard's steps by their place in the progress bar (CONNECTION_STEPS)
export const STEP_ORDER: EditorStep[] = ['connection', 'documents', 'rules', 'test'];

export const INITIAL_EDITOR_STATE: EditorState = {
  step: 'connection',
  name: '',
  description: '',
  documents: [],
  errors: {},
  publishError: null,
  rulesChanged: false,
  dialogOpen: false,
  publishing: false,
  removed: null,
  pendingRemoval: null,
  toast: null,
  savingDraft: false,
  draftError: null,
  conflict: null,
};
