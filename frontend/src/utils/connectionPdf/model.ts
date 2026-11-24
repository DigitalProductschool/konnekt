// The connection PDF's content model (research R3, R9; data-model section 2): everything the PDF
// says, already in its language, from the connection or draft as fetched at "Download PDF"
// (FR-005), the option sets and the catalog in that language, and the moment. The details'
// Summary is the reference: the items, marks, faded and dissolved groups as `SummaryBranch` and
// `SummaryItem` show them, the counts as `summaryNumbersOf()` gives them. No finding, persona or
// citizen data enters (FR-041), and a draft's model holds no URL (FR-013). Pure: no browser API,
// nothing logged, and it never throws on incomplete content
import type { DocumentType } from '@konnekt/api-types/document-types';
import type {
  BranchInput,
  FormConnection,
  FormConnectionDraft,
  FormConnectionOrDraft,
  RequestedDocumentView,
  RuleItem,
  RuleTreeItem,
} from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import { requestedRuleDocuments, ruleDocumentsOf } from '@konnekt/rules/conditions';
import { GERMAN_TIME_ZONE } from '@konnekt/rules/constants';
import { formatDate, isValidIsoDate } from '@konnekt/rules/dates';
import { DEFAULT_LANGUAGE, type Language } from '@konnekt/rules/language';
import { STATEMENT_TEXTS, statementPartsOf } from '@konnekt/rules/statements';
import { shownItems } from '@konnekt/rules/tree';
import type { RuleContext, RulesProblem } from '@konnekt/rules/types';
import { publishProblems } from '@konnekt/rules/validation';

import { draftRuleDocumentsOf, summaryNumbersOf } from '../connectionSummary';
import { gapsOf, missingOf } from './gaps';
import type {
  ConnectionPdfModel,
  PdfDocument,
  PdfItem,
  PdfLinks,
  PdfStatement,
  PdfStatus,
  PdfVariant,
} from './types';

/**
 * What the model is built with besides the connection, all in the language captured at "Download
 * PDF" (research R9). The hook (`useConnectionPdf`) takes both from spec 009's per-language lists
 */
export interface PdfModelContext {
  /** The value sets (GET /api/option-sets) in the language: the statements' value labels */
  optionSets: OptionSet[];
  /**
   * The catalog (GET /api/document-types) in the language. A draft needs it: its statements name
   * data it doesn't request (`draftRuleDocumentsOf()`, as the details page does) and its gaps are
   * judged against the catalog's requested fields (`requestedRuleDocuments()`, as validation
   * does). A published connection doesn't read it, so null is fine there. A draft given null reads
   * its rules with the answer's documents only
   */
  documentTypes: DocumentType[] | null;
}

/** The moment and the language, captured at "Download PDF" (research R9) */
export interface PdfModelOptions {
  language: Language;
  /** When "Download PDF" was activated: the PDF's "Generated" */
  now: Date;
}

/** A published connection's `state` as page 1's status (spec 010; `live` reads "active") */
const STATUS_OF_STATE: Record<FormConnection['state'], PdfStatus> = {
  scheduled: 'scheduled',
  live: 'active',
  deactivated: 'deactivated',
};

/** "09.11.2026, 16:45" in Germany's time, the same in both languages (FR-035) */
const GERMAN_DATE_TIME = new Intl.DateTimeFormat('de-DE', {
  timeZone: GERMAN_TIME_ZONE,
  hourCycle: 'h23',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * An instant as "dd.mm.yyyy, hh:mm" in Germany's time on a 24-hour clock (FR-035), put together
 * from the formatter's parts so that the separators never depend on the runtime's locale data.
 * '' for an invalid date, which the builder never throws on
 */
function germanDateTimeOf(instant: Date): string {
  if (Number.isNaN(instant.getTime())) {
    return '';
  }
  const parts = Object.fromEntries(
    GERMAN_DATE_TIME.formatToParts(instant).map((part) => [part.type, part.value])
  );
  return `${parts.day}.${parts.month}.${parts.year}, ${parts.hour}:${parts.minute}`;
}

/** A scheduled connection's start date, a day in Germany, as "dd.mm.yyyy" (FR-035); else null */
function startDateOf(connection: FormConnection, language: Language): string | null {
  const startDate = connection.start_date;
  if (connection.state !== 'scheduled' || !startDate) {
    return null;
  }
  return isValidIsoDate(startDate) ? formatDate(startDate, language) : startDate;
}

/** A text as entered, or null when it is empty or blank (the line is left out) */
function textOrNull(text: string | null): string | null {
  return text && text.trim() ? text : null;
}

/** The documents in the answer's order, with its labels, or the keys the catalog no longer has */
function documentsOf(documents: RequestedDocumentView[]): PdfDocument[] {
  return documents.map((document) => ({
    name: document.label || document.document_type,
    dataItems: document.fields.map((field) => field.label || field.key),
  }));
}

/**
 * The request link and each variant's result link in the details' order, Standard first, each
 * from its `pull_url`, never derived from a name (`resultLinksOf()` on the details page)
 */
function linksOf(connection: FormConnection): PdfLinks {
  return {
    request: connection.trigger_url,
    results: connection.branches.map((branch) => ({ variant: branch.name, url: branch.pull_url })),
  };
}

/**
 * A rule's statement in the context's language, split as the rule row lays it out
 * (`statementPartsOf()`), the values kept apart: joined as "<subject> <words> <values, comma
 * separated>[, <tail>]" it reads as `statementOf(rule, context).text` when the condition is
 * complete. Without a complete condition, only the subject; null when the target can't be resolved
 */
function pdfStatementOf(rule: RuleItem, context: RuleContext): PdfStatement | null {
  const parts = statementPartsOf(rule, context);
  if (!parts) {
    return null;
  }
  const texts = STATEMENT_TEXTS[context.language ?? DEFAULT_LANGUAGE];
  const { predicate } = parts;
  return {
    subject: texts.subject(parts.document, parts.data),
    words: predicate?.words ?? null,
    values: predicate ? [...predicate.values] : [],
    tail: predicate?.tail ?? null,
  };
}

/** A rule's "Not complete:" text, or null (a published connection's rules have none) */
type MissingOf = (rule: RuleItem, branchIndex: number) => string | null;

/** What every item of a variant is built with */
interface VariantScope {
  /** A variant based on Standard: its marks show */
  based: boolean;
  branchIndex: number;
  context: RuleContext;
  missing: MissingOf;
}

/**
 * A rule or group as `SummaryItem` shows it. A rule shows its mark in a based variant and fades
 * when removed or inside a removed or dissolved group. A group that is removed or dissolved
 * (`inactive`) shows as removed; its members fade and keep their own marks, and inside it nothing
 * dissolves (`shownItems` with `based` false)
 */
function itemOf(
  item: RuleTreeItem,
  dissolved: boolean,
  faded: boolean,
  scope: VariantScope
): PdfItem {
  const mark = scope.based ? item.mark : null;
  if (item.type === 'rule') {
    return {
      type: 'rule',
      id: item.id,
      name: item.name,
      mark,
      faded: faded || mark === 'removed',
      statement: pdfStatementOf(item, scope.context),
      message: item.message.trim(),
      missing: scope.missing(item, scope.branchIndex),
    };
  }
  const inactive = dissolved || item.mark === 'removed';
  return {
    type: 'group',
    id: item.id,
    name: item.name,
    mark: inactive ? 'removed' : mark,
    faded: faded || inactive,
    operator: item.operator,
    message: item.message?.trim() || null,
    items: shownItems(item.items, scope.based && !inactive && !faded).map((entry) =>
      itemOf(entry.item, entry.dissolved, faded || inactive, scope)
    ),
  };
}

/** The variants in the details' order, each with its items as `SummaryBranch` shows them */
function variantsOf(
  branches: BranchInput[],
  context: RuleContext,
  missing: MissingOf
): PdfVariant[] {
  return branches.map((branch, branchIndex) => {
    const based = branch.origin === 'based';
    const scope: VariantScope = { based, branchIndex, context, missing };
    return {
      name: branch.name,
      origin: branch.origin,
      description: textOrNull(branch.description),
      operator: branch.operator,
      operatorChanged: based && branch.operator_mark === 'changed',
      items: shownItems(branch.items, based).map((entry) =>
        itemOf(entry.item, entry.dissolved, false, scope)
      ),
    };
  });
}

/**
 * Validation's context for a draft: the requested documents with only their requested fields from
 * the catalog (`requestedRuleDocuments()`), or the answer's documents without the catalog
 */
function validationContextOf(
  draft: FormConnectionDraft,
  { optionSets, documentTypes }: PdfModelContext,
  language: Language
): RuleContext {
  const documents = documentTypes
    ? requestedRuleDocuments(
        documentTypes,
        draft.documents.map((document) => ({
          document_type: document.document_type,
          fields: document.fields.map((field) => field.key),
        }))
      )
    : ruleDocumentsOf(draft.documents);
  return { documents, optionSets, language };
}

/**
 * A draft's rules' "Not complete:" texts (FR-018): each rule's problem in `publishProblems()`
 * (at most one per item), mapped by `missingOf()`. A rule a based variant inherits unchanged
 * (no mark) is checked once, in Standard, so its copy reads Standard's problem: the content is
 * the same. A rule the variant removed has none there. A variant without a name keeps its rules'
 * texts, although the gap list leaves their problems out
 */
function draftMissingOf(
  draft: FormConnectionDraft,
  validation: RuleContext,
  language: Language
): MissingOf {
  const byItem = new Map<string, RulesProblem>();
  for (const problem of publishProblems(draft.branches, validation)) {
    if (problem.branchIndex !== null && problem.itemId !== null) {
      const key = problemKey(problem.branchIndex, problem.itemId);
      if (!byItem.has(key)) {
        byItem.set(key, problem);
      }
    }
  }
  return (rule, branchIndex) => {
    const inherited = draft.branches[branchIndex]?.origin === 'based' && rule.mark === null;
    const problem =
      byItem.get(problemKey(branchIndex, rule.id)) ??
      (inherited ? byItem.get(problemKey(0, rule.id)) : undefined);
    return problem ? missingOf(problem, language, rule.condition) : null;
  };
}

function problemKey(branchIndex: number, itemId: string): string {
  return `${branchIndex}/${itemId}`;
}

/** A published connection's rules have no "Not complete:" */
const NOTHING_MISSING: MissingOf = () => null;

/**
 * The content model of a connection or draft as fetched at "Download PDF" (FR-005), in
 * `language`, generated at `now` (data-model section 2; research R3, R9).
 *
 * - `status` from a published connection's `state` (`live` reads "active"), a draft's "draft";
 *   a scheduled connection's `startDate` as "dd.mm.yyyy"; `generatedAt` and a draft's
 *   `lastSaved.at` as "dd.mm.yyyy, hh:mm" in Germany's time, in both languages (FR-035).
 * - Name, descriptions and messages as entered (FR-034); an empty description is null.
 * - `counts` as the Summary counts (`summaryNumbersOf()`, FR-008).
 * - A published connection's links (`trigger_url`, each variant's `pull_url`); a draft's
 *   `linksToCreate`, the variants' names, and no URL anywhere (FR-013).
 * - Statements in the language, with the details page's rule context: a published connection's
 *   requested documents (`ruleDocumentsOf()`), a draft's with the catalog's other data
 *   (`draftRuleDocumentsOf()`), and the option sets.
 * - A draft's `gaps` (`gapsOf()`) and its rules' `missing` (`missingOf()`), judged with
 *   validation's context (the catalog's requested fields).
 *
 * Pure, and never throws on incomplete content: a draft is expected to be incomplete
 */
export function connectionPdfModelOf(
  connection: FormConnectionOrDraft,
  context: PdfModelContext,
  { language, now }: PdfModelOptions
): ConnectionPdfModel {
  const { optionSets, documentTypes } = context;
  const counts = summaryNumbersOf(connection.documents, connection.branches);
  const common = {
    language,
    id: connection.id,
    name: connection.name,
    description: textOrNull(connection.description),
    version: connection.version_fingerprint,
    generatedAt: germanDateTimeOf(now),
    counts,
    documents: documentsOf(connection.documents),
  };
  if (connection.status === 'draft') {
    const statements: RuleContext = {
      documents: draftRuleDocumentsOf(connection.documents, documentTypes ?? []),
      optionSets,
      language,
    };
    const validation = validationContextOf(connection, context, language);
    return {
      ...common,
      kind: 'draft',
      status: 'draft',
      startDate: null,
      lastSaved: {
        at: germanDateTimeOf(new Date(connection.updated_at)),
        saveNumber: connection.version,
      },
      gaps: gapsOf(connection, validation, language),
      links: null,
      linksToCreate: connection.branches.map((branch) => branch.name),
      variants: variantsOf(
        connection.branches,
        statements,
        draftMissingOf(connection, validation, language)
      ),
    };
  }
  const statements: RuleContext = {
    documents: ruleDocumentsOf(connection.documents),
    optionSets,
    language,
  };
  return {
    ...common,
    kind: 'published',
    status: STATUS_OF_STATE[connection.state],
    startDate: startDateOf(connection, language),
    lastSaved: null,
    gaps: [],
    links: linksOf(connection),
    linksToCreate: null,
    variants: variantsOf(connection.branches, statements, NOTHING_MISSING),
  };
}
