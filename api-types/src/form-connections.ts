// Mirrors the form connection schemas in backend/app/schemas.py
import type { DocumentField } from './document-types';

/** A document to request, with the keys of its selected fields (input) */
export interface RequestedDocument {
  document_type: string;
  fields: string[];
}

/** A requested document with its labels (output) */
export interface RequestedDocumentView {
  document_type: string;
  label: string;
  fields: DocumentField[];
}

// Rules and branches (specs/002-connection-rules/contracts/management-api.md). Each type mirrors
// the schema of the same name

/** How a based branch's item differs from the main branch's; null: it follows it */
export type Mark = 'changed' | 'removed' | 'added';

/** How a level's rules and groups combine; mirrors Combinator */
export type Combinator = 'and' | 'or';

/** The field a rule checks, or one part of it */
export interface RuleTarget {
  document_type: string;
  field: string;
  /** Fields made of parts: the part, such as 'issue_date' */
  part: string | null;
  /** The class code for a licence class's issue and expiry dates */
  licence_class: string | null;
}

/** An operator of the field's kind and its values. Keys without a value are left out */
export interface Condition {
  operator: string;
  /** Number and text conditions */
  value?: number | string | null;
  /** Text conditions: whether letter case counts; it doesn't by default */
  match_case?: boolean | null;
  /** Enum conditions */
  values?: (string | number)[] | null;
  /** Date conditions: YYYY-MM-DD */
  date?: string | null;
  years?: number | null;
  amount?: number | null;
  unit?: 'years' | 'months' | null;
}

/** A rule: one condition on one field, and the citizen's error message */
export interface RuleItem {
  type: 'rule';
  /** rule-{n} */
  id: string;
  name: string;
  mark: Mark | null;
  target: RuleTarget | null;
  condition: Condition | null;
  message: string;
}

/** A group at the top level, or a sub-group inside a group */
export interface GroupItem {
  type: 'group';
  /** group-{n}, shared by groups and sub-groups */
  id: string;
  name: string;
  mark: Mark | null;
  operator: Combinator;
  /** The group's own error message, if any */
  message: string | null;
  items: RuleTreeItem[];
}

/** An item of a branch's tree; mirrors the RuleTreeItem union, discriminated by `type` */
export type RuleTreeItem = RuleItem | GroupItem;

/** A branch ("variant" in the UI) with its rules, as the editor sends it */
export interface BranchInput {
  /**
   * Null or a client UUID for a branch added in this save; a stored draft's branches always carry
   * one (spec 007, research R10)
   */
  id: string | null;
  name: string;
  description: string | null;
  /** 'main' for the main branch only; fixed when the branch is added */
  origin: 'main' | 'based' | 'empty';
  /** The top level's combination */
  operator: Combinator;
  /** A based branch's own top-level AND/OR, which no longer follows the main branch */
  operator_mark: 'changed' | null;
  /** The top level, in display order */
  items: RuleTreeItem[];
}

/** The identifier counters the editor numbered new rules and groups from */
export interface NumberingBase {
  rule: number;
  group: number;
}

/** A form connection's branches and rules, saved together with it */
export interface RulesInput {
  /** Main branch first */
  branches: BranchInput[];
  numbering_base: NumberingBase;
  /** The rule set version the editor loaded; null on create */
  base_version: number | null;
  /** Save over rules another team member saved meanwhile; false by default */
  replace?: boolean;
}

/** A saved branch with its pull URL, which contains the placeholder `{reference}` literally */
export interface Branch extends BranchInput {
  id: string;
  is_main: boolean;
  pull_url: string;
}

// Drafts (specs/005-connection-drafts/contracts/management-api.md "Schemas")

/** Whether a connection is a draft or published; mirrors ConnectionStatus */
export type ConnectionStatus = 'draft' | 'published';

/** A step of the editor's wizard; mirrors EditorStep */
export type EditorStep = 'connection' | 'documents' | 'rules' | 'test';

/**
 * What every consumer shows, derived by the server (spec 010, research R1); mirrors
 * ConnectionState. `status` stays the discriminator
 */
export type ConnectionState = 'draft' | 'scheduled' | 'live' | 'deactivated';

// The activity (specs/010-revamp-backend-gaps/contracts/management-api.md "Schemas")

/** What happened, in the order of data-model.md section 2.2; mirrors ActivityKind */
export type ActivityKind =
  | 'created'
  | 'renamed'
  | 'description_changed'
  | 'documents_changed'
  | 'variant_added'
  | 'variant_removed'
  | 'variant_renamed'
  | 'rules_changed'
  | 'published'
  | 'scheduled'
  | 'start_date_changed'
  | 'became_active'
  | 'deactivated'
  | 'reactivated'
  | 'deleted'
  | 'restored';

/**
 * Who made an entry. `agent` without `approved`: the agent made the change for the team member
 * `name`; `agent` with `approved`: `name` approved what the agent asked for
 */
export interface ActivityActor {
  /** The team member's username when the entry was made */
  name: string;
  agent: string | null;
  approved: boolean;
}

/** One entry of a connection's activity; the server sends the kind and its data, no sentence */
export interface ActivityEntry {
  id: string;
  kind: ActivityKind;
  /** When it happened; the latest time of the entries merged into it */
  at: string;
  /** The variant's name for the kinds about a variant (the new name for a rename) */
  variant: string | null;
  /** YYYY-MM-DD: `scheduled`, and `start_date_changed` to a date */
  start_date: string | null;
  /** Null: the middleware did it by itself, or the entry was backfilled */
  actor: ActivityActor | null;
}

/** A page of a connection's activity, newest first */
export interface ActivityPage {
  items: ActivityEntry[];
  /** Null on the last page */
  next_cursor: string | null;
}

export interface FormConnectionSummary {
  id: string;
  name: string;
  /** '' possible for a draft */
  description: string;
  /** True for a draft; means nothing until it is published */
  is_active: boolean;
  /** Draft or published */
  status: ConnectionStatus;
  /** A draft's last save (FR-007) */
  updated_at: string;
  /** Spec 010 (research R1, R3) */
  state: ConnectionState;
  /** Null for a draft */
  published_at: string | null;
  /** Set only while deactivated */
  deactivated_at: string | null;
  /** YYYY-MM-DD, a day in Germany; set only while scheduled */
  start_date: string | null;
  /** A draft's stored step; null once published */
  step: EditorStep | null;
}

/** A page of the search's results (spec 007, research R9) */
export interface FormConnectionPage {
  items: FormConnectionSummary[];
  /** Null on the last page */
  next_cursor: string | null;
}

export interface FormConnection {
  /** Always 'published': a draft is a FormConnectionDraft */
  status: 'published';
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  documents: RequestedDocumentView[];
  trigger_url: string;
  /** The main branch's; contains the placeholder `{reference}` literally */
  pull_url: string;
  /** The current rule set's branches: main branch first, in tab order */
  branches: Branch[];
  /** The current rule set, which a save of rules names as its base_version */
  rule_set_version: number;
  /** The next free identifier numbers */
  next_rule_number: number;
  next_group_number: number;
  created_at: string;
  updated_at: string;
  /** Spec 010 (research R1, R3) */
  state: 'scheduled' | 'live' | 'deactivated';
  published_at: string;
  /** When it last became active; null if it never was */
  activated_at: string | null;
  /** Set only while deactivated */
  deactivated_at: string | null;
  /** YYYY-MM-DD, a day in Germany; set only while scheduled */
  start_date: string | null;
  /** The entry the activity card's closed line shows (data-model.md section 2.5) */
  last_activity: ActivityEntry | null;
}

/** Without rules, the form connection gets a main branch "Standard" */
export interface FormConnectionCreate {
  name: string;
  description?: string;
  documents: RequestedDocument[];
  rules?: RulesInput;
}

/** An absent field stays unchanged */
export interface FormConnectionUpdate {
  name?: string;
  description?: string;
  documents?: RequestedDocument[];
  rules?: RulesInput;
}

/**
 * A draft as the API returns it. No URLs, no rule set version and no is_active (FR-006, FR-007)
 */
export interface FormConnectionDraft {
  /** Always 'draft' */
  status: 'draft';
  /** Always 'draft' (spec 010, research R1) */
  state: 'draft';
  id: string;
  name: string;
  /** '' possible */
  description: string;
  /**
   * May be empty, and a document's fields may be empty; a type or field the catalog dropped keeps
   * its key as its label
   */
  documents: RequestedDocumentView[];
  /** Main branch first; a stored draft's branches always carry an id (spec 007, research R10) */
  branches: BranchInput[];
  /** The next free identifier numbers, the draft's numbering */
  next_rule_number: number;
  next_group_number: number;
  /** The step it was saved in, where "Continue" opens it (FR-008) */
  step: EditorStep;
  /** The draft version, sent back on save and publish (FR-022) */
  version: number;
  created_at: string;
  updated_at: string;
  /** The entry the activity card's closed line shows (spec 010, data-model.md section 2.5) */
  last_activity: ActivityEntry | null;
}

/** What GET /api/form-connections/:id answers; discriminated by `status` */
export type FormConnectionOrDraft = FormConnection | FormConnectionDraft;

/** A draft's branches and rules */
export interface DraftRules {
  /**
   * Main branch first; a branch's id may be null (the server assigns one) or a client UUID. A
   * stored draft's branches always carry an id (spec 007, research R10)
   */
  branches: BranchInput[];
  /** The counters the editor started from */
  numbering_base: NumberingBase;
}

/** Stores a new draft. Empty texts and lists and incomplete rules are accepted */
export interface DraftCreate {
  name: string;
  description?: string;
  documents: RequestedDocument[];
  rules: DraftRules;
  /** The step the draft is saved in */
  step: EditorStep;
}

/** Saves a draft's content again */
export interface DraftUpdate extends DraftCreate {
  /** The draft version the editor loaded */
  version: number;
  /** Save over another team member's save; false by default */
  replace?: boolean;
}

/**
 * Publishes a draft: the body of POST /api/form-connections, plus the draft's version.
 * `rules.base_version` and `rules.replace` are ignored: a draft has no rule set yet
 */
export interface DraftPublish extends FormConnectionCreate {
  /** The draft version the editor loaded */
  version: number;
  /** Publish over another team member's save; false by default */
  replace?: boolean;
}

// Connection URLs (specs/007-agent-mcp-server/contracts/management-api.md "Schemas")

/** A variant's pull URL; contains the placeholder `{reference}` literally */
export interface VariantUrl {
  id: string;
  name: string;
  pull_url: string;
}

/** The URLs to copy into serviceBW */
export interface ConnectionUrls {
  trigger_url: string;
  variants: VariantUrl[];
}
