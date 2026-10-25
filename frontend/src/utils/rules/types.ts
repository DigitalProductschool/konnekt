// Types of the rules modules (specs/002-connection-rules, research R10). The API's shapes are in
// src/types/; these describe what the modules derive from them
import type { DocumentField, FieldPart } from '../../types/document-types';
import type { RuleTreeItem } from '../../types/form-connections';
import type { OptionSet } from '../../types/option-sets';

/** The kind of value a rule compares, which decides its operators (FR-003) */
export type ConditionKind = 'number' | 'text' | 'enum' | 'date';

/** Which value an operator takes, and so which keys of the condition it uses */
export type OperatorInput = 'number' | 'text' | 'values' | 'date' | 'years' | 'amount';

/** The sections of the date operators' picker: a fixed date, "Time ago", "Time from now" (F3) */
export type DateSection = 'date' | 'time_ago' | 'time_from_now';

/** An operator of one kind, with FR-003's words */
export interface OperatorDefinition {
  /** The API's name, such as 'at_least_years_ago' */
  operator: string;
  kind: ConditionKind;
  /** FR-003's words, such as "is at least" */
  label: string;
  input: OperatorInput;
  /** Date operators only: the picker's section */
  section: DateSection | null;
}

/** Why a condition isn't complete; validation.ts turns each into the server's message */
export type ConditionProblem =
  | 'choose_check'
  | 'enter_number'
  | 'enter_text'
  | 'choose_value'
  | 'values_from_list'
  | 'value_once'
  | 'enter_date'
  | 'years_at_least_1'
  | 'choose_unit'
  | 'amount_at_least_1';

/**
 * A document whose fields rules can name: a catalog entry (`DocumentType` fits as it is), or a
 * requested document (`ruleDocumentsOf`)
 */
export interface RuleDocument {
  key: string;
  label: string;
  fields: DocumentField[];
}

/** Where the rules modules look up labels and values */
export interface RuleContext {
  /**
   * The documents to look targets up in. Validation takes the requested documents with only
   * their requested fields (`requestedRuleDocuments`); a statement can take the whole catalog,
   * so that a rule on data no longer requested still reads
   */
  documents: RuleDocument[];
  optionSets: OptionSet[];
}

/** A rule's target, looked up in the documents */
export interface ResolvedTarget {
  document: RuleDocument;
  field: DocumentField;
  /** Fields made of parts: the part checked */
  part: FieldPart | null;
  /** A per-class part's licence class, such as 'B' */
  licenceClass: string | null;
  /** The kind compared; null for an image, and for a field made of parts without its part */
  kind: ConditionKind | null;
  /** Enum targets: the key of their value set */
  optionSet: string | null;
  /** The Date of birth, whose years-ago conditions read as an age (FR-003) */
  dateOfBirth: boolean;
}

/** The design's chip before a date condition: decoration that assistive technologies skip */
export type StatementSymbol = '≥' | '<' | '=';

/** A rule as a readable statement (FR-005) */
export interface Statement {
  /** The document, the field and the part: "Driving licence – Licence class B – Issue date" */
  subject: string;
  /** The condition in FR-003's words: "is at least 2 years ago" */
  predicate: string;
  /** The design's chip, if the condition has one; render it with `aria-hidden` */
  symbol: StatementSymbol | null;
  /** The whole statement: subject and predicate */
  text: string;
}

/** A complete condition split for display: FR-003's words, then the values (the design's chips) */
export interface PredicateParts {
  /** The design's chip before the words, if the condition has one; decoration only */
  symbol: StatementSymbol | null;
  /** FR-003's words: "is at least", "includes one of" */
  words: string;
  /** The values, one chip each: ["21 years old"], ["B", "BE"], ['"Stuttgart"'] */
  values: string[];
  /** What follows the values: "ignoring letter case" for text, else null */
  tail: string | null;
}

/**
 * A rule's statement split as the rule row lays it out (S2, S6): "Personal ID –", "Date of birth",
 * then the predicate. `predicate` is null while the condition is incomplete
 */
export interface StatementParts {
  /** "Personal ID" */
  document: string;
  /** The document type's key, for its glyph */
  documentType: string;
  /** The field, and the part: "Date of birth", "Licence class B – Issue date" */
  data: string;
  predicate: PredicateParts | null;
}

/** A calendar date, as dates.ts computes with it */
export interface CalendarDate {
  year: number;
  /** 1 to 12 */
  month: number;
  day: number;
}

/** The dates a date condition means for a given day (the rule editor's example, F4) */
export type DateBoundary =
  | { relation: 'on_or_before' | 'before' | 'after' | 'on_or_after' | 'on'; date: string }
  | { relation: 'between'; from: string; to: string };

/** Where an item sits: its parent group (null at the top level) and its index there */
export interface ItemPosition {
  parentId: string | null;
  index: number;
}

/** An item found in a tree, with where it sits */
export interface FoundItem extends ItemPosition {
  item: RuleTreeItem;
  /** 0 at the top level, 1 inside a group, 2 inside a sub-group */
  depth: number;
}

/**
 * What an undo of a change to a tree's structure puts back (`undoChange`): one range of one
 * level as it was. The change replaced the items `before`, from `index` on, with the items that
 * `after` names: nothing for a deletion, the members for an ungrouping, the remaining member
 * for a dissolution, the new group and the items between its members for a grouping
 */
export interface LevelChange extends ItemPosition {
  /** The range's items before the change, as they were */
  before: RuleTreeItem[];
  /** The identifiers of the items in the range's place after the change */
  after: string[];
}

/** A problem that refuses publishing or saving, with what it names (FR-006) */
export interface RulesProblem {
  /** The server's message, such as "Rule 02 in Standard has no error message." */
  message: string;
  /** The branch it names, by its index in the list; null when it names none */
  branchIndex: number | null;
  /** The rule or group it names, if any, so that the focus can move there */
  itemId: string | null;
}

/** The noun the messages use for an item: a group inside a group is a sub-group */
export type ItemNoun = 'rule' | 'group' | 'sub-group';

/** An item of a tree with the noun that names it */
export interface ItemAtDepth {
  item: RuleTreeItem;
  noun: ItemNoun;
}
