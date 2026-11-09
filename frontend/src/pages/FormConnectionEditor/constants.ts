import type { EditorState, EditorStep, LeaveFlowState, PublishDialogState } from './types';

export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 500;

export const EDITOR_COPY = {
  headerTitle: 'New connection',
  // Step 1 (S7; U19 6699:45321), also at /get-started (U18 6793:47711 draws the same step head)
  connectionTitle: 'Name your connection',
  connectionHint: 'Link a service to the EUDI Wallet so citizens can share verified data.',
  // The card "Connection card (highlight)" (U19 6699:45329; U98 6731:39829 when editing)
  formCardTitle: 'Which service are you connecting?',
  formCardHint: 'You can change these details later.',
  editFormCardHint: 'The name shows in ‘Your connections’ and on the Published page.',
  nameLabel: 'Connection name',
  namePlaceholder: 'e.g. Residents’ parking permit',
  nameInfoLabel: 'About the connection name',
  // The ⓘ's text, two lines (U19 6809:46408; F60)
  nameInfo: 'This name helps you and your colleagues find this connection later.',
  nameInfoAdvice: 'Recommended: Use the name of a particular service. Citizens never see it.',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'e.g. For people who live in the area and park on the street',
  descriptionInfoLabel: 'About the description',
  descriptionInfo:
    'A note for your team, such as the form’s ID in your form management system. Citizens never see it.',
  // The info strip at the bottom of step 1's card, in a new connection's and a stored draft's
  // flow (FR-026, Q8 (d); U19 6699:45346)
  draftNote: 'Starts as a draft. It only becomes active when you publish.',
  // The same strip in the edit flow of a published connection (U98 6731:39846, its copy F49)
  editNote:
    'Your changes take effect when you save them. Requests already in progress keep their previous configuration.',
  // Step 1's footer action (U19 6699:45349, U98 6731:39850)
  continue: 'Choose documents',
  // Step 2, Figma "03 Documents"
  // The step head (U20 7290:60373, U21 #7)
  documentsTitle: 'Choose documents and data',
  documentsHint:
    'Add the documents citizens need to share for this connection. You can set rules in the next step using information you select here.',
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
  removed: (document: string) => `${document} removed.`,
  undo: 'Undo',
  loadingCatalog: 'Loading the wallet documents…',
  catalogErrorTitle: 'Couldn’t load the wallet documents',
  catalogErrorText: 'Check your connection and try again.',
  retry: 'Try again',
  back: 'Back',
  publish: 'Publish',
  // The documents step goes on to the rules (U20 7290:60388, U21 #20; FR-031)
  addRules: 'Set rules',
  publishWithoutRules: 'Publish without rules',
  publishErrorText: 'Nothing went live. Check your connection and try again.',
  // Editing a connection: the same steps, saving instead of publishing (FR-005); step 1 as the
  // build note U05 #27 words it (figma-audit report, cosmetic 6)
  editConnectionTitle: 'Connection details',
  editConnectionHint: 'Rename this connection or update its description.',
  editDocumentsTitle: 'Edit documents',
  save: 'Save',
  // The test step (spec 004, S2, S8; FR-004)
  testRules: 'Test rules',
  // Why "Test rules" can't be used now (FR-034, W21; U01 #22)
  saveRuleFirst: 'Save the rule first',
  finishGroupingFirst: 'Finish grouping first',
  // The edit flow's footer (FR-045, U98 6731:39850)
  discardChanges: 'Discard changes',
  saveErrorText: 'Nothing was saved. Check your connection and try again.',
};

// Drafts (spec 005, contracts/ui-screens.md "Copy")
export const DRAFT_COPY = {
  saveAndExit: 'Save and exit',
  saving: 'Saving…',
  savingStatus: 'Saving draft…',
  // The failed save's toast (FR-033, F67; U51 6197:11098), with "Try again" and the error ID
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
    'Reload shows the draft as it was last saved and drops your changes. Replace their changes saves your version of the whole draft.',
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

// Leaving a flow (FR-026; CLAR 2026-11-07 #8, #47): "Leave this connection?" (U17 7173:52682),
// "Save your changes?" (U99 7173:52836) and "Save before you log out?" (U17 6408:72737); the
// wording of T048's task line and FR-026, whose frames T048 checks
export const LEAVE_COPY = {
  leaveTitle: 'Leave this connection?',
  leaveText:
    'If you leave now, you lose all progress. Save it to continue later, or discard the connection.',
  discardConnection: 'Discard connection',
  saveProgress: 'Save progress',
  saveTitle: 'Save your changes?',
  saveText:
    'If you leave now, your changes are lost. Save them, or discard them and keep the active version.',
  discardChanges: 'Discard changes',
  save: 'Save',
  logoutTitle: 'Save before you log out?',
  logoutText: 'Your latest changes will be lost if you log out now.',
  saveAndLogOut: 'Save and log out',
  logOutAnyway: 'Log out anyway',
  cancel: 'Cancel',
};

// The publish and save dialog (S5): U33 6376:25536, U35 6376:27178, U36 6376:27630, and
// design-notes.md §6
export const PUBLISH_COPY = {
  publishTitle: 'Ready to publish?',
  // The edit flow's save dialog (FR-045c; CLAR #47: "Save" opens "Save changes?")
  saveTitle: 'Save changes?',
  publishWithoutRulesTitle: 'Publish without rules?',
  saveWithoutRulesTitle: 'Save without rules?',
  // U73 7058:62120, U75 6376:25536, U77 6760:47979 (FR-002; F1: no "Active from")
  publishIntro: 'When you publish, the connection is ready to be added to your services.',
  // F27: the message of "Edit this live connection?" (U38) moves here
  saveIntro:
    'Citizens keep using the current version until you save. Requests already in progress keep the data and rules they started with.',
  withoutRulesIntro: 'Without rules, anyone who shares these documents can apply.',
  documents: 'Documents',
  rules: 'Rules',
  documentLine: (document: string, count: number) =>
    `${document} · ${count} ${count === 1 ? 'data item' : 'data items'}`,
  ruleLine: (branch: string, count: number) =>
    `${branch} · ${count === 0 ? 'No rules' : `${count} ${count === 1 ? 'rule' : 'rules'}`}`,
  noRules: 'No rules',
  checkRulesAgain: 'Check rules again',
  // FR-044a: opened from the test step, it closes back to it (U73 7058:62120)
  backToTest: 'Back to test',
  addRules: 'Add rules',
  publish: 'Publish connection',
  save: 'Save',
  // The status dialog (U78 6387:65280 publishing, 6387:65289 published; "Dialog/Status"); the
  // edit flow's words are the save's, its frames undrawn
  publishing: 'Publishing…',
  saving: 'Saving…',
  statusWait: 'This takes a few seconds.',
  published: 'Published',
  saved: 'Saved',
  openingConnection: 'Opening your connection page…',
  // A network failure or a 5xx (U79 6376:27178; F46: with the error ID, the summary kept)
  publishFailed:
    'Couldn’t publish, so nothing has changed. Check your internet connection and try again.',
  saveFailed:
    'Couldn’t save, so nothing has changed. Check your internet connection and try again.',
  // Any other refusal, above the server's message (002-S5.3)
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
  nameRequired: 'Enter a name for the connection.',
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
  // The footer's "Save and exit", where the failed save's "Try again" leaves the focus
  saveAndExit: 'save-and-exit',
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

// The wizard's steps by their place in the progress bar (CONNECTION_STEPS; Publish is a dialog)
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

export const INITIAL_PUBLISH_DIALOG_STATE: PublishDialogState = {
  phase: 'closed',
  from: 'test',
  withoutRules: false,
  failure: null,
  conflict: null,
  connectionId: null,
};

/**
 * How long "Published" ("Saved") shows before the details open (FR-044d; U78 6376:26662: "green
 * check for 0.5 s"). Behaviour, not motion: it stays under reduced motion (CLAR #33, FR-050)
 */
export const PUBLISHED_DELAY_MS = 500;

/**
 * The status dialog ("Dialog/Status", U78 6387:65280: 400 × 232, padding 40 32, gap 16, radius 12,
 * no outline), on the scrim and with the fade of `ConfirmDialog` (design-notes §4). The `!`s beat
 * kern.css's dialog and its small-screen bottom sheet, as `ConfirmDialog`'s do
 */
export const PUBLISH_STATUS_DIALOG_CLASSES =
  'kern-dialog motion m-auto! w-400 max-w-[calc(100%-32px)]! min-w-0! rounded-(--kern-metric-border-radius-large)! border-0! backdrop:bg-(--kern-color-action-state-indicator-shade)!';

export const INITIAL_LEAVE_FLOW_STATE: LeaveFlowState = { status: 'idle' };
