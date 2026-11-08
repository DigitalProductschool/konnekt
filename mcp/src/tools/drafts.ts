// The tools that create a draft and change its connection, documents and variants
// (contracts/mcp-tools.md "Changing drafts"; FR-012 to FR-020): each makes one change and stores
// it at once. Every change to an existing draft runs through `editDraft()`, the read-apply-save
// loop, with the editor's own actions of `@connection-portal/rules/edits`
import type {
  BranchInput,
  DraftCreate,
  FormConnectionDraft,
  RequestedDocument,
} from '@connection-portal/api-types/form-connections';
import {
  addVariant,
  deleteVariant,
  editVariant,
  removeRules,
  resetOperator,
  rulesCheckingRemoval,
  switchOperator,
} from '@connection-portal/rules/edits';
import type { DataRemoval, EditState, RuleDocument } from '@connection-portal/rules/types';
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
  .describe('The draft: its id, or any Connection Portal link that names it');
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
    'description can have at most 500 characters. A published connection is changed in the ' +
    'Connection Portal, not by agents.',
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

/** The requested documents in catalog order, those the catalog dropped last. */
function inCatalogOrder(
  documents: RequestedDocument[],
  catalog: RuleDocument[]
): RequestedDocument[] {
  const rank = (key: string) => {
    const index = catalog.findIndex((entry) => entry.key === key);
    return index < 0 ? catalog.length : index;
  };
  return [...documents].sort((a, b) => rank(a.document_type) - rank(b.document_type));
}

/** A field's label in the catalog, or its key where the catalog dropped it. */
function fieldLabelOf(document: RuleDocument | undefined, key: string): string {
  return document?.fields.find((field) => field.key === key)?.label ?? key;
}

interface DocumentChange {
  removedRules: ItemRef[];
}

/**
 * The documents with `documentType` added, its fields replaced (in catalog order) or, with
 * `fields` null, removed; refused while rules check the data that stops being requested, unless
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
    const others = content.documents.filter((document) => document !== requested);
    documents = inCatalogOrder([...others, { document_type: key, fields }], catalog);
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
    'Adds a document type to a draft or replaces the fields it requests (put in catalog order), ' +
    'or removes it with fields null. Removing a document or a field that rules check is refused ' +
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
    const documents = draft.documents.map((document) => ({
      document_type: document.document_type,
      label: document.label,
      fields: document.fields.map(({ key, label, kind }) => ({ key, label, kind })),
    }));
    const removedRules = outcome.result.removedRules;
    return toolResult(
      { connection, documents, removed_rules: removedRules },
      summaryTextOf(
        connectionLineOf(connection),
        documents.length === 0
          ? 'Documents: none.'
          : 'Documents:\n' +
              documents
                .map((document) => {
                  const fields = document.fields.map((field) => field.key).join(', ');
                  return `- ${document.label} (${document.document_type}): ${fields || 'no fields yet'}`;
                })
                .join('\n'),
        removedRules.length > 0 &&
          'Removed with the data:\n' + removedRules.map((ref) => `- ${itemLineOf(ref)}`).join('\n'),
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
