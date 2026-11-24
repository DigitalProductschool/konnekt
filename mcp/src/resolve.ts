// How tools find what an agent names (data-model §8; FR-019, FR-030, FR-031): a connection by
// its id or a link; a variant, rule or group by its id, a link or its name; a rule's data by its
// catalog keys. Pure: the tools pass what they read. A refusal is a `ReferenceRefusal` with the
// tool error's code, which the registry (T029) answers
import type { BranchInput, RuleTarget, RuleTreeItem } from '@konnekt/api-types/form-connections';
import type { OptionSet } from '@konnekt/api-types/option-sets';
import { LICENCE_CLASSES_SET } from '@konnekt/rules/constants';
import { findItem, flattenItems, foldName } from '@konnekt/rules/tree';
import type { FoundItem, RuleDocument } from '@konnekt/rules/types';

import { parseReference, type Reference, ReferenceRefusal } from './links';
import { type ItemRef, itemRefOf, type VariantRef, variantRefOf } from './views';

export const RESOLVE_MESSAGES = {
  variantNotFound: 'This variant no longer exists.',
  itemNotFound: 'This rule or group no longer exists.',
  otherConnection: 'This link names another connection.',
  otherVariant: 'This link names another variant.',
  connectionReference:
    'Name a connection by its id or its link. search_connections finds it by its name.',
  approvalLink: "This is an approval request's link: it doesn't name a connection.",
  noVariantInLink: 'This link names a connection, not one of its variants.',
  noItemInLink: 'This link names a variant, not a rule or group.',
  ambiguousVariants: (count: number, name: string, links: string[]) =>
    `${countWord(count)} variants are called '${name}'. Name one by its link: ${links.join(', ')}`,
  ambiguousItems: (count: number, name: string, links: string[]) =>
    `${countWord(count)} rules or groups are called '${name}'. Name one by its link: ${links.join(', ')}`,
  unknownDocumentType: (key: string, known: string[]) =>
    `The catalog has no document type '${key}'. Its document types: ${known.join(', ')}.`,
  unknownField: (document: string, key: string, known: string[]) =>
    `${document} has no field '${key}' that rules can check. Its fields: ${known.join(', ')}.`,
  partMissing: (field: string, known: string[]) =>
    `'${field}' is made of parts: name one as ${field}.<part>. Its parts: ${known.join(', ')}.`,
  unknownPart: (field: string, key: string, known: string[]) =>
    `'${field}' has no part '${key}'. Its parts: ${known.join(', ')}.`,
  noParts: (field: string) => `'${field}' has no parts.`,
  classMissing: (field: string, known: string[]) =>
    `'${field}' is checked per licence class: name one as ${field}#<class>.` +
    (known.length > 0 ? ` The licence classes: ${known.join(', ')}.` : ''),
  unknownClass: (key: string, known: string[]) =>
    `There is no licence class '${key}'. The licence classes: ${known.join(', ')}.`,
  noClasses: (field: string) => `'${field}' isn't checked per licence class.`,
} as const;

const COUNT_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];

function countWord(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}

/** No connection, variant, rule or group by that reference (FR-031) */
export class ReferenceNotFound extends ReferenceRefusal {
  constructor(message: string) {
    super('not_found', message);
    this.name = 'ReferenceNotFound';
  }
}

/** A name that matches several variants, rules or groups (FR-019) */
export class AmbiguousName extends ReferenceRefusal {
  readonly candidates: (VariantRef | ItemRef)[];

  constructor(message: string, candidates: (VariantRef | ItemRef)[]) {
    super('ambiguous_name', message);
    this.name = 'AmbiguousName';
    this.candidates = candidates;
  }
}

/** A reference of the wrong kind for the parameter, or data the catalog doesn't have */
export class InvalidReference extends ReferenceRefusal {
  constructor(message: string) {
    super('validation', message);
    this.name = 'InvalidReference';
  }
}

/**
 * The connection's id from a UUID or a link of it, of a variant or of an item (data-model §8). An
 * approval's link, an item id and a name are refused: connections aren't named by name.
 */
export function resolveConnectionId(reference: string): string {
  const parsed = parseReference(reference);
  switch (parsed.kind) {
    case 'uuid':
      return parsed.id;
    case 'link':
      return parsed.connectionId;
    case 'approval_link':
      throw new InvalidReference(RESOLVE_MESSAGES.approvalLink);
    default:
      throw new InvalidReference(RESOLVE_MESSAGES.connectionReference);
  }
}

/** The text a name reference stands for: a name, or an item id given where a name may be. */
function nameOf(parsed: Reference): string | null {
  if (parsed.kind === 'name') {
    return parsed.name;
  }
  return parsed.kind === 'item_id' ? parsed.id : null;
}

/** A link's connection must be the tool's connection. */
function checkConnection(parsed: Reference & { kind: 'link' }, connectionId: string): void {
  if (parsed.connectionId !== connectionId.toLowerCase()) {
    throw new ReferenceNotFound(RESOLVE_MESSAGES.otherConnection);
  }
}

/**
 * The variant a reference names among the connection's `branches`: by its id, by a link (which
 * must name `connectionId`, and a variant), or by its name, compared ignoring letter case and
 * outer spaces as the editor compares names (`foldName()`; `rules._folded()`), so "standard" is
 * the main variant while it is called "Standard". A name that several variants have is refused
 * with them as candidates; no match is `not_found`.
 */
export function resolveVariant<B extends Pick<BranchInput, 'id' | 'name'>>(
  branches: B[],
  reference: string,
  connectionId: string
): B {
  const parsed = parseReference(reference);
  const byId = (id: string): B => {
    const branch = branches.find((entry) => entry.id?.toLowerCase() === id);
    if (!branch) {
      throw new ReferenceNotFound(RESOLVE_MESSAGES.variantNotFound);
    }
    return branch;
  };
  if (parsed.kind === 'uuid') {
    return byId(parsed.id);
  }
  if (parsed.kind === 'approval_link') {
    throw new InvalidReference(RESOLVE_MESSAGES.approvalLink);
  }
  if (parsed.kind === 'link') {
    checkConnection(parsed, connectionId);
    if (!parsed.variantId) {
      throw new InvalidReference(RESOLVE_MESSAGES.noVariantInLink);
    }
    return byId(parsed.variantId);
  }
  const name = nameOf(parsed) ?? '';
  const matches = branches.filter((branch) => foldName(branch.name) === foldName(name));
  if (matches.length > 1) {
    const candidates = matches.map((branch) => variantRefOf(branch, connectionId));
    throw new AmbiguousName(
      RESOLVE_MESSAGES.ambiguousVariants(
        matches.length,
        name,
        candidates.map((candidate) => candidate.link)
      ),
      candidates
    );
  }
  if (matches.length === 0) {
    throw new ReferenceNotFound(RESOLVE_MESSAGES.variantNotFound);
  }
  return matches[0];
}

/**
 * The rule or group a reference names in the variant `branch`, with where it sits: by `rule-n` /
 * `group-n`, by a link (which must name `connectionId`, this variant if it names one, and an
 * item) or by its name in the variant, folded as for variants. Removed items of a based variant
 * count: `reset_item` restores them. Several items of that name are refused with them as
 * candidates; no match is `not_found`.
 */
export function resolveItem(
  branch: Pick<BranchInput, 'id' | 'items'>,
  reference: string,
  connectionId: string
): FoundItem {
  const parsed = parseReference(reference);
  const byId = (id: string): FoundItem => {
    const found = findItem(branch.items, id);
    if (!found) {
      throw new ReferenceNotFound(RESOLVE_MESSAGES.itemNotFound);
    }
    return found;
  };
  if (parsed.kind === 'item_id') {
    // An item id can also be a name: "rule-3" names the rule `rule-3`, never a rule called so
    return byId(parsed.id);
  }
  if (parsed.kind === 'approval_link') {
    throw new InvalidReference(RESOLVE_MESSAGES.approvalLink);
  }
  if (parsed.kind === 'link') {
    checkConnection(parsed, connectionId);
    if (parsed.variantId && parsed.variantId !== branch.id?.toLowerCase()) {
      throw new ReferenceNotFound(RESOLVE_MESSAGES.otherVariant);
    }
    if (!parsed.itemId) {
      throw new InvalidReference(RESOLVE_MESSAGES.noItemInLink);
    }
    return byId(parsed.itemId);
  }
  // A UUID names no item; as a name it finds nothing either
  const name = parsed.kind === 'name' ? parsed.name : parsed.id;
  const matches = flattenItems(branch.items).filter(
    (item: RuleTreeItem) => foldName(item.name) === foldName(name)
  );
  if (matches.length > 1) {
    const candidates = matches.map((item) => itemRefOf(item, branch, connectionId));
    throw new AmbiguousName(
      RESOLVE_MESSAGES.ambiguousItems(
        matches.length,
        name,
        candidates.map((candidate) => candidate.link)
      ),
      candidates
    );
  }
  if (matches.length === 0) {
    throw new ReferenceNotFound(RESOLVE_MESSAGES.itemNotFound);
  }
  return byId(matches[0].id);
}

/**
 * A rule's data from the catalog's keys (data-model §8): `field`, `field.part`
 * (`place_of_birth.country`) or `field.part#class` (`driving_privileges.issue_date#B`), checked
 * against `documentTypes` (the catalog) and, for a licence class, the licence-class value set of
 * `optionSets`, whose code it takes as the set writes it. An unknown document type, field, part or
 * class is refused with the known ones; so is an image, which rules can't check, a field made of
 * parts without its part, and a per-class part without its class.
 */
export function resolveField(
  documentTypes: RuleDocument[],
  optionSets: OptionSet[],
  documentType: string,
  key: string
): RuleTarget {
  const document = documentTypes.find((entry) => entry.key === documentType.trim());
  if (!document) {
    throw new InvalidReference(
      RESOLVE_MESSAGES.unknownDocumentType(
        documentType.trim(),
        documentTypes.map((entry) => entry.key)
      )
    );
  }
  const [path, licenceClass = null] = splitOnce(key.trim(), '#');
  const [fieldKey, partKey = null] = splitOnce(path, '.');
  const checkable = document.fields.filter((field) => field.kind !== 'image');
  const field = checkable.find((entry) => entry.key === fieldKey);
  if (!field) {
    throw new InvalidReference(
      RESOLVE_MESSAGES.unknownField(
        document.label,
        fieldKey,
        checkable.map((entry) => entry.key)
      )
    );
  }
  const target: RuleTarget = {
    document_type: document.key,
    field: field.key,
    part: null,
    licence_class: null,
  };
  if (field.kind !== 'parts') {
    if (partKey !== null) {
      throw new InvalidReference(RESOLVE_MESSAGES.noParts(field.key));
    }
    if (licenceClass !== null) {
      throw new InvalidReference(RESOLVE_MESSAGES.noClasses(field.key));
    }
    return target;
  }
  const parts = field.parts ?? [];
  const partKeys = parts.map((part) => part.key);
  if (partKey === null) {
    throw new InvalidReference(RESOLVE_MESSAGES.partMissing(field.key, partKeys));
  }
  const part = parts.find((entry) => entry.key === partKey);
  if (!part) {
    throw new InvalidReference(RESOLVE_MESSAGES.unknownPart(field.key, partKey, partKeys));
  }
  target.part = part.key;
  const named = `${field.key}.${part.key}`;
  if (!part.per_licence_class) {
    if (licenceClass !== null) {
      throw new InvalidReference(RESOLVE_MESSAGES.noClasses(named));
    }
    return target;
  }
  const classes = licenceClassesOf(optionSets);
  if (licenceClass === null || licenceClass === '') {
    throw new InvalidReference(RESOLVE_MESSAGES.classMissing(named, classes));
  }
  target.licence_class = classOf(licenceClass, classes);
  return target;
}

/** The value before and after the first `separator`, or the value alone. */
function splitOnce(value: string, separator: string): [string, string?] {
  const index = value.indexOf(separator);
  return index < 0 ? [value] : [value.slice(0, index), value.slice(index + separator.length)];
}

/** The licence-class set's codes, in its order; empty while it isn't known. */
function licenceClassesOf(optionSets: OptionSet[]): string[] {
  const set = optionSets.find((entry) => entry.key === LICENCE_CLASSES_SET);
  return set ? set.options.map((option) => String(option.value)) : [];
}

/**
 * A class as the set writes it, matched ignoring letter case ("be" is BE). Without the set, the
 * class is taken as given and the save's checks judge it.
 */
function classOf(licenceClass: string, classes: string[]): string {
  if (classes.length === 0) {
    return licenceClass;
  }
  const code = classes.find((entry) => entry.toLowerCase() === licenceClass.toLowerCase());
  if (code === undefined) {
    throw new InvalidReference(RESOLVE_MESSAGES.unknownClass(licenceClass, classes));
  }
  return code;
}
