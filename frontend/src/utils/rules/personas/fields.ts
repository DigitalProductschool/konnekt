// The persona fields (specs/004-rule-test-personas, research R3; data-model.md, "Persona field";
// contracts/personas.md, `personaFieldsOf()`): the data a persona has a value for, which is exactly
// the data that a rule counting in some branch checks (FR-005, FR-009), in display order and named
// as the rules name it. And `checkedBranchesOf()`: every branch's checked tree with its rules, as
// the worker's 'generate' message carries them (contracts/personas.md, "Worker protocol").
//
// Both derive from spec 003's `buildCheckedBranch()`, so that the test step, the checks and the
// evaluation agree, by construction, on which rules count. This module reaches
// `checks/checkedTree.ts`, and with it the case-folding table: the main bundle never imports it
// statically (tasks.md, "Bundle")
import type { DocumentField, FieldPart } from '../../../types/document-types';
import type { RuleItem, RuleTarget, RuleTreeItem } from '../../../types/form-connections';
import { buildCheckedBranch, type KeyedBranch } from '../checks/checkedTree';
import { variableKey } from '../checks/literals';
import type { CheckedBranch, CheckedItem } from '../checks/types';
import { resolveTarget } from '../conditions';
import { LICENCE_CLASSES_SET } from '../constants';
import { dataOfResolved } from '../statements';
import { effectiveItems } from '../tree';
import type { RuleContext, RuleDocument } from '../types';
import type { PersonaField } from './types';

/**
 * The part of a field made of parts that lists the licence classes held, which a class's dates
 * need (`CLASSES_PART` of `checks/literals.ts`; `CLASSES` of evaluation.py)
 */
const CLASSES_PART = 'classes';

/**
 * The day given to `buildCheckedBranch()` where only the variables are read: they don't depend on
 * the day, which the checked tree keeps as given without reading it
 */
const ANY_DAY = '2000-01-01';

/** One branch as the worker's 'generate' message carries it (contracts/personas.md) */
export interface CheckedBranchWithRules {
  /** The branch's checked tree */
  checked: CheckedBranch;
  /** The rules of the checked tree, by id, for substitution (research R8) */
  rules: Record<string, RuleItem>;
}

/**
 * The persona fields, in display order (FR-005):
 * - **Which**: the union of every branch's `buildCheckedBranch().variables`, so a rule removed in a
 *   based branch still brings its data while another branch's rule checks it (EC "Rules removed in
 *   a branch"), and a rule that the checked tree leaves out brings none. Licence classes are a
 *   field whenever a class's date is one.
 * - **Order**: by document in `context.documents`' order (the catalog's: Personal ID, then Driving
 *   licence), then by the document's field order, then by part order. A class's dates aren't at
 *   their part's place: they follow "Licence classes", class by class in the licence-class set's
 *   order, and for each class in part order (the issue date before the expiry date).
 * - **What**: `label` is `dataOfResolved()` ("Date of birth (Age)", "Licence class B – Issue
 *   date"), `documentLabel` the document's label; kind, value set, `multiple` (`multiple_values`
 *   of the part, or of the field without parts, for enums) and `dateOfBirth` come from the catalog.
 *
 * Total: it never throws on a branch of the rules state, whatever its problems
 * (`buildCheckedBranch()` doesn't either). Linear in the branches' items plus the size of the
 * catalog times the licence classes
 */
export function personaFieldsOf(
  branches: readonly KeyedBranch[],
  context: RuleContext
): PersonaField[] {
  const keys = new Set<string>();
  for (const branch of branches) {
    for (const key of Object.keys(buildCheckedBranch(branch, context, ANY_DAY).variables)) {
      keys.add(key);
    }
  }
  const classes = licenceClassesOf(context);
  const fields: PersonaField[] = [];
  for (const document of context.documents) {
    for (const field of document.fields) {
      fields.push(...fieldsOfCatalogField(document, field, classes, keys, context));
    }
  }
  return fields;
}

/**
 * Every branch, in the given (tab) order, as the worker request needs it: its checked tree for
 * `today` (`YYYY-MM-DD`, the date in Germany), and the rules in it by id. Never throws on a branch
 * of the rules state
 */
export function checkedBranchesOf(
  branches: readonly KeyedBranch[],
  context: RuleContext,
  today: string
): CheckedBranchWithRules[] {
  return branches.map((branch) => {
    const checked = buildCheckedBranch(branch, context, today);
    const ids = new Set<string>();
    collectRuleIds(checked.items, ids);
    const rules: Record<string, RuleItem> = {};
    for (const rule of countingRules(branch.items, branch.origin === 'based')) {
      if (ids.has(rule.id) && !(rule.id in rules)) {
        rules[rule.id] = rule;
      }
    }
    return { checked, rules };
  });
}

/** The codes of the licence-class set as loaded, in its order; empty when it isn't loaded */
function licenceClassesOf(context: RuleContext): string[] {
  const set = context.optionSets.find((entry) => entry.key === LICENCE_CLASSES_SET);
  return set ? set.options.map((option) => String(option.value)) : [];
}

/**
 * One catalog field's persona fields, in display order: the field itself, or its parts in part
 * order, with each class's dates right after the classes held
 */
function fieldsOfCatalogField(
  document: RuleDocument,
  field: DocumentField,
  classes: readonly string[],
  keys: ReadonlySet<string>,
  context: RuleContext
): PersonaField[] {
  const at = (part: FieldPart | null, licenceClass: string | null): PersonaField[] => {
    const entry = personaFieldOf(document, field, part, licenceClass, context);
    return entry ? [entry] : [];
  };
  if (field.kind !== 'parts') {
    return keys.has(keyOf(document, field, null, null)) ? at(null, null) : [];
  }
  const parts = field.parts ?? [];
  const perClass = parts.filter((part) => part.per_licence_class);
  const fields: PersonaField[] = [];
  for (const part of parts) {
    if (part.per_licence_class) {
      continue;
    }
    if (part.key !== CLASSES_PART || perClass.length === 0) {
      if (keys.has(keyOf(document, field, part, null))) {
        fields.push(...at(part, null));
      }
      continue;
    }
    const dates = classes.flatMap((code) =>
      perClass.flatMap((datePart) =>
        keys.has(keyOf(document, field, datePart, code)) ? at(datePart, code) : []
      )
    );
    if (dates.length > 0 || keys.has(keyOf(document, field, part, null))) {
      fields.push(...at(part, null), ...dates);
    }
  }
  return fields;
}

/** The variable key of a catalog field, part and class (`variableKey()`) */
function keyOf(
  document: RuleDocument,
  field: DocumentField,
  part: FieldPart | null,
  licenceClass: string | null
): string {
  return variableKey(targetOf(document, field, part, licenceClass));
}

function targetOf(
  document: RuleDocument,
  field: DocumentField,
  part: FieldPart | null,
  licenceClass: string | null
): RuleTarget {
  return {
    document_type: document.key,
    field: field.key,
    part: part?.key ?? null,
    licence_class: licenceClass,
  };
}

/**
 * The persona field of a catalog field, part and class, or null for data no rule can check (an
 * image, a field made of parts without its part)
 */
function personaFieldOf(
  document: RuleDocument,
  field: DocumentField,
  part: FieldPart | null,
  licenceClass: string | null,
  context: RuleContext
): PersonaField | null {
  const target = targetOf(document, field, part, licenceClass);
  const resolved = resolveTarget(target, context.documents);
  if (!resolved || resolved.kind === null) {
    return null;
  }
  const declared = resolved.part ?? resolved.field;
  return {
    key: variableKey(target),
    documentType: document.key,
    documentLabel: document.label,
    label: dataOfResolved(resolved),
    field: field.key,
    part: part?.key ?? null,
    licenceClass: resolved.licenceClass,
    kind: resolved.kind,
    optionSet: resolved.optionSet,
    multiple: resolved.kind === 'enum' && declared.multiple_values,
    dateOfBirth: resolved.dateOfBirth,
  };
}

/** The ids of the rules of a checked tree, at every level */
function collectRuleIds(items: readonly CheckedItem[], ids: Set<string>): void {
  for (const item of items) {
    if (item.type === 'rule') {
      ids.add(item.id);
    } else {
      collectRuleIds(item.items, ids);
    }
  }
}

/**
 * The rules that count in a branch, at every level, as `buildCheckedBranch()` walks them
 * (`effectiveItems()`): the checked tree holds no other rule
 */
function countingRules(items: RuleTreeItem[], based: boolean): RuleItem[] {
  return effectiveItems(items, based).flatMap((item) =>
    item.type === 'rule' ? [item] : countingRules(item.items, based)
  );
}
