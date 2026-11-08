// The catalog tools (contracts/mcp-tools.md "Reading"; FR-009): the document types the wallet
// offers with their fields, parts and the conditions rules can set on each, and the values of a
// value set, searched rather than listed whole
import type {
  DocumentField,
  FieldKind,
  FieldPart,
} from '@connection-portal/api-types/document-types';
import type { Option } from '@connection-portal/api-types/option-sets';
import { OPERATORS } from '@connection-portal/rules/constants';
import type { OperatorInput } from '@connection-portal/rules/types';
import { z } from 'zod';

import { InvalidReference, ReferenceNotFound, RESOLVE_MESSAGES } from '../resolve';
import { summaryTextOf } from '../views';
import { registerTool, toolResult } from './registry';

/** How many values `search_values` answers per page. */
export const VALUES_PER_PAGE = 25;

export const CATALOG_MESSAGES = {
  unknownOptionSet: (key: string, known: string[]) =>
    `The catalog has no value set '${key}'. Its value sets: ${known.join(', ')}.`,
  invalidCursor: "This cursor doesn't belong to this search. Search again without it.",
} as const;

/** A condition rules can set on a field or part: the operator, its words, what it takes. */
interface ConditionView {
  operator: string;
  words: string;
  input: OperatorInput;
}

/** The conditions of a kind of data, in the editor's order; none for an image or a parts field. */
function conditionsOf(kind: FieldKind): ConditionView[] {
  if (kind === 'image' || kind === 'parts') return [];
  return OPERATORS[kind].map(({ operator, label, input }) => ({
    operator,
    words: label,
    input,
  }));
}

function optionSetOf(optionSet: string | null): { option_set?: string } {
  return optionSet === null ? {} : { option_set: optionSet };
}

function partViewOf(part: FieldPart) {
  return {
    key: part.key,
    label: part.label,
    kind: part.kind,
    ...optionSetOf(part.option_set),
    per_licence_class: part.per_licence_class,
    multiple_values: part.multiple_values,
    conditions: conditionsOf(part.kind),
  };
}

function fieldViewOf(field: DocumentField) {
  return {
    key: field.key,
    label: field.label,
    kind: field.kind,
    ...optionSetOf(field.option_set),
    multiple_values: field.multiple_values,
    ...(field.parts === null ? {} : { parts: field.parts.map(partViewOf) }),
    conditions: conditionsOf(field.kind),
  };
}

type FieldView = ReturnType<typeof fieldViewOf>;

/** A field's line of the text block: its key, label, kind and, for parts, the parts' keys. */
function fieldLineOf(field: FieldView): string {
  const details = [
    field.kind,
    field.option_set && `values from ${field.option_set}`,
    field.multiple_values && 'several values',
  ].filter(Boolean);
  const parts = field.parts
    ? `; parts: ${field.parts
        .map((part) => `${field.key}.${part.key}${part.per_licence_class ? '#<class>' : ''}`)
        .join(', ')}`
    : '';
  return `- ${field.key}: ${field.label} (${details.join(', ')}${parts})`;
}

// get_catalog

registerTool({
  name: 'get_catalog',
  level: 'read',
  description:
    'Reads the catalog of what the EUDI Wallet can share. Without document_type: the document ' +
    'types with their number of fields. With one: its fields with their kind, value set, parts ' +
    '(named as field.part, a licence class date as field.part#B) and the conditions a rule can ' +
    'set on each.',
  input: z.object({
    document_type: z
      .string()
      .optional()
      .describe("A document type's key, such as pid or mdl; all document types without"),
  }),
  handler: async (_caller, input, { backend }) => {
    const documentTypes = await backend.documentTypes();
    const key = input.document_type?.trim();
    if (!key) {
      const list = documentTypes.map((type) => ({
        key: type.key,
        label: type.label,
        fields: type.fields.length,
      }));
      return toolResult(
        { document_types: list },
        summaryTextOf(
          'Document types:',
          ...list.map((type) => `- ${type.key}: ${type.label} (${type.fields} fields)`)
        )
      );
    }
    const documentType = documentTypes.find((type) => type.key === key);
    if (!documentType) {
      throw new ReferenceNotFound(
        RESOLVE_MESSAGES.unknownDocumentType(
          key,
          documentTypes.map((type) => type.key)
        )
      );
    }
    const fields = documentType.fields.map(fieldViewOf);
    return toolResult(
      { key: documentType.key, label: documentType.label, fields },
      summaryTextOf(
        `${documentType.label} (${documentType.key}), its fields:`,
        ...fields.map(fieldLineOf)
      )
    );
  },
});

// search_values

/** The page's offset from a cursor: a whole number the previous page answered. */
function offsetOf(cursor: string | undefined): number {
  if (cursor === undefined || cursor.trim() === '') return 0;
  const offset = Number(cursor);
  if (!Number.isInteger(offset) || offset < 0) {
    throw new InvalidReference(CATALOG_MESSAGES.invalidCursor);
  }
  return offset;
}

function matches(option: Option, query: string): boolean {
  return (
    option.label.toLowerCase().includes(query) || String(option.value).toLowerCase().includes(query)
  );
}

registerTool({
  name: 'search_values',
  level: 'read',
  description:
    'Searches the values of a value set (countries, sexes, licence classes, …) by a part of ' +
    'their label or code, ignoring letter case; without a query, lists them. Answers 25 per ' +
    "page; pass next_cursor for the next. A rule's condition names the values by their value.",
  input: z.object({
    option_set: z.string().min(1).describe("The value set's key, as get_catalog names it"),
    query: z.string().optional().describe('A part of the label or the code'),
    cursor: z.string().optional().describe("The previous answer's next_cursor, for the next page"),
  }),
  handler: async (_caller, input, { backend }) => {
    const optionSets = await backend.optionSets();
    const key = input.option_set.trim();
    const optionSet = optionSets.find((set) => set.key === key);
    if (!optionSet) {
      throw new ReferenceNotFound(
        CATALOG_MESSAGES.unknownOptionSet(
          key,
          optionSets.map((set) => set.key)
        )
      );
    }
    const query = input.query?.trim().toLowerCase() ?? '';
    const found = optionSet.options.filter((option) => query === '' || matches(option, query));
    const offset = offsetOf(input.cursor);
    const items = found.slice(offset, offset + VALUES_PER_PAGE).map((option) => ({
      value: option.value,
      label: option.label,
      ...(option.description ? { description: option.description } : {}),
    }));
    const next = offset + VALUES_PER_PAGE < found.length ? String(offset + VALUES_PER_PAGE) : null;
    return toolResult(
      { items, next_cursor: next },
      summaryTextOf(
        items.length === 0
          ? `No value of ${optionSet.key} matches.`
          : `Values of ${optionSet.key}:`,
        ...items.map(
          (item) =>
            `- ${item.value}: ${item.label}${item.description ? ` (${item.description})` : ''}`
        ),
        next && `More values match: pass the cursor ${next}.`
      )
    );
  },
});
