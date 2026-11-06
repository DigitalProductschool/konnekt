// The tools that change a draft's rules and groups (contracts/mcp-tools.md "Changing drafts";
// FR-012 to FR-017): add a rule, change, delete, reset or copy an item, group items. Each makes one
// change and stores it at once through `editDraft()`, the read-apply-save loop, with the editor's
// own actions of `@connection-portal/rules/edits`, so Standard's changes reach the based variants
// with the editor's marks. A condition is checked against the rule's data as the editor's check
// menu limits it (research R8; FR-016). The answers describe the items as saved
import type {
  BranchInput,
  Condition,
  FormConnectionDraft,
  RuleItem,
  RuleTarget,
  RuleTreeItem,
} from '@connection-portal/api-types/form-connections';
import { kindOfTarget, operatorDefinition, withTarget } from '@connection-portal/rules/conditions';
import { OPERATORS } from '@connection-portal/rules/constants';
import {
  addRule,
  changeGroup,
  changeRule,
  copyRule,
  deleteItem,
  duplicateRule,
  groupItems,
  resetItem,
  restoreItem,
} from '@connection-portal/rules/edits';
import { findItem, isDissolved } from '@connection-portal/rules/tree';
import type { ConditionKind, GroupChanges, RuleChanges } from '@connection-portal/rules/types';
import { z } from 'zod';

import {
  applied,
  type ApplyRefusal,
  draftContentOf,
  type DraftEdited,
  draftLineOf,
  editDraft,
  refusalOf,
  savedVariantRef,
} from '../draftEdit';
import { resolveField, resolveItem, resolveVariant } from '../resolve';
import {
  connectionLineOf,
  connectionRefOf,
  fieldKeyOf,
  itemLineOf,
  type ItemRef,
  itemRefOf,
  type ItemView,
  itemViewLinesOf,
  itemViewOf,
  summaryTextOf,
  type ToolRuleContext,
  variantIdOf,
  variantLineOf,
  type VariantRef,
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
const ITEM = z
  .string()
  .min(1)
  .describe('The rule or group: rule-n or group-n, its link, or its name in the variant');
const RULE = z.string().min(1).describe('The rule: rule-n, its link, or its name in the variant');
const OPERATOR = z.enum(['and', 'or']);
const TARGET = z
  .object({
    document_type: z.string().min(1).describe('The catalog key of the document type: pid, mdl, …'),
    field: z
      .string()
      .min(1)
      .describe(
        'The catalog key of the field; a part as field.part (place_of_birth.country), a ' +
          "licence class's date as field.part#class (driving_privileges.issue_date#B)"
      ),
  })
  .describe('The data the rule checks; get_catalog lists it');
const CONDITION = z
  .object({
    operator: z
      .string()
      .min(1)
      .describe('One of the operators get_catalog lists for the field; another is refused'),
    value: z.union([z.number(), z.string()]).nullable().optional(),
    match_case: z.boolean().nullable().optional(),
    values: z
      .array(z.union([z.string(), z.number()]))
      .nullable()
      .optional(),
    date: z.string().nullable().optional().describe('YYYY-MM-DD'),
    years: z.number().nullable().optional(),
    amount: z.number().nullable().optional(),
    unit: z.enum(['years', 'months']).nullable().optional(),
  })
  .describe('The check on the data; the conditions skill lists the operators per kind');

/** The operators of a kind, as `get_catalog` lists them: "includes_one_of, includes_none_of". */
function checksOf(kind: ConditionKind): string {
  return OPERATORS[kind].map((definition) => definition.operator).join(', ');
}

/** The operators of every kind: "number: greater_than, …; text: …; enum: …; date: …". */
function checksPerKind(): string {
  return (Object.keys(OPERATORS) as ConditionKind[])
    .map((kind) => `${kind}: ${checksOf(kind)}`)
    .join('; ');
}

export const ITEM_TOOL_MESSAGES = {
  nothingToChange: (what: string) => `Give ${what} to change.`,
  groupHasNoData: (group: string, variant: string) =>
    `${group} in ${variant} is a group: it has no data or condition. Change its rules instead.`,
  ruleHasNoOperator: (rule: string, variant: string) =>
    `${rule} in ${variant} is a rule: it has no AND/OR. Switch the AND/OR of the group it sits ` +
    'in, or of the top level with update_variant.',
  // A condition's operator the rule's data doesn't offer (FR-016)
  operatorNotOffered: (
    rule: string,
    variant: string,
    operator: string,
    field: string,
    kind: ConditionKind
  ) =>
    `${rule} in ${variant}: '${operator}' isn't a check of ${field} (kind ${kind}). ` +
    `Its checks: ${checksOf(kind)}.`,
  operatorOfNoKind: (rule: string, variant: string, operator: string) =>
    `${rule} in ${variant}: '${operator}' isn't a check of any kind of data. The checks per ` +
    `kind: ${checksPerKind()}.`,
  // The text line after `update_item` dropped a condition that no longer fits (FR-014)
  droppedCondition: (field: string, kind: ConditionKind | null) =>
    `Its condition was dropped: it doesn't fit ${field}` +
    (kind === null ? '.' : ` (kind ${kind}). Its checks: ${checksOf(kind)}.`),
} as const;

/** A condition `update_item` dropped because the rule's new data doesn't fit it (FR-014). */
interface DroppedCondition {
  condition: Condition;
  /** The new data, as tools name it, and its kind */
  field: string;
  kind: ConditionKind | null;
}

/**
 * The refusal of a condition whose operator the rule's data doesn't offer, or null (FR-016): the
 * editor's check menu offers only the operators of the data's kind, so the tools refuse any
 * other, naming the data's checks as `get_catalog` lists them. The kind is looked up in the whole
 * catalog, since a rule may check data that isn't requested yet. A rule without data, or on data
 * the catalog no longer offers, refuses only an operator that no kind offers.
 */
function conditionRefusal(
  rule: RuleItem,
  variantName: string,
  context: ToolRuleContext
): ApplyRefusal | null {
  if (rule.condition === null) {
    return null;
  }
  const { operator } = rule.condition;
  const names = [rule.name.trim(), variantName.trim()] as const;
  const kind = kindOfTarget(rule.target, context.allDocuments);
  if (kind === null || rule.target === null) {
    const known = Object.values(OPERATORS).some((definitions) =>
      definitions.some((definition) => definition.operator === operator)
    );
    return known ? null : refusalOf(ITEM_TOOL_MESSAGES.operatorOfNoKind(...names, operator));
  }
  if (operatorDefinition(operator, kind) !== undefined) {
    return null;
  }
  return refusalOf(
    ITEM_TOOL_MESSAGES.operatorNotOffered(...names, operator, fieldKeyOf(rule.target), kind)
  );
}

/** The rule's data from the catalog's keys, as `target.field` names it (data-model §8). */
function targetOf(
  target: { document_type: string; field: string },
  context: ToolRuleContext
): RuleTarget {
  return resolveField(context.allDocuments, context.optionSets, target.document_type, target.field);
}

/** The variant of the draft as read, with its id. */
function branchOf(
  read: FormConnectionDraft,
  reference: string
): { branch: BranchInput; branchId: string } {
  const branch = resolveVariant<BranchInput>(read.branches, reference, read.id);
  return { branch, branchId: variantIdOf(branch) };
}

/** The item as saved, as tools answer it, with the context the change was applied with. */
function savedItemView(edited: DraftEdited<unknown>, branchId: string, itemId: string): ItemView {
  const { draft, context } = edited;
  const branch = draft.branches.find((entry) => entry.id === branchId);
  const item = branch ? findItem(branch.items, itemId)?.item : undefined;
  if (!item) {
    // A save keeps every item the change answers about
    throw new Error('A saved item is missing from the draft.');
  }
  return itemViewOf(item, { id: branchId }, { connectionId: draft.id, rules: context });
}

/** An item of the draft as saved, by its variant and id; as the action answered it otherwise. */
function savedItemRef(
  draft: FormConnectionDraft,
  branchId: string,
  item: Pick<RuleTreeItem, 'id' | 'type' | 'name'>
): ItemRef {
  const branch = draft.branches.find((entry) => entry.id === branchId);
  const saved = branch ? findItem(branch.items, item.id)?.item : undefined;
  return itemRefOf(saved ?? item, { id: branchId }, draft.id);
}

/** The text line on the based variants a change of Standard reached, or null for none. */
function propagatedLineOf(variants: VariantRef[]): string | null {
  return variants.length === 0
    ? null
    : `Also in the variants based on Standard: ${variants.map((variant) => variant.name).join(', ')}.`;
}

// add_rule

registerTool({
  name: 'add_rule',
  level: 'drafts',
  description:
    'Adds a rule to a variant of a draft, at the end of its top level or of a group: numbered ' +
    'from the counters, "added" in a based variant, and in Standard passed on to the variants ' +
    'based on it. The data (target), condition and message may come later: an incomplete rule ' +
    'is stored, but blocks publishing.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    group: z
      .string()
      .min(1)
      .optional()
      .describe('The group or sub-group to add the rule to: group-n, its link or its name'),
    name: z.string().optional().describe('The rule’s name; Rule 01, Rule 02, … by default'),
    target: TARGET.optional(),
    condition: CONDITION.optional(),
    message: z.string().optional().describe('What the citizen reads when the rule isn’t met'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read, context) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const parentId =
        input.group === undefined ? null : resolveItem(branch, input.group, read.id).item.id;
      const content = draftContentOf(read);
      const rule = {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.target === undefined ? {} : { target: targetOf(input.target, context) }),
        ...(input.condition === undefined ? {} : { condition: input.condition }),
        ...(input.message === undefined ? {} : { message: input.message }),
      };
      const added = addRule(content, branchId, parentId, rule);
      if (added.ok && input.condition !== undefined) {
        const refusal = conditionRefusal(added.item, branch.name, context);
        if (refusal) {
          return refusal;
        }
      }
      return applied(content, added, ({ item, propagatedTo }) => ({
        branchId,
        itemId: item.id,
        propagatedTo,
      }));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, result.branchId);
    const item = savedItemView(outcome, result.branchId, result.itemId);
    const propagatedTo = result.propagatedTo.map((id) => savedVariantRef(draft, id));
    return toolResult(
      { connection, variant, item, propagated_to: propagatedTo },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        'Added:',
        ...itemViewLinesOf([item]),
        propagatedLineOf(propagatedTo),
        draftLineOf(draft)
      )
    );
  },
});

// update_item

registerTool({
  name: 'update_item',
  level: 'drafts',
  description:
    "Changes a rule's name, data (target), condition or message, or a group's name, AND/OR " +
    "(operator) or message (null removes a group's own message). In a based variant the item " +
    'becomes "changed" and no longer follows Standard\'s; a change in Standard reaches the ' +
    'variants based on it where the item follows Standard. A name used by another rule or group ' +
    'is refused, also where it clashes in a based variant.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    item: ITEM,
    name: z.string().optional().describe('The new name'),
    target: TARGET.optional(),
    condition: CONDITION.optional(),
    message: z
      .string()
      .nullable()
      .optional()
      .describe("The new message; null removes a group's own message"),
    operator: OPERATOR.optional().describe(
      'A group’s AND/OR: and (all must be met) or or (one must be met)'
    ),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read, context) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const { item } = resolveItem(branch, input.item, read.id);
      const content = draftContentOf(read);
      const names = [item.name.trim(), branch.name.trim()] as const;
      const answerOf = (edit: { item: RuleTreeItem; propagatedTo: string[] }) => ({
        branchId,
        itemId: edit.item.id,
        propagatedTo: edit.propagatedTo,
        dropped: null as DroppedCondition | null,
      });
      if (item.type === 'group') {
        if (input.target !== undefined || input.condition !== undefined) {
          return refusalOf(ITEM_TOOL_MESSAGES.groupHasNoData(...names));
        }
        const changes: GroupChanges = {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.operator === undefined ? {} : { operator: input.operator }),
          ...(input.message === undefined ? {} : { message: input.message }),
        };
        if (Object.keys(changes).length === 0) {
          return refusalOf(ITEM_TOOL_MESSAGES.nothingToChange('a name, an operator or a message'));
        }
        return applied(content, changeGroup(content, branchId, item.id, changes), answerOf);
      }
      if (input.operator !== undefined) {
        return refusalOf(ITEM_TOOL_MESSAGES.ruleHasNoOperator(...names));
      }
      const changes: RuleChanges = {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.target === undefined ? {} : { target: targetOf(input.target, context) }),
        ...(input.condition === undefined ? {} : { condition: input.condition }),
        // A rule's message is a text; null clears it as an empty one
        ...(input.message === undefined ? {} : { message: input.message ?? '' }),
      };
      if (Object.keys(changes).length === 0) {
        return refusalOf(
          ITEM_TOOL_MESSAGES.nothingToChange('a name, a target, a condition or a message')
        );
      }
      // New data without a new condition keeps or drops the condition as the editor does
      let dropped: DroppedCondition | null = null;
      if (changes.target !== undefined && changes.condition === undefined) {
        const target = changes.target;
        const moved = withTarget(item, target, context.allDocuments);
        if (moved.condition !== item.condition && item.condition !== null && target !== null) {
          changes.condition = null;
          dropped = {
            condition: item.condition,
            field: fieldKeyOf(target),
            kind: kindOfTarget(target, context.allDocuments),
          };
        }
      }
      const changed = changeRule(content, branchId, item.id, changes);
      if (changed.ok && (input.condition !== undefined || input.target !== undefined)) {
        const refusal = conditionRefusal(changed.item, branch.name, context);
        if (refusal) {
          return refusal;
        }
      }
      return applied(content, changed, (edit) => ({ ...answerOf(edit), dropped }));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, result.branchId);
    const item = savedItemView(outcome, result.branchId, result.itemId);
    const propagatedTo = result.propagatedTo.map((id) => savedVariantRef(draft, id));
    const { dropped } = result;
    return toolResult(
      {
        connection,
        variant,
        item,
        propagated_to: propagatedTo,
        ...(dropped === null ? {} : { dropped_condition: dropped.condition }),
      },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        'Changed:',
        ...itemViewLinesOf([item]),
        item.message !== undefined && item.message !== '' && `Message: ${item.message}`,
        dropped !== null && ITEM_TOOL_MESSAGES.droppedCondition(dropped.field, dropped.kind),
        propagatedLineOf(propagatedTo),
        draftLineOf(draft)
      )
    );
  },
});

// delete_item

const DELETE_ACTIONS = {
  deleted: 'Deleted',
  ungrouped: 'Ungrouped',
  removed: 'Removed from this variant (it stays shown with the mark removed)',
} as const;

registerTool({
  name: 'delete_item',
  level: 'drafts',
  description:
    'Deletes a rule or a group with its members from Standard, an empty variant, or a based ' +
    "variant's own items; with keep_members, a group is ungrouped instead and its members take " +
    'its place. An item a based variant inherits from Standard is removed there instead: it stays, ' +
    'marked removed, and reset_item restores it. Deleting in Standard reports what the based ' +
    'variants keep because they changed it.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    item: ITEM,
    keep_members: z
      .boolean()
      .optional()
      .describe('Ungroup a group instead of deleting it with its members'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const { item } = resolveItem(branch, input.item, read.id);
      const content = draftContentOf(read);
      return applied(
        content,
        deleteItem(content, branchId, item.id, { keepMembers: input.keep_members ?? false }),
        ({ action, item: deleted, effects }) => ({
          branchId,
          action,
          item: itemRefOf(deleted, branch, read.id),
          effects,
        })
      );
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, result.branchId);
    const effects = result.effects.map(({ branchId, kept, dissolved }) => ({
      variant: savedVariantRef(draft, branchId),
      kept: kept.map((item) => itemRefOf(item, { id: branchId }, draft.id)),
      dissolved: dissolved.map((item) => itemRefOf(item, { id: branchId }, draft.id)),
    }));
    return toolResult(
      { connection, variant, action: result.action, item: result.item, effects },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        `${DELETE_ACTIONS[result.action]}: ${itemLineOf(result.item)}`,
        ...effects.flatMap((effect) => [
          effect.kept.length > 0 &&
            `${effect.variant.name} keeps its changed ${effect.kept.map((ref) => ref.name).join(', ')}.`,
          effect.dissolved.length > 0 &&
            `In ${effect.variant.name}, ${effect.dissolved.map((ref) => ref.name).join(', ')} ` +
              'dissolved all the same.',
        ]),
        draftLineOf(draft)
      )
    );
  },
});

// reset_item

registerTool({
  name: 'reset_item',
  level: 'drafts',
  description:
    'In a variant based on Standard: restores a removed rule or group (with the members removed ' +
    "inside it), or resets a changed one to follow Standard again with Standard's content.",
  input: z.object({ connection: CONNECTION, variant: VARIANT, item: ITEM }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const { item } = resolveItem(branch, input.item, read.id);
      const content = draftContentOf(read);
      // The editor offers "Restore" for a removed item and a dissolved group, "Reset" otherwise
      const restores = item.mark === 'removed' || isDissolved(item, branch.origin === 'based');
      const edit = restores
        ? restoreItem(content, branchId, item.id)
        : resetItem(content, branchId, item.id);
      return applied(content, edit, () => ({ branchId, itemId: item.id, restores }));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, result.branchId);
    const item = savedItemView(outcome, result.branchId, result.itemId);
    return toolResult(
      { connection, variant, item },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        result.restores ? 'Restored:' : 'Follows Standard again:',
        ...itemViewLinesOf([item]),
        draftLineOf(draft)
      )
    );
  },
});

// copy_rule

registerTool({
  name: 'copy_rule',
  level: 'drafts',
  description:
    'Copies a rule as a new rule with the next number and a default name. Without to_variants, ' +
    'the copy goes beside the rule in its variant; with to_variants, a copy goes at the end of ' +
    "each of those variants' top level. A copy to Standard also reaches the variants based on it.",
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    rule: RULE,
    to_variants: z
      .array(z.string().min(1))
      .optional()
      .describe('The variants to copy the rule to: ids, links or names'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const { item } = resolveItem(branch, input.rule, read.id);
      const content = draftContentOf(read);
      if (input.to_variants === undefined) {
        return applied(content, duplicateRule(content, branchId, item.id), (edit) => ({
          copies: [{ branchId, item: edit.item }],
          propagatedTo: edit.propagatedTo,
        }));
      }
      const targets = input.to_variants.map((reference) => branchOf(read, reference).branchId);
      return applied(content, copyRule(content, branchId, item.id, targets), (edit) => ({
        copies: edit.copies,
        propagatedTo: edit.propagatedTo,
      }));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const copies = result.copies.map(({ branchId, item }) => ({
      variant: savedVariantRef(draft, branchId),
      item: savedItemRef(draft, branchId, item),
    }));
    const propagatedTo = result.propagatedTo.map((id) => savedVariantRef(draft, id));
    return toolResult(
      { connection, copies },
      summaryTextOf(
        connectionLineOf(connection),
        ...copies.map((copy) => `In '${copy.variant.name}': ${itemLineOf(copy.item)}`),
        propagatedLineOf(propagatedTo),
        draftLineOf(draft)
      )
    );
  },
});

// group_items

registerTool({
  name: 'group_items',
  level: 'drafts',
  description:
    'Puts two or more rules (or groups) of one level of a variant into a new group, in the first ' +
    "one's place: a group at the top level, a sub-group inside a group (a sub-group holds rules " +
    'only). Optionally names it and sets its AND/OR and its own message. In a based variant the ' +
    'group is "added" and its rules keep following Standard.',
  input: z.object({
    connection: CONNECTION,
    variant: VARIANT,
    items: z
      .array(z.string().min(1))
      .describe('Two or more rules or groups of one level: rule-n / group-n, links or names'),
    name: z.string().optional().describe('The group’s name; Group 01, … by default'),
    operator: OPERATOR.optional().describe(
      'and (all must be met, the default) or or (one must be met)'
    ),
    message: z
      .string()
      .optional()
      .describe('The group’s own message, which replaces its members’ when it isn’t met'),
  }),
  changesContent: true,
  handler: async (caller, input, { backend }) => {
    const outcome = await editDraft(backend, caller, input.connection, (read) => {
      const { branch, branchId } = branchOf(read, input.variant);
      const ids = input.items.map((reference) => resolveItem(branch, reference, read.id).item.id);
      const content = draftContentOf(read);
      const changes: GroupChanges = {
        ...(input.name === undefined ? {} : { name: input.name }),
        ...(input.operator === undefined ? {} : { operator: input.operator }),
        ...(input.message === undefined ? {} : { message: input.message }),
      };
      return applied(content, groupItems(content, branchId, ids, changes), (edit) => ({
        branchId,
        itemId: edit.item.id,
        propagatedTo: edit.propagatedTo,
      }));
    });
    if (!outcome.ok) {
      return outcome.error;
    }
    const { draft, result } = outcome;
    const connection = connectionRefOf(draft);
    const variant = savedVariantRef(draft, result.branchId);
    const item = savedItemView(outcome, result.branchId, result.itemId);
    const propagatedTo = result.propagatedTo.map((id) => savedVariantRef(draft, id));
    return toolResult(
      { connection, variant, item },
      summaryTextOf(
        connectionLineOf(connection),
        variantLineOf(variant),
        'Grouped:',
        ...itemViewLinesOf([item]),
        propagatedLineOf(propagatedTo),
        draftLineOf(draft)
      )
    );
  },
});
