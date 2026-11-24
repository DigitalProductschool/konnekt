// The tools that create a draft and change its connection, documents and variants
// (contracts/mcp-tools.md "Changing drafts"; FR-012 to FR-020): each makes one change and stores
// it at once. Every change to an existing draft runs through `editDraft()`, the read-apply-save
// loop, with the editor's own actions of `@konnekt/rules/edits`
import type {
  BranchInput,
  DraftCreate,
  FormConnectionDraft,
  RequestedDocument,
} from '@konnekt/api-types/form-connections';
import {
  addVariant,
  appendDocument,
  deleteVariant,
  editVariant,
  moveDocument,
  removeRules,
  resetOperator,
  rulesCheckingRemoval,
  switchOperator,
} from '@konnekt/rules/edits';
import type { DataRemoval, EditState, RuleDocument } from '@konnekt/rules/types';
import { z } from 'zod';

import {
  applied,
  type ApplyOutcome,
  draftContentOf,
  draftLineOf,
  editDraft,
  refusalOf,
  savedVariantRef,
  withEditState,
} from '../draftEdit';
import { resolveVariant } from '../resolve';
import {
  connectionLineOf,
  connectionRefOf,
  itemLineOf,
  type ItemRef,
  itemRefOf,
  summaryTextOf,
  variantIdOf,
  variantLineOf,
  variantRefOf,
} from '../views';
import { registerTool, toolResult } from './registry';

const CONNECTION = z
  .string()
  .min(1)
  .describe('The draft: its id, or any Konnekt link that names it');
const VARIANT = z
  .string()
  .min(1)
  .describe(
    'The variant: its id, its link, or its name ("Standard" for the main variant unless renamed)'
  );
const OPERATOR = z.enum(['and', 'or']);

/** The main variant of a new connection, as the editor names it until it is renamed. */
export const MAIN_VARIANT_NAME = 'Standard';

export const DRAFT_TOOL_MESSAGES = {
  nothingToChange: (what: string) => `Give ${what} to change.`,
  operatorAndReset: 'Give either operator or reset_operator, not both.',
  notRequested: (documentType: string) => `The connection doesn't request '${documentType}'.`,
  // The server's words for data the catalog doesn't offer (clean_documents), with the known keys
  unknownDocumentType: (key: string, known: string[]) =>
    `Unknown document type '${key}'. The catalog's document types: ${known.join(', ')}.`,
  unknownField: (key: string, document: string, known: string[]) =>
    `Unknown field '${key}' for '${document}'. Its fields: ${known.join(', ')}.`,
  // The removal dialog's words (F18): "2 rules check data from this document: Rule 01 in
  // Standard, …", with what the agent can do instead of the dialog's buttons
  rulesCheckRemoval: (data: string, rules: string[]) => {
    const count = rules.length;
    const subject = `${count} ${count === 1 ? 'rule checks' : 'rules check'}`;
    const them = count === 1 ? 'this rule' : 'these rules';
    return (
      `${subject} ${data}: ${rules.join(', ')}. Pass also_remove_rules: true to remove ${them} ` +
      `in every variant too, or change ${them} first.`
    );
  },
} as const;

// create_draft

registerTool({
  name: 'create_draft',
  level: 'drafts',
  description:
    'Creates a draft connection for a serviceBW form, with its name and an optional ' +
    'description: the main variant "Standard", no documents and no rules yet. The draft is ' +
    'stored at once and is never live. Look for an existing connection with search_connections ' +
    'first. An agent can create a limited number of drafts per hour.',
  input: z.object({
    name: z.string().describe('The name the team sees in the overview, such as the form’s name'),
    description: z
      .string()
      .optional()
      .describe('Which form and which case the connection serves, at most 500 characters'),
  }),
  changesContent: true,
  handler: async (_caller, input, { backend }) => {
    const standard: BranchInput = {
      id: crypto.randomUUID(),
      name: MAIN_VARIANT_NAME,
      description: null,
      origin: 'main',
      operator: 'and',
      operator_mark: null,
      items: [],
    };
    const body: DraftCreate = {
      name: input.name,
      description: input.description ?? '',
      documents: [],
      rules: { branches: [standard], numbering_base: { rule: 1, group: 1 } },
      step: 'connection',
    };
    const draft = await backend.post<FormConnectionDraft>('/api/form-connections/drafts', body);
    const connection = connectionRefOf(draft);
    const variants = draft.branches.map((branch) => variantRefOf(branch, draft.id));
    return toolResult(
      { connection, variants },
      summaryTextOf(
        `Created the draft '${connection.name}': ${connection.link}`,
        ...variants.map(variantLineOf),
        draftLineOf(draft)
      )
    );
  },
});

// update_connection

registerTool({
  name: 'update_connection',
  level: 'drafts',
  description:
    "Changes a draft's name or description. A description of null or '' clears it; the " +
    'description can have at most 500 characters. A published connection is changed in ' +
    'Konnekt, not by agents.',
  input: z.object({
    connection: CONNECTION,
    name: z.string().optional().describe('The new name'),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("The new description; null or '' clears it"),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      if (input.name === undefined && input.description === undefined) {
        return refusalOf(DRAFT_TOOL_MESSAGES.nothingToChange('a name or a description'));
      }
      const content = draftContentOf(read);
      return {
        ok: true,
        content: {
          ...content,
          name: input.name ?? content.name,
          description:
            input.description === undefined ? content.description : (input.description ?? ''),
        },
        result: null,
      };
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    return toolResult(
      { connection },
      summaryTextOf(
        connectionLineOf(connection),
        draft.description ? `Description: ${draft.description}` : 'No description.',
        draftLineOf(draft)
      )
    );
  },
});

// set_document

/** A field's label in the catalog, or its key where the catalog dropped it. */
function fieldLabelOf(document: RuleDocument | undefined, key: string): string {
  return document?.fields.find((field) => field.key === key)?.label ?? key;
}

interface DocumentChange {
  removedRules: ItemRef[];
}

/** A document as `set_document` and `move_document` answer it. */
interface DocumentAnswer {
  document_type: string;
  label: string;
  fields: { key: string; label: string; kind: string }[];
}

/** The draft's documents as saved, in the stored order (the team's, FR-050). */
function documentsOf(draft: FormConnectionDraft): DocumentAnswer[] {
  return draft.documents.map((document) => ({
    document_type: document.document_type,
    label: document.label,
    fields: document.fields.map(({ key, label, kind }) => ({ key, label, kind })),
  }));
}

/** The text block's lines on the documents, in their order. */
function documentsTextOf(documents: DocumentAnswer[]): string {
  if (documents.length === 0) {
    return 'Documents: none.';
  }
  const lines = documents.map((document, index) => {
    const fields = document.fields.map((field) => field.key).join(', ');
    return `${index + 1}. ${document.label} (${document.document_type}): ${fields || 'no fields yet'}`;
  });
  return 'Documents:\n' + lines.join('\n');
}

/**
 * The documents with `documentType` added at the end, its fields replaced (in catalog order) in
 * its place, or, with `fields` null, removed, the others keeping their order (FR-064); refused while rules check the data that stops being requested, unless
 * `alsoRemoveRules`, which removes those rules in every variant (`removeRules()`).
 */
function setDocument(
  read: FormConnectionDraft,
  catalog: RuleDocument[],
  input: { document_type: string; fields: string[] | null; also_remove_rules?: boolean }
): ApplyOutcome<DocumentChange> {
  const content = draftContentOf(read);
  const key = input.document_type.trim();
  const requested = content.documents.find((document) => document.document_type === key);
  const known = catalog.find((entry) => entry.key === key);
  let documents: RequestedDocument[];
  let removal: DataRemoval | null = null;
  let data: string;
  if (input.fields === null) {
    if (!requested) {
      return refusalOf(DRAFT_TOOL_MESSAGES.notRequested(key));
    }
    documents = content.documents.filter((document) => document !== requested);
    removal = { type: 'document', documentType: key };
    const label = read.documents.find((document) => document.document_type === key)?.label ?? key;
    data = `data from ${label}`;
  } else {
    if (!known) {
      return refusalOf(
        DRAFT_TOOL_MESSAGES.unknownDocumentType(
          key,
          catalog.map((entry) => entry.key)
        )
      );
    }
    const wanted = new Set(input.fields.map((field) => field.trim()));
    const unknown = [...wanted].find((field) => !known.fields.some((entry) => entry.key === field));
    if (unknown !== undefined) {
      return refusalOf(
        DRAFT_TOOL_MESSAGES.unknownField(
          unknown,
          known.label,
          known.fields.map((field) => field.key)
        )
      );
    }
    const fields = known.fields.filter((field) => wanted.has(field.key)).map((field) => field.key);
    const dropped = (requested?.fields ?? []).filter((field) => !wanted.has(field));
    // The team's order (FR-045): a new document goes to the end, a changed one keeps its place
    documents = appendDocument(content.documents, { document_type: key, fields });
    // Several fields at once: each rule that checks any of them once, in variant and tree order
    removal =
      dropped.length > 0
        ? { type: 'dropped', items: dropped.map((field) => ({ documentType: key, field })) }
        : null;
    data = dropped.map((field) => fieldLabelOf(known, field)).join(', ');
  }
  const checking = removal
    ? rulesCheckingRemoval(content.branches, removal, content.documents)
    : [];
  const changed = { ...content, documents };
  if (checking.length === 0) {
    return { ok: true, content: changed, result: { removedRules: [] } };
  }
  if (!input.also_remove_rules) {
    const names = checking.map(
      ({ branchIndex, rule }) =>
        `${rule.name.trim()} in ${content.branches[branchIndex].name.trim()}`
    );
    return refusalOf(DRAFT_TOOL_MESSAGES.rulesCheckRemoval(data, names));
  }
  const removedRules = checking.map(({ branchIndex, rule }) =>
    itemRefOf(rule, content.branches[branchIndex], read.id)
  );
  return applied(
    changed,
    removeRules(
      changed,
      checking.map(({ branchIndex, rule }) => ({
        branchId: variantIdOf(content.branches[branchIndex]),
        ruleId: rule.id,
      }))
    ),
    () => ({ removedRules })
  );
}

registerTool({
  name: 'set_document',
  level: 'drafts',
  description:
    'Adds a document type to a draft, after the documents it requests, or replaces the fields ' +
    'it requests (put in catalog order; the document keeps its place), or removes it with ' +
    'fields null (the others keep their order); move_document changes the order. Removing a ' +
    'document or a field that rules check is refused ' +
    'with the names of those rules, unless also_remove_rules is true: then those rules are ' +
    'removed in every variant too, and the answer names them.',
  input: z.object({
    connection: CONNECTION,
    document_type: z.string().min(1).describe('The catalog key of the document type: pid, mdl, …'),
    fields: z
      .array(z.string())
      .nullable()
      .describe(
        'The catalog keys of every field to request, replacing those requested; null removes ' +
          'the document'
      ),
    also_remove_rules: z
      .boolean()
      .optional()
      .describe('Also remove the rules that check the data no longer requested, in every variant'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read, context) =>
      setDocument(read, context.allDocuments, input)
    );
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    const documents = documentsOf(draft);
    const removedRules = outcome.result.removedRules;
    return toolResult(
      { connection, documents, removed_rules: removedRules },
      summaryTextOf(
        connectionLineOf(connection),
        documentsTextOf(documents),
        removedRules.length > 0 &&
          'Removed with the data:\n' + removedRules.map((ref) => `- ${itemLineOf(ref)}`).join('\n'),
        draftLineOf(draft)
      )
    );
  },
});

// move_document

/** How `move_document` answers the editor's refusals of a move, by their code. */
const MOVE_REFUSAL_CODES: Record<string, 'not_found' | 'validation'> = {
  documentNotRequested: 'not_found',
  positionOutside: 'validation',
  alreadyInPosition: 'validation',
};

registerTool({
  name: 'move_document',
  level: 'drafts',
  description:
    "Moves a draft's document to another place in the documents' order (1 is the first), the " +
    'others keeping theirs, as a drag in the editor does. The order is how Konnekt lists the ' +
    'documents; what the wallet asks for and serviceBW receives keeps the catalog order.',
  input: z.object({
    connection: CONNECTION,
    document_type: z
      .string()
      .min(1)
      .describe('The catalog key of a document type the draft requests: pid, mdl, …'),
    position: z
      .number()
      .describe('The place to move it to: 1 is the first, the number of documents the last'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const key = input.document_type.trim();
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const content = draftContentOf(read);
      const moved = moveDocument(content.documents, key, input.position - 1);
      if (!moved.ok) {
        return {
          ok: false,
          refusal: moved.refusal,
          code: MOVE_REFUSAL_CODES[moved.refusal.code ?? ''] ?? 'validation',
        };
      }
      return { ok: true, content: { ...content, documents: moved.documents }, result: null };
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    const documents = documentsOf(draft);
    const position = documents.findIndex((document) => document.document_type === key) + 1;
    const label = documents[position - 1]?.label ?? key;
    return toolResult(
      { connection, documents },
      summaryTextOf(
        connectionLineOf(connection),
        `Moved ${label} (${key}) to position ${position} of ${documents.length}.`,
        documentsTextOf(documents),
        draftLineOf(draft)
      )
    );
  },
});

// add_variant

registerTool({
  name: 'add_variant',
  level: 'drafts',
  description:
    "Adds a variant to a draft, after the others: based on Standard (a copy of Standard's rules " +
    "that keeps following Standard's changes) or empty (no rules, never follows Standard). " +
    'Variant names are unique within a connection.',
  input: z.object({
    connection: CONNECTION,
    name: z.string().describe('The variant’s name, unique within the connection'),
    description: z.string().optional().describe('What the variant is for, at most 500 characters'),
    origin: z.enum(['based', 'empty']).describe('based on Standard, or empty'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    // One id for every attempt: the variant keeps it from now on (research R10)
    const id = crypto.randomUUID();
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const content = draftContentOf(read);
      return applied(
        content,
        addVariant(
          content,
          { name: input.name, description: input.description ?? null },
          input.origin,
          id
        ),
        () => null
      );
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, id);
    return toolResult(
      { connection, variant },
      summaryTextOf(
        connectionLineOf(connection),
        `Added the ${input.origin === 'based' ? 'variant based on Standard' : 'empty variant'} ` +
          `'${variant.name}': ${variant.link}`,
        draftLineOf(draft)
      )
    );
  },
});

// update_variant

registerTool({
  name: 'update_variant',
  level: 'drafts',
  description:
    "Renames or describes a variant (Standard too), switches its top level's AND/OR, or resets " +
    "a based variant's top-level AND/OR to Standard's with reset_operator. A based variant that " +
    "switches its AND/OR no longer follows Standard's.",
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    name: z.string().optional().describe('The new name, unique within the connection'),
    description: z
      .string()
      .nullable()
      .optional()
      .describe("The new description; null or '' clears it"),
    operator: OPERATOR.optional().describe(
      'The top level’s AND/OR: and (all must be met) or or (one must be met)'
    ),
    reset_operator: z
      .literal(true)
      .optional()
      .describe("A based variant's top level follows Standard's AND/OR again"),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const branch = resolveVariant(read.branches, input.variant, read.id);
      const branchId = variantIdOf(branch);
      const renames = input.name !== undefined || input.description !== undefined;
      if (!renames && input.operator === undefined && input.reset_operator === undefined) {
        return refusalOf(
          DRAFT_TOOL_MESSAGES.nothingToChange(
            'a name, a description, an operator or reset_operator'
          )
        );
      }
      if (input.operator !== undefined && input.reset_operator !== undefined) {
        return refusalOf(DRAFT_TOOL_MESSAGES.operatorAndReset);
      }
      const content = draftContentOf(read);
      let state: EditState = content;
      if (renames) {
        const edited = editVariant(state, branchId, {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.description === undefined ? {} : { description: input.description }),
        });
        if (!edited.ok) return edited;
        state = edited.state;
      }
      if (input.operator !== undefined) {
        const switched = switchOperator(state, branchId, null, input.operator);
        if (!switched.ok) return switched;
        state = switched.state;
      }
      if (input.reset_operator) {
        const reset = resetOperator(state, branchId);
        if (!reset.ok) return reset;
        state = reset.state;
      }
      return { ok: true, content: withEditState(content, state), result: branchId };
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    const saved = draft.branches.find((branch) => branch.id === outcome.result);
    const variant = savedVariantRef(draft, outcome.result);
    return toolResult(
      { connection, variant },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        saved?.description && `Description: ${saved.description}`,
        saved &&
          `Top level: ${saved.operator.toUpperCase()}` +
            (saved.operator_mark ? " (changed from Standard's)." : '.'),
        draftLineOf(draft)
      )
    );
  },
});

// delete_variant

registerTool({
  name: 'delete_variant',
  level: 'drafts',
  description:
    'Deletes a variant of a draft with its rules and groups. The main variant (Standard) can’t ' +
    'be deleted.',
  input: z.object({ connection: CONNECTION, variant: VARIANT }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const branch = resolveVariant(read.branches, input.variant, read.id);
      const content = draftContentOf(read);
      const deleted = deleteVariant(content, variantIdOf(branch));
      if (!deleted.ok) {
        // The main variant: an action that doesn't apply (contracts/mcp-tools.md)
        const main = deleted.refusal.branchIndex === 0;
        return { ...deleted, code: main ? 'not_allowed' : 'validation' };
      }
      return applied(content, deleted, () => variantRefOf(branch, read.id));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft } = outcome;
    const connection = connectionRefOf(draft);
    const deleted = outcome.result;
    return toolResult(
      { connection, deleted },
      summaryTextOf(
        connectionLineOf(connection),
        `Deleted the variant '${deleted.name}' with its rules.`,
        draftLineOf(draft)
      )
    );
  },
});
