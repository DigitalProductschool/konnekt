// What the tools answer about connections, variants, rules and groups (contracts/mcp-tools.md
// "Results and errors"; data-model §7, §9): the refs with their links, the structured items with
// their statements, the connection URLs, the citizen fields, and the helpers of the text blocks.
// Pure: every function derives its answer from the API's shapes and the rules logic of
// `@connection-portal/rules`, as the editor derives what it shows
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  Combinator,
  Condition,
  ConnectionState as ApiConnectionState,
  ConnectionStatus,
  EditorStep,
  FormConnectionOrDraft,
  FormConnectionSummary,
  Mark,
  RequestedDocument,
  RequestedDocumentView,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import type { OptionSet } from '@connection-portal/api-types/option-sets';
import { ruleDocumentsOf } from '@connection-portal/rules/conditions';
import { droppedDataOf as catalogDroppedDataOf } from '@connection-portal/rules/dropped';
import { personaFieldsOf } from '@connection-portal/rules/personas/fields';
import { statementOf } from '@connection-portal/rules/statements';
import { flattenItems, hasAnyRule } from '@connection-portal/rules/tree';
import type { RuleContext, RuleDocument } from '@connection-portal/rules/types';
import { unrequestedRules } from '@connection-portal/rules/validation';

import { connectionLink, itemLink, variantLink } from './links';

// Refs (contracts/mcp-tools.md "Results and errors")

/**
 * A connection's state as agents see it: a draft, or a published one that is scheduled, live or
 * deactivated; the API's `state` (spec 010, research R1)
 */
export type ConnectionState = ApiConnectionState;

export interface ConnectionRef {
  id: string;
  name: string;
  status: ConnectionState;
  link: string;
}

export interface VariantRef {
  id: string;
  name: string;
  link: string;
}

export interface ItemRef {
  id: string;
  type: 'rule' | 'group';
  name: string;
  link: string;
}

/** A connection as the API gives it: a summary, a published connection or a draft */
export interface ConnectionLike {
  id: string;
  name: string;
  status: ConnectionStatus;
  /** Published connections and summaries; a draft has none */
  is_active?: boolean;
  /** The state the server derived (spec 010, research R1) */
  state: ConnectionState;
  /** YYYY-MM-DD, a day in Germany; set only while scheduled */
  start_date?: string | null;
}

/** The API's `state`: the server is the one place that derives it (spec 010, research R1). */
export function connectionStateOf(fc: Pick<ConnectionLike, 'state'>): ConnectionState {
  return fc.state;
}

export function connectionRefOf(fc: ConnectionLike): ConnectionRef {
  return { id: fc.id, name: fc.name, status: connectionStateOf(fc), link: connectionLink(fc.id) };
}

/**
 * A stored variant's id. A stored draft's variants always carry one (spec 007, research R10), so
 * a missing one is a fault of the answer read, not of the agent's request
 */
export function variantIdOf(branch: Pick<BranchInput, 'id'>): string {
  if (!branch.id) {
    throw new Error('A stored variant has no id.');
  }
  return branch.id;
}

export function variantRefOf(
  branch: Pick<BranchInput, 'id' | 'name'>,
  connectionId: string
): VariantRef {
  const id = variantIdOf(branch);
  return { id, name: branch.name, link: variantLink(connectionId, id) };
}

export function itemRefOf(
  item: Pick<RuleTreeItem, 'id' | 'type' | 'name'>,
  branch: Pick<BranchInput, 'id'>,
  connectionId: string
): ItemRef {
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    link: itemLink(connectionId, variantIdOf(branch), item.id),
  };
}

// The rule context (the editor's `RulesCatalog`)

/**
 * The rules modules' context as the editor's rules step builds it (`RulesCatalog`): `documents`
 * are the requested documents with their requested fields, which validation, the checks and the
 * citizen fields read; `allDocuments` the whole catalog, from which statements read, so that a
 * rule on data no longer requested still reads
 */
export interface ToolRuleContext extends RuleContext {
  allDocuments: RuleDocument[];
}

/**
 * The context of a connection's rules: its documents as the API gives them (a type or field the
 * catalog dropped keeps its key as its label and can't be checked), the catalog and the value sets.
 */
export function ruleContextOf(
  documentsView: RequestedDocumentView[],
  documentTypes: DocumentType[],
  optionSets: OptionSet[]
): ToolRuleContext {
  return { documents: ruleDocumentsOf(documentsView), allDocuments: documentTypes, optionSets };
}

/** The context statements read from: the whole catalog (the rules step's `context`). */
function statementContextOf(context: ToolRuleContext): RuleContext {
  return { documents: context.allDocuments, optionSets: context.optionSets };
}

// Items

/** A rule's data as tools name it: the document type, and `field`, `field.part` or `field.part#B` */
export interface ItemTarget {
  document_type: string;
  field: string;
}

/**
 * A rule or group as `get_variant` and `get_item` answer it: the structured item with its
 * statement, mark and link; a rule's target, condition and message; a group's AND/OR, its message
 * if it has one and its members
 */
export interface ItemView {
  id: string;
  type: 'rule' | 'group';
  name: string;
  /** A rule's readable sentence (`statementOf()`); null for a group and an incomplete rule */
  statement: string | null;
  mark: Mark | null;
  link: string;
  target?: ItemTarget;
  condition?: Condition;
  message?: string;
  operator?: Combinator;
  items?: ItemView[];
}

/** Where `itemViewOf()` reads labels and builds links */
export interface ItemViewContext {
  connectionId: string;
  rules: ToolRuleContext;
}

/** A target's field as tools name it (data-model §8): `birthdate`, `place_of_birth.country`… */
export function fieldKeyOf(target: Pick<RuleTarget, 'field' | 'part' | 'licence_class'>): string {
  const part = target.part ? `.${target.part}` : '';
  const licenceClass = target.licence_class ? `#${target.licence_class}` : '';
  return `${target.field}${part}${licenceClass}`;
}

/**
 * The item as tools answer it, with a group's members at every level. A rule's statement is null
 * while its target or condition is incomplete; a rule without a target or condition leaves the
 * key out, and a group without a message leaves `message` out.
 */
export function itemViewOf(
  item: RuleTreeItem,
  branch: Pick<BranchInput, 'id'>,
  context: ItemViewContext
): ItemView {
  const { id, type, name, mark } = item;
  const link = itemLink(context.connectionId, variantIdOf(branch), id);
  if (item.type === 'group') {
    return {
      id,
      type,
      name,
      statement: null,
      mark,
      link,
      operator: item.operator,
      ...(item.message === null ? {} : { message: item.message }),
      items: item.items.map((member) => itemViewOf(member, branch, context)),
    };
  }
  const statement = statementOf(item, statementContextOf(context.rules));
  return {
    id,
    type,
    name,
    statement: statement?.text ?? null,
    mark,
    link,
    ...(item.target
      ? { target: { document_type: item.target.document_type, field: fieldKeyOf(item.target) } }
      : {}),
    ...(item.condition ? { condition: item.condition } : {}),
    message: item.message,
  };
}

/**
 * The rules of a variant that check data the connection no longer requests, or an image, as the
 * rules step's banner names them (`UnrequestedBanner`, F11): a rule a based variant inherits
 * unchanged is named once, for Standard. `documents` are the requested ones
 * (`ToolRuleContext.documents`).
 */
export function unrequestedRulesOf(
  branch: Pick<BranchInput, 'id' | 'origin' | 'items'>,
  documents: RuleDocument[],
  connectionId: string
): ItemRef[] {
  return unrequestedRules([branch], documents).map(({ rule }) =>
    itemRefOf(rule, branch, connectionId)
  );
}

/** The number of rules and groups of a variant's tree, at every level, for `get_connection`. */
export function itemCountsOf(items: RuleTreeItem[]): { rules: number; groups: number } {
  const all = flattenItems(items);
  const rules = all.filter((item) => item.type === 'rule').length;
  return { rules, groups: all.length - rules };
}

// Connection URLs (FR-010)

export interface ConnectionUrls {
  trigger_url: string;
  /** Each variant's pull URL, with the placeholder `{reference}` kept literally */
  variants: (VariantRef & { pull_url: string })[];
}

/** A published connection's URLs, labelled with its variants; null for a draft, which has none. */
export function connectionUrlsOf(fc: FormConnectionOrDraft): ConnectionUrls | null {
  if (fc.status === 'draft') {
    return null;
  }
  return {
    trigger_url: fc.trigger_url,
    variants: fc.branches.map((branch) => ({
      ...variantRefOf(branch, fc.id),
      pull_url: branch.pull_url,
    })),
  };
}

export const URLS_NOTES = {
  draft: 'The connection URLs exist once the draft is published.',
  deactivated:
    'This connection is deactivated: its URLs answer "unavailable" until it is reactivated.',
  live: 'This connection is live: serviceBW calls these URLs.',
  scheduled:
    'This connection is scheduled: its URLs answer "unavailable" until it becomes active on ' +
    '{date}, 00:00 in Germany.',
} as const;

/** What `get_connection` says about the URLs: none yet, live, or answering "unavailable". */
export function urlsNoteOf(fc: Pick<ConnectionLike, 'state' | 'start_date'>): string {
  const state = connectionStateOf(fc);
  if (state === 'scheduled') {
    return URLS_NOTES.scheduled.replace('{date}', fc.start_date ?? '');
  }
  return URLS_NOTES[state];
}

// Citizen fields (data-model §9; R15)

/** A field a citizen of `test_applicants` gives a value for: the variant's rules check it */
export interface ApplicantField {
  /** Spec 004's persona field key: `pid.birthdate`, `mdl.driving_privileges.issue_date#B` */
  key: string;
  /** "Personal ID · Date of birth (Age)", "Driving licence · Licence class B – Issue date" */
  label: string;
  kind: 'number' | 'text' | 'enum' | 'date';
  option_set?: string;
  /** Takes a list */
  multiple: boolean;
  licence_class?: string;
}

/**
 * The fields the variant's rules check, as the test step lists them (`personaFieldsOf()`), in
 * catalog order, labelled with their document as statements name their subject.
 */
export function applicantFieldsOf(
  branch: Pick<BranchInput, 'id' | 'origin' | 'operator' | 'items'>,
  context: ToolRuleContext
): ApplicantField[] {
  const keyed = { key: variantIdOf(branch), ...branch };
  return personaFieldsOf([keyed], context).map((field) => ({
    key: field.key,
    label: `${field.documentLabel} · ${field.label}`,
    kind: field.kind,
    ...(field.optionSet === null ? {} : { option_set: field.optionSet }),
    multiple: field.multiple,
    ...(field.licenceClass === null ? {} : { licence_class: field.licenceClass }),
  }));
}

// Dropped data (spec 005, S8)

/** Data a draft requests that the catalog no longer offers (contracts/mcp-tools.md) */
export interface DroppedData {
  document_type: string;
  /** Null when the catalog lacks the whole document type */
  field: string | null;
  /** "Personal ID – eye_colour", or a whole document's key, as the API labels it */
  label: string;
}

/**
 * The data requested that the catalog no longer offers, as the editor's documents step notes it
 * (`droppedDataOf()` of `@connection-portal/rules/dropped`).
 */
export function droppedDataOf(
  documents: (RequestedDocument | RequestedDocumentView)[],
  documentTypes: DocumentType[]
): DroppedData[] {
  const requested = documents.map((document) => ({
    document_type: document.document_type,
    fields: document.fields.map((field) => (typeof field === 'string' ? field : field.key)),
  }));
  return catalogDroppedDataOf(requested, documentTypes).map((item) => ({
    document_type: item.documentType,
    field: item.field,
    label: item.label,
  }));
}

// The step (FR-017)

/**
 * The furthest step a draft's content reaches, where a team member continues it: `rules` once
 * any variant has a rule, `documents` once a document is requested, `connection` otherwise.
 */
export function stepOf(content: {
  documents: readonly unknown[];
  branches: Pick<BranchInput, 'items'>[];
}): EditorStep {
  if (hasAnyRule(content.branches)) {
    return 'rules';
  }
  return content.documents.length > 0 ? 'documents' : 'connection';
}

// Dates and a draft's step (spec 010, FR-018, FR-019, FR-062; data-model §1.4)

/**
 * What a search item adds to its ref (contracts/mcp-tools.md "Reading"): the overview row's date
 * and a draft's step, an empty one left out
 */
export interface SummaryFacts {
  /** YYYY-MM-DD, the day in Germany a scheduled connection becomes active */
  start_date?: string;
  /** When it was first published; a draft has none */
  published_at?: string;
  /** Present only while deactivated */
  deactivated_at?: string;
  /** A draft's stored step */
  step?: EditorStep;
}

/** A search item's dates and step, as the API's summary gives them; nulls are left out. */
export function summaryFactsOf(
  summary: Pick<FormConnectionSummary, 'start_date' | 'published_at' | 'deactivated_at' | 'step'>
): SummaryFacts {
  return {
    ...(summary.start_date ? { start_date: summary.start_date } : {}),
    ...(summary.published_at ? { published_at: summary.published_at } : {}),
    ...(summary.deactivated_at ? { deactivated_at: summary.deactivated_at } : {}),
    ...(summary.step ? { step: summary.step } : {}),
  };
}

/**
 * What `get_connection` adds to its ref (contracts/mcp-tools.md "Reading"): the details' dates and
 * a draft's step, an empty one left out. `active_since` is when it last became active, which
 * reactivating moves and publishing doesn't (FR-018)
 */
export interface ConnectionFacts {
  /** YYYY-MM-DD, the day in Germany a scheduled connection becomes active */
  start_date?: string;
  published_at?: string;
  active_since?: string;
  /** Present only while deactivated */
  deactivated_since?: string;
  /** A draft's stored step */
  step?: EditorStep;
}

/** A connection's dates, or a draft's step, as `get_connection` answers them. */
export function connectionFactsOf(fc: FormConnectionOrDraft): ConnectionFacts {
  if (fc.status === 'draft') {
    return { step: fc.step };
  }
  return {
    ...(fc.start_date ? { start_date: fc.start_date } : {}),
    published_at: fc.published_at,
    ...(fc.activated_at ? { active_since: fc.activated_at } : {}),
    ...(fc.deactivated_at ? { deactivated_since: fc.deactivated_at } : {}),
  };
}

/** The text block's line on a draft's step: "Draft at the rules step." */
export function stepLineOf(step: EditorStep): string {
  return `Draft at the ${step} step.`;
}

/**
 * The text block's line on a search item's dates or step: "Draft at the rules step.",
 * "Published {at}.", "Published {at}; deactivated {at}."; null when there is none
 */
export function summaryFactsLineOf(facts: SummaryFacts): string | null {
  if (facts.step) {
    return stepLineOf(facts.step);
  }
  const parts = [
    facts.published_at && `Published ${facts.published_at}`,
    facts.deactivated_at && `deactivated ${facts.deactivated_at}`,
  ].filter((part): part is string => typeof part === 'string' && part !== '');
  return parts.length === 0 ? null : `${parts.join('; ')}.`;
}

/**
 * The text block's line on a published connection's dates: "Published {at}; active since {at};
 * deactivated since {at}."; null for a draft, whose step has its own line
 */
export function connectionDatesLineOf(facts: ConnectionFacts): string | null {
  const parts = [
    facts.published_at && `Published ${facts.published_at}`,
    facts.active_since && `active since ${facts.active_since}`,
    facts.deactivated_since && `deactivated since ${facts.deactivated_since}`,
  ].filter((part): part is string => typeof part === 'string' && part !== '');
  return parts.length === 0 ? null : `${parts.join('; ')}.`;
}

// Text blocks (contracts/mcp-tools.md "Results and errors": a text block summarises each answer)

/** A tool's text block: the lines given, without the empty ones. */
export function summaryTextOf(...lines: (string | null | undefined | false)[]): string {
  return lines.filter((line): line is string => typeof line === 'string' && line !== '').join('\n');
}

/**
 * A connection's line: "Connection '{name}' (live): {link}"; a scheduled one with the day it
 * starts, "Connection '{name}' (scheduled from {date}): {link}", where the caller knows it
 */
export function connectionLineOf(ref: ConnectionRef, startDate?: string | null): string {
  const status =
    ref.status === 'scheduled' && startDate ? `scheduled from ${startDate}` : ref.status;
  return `Connection '${ref.name}' (${status}): ${ref.link}`;
}

export function variantLineOf(ref: VariantRef): string {
  return `Variant '${ref.name}': ${ref.link}`;
}

export function itemLineOf(ref: ItemRef): string {
  return `${ref.type === 'rule' ? 'Rule' : 'Group'} '${ref.name}' (${ref.id}): ${ref.link}`;
}

/**
 * A variant's items as indented lines, members under their group: "- Rule 01 (rule-1): Personal
 * ID · Date of birth (Age) is at least 21 years old. {link}", with the mark when there is one.
 */
export function itemViewLinesOf(items: ItemView[], depth = 0): string[] {
  const indent = '  '.repeat(depth);
  return items.flatMap((item) => {
    const mark = item.mark ? `, ${item.mark}` : '';
    if (item.type === 'group') {
      const combination = item.operator === 'or' ? 'one must be met' : 'all must be met';
      return [
        `${indent}- ${item.name} (${item.id}${mark}; ${combination}): ${item.link}`,
        ...itemViewLinesOf(item.items ?? [], depth + 1),
      ];
    }
    const statement = item.statement ?? 'incomplete';
    return [`${indent}- ${item.name} (${item.id}${mark}): ${statement}. ${item.link}`];
  });
}

/**
 * The editor's note on dropped data, with what the agent can do: null when nothing was dropped.
 */
export function droppedTextOf(dropped: DroppedData[]): string | null {
  if (dropped.length === 0) {
    return null;
  }
  const labels = dropped.map((item) => item.label).join(', ');
  return (
    `The wallet no longer offers some data of this draft: ${labels}. ` +
    'Remove it with set_document before publishing.'
  );
}

/** The connection URLs as lines, after the note on them. */
export function urlsTextOf(urls: ConnectionUrls | null, note: string): string {
  if (!urls) {
    return note;
  }
  return summaryTextOf(
    note,
    `Trigger URL: ${urls.trigger_url}`,
    ...urls.variants.map((variant) => `Pull URL of '${variant.name}': ${variant.pull_url}`)
  );
}
