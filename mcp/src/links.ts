// Konnekt's links (research R11; data-model §7): built from `PORTAL_URL`, and parsed
// wherever a tool takes a reference (FR-019, FR-030). Pure apart from reading the settings: the
// functions take the portal's URL as an optional last argument, which tests pass
import { GROUP_ID_PATTERN, RULE_ID_PATTERN } from '@connection-portal/rules/constants';

import { config } from './config';

/** The tool error codes a reference can be refused with (contracts/mcp-tools.md) */
export type RefusalCode = 'not_found' | 'validation' | 'ambiguous_name' | 'foreign_link';

/**
 * A reference that a tool can't use, with the tool error's code and message; the registry (T029)
 * answers it as a tool error
 */
export class ReferenceRefusal extends Error {
  readonly code: RefusalCode;

  constructor(code: RefusalCode, message: string) {
    super(message);
    this.name = 'ReferenceRefusal';
    this.code = code;
  }
}

export const FOREIGN_LINK_MESSAGE = "This link doesn't belong to Konnekt.";
export const INVALID_LINK_MESSAGE =
  "This link doesn't name a connection, variant, rule or group in Konnekt.";

/** A link to another address than `PORTAL_URL`'s (FR-030) */
export class ForeignLink extends ReferenceRefusal {
  constructor() {
    super('foreign_link', FOREIGN_LINK_MESSAGE);
    this.name = 'ForeignLink';
  }
}

/** A Konnekt link that names nothing a tool takes, or names it malformed */
export class InvalidLink extends ReferenceRefusal {
  constructor() {
    super('validation', INVALID_LINK_MESSAGE);
    this.name = 'InvalidLink';
  }
}

/** What a tool's reference names (data-model §8) */
export type Reference =
  | { kind: 'uuid'; id: string }
  | { kind: 'item_id'; id: string }
  | { kind: 'name'; name: string }
  | { kind: 'link'; connectionId: string; variantId?: string; itemId?: string }
  | { kind: 'approval_link'; requestId: string };

/** Any UUID, as the backend writes it (`str(uuid.uuid4())`); compared lower case */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A value with a scheme followed by `//` is taken as a link: a name such as "Age: 18 or older"
 * also parses as a URL (scheme `age:`), and stays a name
 */
const LINK_PATTERN = /^[a-z][a-z0-9+.-]*:\/\//i;

const CONNECTION_PATH = /^\/form-connections\/([^/]+)(?:\/edit)?\/?$/;
const APPROVAL_PATH = /^\/approvals\/([^/]+)\/?$/;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isItemId(value: string): boolean {
  return RULE_ID_PATTERN.test(value) || GROUP_ID_PATTERN.test(value);
}

/** `{PORTAL_URL}/form-connections/{id}` */
export function connectionLink(id: string, portalUrl = config.portalUrl): string {
  return `${portalUrl}/form-connections/${id}`;
}

/** `{PORTAL_URL}/form-connections/{id}/edit?step=rules&variant={variantId}` */
export function variantLink(
  connectionId: string,
  variantId: string,
  portalUrl = config.portalUrl
): string {
  return `${connectionLink(connectionId, portalUrl)}/edit?step=rules&variant=${variantId}`;
}

/** The variant's link with `&item={itemId}` */
export function itemLink(
  connectionId: string,
  variantId: string,
  itemId: string,
  portalUrl = config.portalUrl
): string {
  return `${variantLink(connectionId, variantId, portalUrl)}&item=${itemId}`;
}

/** `{PORTAL_URL}/approvals/{requestId}` */
export function approvalLink(requestId: string, portalUrl = config.portalUrl): string {
  return `${portalUrl}/approvals/${requestId}`;
}

/**
 * What a tool's reference names (research R11; data-model §8), from the value as given, outer
 * spaces ignored:
 * - a link (an absolute URL): it must have `PORTAL_URL`'s origin, else `ForeignLink` (FR-030); its
 *   path `/form-connections/{uuid}` (with or without `/edit`, a trailing slash tolerated) and its
 *   query's `variant` (a UUID) and `item` (`rule-n`, `group-n`) give the parts, and
 *   `/approvals/{uuid}` an approval request. Any other path, or a malformed part, is an
 *   `InvalidLink`;
 * - a UUID is an id, `rule-n` / `group-n` an item id;
 * - anything else is a name.
 *
 * UUIDs come back lower case, as the backend writes them.
 */
export function parseReference(value: string, portalUrl = config.portalUrl): Reference {
  const trimmed = value.trim();
  if (isUuid(trimmed)) {
    return { kind: 'uuid', id: trimmed.toLowerCase() };
  }
  if (isItemId(trimmed)) {
    return { kind: 'item_id', id: trimmed };
  }
  const url = LINK_PATTERN.test(trimmed) ? urlOf(trimmed) : null;
  return url ? linkReference(url, new URL(portalUrl)) : { kind: 'name', name: trimmed };
}

function urlOf(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function linkReference(url: URL, portal: URL): Reference {
  if (url.origin !== portal.origin) {
    throw new ForeignLink();
  }
  // A portal served under a path, such as https://example.org/portal, prefixes its routes
  const base = portal.pathname.replace(/\/+$/, '');
  if (!url.pathname.startsWith(`${base}/`)) {
    throw new InvalidLink();
  }
  const path = url.pathname.slice(base.length);
  const approval = APPROVAL_PATH.exec(path);
  if (approval) {
    return { kind: 'approval_link', requestId: uuidOf(approval[1]) };
  }
  const connection = CONNECTION_PATH.exec(path);
  if (!connection) {
    throw new InvalidLink();
  }
  const reference: Reference = { kind: 'link', connectionId: uuidOf(connection[1]) };
  const variant = url.searchParams.get('variant');
  if (variant !== null) {
    reference.variantId = uuidOf(variant);
  }
  const item = url.searchParams.get('item');
  if (item !== null) {
    if (!isItemId(item)) {
      throw new InvalidLink();
    }
    reference.itemId = item;
  }
  return reference;
}

function uuidOf(value: string): string {
  if (!isUuid(value)) {
    throw new InvalidLink();
  }
  return value.toLowerCase();
}
