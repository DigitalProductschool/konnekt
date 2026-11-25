import { defineTexts } from '@konnekt/rules/language';

import type { EditorState, EditorStep, LeaveFlowState, PublishDialogState } from './types';

export const NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 500;

// The wizard's own copy in both languages (spec 009, R1; glossary G§2 "connection", "draft",
// "publish", "revision", "discard", "cancel/back/next/save"): the English column is spec 008's,
// word for word (FR-014). Names, descriptions and variant names are content and never here
export const EDITOR_COPY = defineTexts(
  {
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
    // The ⓘ's text, a line each (U19 6809:46408; F60); German has the advice alone (round 4 of
    // the user tests)
    nameInfoLines: [
      'This name helps you and your colleagues find this connection later.',
      'Recommended: Use the name of a particular service. Citizens never see it.',
    ] as readonly string[],
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
    // The same strip for a scheduled connection (spec 010, S18; FR-013, W7)
    scheduledEditNote: (date: string) =>
      `Scheduled. Your changes become active on ${date} once you save them.`,
    // Step 1's footer action (U19 6699:45349, U98 6731:39850)
    continue: 'Choose documents',
    // Step 2, Figma "03 Documents"
    // The step head (U20 7290:60373, U21 #7)
    documentsTitle: 'Choose documents and data',
    documentsHint:
      'Add the documents citizens need to share for this connection. You can set rules in the next step using information you select here.',
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
    save: 'Save',
    // The test step (spec 004, S2, S8; FR-004)
    testRules: 'Test rules',
    // Why "Test rules" can't be used now (FR-034, W21; U01 #22)
    saveRuleFirst: 'Save the rule first',
    finishGroupingFirst: 'Finish grouping first',
    // The edit flow's footer (FR-045, U98 6731:39850)
    discardChanges: 'Discard changes',
    saveErrorText: 'Nothing was saved. Check your connection and try again.',
  },
  {
    headerTitle: 'Neue Anbindung',
    connectionTitle: 'Benennen Sie Ihre Anbindung',
    connectionHint:
      'Verbinden Sie einen Dienst mit dem EUDI-Wallet, um verifizierte Daten von Bürgerinnen und Bürgern zu empfangen.',
    formCardTitle: 'Welchen Dienst möchten Sie anbinden?',
    formCardHint: 'Sie können diese Angaben später ändern.',
    editFormCardHint:
      'Der Name erscheint unter „Ihre Anbindungen“ und auf der Seite der veröffentlichten Anbindung.',
    nameLabel: 'Name der Anbindung',
    namePlaceholder: 'z. B. Bewohnerparkausweis',
    nameInfoLabel: 'Informationen zum Namen der Anbindung',
    nameInfoLines: ['Empfehlung: Verwenden Sie den Namen des Dienstes.'],
    descriptionLabel: 'Beschreibung',
    descriptionPlaceholder:
      'z. B. Für Personen, die im Gebiet wohnen und auf der Straße parken möchten',
    descriptionInfoLabel: 'Informationen zur Beschreibung',
    descriptionInfo:
      'Eine Notiz für Ihr Team, etwa die ID des Formulars in Ihrem Formularmanagementsystem. Bürgerinnen und Bürger sehen sie nie.',
    draftNote: 'Entwurf: Die Anbindung wird erst aktiv, wenn Sie sie veröffentlichen.',
    editNote:
      'Ihre Änderungen werden wirksam, wenn Sie sie speichern. Bereits laufende Anfragen behalten ihre bisherige Konfiguration.',
    scheduledEditNote: (date: string) =>
      `Geplant. Ihre Änderungen werden am ${date} aktiv, sobald Sie sie speichern.`,
    continue: 'Dokumente auswählen',
    documentsTitle: 'Dokumente und Daten auswählen',
    documentsHint:
      'Wählen Sie die Dokumente und Felder aus, die für diese Anbindung erforderlich sind.',
    removed: (document: string) => `${document} entfernt.`,
    undo: 'Rückgängig',
    loadingCatalog: 'Die Wallet-Dokumente werden geladen …',
    catalogErrorTitle: 'Die Wallet-Dokumente konnten nicht geladen werden',
    catalogErrorText: 'Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    retry: 'Erneut versuchen',
    back: 'Zurück',
    publish: 'Veröffentlichen',
    addRules: 'Regeln festlegen',
    publishWithoutRules: 'Ohne Regeln veröffentlichen',
    publishErrorText:
      'Es wurde nichts veröffentlicht. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    editConnectionTitle: 'Details der Anbindung',
    editConnectionHint: 'Benennen Sie diese Anbindung um oder ändern Sie ihre Beschreibung.',
    save: 'Speichern',
    testRules: 'Regeln testen',
    saveRuleFirst: 'Speichern Sie zuerst die Regel',
    finishGroupingFirst: 'Schließen Sie zuerst das Gruppieren ab',
    discardChanges: 'Änderungen verwerfen',
    saveErrorText:
      'Es wurde nichts gespeichert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
  }
);

// Drafts (spec 005, contracts/ui-screens.md "Copy")
export const DRAFT_COPY = defineTexts(
  {
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
    // `droppedDataOf()` in @konnekt/rules/dropped
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
  },
  {
    saveAndExit: 'Speichern und schließen',
    saving: 'Wird gespeichert …',
    savingStatus: 'Entwurf wird gespeichert …',
    saveNetworkError:
      'Der Entwurf konnte nicht gespeichert werden. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
    tryAgain: 'Erneut versuchen',
    draftBadge: 'Entwurf',
    untitled: 'Unbenannte Anbindung',
    draftSaved: (name: string) => `Entwurf ${name} gespeichert.`,
    catalogDroppedTitle: 'Das Wallet bietet einige Daten dieses Entwurfs nicht mehr an',
    removeIt: 'Entfernen',
    draftChangedTitle: 'Dieser Entwurf wurde geändert',
    draftChangedHint:
      '„Neu laden“ zeigt den Entwurf, wie er zuletzt gespeichert wurde, und verwirft Ihre Änderungen. „Mit Ihrer Version überschreiben“ speichert Ihre Version des ganzen Entwurfs.',
    draftPublishedTitle: 'Dieser Entwurf wurde veröffentlicht',
    draftPublishedHint:
      'Ihre Änderungen wurden nicht gespeichert. Öffnen Sie die Anbindung, um sie anzusehen.',
    draftDeletedTitle: 'Dieser Entwurf wurde gelöscht',
    draftDeletedText:
      'Dieser Entwurf wurde gelöscht, nachdem Sie ihn geöffnet haben. Speichern Sie Ihre Arbeit als neuen Entwurf, um sie zu behalten.',
    reload: 'Neu laden',
    replaceTheirChanges: 'Mit Ihrer Version überschreiben',
    openConnection: 'Anbindung öffnen',
    saveAsNewDraft: 'Als neuen Entwurf speichern',
    cancel: 'Abbrechen',
  }
);

// Leaving a flow (FR-026; CLAR 2026-11-07 #8, #47): "Leave this connection?" (U17 7173:52682),
// "Save your changes?" (U99 7173:52836) and "Save before you log out?" (U17 6408:72737); the
// wording of T048's task line and FR-026, whose frames T048 checks
export const LEAVE_COPY = defineTexts(
  {
    leaveTitle: 'Leave this connection?',
    leaveText:
      'If you leave now, you lose all progress. Save it to continue later, or discard the connection.',
    discardConnection: 'Discard connection',
    saveProgress: 'Save progress',
    saveTitle: 'Save your changes?',
    saveText:
      'If you leave now, your changes are lost. Save them, or discard them and keep the active version.',
    // The same question for a scheduled connection (spec 010, S18; FR-013, W7)
    saveTextScheduled:
      'If you leave now, your changes are lost. Save them, or discard them and keep the scheduled version.',
    discardChanges: 'Discard changes',
    save: 'Save',
    logoutTitle: 'Save before you log out?',
    logoutText: 'Your latest changes will be lost if you log out now.',
    saveAndLogOut: 'Save and log out',
    logOutAnyway: 'Log out anyway',
  },
  {
    leaveTitle: 'Diese Anbindung verlassen?',
    leaveText:
      'Wenn Sie jetzt gehen, geht Ihr gesamter Fortschritt verloren. Speichern Sie ihn, um später weiterzumachen, oder verwerfen Sie die Anbindung.',
    discardConnection: 'Anbindung verwerfen',
    saveProgress: 'Fortschritt speichern',
    saveTitle: 'Ihre Änderungen speichern?',
    saveText:
      'Wenn Sie jetzt gehen, gehen Ihre Änderungen verloren. Speichern Sie sie oder verwerfen Sie sie und behalten Sie die aktive Version.',
    saveTextScheduled:
      'Wenn Sie jetzt gehen, gehen Ihre Änderungen verloren. Speichern Sie sie oder verwerfen Sie sie und behalten Sie die geplante Version.',
    discardChanges: 'Änderungen verwerfen',
    save: 'Speichern',
    logoutTitle: 'Vor dem Abmelden speichern?',
    logoutText: 'Ihre letzten Änderungen gehen verloren, wenn Sie sich jetzt abmelden.',
    saveAndLogOut: 'Speichern und abmelden',
    logOutAnyway: 'Trotzdem abmelden',
  }
);

// The publish and save dialog (S5): U33 6376:25536, U35 6376:27178, U36 6376:27630, and
// design-notes.md §6; "Active from" (spec 010, S14): the German from spec 009's glossary
// ("Planen"; "Ihr Dienst", the team's service)
export const PUBLISH_DIALOG_COPY = defineTexts(
  {
    publishTitle: 'Ready to publish?',
    // The edit flow's save dialog (FR-045c; CLAR #47: "Save" opens "Save changes?")
    saveTitle: 'Save changes?',
    publishWithoutRulesTitle: 'Publish without rules?',
    saveWithoutRulesTitle: 'Save without rules?',
    // U73 7058:62120, U75 6376:25536, U77 6760:47979: with "Now" (spec 010, FR-001)
    publishIntro: 'When you publish, the connection is ready to be added to your services.',
    // U75 6383:66119, U76 6635:36265: with "On a date" (spec 010, FR-002)
    scheduleIntro:
      'The connection becomes active on the date you choose. You get the links now, so your service can be ready in time.',
    // F27: the message of "Edit this live connection?" (U38) moves here
    saveIntro:
      'Citizens keep using the current version until you save. Requests already in progress keep the data and rules they started with.',
    // "Save changes?" for a scheduled connection (spec 010, S14; FR-013, W6; copy.md §2)
    saveScheduledIntro: (date: string) =>
      `Your changes become active with the connection on ${date}. Citizens can’t use it before then.`,
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
    // With "On a date" (U75 6383:66119; spec 010, FR-002)
    schedule: 'Schedule',
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
    // The example's line (spec 010, S14; FR-060, F30; U73 7137:50210), while the loaded draft is
    // the unchanged example and the page holds no change against it (`showsExampleLine()`)
    exampleLine:
      'This is still the example. Check that the name, documents and rules fit your service.',
  },
  {
    // A soft hyphen (R9 step 3): at 320px the whole word pushed the dialog's × past its edge
    // (spec 009, T046)
    publishTitle: 'Bereit zum Veröffent\u00ADlichen?',
    saveTitle: 'Änderungen speichern?',
    // As publishTitle (R9 step 3; spec 009, T046)
    publishWithoutRulesTitle: 'Ohne Regeln veröffent\u00ADlichen?',
    saveWithoutRulesTitle: 'Ohne Regeln speichern?',
    publishIntro:
      'Nach der Veröffentlichung kann die Anbindung in Ihre Dienste eingebunden werden.',
    scheduleIntro:
      'Die Anbindung wird am gewählten Datum aktiv. Sie erhalten die Links schon jetzt, damit Ihr Dienst rechtzeitig bereit ist.',
    saveIntro:
      'Bis Sie speichern, gilt für Bürgerinnen und Bürger weiter die aktuelle Version. Bereits laufende Anfragen behalten die Daten und Regeln, mit denen sie begonnen haben.',
    saveScheduledIntro: (date: string) =>
      `Ihre Änderungen werden mit der Anbindung am ${date} aktiv. Vorher können Bürgerinnen und Bürger die Anbindung nicht nutzen.`,
    withoutRulesIntro: 'Ohne Regeln können alle, die diese Dokumente teilen, einen Antrag stellen.',
    documents: 'Dokumente',
    rules: 'Regeln',
    documentLine: (document: string, count: number) =>
      `${document} · ${count} ${count === 1 ? 'Feld' : 'Felder'}`,
    ruleLine: (branch: string, count: number) =>
      `${branch} · ${count === 0 ? 'Keine Regeln' : `${count} ${count === 1 ? 'Regel' : 'Regeln'}`}`,
    noRules: 'Keine Regeln',
    checkRulesAgain: 'Regeln erneut prüfen',
    backToTest: 'Zurück zum Test',
    addRules: 'Regeln hinzufügen',
    publish: 'Anbindung veröffentlichen',
    schedule: 'Planen',
    save: 'Speichern',
    publishing: 'Wird veröffentlicht …',
    saving: 'Wird gespeichert …',
    statusWait: 'Das dauert einige Sekunden.',
    published: 'Veröffentlicht',
    saved: 'Gespeichert',
    openingConnection: 'Die Seite Ihrer Anbindung wird geöffnet …',
    // A soft hyphen in "Internetverbindung": the alert's title can't break the word otherwise
    // and runs past the alert at 320 px (R9 step 3; design-notes §2.2, T035)
    publishFailed:
      'Die Anbindung konnte nicht veröffentlicht werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internet\u00ADverbindung und versuchen Sie es erneut.',
    // A soft hyphen in "Internetverbindung": the alert's title can't break the word otherwise
    // and runs past the alert at 320 px (R9 step 3; design-notes §2.2, T035)
    saveFailed:
      'Die Änderungen konnten nicht gespeichert werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internet\u00ADverbindung und versuchen Sie es erneut.',
    publishErrorTitle: 'Die Anbindung konnte nicht veröffentlicht werden',
    saveErrorTitle: 'Die Änderungen konnten nicht gespeichert werden',
    retry: 'Erneut versuchen',
    rulesChangedTitle: 'Die Regeln wurden geändert, seit Sie sie geöffnet haben',
    rulesChangedHint:
      'Laden Sie neu, um die Änderungen der anderen zu sehen; Ihre nicht gespeicherten Änderungen gehen dabei verloren. Oder überschreiben Sie deren Änderungen mit Ihrer Version.',
    reload: 'Neu laden',
    replaceTheirChanges: 'Mit Ihrer Version überschreiben',
    // Written from spec 009's glossary ("Beispiel", "Dokument", "Regel", "Ihr Dienst")
    exampleLine:
      'Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen.',
  }
);

/**
 * The example variant's names (spec 010, FR-058; research R7, design-notes §4.1 call 6): the rules
 * step shows the variant's banner on a variant of the example that carries one of them, in either
 * language, as stored; a renamed or another variant shows none
 */
export const EXAMPLE_VARIANT_NAMES: readonly string[] = ['Ambulance', 'Krankentransport'];

/** The API's answer to a save over rules another team member saved meanwhile (FR-028) */
export const RULES_CHANGED_ERROR = 'rules_changed';

/** The API's answers to a draft save or publish over another team member's save (S2; R6) */
export const DRAFT_CHANGED_ERROR = 'draft_changed';
export const DRAFT_PUBLISHED_ERROR = 'draft_published';

// Validation messages; the API answers with the same ones, word for word in both languages
// (data-model.md, FR-003; `backend/app/services/form_connections.py`)
export const VALIDATION_MESSAGES = defineTexts(
  {
    nameRequired: 'Enter a name for the connection.',
    nameTooLong: `The name can have at most ${NAME_MAX_LENGTH} characters.`,
    descriptionTooLong: `The description can have at most ${DESCRIPTION_MAX_LENGTH} characters.`,
  },
  {
    nameRequired: 'Geben Sie einen Namen für die Anbindung ein.',
    nameTooLong: `Der Name darf höchstens ${NAME_MAX_LENGTH} Zeichen lang sein.`,
    descriptionTooLong: `Die Beschreibung darf höchstens ${DESCRIPTION_MAX_LENGTH} Zeichen lang sein.`,
  }
);

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
  allData: (documentType: string) => `document-${documentType}-all`,
  fieldsError: (documentType: string) => `document-${documentType}-error`,
  field: (documentType: string, field: string) => `document-${documentType}-${field}`,
  // A data group's checkbox (FR-079); field keys have no hyphen, so it meets no field's id
  group: (documentType: string, group: string) => `document-${documentType}-group-${group}`,
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
  activeFrom: 'now',
  startDateText: '',
  dateError: false,
  dateRefusals: 0,
};

/** The API's answer to a start date that isn't after today in Germany (spec 010, FR-003) */
export const INVALID_START_DATE_ERROR = 'invalid_start_date';

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
