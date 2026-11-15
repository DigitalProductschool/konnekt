/**
 * The connection's summary as numbers and names, shared by the details page's Summary and the
 * PDF (spec 011, FR-008), so that the two never disagree. Pure: no browser API, no logging.
 */
import type { DocumentType } from '@connection-portal/api-types/document-types';
import type {
  BranchInput,
  RequestedDocumentView,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { ruleDocumentsOf } from '@connection-portal/rules/conditions';
import type { RuleDocument } from '@connection-portal/rules/types';

/** The Summary's four counts (data-model §2, `counts`) */
export interface SummaryNumbers {
  documents: number;
  dataItems: number;
  variants: number;
  rules: number;
}

/** The identifiers of the rules that count in a tree, as `countRules` counts them. */
function countableRuleIds(items: RuleTreeItem[]): string[] {
  return items.flatMap((item) => {
    if (item.mark === 'removed') {
      return [];
    }
    return item.type === 'rule' ? [item.id] : countableRuleIds(item.items);
  });
}

/**
 * The Summary's counts (FR-046 (i); Figma 10.11, B8): the requested documents, every requested
 * field once, every variant, Standard included, and every distinct rule once. A based variant
 * keeps the main branch's identifiers for inherited rules (data-model.md), so summing the
 * variants would count them twice; a rule a variant removes still counts, in Standard. Grouped
 * rules count one by one, groups don't.
 */
export function summaryNumbersOf(
  documents: Pick<RequestedDocumentView, 'fields'>[],
  branches: Pick<BranchInput, 'items'>[]
): SummaryNumbers {
  const ruleIds = new Set(branches.flatMap((branch) => countableRuleIds(branch.items)));
  return {
    documents: documents.length,
    dataItems: documents.reduce((count, document) => count + document.fields.length, 0),
    variants: branches.length,
    rules: ruleIds.size,
  };
}

/**
 * What a draft's rules summary names (S6): the requested documents as the draft holds them (a type
 * or field the catalog dropped keeps its key as its label), each followed by the catalog's fields
 * it doesn't request, then the catalog's documents it doesn't request. A draft may keep rules on
 * data that isn't requested (FR-004), and the summary names that data as the rules step does,
 * which looks rules up in the whole catalog. Without the catalog, only the requested documents.
 */
export function draftRuleDocumentsOf(
  documents: RequestedDocumentView[],
  documentTypes: DocumentType[]
): RuleDocument[] {
  const requested = ruleDocumentsOf(documents).map((document) => {
    const known = new Set(document.fields.map((field) => field.key));
    const others = documentTypes.find((type) => type.key === document.key)?.fields ?? [];
    return {
      ...document,
      fields: [...document.fields, ...others.filter((field) => !known.has(field.key))],
    };
  });
  const keys = new Set(requested.map((document) => document.key));
  return [...requested, ...documentTypes.filter((type) => !keys.has(type.key))];
}
