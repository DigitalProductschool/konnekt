import type { BranchCheck } from '@connection-portal/rules/checks/types';
import type {
  GenerationRun,
  Persona,
  PersonaConfirm,
  PersonaField,
  PersonaSlot,
  PersonaValue,
  ResultRow,
  ResultView,
  TestResults,
} from '@connection-portal/rules/personas/types';
import type { DataRow } from '@connection-portal/rules/personas/values';
import type { RuleContext } from '@connection-portal/rules/types';
import type { KeyboardEvent, ReactNode } from 'react';

import type { ValueChoice } from '../../../components/ValuesPicker/types';
import type { Personas } from '../../../hooks/usePersonas';
import type { RulesBranch } from '../RulesStep/types';

/** The test step (S8): the editor page's personas, rules and checks */
export interface TestStepProps {
  /** `usePersonas()`, which lives with the editor page (FR-019) */
  personas: Personas;
  /** The rules state's branches, in the rules step's tab order */
  branches: readonly RulesBranch[];
  /** Spec 003's checks per branch key (`useRuleChecks().byBranch`): null while unchecked */
  checks: Record<string, BranchCheck | null>;
  /**
   * The requested documents and value sets, as `usePersonas()` gets them, or `null` while they
   * load; for the values' labels
   */
  context: RuleContext | null;
  /** The catalog or the value sets couldn't load: the failure state, whose "Try again" reloads */
  contextFailed: boolean;
  /** Whether the connection is being edited ("save" in place of "publish") */
  editing: boolean;
  /** "Try again" of the failure state */
  onRetry: () => void;
  /**
   * The editor's failed save toast is showing: the step's saved toast goes, one toast at a time
   * (research R8)
   */
  saveFailed: boolean;
}

/** `TestDayLine` (S8.1; W1; test-results-v5 R1: in the result card's head) */
export interface TestDayLineProps {
  /** `YYYY-MM-DD`, today in Germany */
  today: string;
}

/** `VariantTabs` (S8.2; T031): the tab list. Each tab has `ELEMENT_IDS.testTab(branch.key)` */
export interface VariantTabsProps {
  /** Every variant, in the rules step's tab order */
  branches: readonly RulesBranch[];
  /** The shown variant's key (`selectedBranchOf()`) */
  selected: string;
  /** Spec 003's checks per branch key, for the `none_can_meet` notice (F6) */
  checks: Record<string, BranchCheck | null>;
  /** Selects a variant: dispatches `selectBranch` */
  onSelect: (branchKey: string) => void;
}

/** `VariantTab` (S8.2; T031): one variant's tab, its (i) or warning icon, and its underline */
export interface VariantTabProps {
  branch: RulesBranch;
  selected: boolean;
  /**
   * Spec 003's check of the variant: its `none_can_meet` notice adds the warning icon and its
   * tooltip (F38, FR-041), the test step's only finding
   */
  check: BranchCheck | null;
  onSelect: () => void;
  /** The arrow keys, Home and End (WAI-ARIA tabs; research R16) */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/**
 * `ApplicantsRow` (S8.3, S8.8; T032, T035): the chips, the loading status and "Generate all
 * again". Each chip has `ELEMENT_IDS.personaChip(persona.id)` and controls
 * `ELEMENT_IDS.personaPanel(persona.id)`, the panel that `TestStep` renders for the selected one
 */
export interface ApplicantsRowProps {
  /**
   * `null` while all three are generated (frame 18: first open, "Generate all", "Try
   * again"): skeleton pills
   */
  personas: readonly Persona[] | null;
  selected: PersonaSlot;
  /** The shown variant: the chips' outcome and accessible names (`chipNameOf()`) */
  branch: RulesBranch;
  /** Every ready persona's results; a persona being generated has none */
  results: TestResults | null;
  /** The run in progress, for the status at the row's right end (`runStatusOf()`) */
  run: GenerationRun | null;
  /** Selects a persona: dispatches `select` */
  onSelect: (slot: PersonaSlot) => void;
  /** "Generate all" (W9, F45) */
  onGenerateAll: () => void;
}

/** `RegenerateDialog` (S8.7; W9; T046): the question before generating anew */
export interface RegenerateDialogProps {
  /** `state.confirm`: the open question, or `null` while it is closed */
  confirm: PersonaConfirm | null;
  /** `state.personas`, for the names in the question */
  personas: readonly Persona[] | null;
  /** "Generate new data": `confirmed()` */
  onConfirm: () => void;
  /** "Cancel", the close button and Escape: `cancelled()` */
  onCancel: () => void;
}

/** `PersonaPanel` (S8.4; T033): the selected persona's data card, left of the results */
export interface PersonaPanelProps {
  /** A ready persona */
  persona: Persona;
  /** The persona fields for the current branches, in display order */
  fields: readonly PersonaField[];
  /** For the values' labels (option sets) */
  context: RuleContext;
  /** The keys of the fields read by rules failing in the shown variant (K1) */
  failingFields: readonly string[];
  /** "Edit data": opens `EditDataDialog` (`usePersonas().startEditing()`, spec 008 FR-042) */
  onEditData: () => void;
  /** "Generate again" */
  onGenerateAgain: () => void;
}

/**
 * `PersonaChip` (S8.3; T032): one tab of the "Sample citizens" tab list, with the persona's name
 * and the icon of its outcome for the shown variant
 */
export interface PersonaChipProps {
  persona: Persona;
  selected: boolean;
  /** Whether the persona meets the shown variant; `null` without a result: no icon, the name alone */
  meets: boolean | null;
  /** The shown variant's name, for the accessible name (`chipNameOf()`) */
  branchName: string;
  onSelect: () => void;
  /** The tab list's keys: arrows, Home and End */
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}

/** `GenerateAllButton` (S8.3; W9; T032, T071): "Generate all" */
export interface GenerateAllButtonProps {
  onGenerateAll: () => void;
}

/** `PersonaHead` (S8.4; T033, T072): "Mia’s data" and the persona's buttons */
export interface PersonaHeadProps {
  persona: Persona;
  /** "Edit data": opens the edit-data dialog (spec 008 FR-042) */
  onEditData: () => void;
  /** "Generate again" */
  onGenerateAgain: () => void;
}

/**
 * `PersonaData` (S8.4; T033, T071): the shown values as one flat list (`dataRowsOf()`), each
 * document's rows under its hidden heading
 */
export interface PersonaDataProps {
  persona: Persona;
  fields: readonly PersonaField[];
  context: RuleContext;
  failingFields: readonly string[];
}

/** One document's rows of the data card, in the order of `dataRowsOf()` (spec 008 F63, FR-043) */
export interface DataRowGroup {
  documentType: string;
  /** "Personal ID", "Driving licence": the group's hidden heading */
  documentLabel: string;
  rows: DataRow[];
}

/** One document's fields, in the order of the persona fields (F9) */
export interface DocumentGroup {
  documentType: string;
  /** "Personal ID", "Driving licence" */
  documentLabel: string;
  fields: PersonaField[];
}

/** `DocumentValues` (S8.4; F9; T033, T071): a document's hidden heading and its rows */
export interface DocumentValuesProps {
  group: DataRowGroup;
  persona: Persona;
  context: RuleContext;
  failingFields: readonly string[];
  /** The keys of the changed values (K2, `changedKeys()`) */
  changedFields: readonly string[];
}

/** `ValueRow` (S8.4; F10, F11, K1; T033, T071): one row's label and value */
export interface ValueRowProps {
  /** `dataRowLabelOf()`: "Date of birth", "Licence classes" */
  label: string;
  /** The text `dataRowTextOf()` gives */
  text: string;
  /** Shows a value read by a rule shown as failing in the shown variant (K1) */
  failing: boolean;
  /** Shows a value that differs from the generated one (K2, `changedKeys()`) */
  changed: boolean;
}

/** `CardScrollArea`: a card's rows under its head, scrolling on their own where the cards do */
export interface CardScrollAreaProps {
  /** The id of the card's heading, which names the area */
  labelledBy: string;
  children: ReactNode;
}

/** `ResultSection` (S8.6; T034): the selected persona's results for the shown variant */
export interface ResultSectionProps {
  /** `null` when the evaluator gave the variant no result */
  view: ResultView | null;
  /** The shown variant, for its name (`noRulesNoteOf()`) and its rules */
  branch: RulesBranch;
  /** `YYYY-MM-DD`, today in Germany: the test day under the heading (test-results-v5 R1) */
  today: string;
}

/** `ResultList` (S8.6; T034; test-results-v5 R2): the rows of a variant with rules */
export interface ResultListProps {
  rows: readonly ResultRow[];
}

/** `ResultRow` (S8.6; T034): one row, then a reported group's members (W10) */
export interface ResultRowProps {
  row: ResultRow;
  /** 0 for a top-level row, 1 for a reported group's member, 2 for a member of a member */
  depth: number;
}

/** `MemberRows` (S8.6; T034; W10): a reported group's members, indented */
export interface MemberRowsProps {
  members: readonly ResultRow[];
  /** The members' depth: their group's plus one */
  depth: number;
}

/** `GenerationFailed` (S8.9; T036), in place of the citizens row and the panel */
export interface GenerationFailedProps {
  /** Whether the connection is being edited (`failureHintOf()`) */
  editing: boolean;
  /** "Try again" */
  onRetry: () => void;
}

/** `LoadingStatus` (S8.8; T035): the citizens row's status */
export interface LoadingStatusProps {
  /** "Creating 3 sample citizens…", "Creating new data for Mia…", or '' without a run */
  text: string;
}

/** `SkeletonPill` (S8.8; T035; Figma 7062:51206–7062:51208) */
export interface SkeletonPillProps {
  /** Its width class (`SKELETON_PILL_WIDTHS`) */
  width: string;
}

/** `SkeletonDataRow` (S8.8; T035; Figma 7062:51214, 7062:51501): a label bar and a value bar */
export interface SkeletonDataRowProps {
  /** The value bar's width class (`SKELETON_VALUE_WIDTHS`) */
  value: string;
}

/**
 * `SkeletonResultRow` (S8.8; F14; T035; Figma 7062:51229, 7062:51516): the width classes of a
 * row's bars (`SKELETON_RESULT_ROWS`)
 */
export interface SkeletonResultRowProps {
  name: string;
  statement: string;
  message: string;
}

/**
 * A field's draft in the edit-data dialog (T038, T072; research R12): what the team member typed,
 * and the error it shows under the field, `null` while the entry is valid. A valid entry has been
 * applied to the dialog's working values; an invalid one hasn't, and blocks "Save and test"
 * (spec 008 FR-042)
 */
export interface Draft {
  text: string;
  error: string | null;
}

/** The dialog's drafts by key: a field's key, `NAME_DRAFT_KEY` or `ageDraftKey(key)` */
export type DraftsState = Readonly<Record<string, Draft>>;

/** `draftsReducer()`'s actions */
export type DraftsAction =
  /** One entry was typed: its text and its error, `null` when it is valid */
  { type: 'edit'; key: string; text: string; error: string | null };

/** An entry's parse: its value (`null` when empty), or the error to show under its field */
export type ParseResult<T> = { ok: true; value: T | null } | { ok: false; error: string };

/**
 * The edit-data dialog's working copy (spec 008 FR-042; S8.5; T072): which persona it was opened
 * for, its values with every valid entry applied, and the drafts with their errors. Nothing of it
 * reaches the persona before "Save and test"
 */
export interface EditDataState {
  /** The persona the dialog was opened for, `null` while it is closed */
  personaId: string | null;
  /**
   * The persona's values with the valid entries applied; hidden values (a class's date while the
   * class isn't held) stay, so that they come back with the class (W4)
   */
  values: Persona['values'];
  /** The typed texts and their errors: a field's key, `NAME_DRAFT_KEY` or `ageDraftKey(key)` */
  drafts: DraftsState;
}

/** `editDataReducer()`'s actions */
export type EditDataAction =
  /** The dialog opens for this persona: its values, its name as the name's draft, no errors */
  | { type: 'start'; persona: Persona }
  /** The dialog closed: "Cancel", "Save and test", or the persona went */
  | { type: 'close' }
  /** One entry was typed: its text and its error, `null` when it is valid */
  | { type: 'draft'; key: string; text: string; error: string | null }
  /** A valid entry's value, applied to the working copy */
  | { type: 'value'; key: string; value: PersonaValue };

/** What "Save and test" gives the step: the new name and the values that changed */
export interface EditedData {
  /** The name, trimmed and never empty */
  name: string;
  /** The values that differ from the persona's, by key (`changedValuesOf()`) */
  values: Record<string, PersonaValue>;
}

/**
 * `EditDataDialog` (spec 008 S13, FR-042, F40; T072): "Edit Mia’s data", the persona's fields
 * over a scrim, "Cancel" and "Save and test". Always mounted, so that closing it returns the
 * focus to "Edit data"
 */
export interface EditDataDialogProps {
  /** The ready persona being edited (`PersonaState.editing`), `null` while the dialog is closed */
  persona: Persona | null;
  /** The persona fields for the current branches, in display order */
  fields: readonly PersonaField[];
  /** For the value sets' choices; `null` while it loads (the dialog is closed then) */
  context: RuleContext | null;
  /** `YYYY-MM-DD`, for "Age today" */
  today: string;
  /** "Save and test" without an error */
  onSave: (edited: EditedData) => void;
  /** "Cancel", the ×, Escape and the scrim: the changes are dropped */
  onCancel: () => void;
}

/** What one field's component needs of the editor's drafts and commits (T043, T044) */
export interface FieldHandlers {
  /** The text typed into the field (a date of birth's date, a value's text) */
  onText: (field: PersonaField, text: string) => void;
  /** The text typed into a date of birth's "Age today" */
  onAge: (field: PersonaField, text: string) => void;
  /** A chosen value of a set, or several, or `null` for none */
  onValue: (field: PersonaField, value: PersonaValue) => void;
}

/** `DocumentFields` (S8.5; T043, T072): a document's heading and the fields of its values */
export interface DocumentFieldsProps extends FieldHandlers {
  group: DocumentGroup;
  /** For the fields' element ids */
  personaId: string;
  /** The dialog's working values (`EditDataState.values`) */
  values: Persona['values'];
  context: RuleContext;
  today: string;
  drafts: DraftsState;
}

/** `EditorField` (S8.5; T044): the field for one value, by its kind */
export interface EditorFieldProps extends FieldHandlers {
  field: PersonaField;
  /** The persona's value (`undefined` while it has none) */
  value: PersonaValue | undefined;
  /** The options of the field's value set, in the set's order; none for another kind */
  choices: ValueChoice[];
  today: string;
  drafts: DraftsState;
  /** The element id of the field's control */
  id: string;
}

/**
 * `FieldFrame` (S8.5; T044): KERN 2.8's form field around a control: its label above, the control,
 * and the error under it with the danger icon (Figma 7058:60812: 4px danger bar before the field,
 * `kern-form-input--error`). The control gets `aria-describedby`/`aria-invalid` itself, from
 * `errorIdOf()`
 */
export interface FieldFrameProps {
  /** The control's id: the label's `for`, and the base of the error's id (`${id}-error`) */
  id: string;
  label: string;
  /** The error shown under the field, `null` while the entry is valid */
  error: string | null;
  /**
   * Without a control to point the label at, as for a picker whose button reads its own name: the
   * label is plain text, not a `label`
   */
  plainLabel?: boolean;
  children: ReactNode;
}

/** `ValueField` (S8.5; T044): text, a whole number, a date as `dd.mm.yyyy`, or "Age today" */
export interface ValueFieldProps {
  id: string;
  label: string;
  /** What the field shows: the draft's text, or the value written as the field takes it */
  text: string;
  /** `'number'` and `'date'` get the numeric keypad (`inputmode="numeric"`, R16) */
  kind: PersonaField['kind'];
  error: string | null;
  onChange: (text: string) => void;
}

/** A date field's text after a change and where its caret goes (`dateEntryOf()`) */
export interface DateEntry {
  text: string;
  caret: number;
}

/** `DateOfBirthField` (S8.5; F10, T044): the date and "Age today" side by side */
export interface DateOfBirthFieldProps {
  id: string;
  label: string;
  dateText: string;
  dateError: string | null;
  ageText: string;
  ageError: string | null;
  onDateChange: (text: string) => void;
  onAgeChange: (text: string) => void;
}

/** `ChoiceField` (S8.5; F12, T044): a select of labels for one value of a set */
export interface ChoiceFieldProps {
  id: string;
  label: string;
  choices: ValueChoice[];
  value: PersonaValue | undefined;
  /** The chosen value, or `null` for "Not shared" */
  onChange: (value: string | number | null) => void;
}

/** `ValuesField` (S8.5; F12, T044): several values picked from a list, never typed */
export interface ValuesFieldProps {
  id: string;
  label: string;
  choices: ValueChoice[];
  /** Licence classes: by code, with their descriptions, "Search classes" */
  classes: boolean;
  value: PersonaValue | undefined;
  /** The chosen values in the set's order, or `null` for none */
  onChange: (values: readonly (string | number)[] | null) => void;
}

/** A `ValuesField`'s menu: whether it is open, and its search text */
export interface PickerState {
  open: boolean;
  search: string;
}

/** `pickerReducer()`'s actions */
export type PickerAction = { type: 'open' } | { type: 'close' } | { type: 'search'; text: string };
