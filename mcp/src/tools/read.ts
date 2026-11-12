// The reading tools (contracts/mcp-tools.md "Reading"; FR-007, FR-008, FR-010, FR-011): finding
// connections, one connection with its documents, variants and URLs, one variant with its items
// and citizen fields, and one rule or group. Every answer carries the links of what it read
import type {
  ActivityPage,
  BranchInput,
  FormConnectionOrDraft,
  FormConnectionPage,
} from '@connection-portal/api-types/form-connections';
import { findItem } from '@connection-portal/rules/tree';
import { z } from 'zod';

import type { BackendClient } from '../backend';
import { resolveConnectionId, resolveItem, resolveVariant } from '../resolve';
import {
  activityEntryViewOf,
  activityLineOf,
  applicantFieldsOf,
  connectionDatesLineOf,
  connectionFactsOf,
  connectionLineOf,
  connectionRefOf,
  connectionUrlsOf,
  type DroppedData,
  droppedDataOf,
  droppedTextOf,
  EXAMPLE_LINE,
  itemCountsOf,
  type ItemRef,
  itemRefOf,
  itemViewLinesOf,
  itemViewOf,
  ruleContextOf,
  stepLineOf,
  summaryFactsLineOf,
  summaryFactsOf,
  summaryTextOf,
  type ToolRuleContext,
  unrequestedRulesOf,
  urlsNoteOf,
  urlsTextOf,
  variantLineOf,
  variantRefOf,
  versionLineOf,
} from '../views';
import { registerTool, toolResult } from './registry';

const CONNECTION = z
  .string()
  .min(1)
  .describe('The connection: its id, or any Konnekt link that names it');
const VARIANT = z
  .string()
  .min(1)
  .describe(
    'The variant: its id, its link, or its name ("Standard" for the main variant unless renamed)'
  );
const ITEM = z
  .string()
  .min(1)
  .describe('The rule or group: rule-n or group-n, its link, or its name in the variant');

/** The connection or draft a reference names, as the management API answers it. */
async function connectionOf(
  backend: BackendClient,
  reference: string
): Promise<FormConnectionOrDraft> {
  const id = resolveConnectionId(reference);
  return backend.get<FormConnectionOrDraft>(`/api/form-connections/${id}`);
}

/** A description where there is one: the answers leave an empty one out. */
function descriptionOf(description: string | null): { description?: string } {
  return description ? { description } : {};
}

/** The rules modules' context of a connection: its documents, the catalog, the value sets. */
async function ruleContextFor(
  backend: BackendClient,
  fc: FormConnectionOrDraft
): Promise<ToolRuleContext> {
  const [documentTypes, optionSets] = await Promise.all([
    backend.documentTypes(),
    backend.optionSets(),
  ]);
  return ruleContextOf(fc.documents, documentTypes, optionSets);
}

/** The top level's AND/OR in words, and whether a based variant switched it. */
function operatorLineOf(branch: Pick<BranchInput, 'operator' | 'operator_mark'>): string {
  const combination = branch.operator === 'or' ? 'one must be met' : 'all must be met';
  const mark = branch.operator_mark ? " (changed from Standard's)" : '';
  return `Top level: ${branch.operator.toUpperCase()}, ${combination}${mark}.`;
}

// search_connections

const STATUSES = ['draft', 'scheduled', 'live', 'deactivated'] as const;

const searchInput = z.object({
  query: z
    .string()
    .optional()
    .describe('A part of the name or description, ignoring letter case; all connections without'),
  status: z
    .enum(STATUSES)
    .optional()
    .describe('Only drafts, scheduled, live or deactivated connections'),
  cursor: z.string().optional().describe("The previous answer's next_cursor, for the next page"),
});

registerTool({
  name: 'search_connections',
  level: 'read',
  description:
    'Finds connections (serviceBW forms linked to the EUDI Wallet) by a part of their name or ' +
    'description, and by status: draft, scheduled, live or deactivated. Answers at most 25 per ' +
    'page, the most recently changed first, each with its link, when it was published and ' +
    "deactivated, the day a scheduled one becomes active, a draft's step, and example: true on " +
    'the example a team member created in Konnekt; pass next_cursor to read the next page. ' +
    'Look here before creating a draft, so that a form gets one connection.',
  input: searchInput,
  handler: async (_caller, input, { backend }) => {
    const query = new URLSearchParams();
    const text = input.query?.trim();
    if (text) query.set('q', text);
    if (input.status) query.set('status', input.status);
    if (input.cursor) query.set('cursor', input.cursor);
    const search = query.toString();
    const page = await backend.get<FormConnectionPage>(
      `/api/form-connections/search${search ? `?${search}` : ''}`
    );
    const items = page.items.map((item) => ({
      ...connectionRefOf(item),
      ...descriptionOf(item.description),
      updated_at: item.updated_at,
      ...summaryFactsOf(item),
    }));
    const count = items.length === 1 ? 'One connection' : `${items.length} connections`;
    return toolResult(
      { items, next_cursor: page.next_cursor },
      summaryTextOf(
        items.length === 0 ? 'No connection matches.' : `${count}:`,
        ...items.map((item) => {
          const facts = summaryFactsLineOf(item);
          return `- ${connectionLineOf(item, item.start_date)}${facts ? `\n  ${facts}` : ''}`;
        }),
        page.next_cursor && `More connections match: pass the cursor ${page.next_cursor}.`
      )
    );
  },
});

// get_connection

registerTool({
  name: 'get_connection',
  level: 'read',
  description:
    'Reads one connection: its name, description and status, the documents and fields it ' +
    'requests, its variants with their number of rules and groups (never the rules: use ' +
    'get_variant), its connection URLs once published, when it was published, became active ' +
    'and was deactivated, the day a scheduled one becomes active, its version_fingerprint (the ' +
    'Version the details page and the PDF show) and, for a draft, its save number ' +
    '(draft.version), its step, the requested data the wallet no longer offers and, for the ' +
    "example a team member created in Konnekt, its mark example: 'unchanged' or 'changed'. " +
    'Every part comes with its link.',
  input: z.object({ connection: CONNECTION }),
  handler: async (_caller, input, { backend }) => {
    const fc = await connectionOf(backend, input.connection);
    const ref = connectionRefOf(fc);
    const facts = connectionFactsOf(fc);
    const documents = fc.documents.map((document) => ({
      document_type: document.document_type,
      label: document.label,
      fields: document.fields.map(({ key, label, kind }) => ({ key, label, kind })),
    }));
    const variants = fc.branches.map((branch) => ({
      ...variantRefOf(branch, fc.id),
      ...descriptionOf(branch.description),
      origin: branch.origin,
      ...itemCountsOf(branch.items),
    }));
    const urls = connectionUrlsOf(fc);
    const urlsNote = urlsNoteOf(fc);
    // The editor notes dropped data on a draft's documents step (spec 005, S8): a published
    // connection's content is changed in Konnekt, not by agents
    const dropped: DroppedData[] =
      fc.status === 'draft' ? droppedDataOf(fc.documents, await backend.documentTypes()) : [];
    const draft =
      fc.status === 'draft'
        ? { draft: { version: fc.version, step: fc.step, updated_at: fc.updated_at } }
        : {};
    return toolResult(
      {
        ...ref,
        ...descriptionOf(fc.description),
        ...facts,
        documents,
        variants,
        urls,
        urls_note: urlsNote,
        dropped,
        ...draft,
      },
      summaryTextOf(
        connectionLineOf(ref, facts.start_date),
        fc.description && `Description: ${fc.description}`,
        versionLineOf(facts.version_fingerprint),
        fc.status === 'draft'
          ? `${stepLineOf(fc.step)} Version ${fc.version}, last saved ${fc.updated_at}.`
          : connectionDatesLineOf(facts),
        facts.example && EXAMPLE_LINE,
        documents.length === 0
          ? 'Documents: none yet.'
          : 'Documents:\n' +
              documents
                .map((document) => {
                  const fields = document.fields.map((field) => field.key).join(', ');
                  return `- ${document.label} (${document.document_type}): ${fields || 'no fields yet'}`;
                })
                .join('\n'),
        'Variants:\n' +
          variants
            .map(
              (variant) =>
                `- ${variantLineOf(variant)} (${variant.origin}; ${variant.rules} rules, ` +
                `${variant.groups} groups)`
            )
            .join('\n'),
        urlsTextOf(urls, urlsNote),
        droppedTextOf(dropped)
      )
    );
  },
});

// get_activity

registerTool({
  name: 'get_activity',
  level: 'read',
  description:
    "Reads a connection's activity, as the Activity card in Konnekt shows it: what happened " +
    'and when, newest first, 50 entries per page; pass next_cursor to read earlier ones. Each ' +
    'entry has its time, its event in words ("Rules changed in Ambulance"), its kind, the ' +
    'variant or start date it concerns, and who did it: the team member (by), the agent that ' +
    'made the change for them (agent), or the agent whose request they approved (agent with ' +
    'approved). An entry without by was made by the middleware itself, or before the activity ' +
    'was recorded.',
  input: z.object({
    connection: CONNECTION,
    cursor: z
      .string()
      .optional()
      .describe("The previous answer's next_cursor, for earlier entries"),
  }),
  handler: async (_caller, input, { backend }) => {
    const fc = await connectionOf(backend, input.connection);
    const connection = connectionRefOf(fc);
    const query = input.cursor ? `?${new URLSearchParams({ cursor: input.cursor })}` : '';
    const page = await backend.get<ActivityPage>(`/api/form-connections/${fc.id}/activity${query}`);
    const entries = page.items.map(activityEntryViewOf);
    return toolResult(
      { connection, entries, ...(page.next_cursor ? { next_cursor: page.next_cursor } : {}) },
      summaryTextOf(
        connectionLineOf(connection),
        entries.length === 0 ? 'No activity yet.' : 'Activity, newest first:',
        ...entries.map(activityLineOf),
        page.next_cursor && `Earlier entries exist: pass the cursor ${page.next_cursor}.`
      )
    );
  },
});

// get_variant

registerTool({
  name: 'get_variant',
  level: 'read',
  description:
    'Reads one variant of a connection, one per call: its rules and groups as a tree, each with ' +
    'its readable statement, its mark in a based variant (changed, removed, added) and its link; ' +
    'the top-level AND/OR; the citizen fields its rules check, which test_applicants takes; ' +
    'and the rules that check data the connection no longer requests.',
  input: z.object({ connection: CONNECTION, variant: VARIANT }),
  handler: async (_caller, input, { backend }) => {
    const fc = await connectionOf(backend, input.connection);
    const branch: BranchInput = resolveVariant<BranchInput>(fc.branches, input.variant, fc.id);
    const rules = await ruleContextFor(backend, fc);
    const connection = connectionRefOf(fc);
    const variantRef = variantRefOf(branch, fc.id);
    const items = branch.items.map((item) =>
      itemViewOf(item, branch, { connectionId: fc.id, rules })
    );
    const applicantFields = applicantFieldsOf(branch, rules);
    const unrequested = unrequestedRulesOf(branch, rules.documents, fc.id);
    return toolResult(
      {
        connection,
        variant: {
          ...variantRef,
          ...descriptionOf(branch.description),
          origin: branch.origin,
          operator: branch.operator,
          operator_mark: branch.operator_mark,
        },
        items,
        applicant_fields: applicantFields,
        unrequested_rules: unrequested,
      },
      summaryTextOf(
        connectionLineOf(connection),
        `${variantLineOf(variantRef)} (${branch.origin})`,
        branch.description && `Description: ${branch.description}`,
        operatorLineOf(branch),
        items.length === 0 ? 'No rules yet.' : itemViewLinesOf(items).join('\n'),
        applicantFields.length > 0 &&
          'Citizen fields for test_applicants:\n' +
            applicantFields
              .map(
                (field) =>
                  `- ${field.key}: ${field.label} (${field.kind}${field.multiple ? ', a list' : ''})`
              )
              .join('\n'),
        unrequested.length > 0 &&
          'These rules check data the connection no longer requests:\n' +
            unrequested.map((ref) => `- ${ref.name} (${ref.id}): ${ref.link}`).join('\n')
      )
    );
  },
});

// get_item

registerTool({
  name: 'get_item',
  level: 'read',
  description:
    'Reads one rule or group of a variant: a rule with its data, condition, message and readable ' +
    'statement; a group with its AND/OR, message and members; its mark in a based variant, the ' +
    'group it sits in, and the links.',
  input: z.object({ connection: CONNECTION, variant: VARIANT, item: ITEM }),
  handler: async (_caller, input, { backend }) => {
    const fc = await connectionOf(backend, input.connection);
    const branch: BranchInput = resolveVariant<BranchInput>(fc.branches, input.variant, fc.id);
    const found = resolveItem(branch, input.item, fc.id);
    const rules = await ruleContextFor(backend, fc);
    const connection = connectionRefOf(fc);
    const variant = variantRefOf(branch, fc.id);
    const item = itemViewOf(found.item, branch, { connectionId: fc.id, rules });
    const parent = found.parentId === null ? null : findItem(branch.items, found.parentId);
    const inGroup: ItemRef | null = parent ? itemRefOf(parent.item, branch, fc.id) : null;
    return toolResult(
      { connection, variant, item, in_group: inGroup },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        ...itemViewLinesOf([item]),
        item.message !== undefined && item.message !== '' && `Message: ${item.message}`,
        inGroup && `In ${inGroup.name} (${inGroup.id}): ${inGroup.link}`
      )
    );
  },
});
