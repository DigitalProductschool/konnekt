import type { KeyboardEvent } from 'react';

import type { Personas } from '../../../hooks/usePersonas';
import type { BranchCheck } from '../../../utils/rules/checks/types';
import type {
  GenerationRun,
  Persona,
  PersonaField,
  PersonaSlot,
  ResultRow,
  ResultView,
  TestResults,
} from '../../../utils/rules/personas/types';
import type { RuleContext } from '../../../utils/rules/types';
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
}

/** `TestDayLine` (S8.1; W1) */
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
  /** Spec 003's check of the variant: its `none_can_meet` notice adds the warning icon (F6) */
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
   * `null` while all three are generated (frame 18: first open, "Generate all again", "Try
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
  /** "Generate all again" (W9) */
  onGenerateAll: () => void;
}

/** `PersonaPanel` (S8.4; T033): the selected persona's data card, left of the results */
export interface PersonaPanelProps {
  /** A ready persona */
  persona: Persona;
  /** The persona fields for the current branches, in display order */
  fields: readonly PersonaField[];
  /** For the values' labels (option sets) */
  context: RuleContext;
  /** `YYYY-MM-DD`, for the age after a date of birth */
  today: string;
  /** The keys of the fields read by rules failing in the shown variant (K1) */
  failingFields: readonly string[];
  /** "Generate again" */
  onGenerateAgain: () => void;
}

/**
 * `PersonaChip` (S8.3; T032): one tab of the "Sample applicants" tab list, with the persona's name
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

/** `GenerateAllButton` (S8.3; W9; T032) */
export interface GenerateAllButtonProps {
  onGenerateAll: () => void;
}

/** `PersonaHead` (S8.4; T033): "Mia’s data" and the persona's buttons */
export interface PersonaHeadProps {
  persona: Persona;
  /** "Generate again" */
  onGenerateAgain: () => void;
}

/** `PersonaData` (S8.4; T033): the shown values, under their documents' headings */
export interface PersonaDataProps {
  persona: Persona;
  fields: readonly PersonaField[];
  context: RuleContext;
  today: string;
  failingFields: readonly string[];
}

/** One document's fields, in the order of the persona fields (F9) */
export interface DocumentGroup {
  documentType: string;
  /** "Personal ID", "Driving licence" */
  documentLabel: string;
  fields: PersonaField[];
}

/** `DocumentValues` (S8.4; F9; T033): a document's heading and its values */
export interface DocumentValuesProps {
  group: DocumentGroup;
  persona: Persona;
  context: RuleContext;
  today: string;
  failingFields: readonly string[];
}

/** `ValueRow` (S8.4; F10, F11, K1; T033): one field's label and value */
export interface ValueRowProps {
  field: PersonaField;
  /** The text `valueTextOf()` gives */
  text: string;
  /** Read by a rule shown as failing in the shown variant (K1) */
  failing: boolean;
}

/** `ResultSection` (S8.6; T034): the selected persona's results for the shown variant */
export interface ResultSectionProps {
  /** `null` when the evaluator gave the variant no result */
  view: ResultView | null;
  /** The shown variant, for its name (`noRulesNoteOf()`) and its rules */
  branch: RulesBranch;
  /** Spec 003's check of the shown variant, for the `none_can_meet` notice (F6) */
  check: BranchCheck | null;
}

/** `ResultTable` (S8.6; T034): the rows of a variant with rules */
export interface ResultTableProps {
  view: ResultView;
}

/** `ResultRow` (S8.6; T034): one row, then a reported group's members (W10) */
export interface ResultRowProps {
  row: ResultRow;
  /** 0 for a top-level row, 1 for a reported group's member, 2 for a member of a member */
  depth: number;
  /** Whether the table has the message column ("Message Mia reads"; F3) */
  messageColumn: boolean;
}

/** `MemberRows` (S8.6; T034; W10): a reported group's members, indented */
export interface MemberRowsProps {
  members: readonly ResultRow[];
  /** The members' depth: their group's plus one */
  depth: number;
  messageColumn: boolean;
}

/** `GenerationFailed` (S8.9; T036), in place of the applicants row and the panel */
export interface GenerationFailedProps {
  /** Whether the connection is being edited (`failureHintOf()`) */
  editing: boolean;
  /** "Try again" */
  onRetry: () => void;
}

/** `LoadingStatus` (S8.8; T035): the applicants row's status */
export interface LoadingStatusProps {
  /** "Creating 3 sample applicants…", "Creating new data for Mia…", or '' without a run */
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
