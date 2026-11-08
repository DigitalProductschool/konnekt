import { describe, expect, it } from 'vitest';

import { config } from './config';
import {
  approvalLink,
  connectionLink,
  FOREIGN_LINK_MESSAGE,
  ForeignLink,
  InvalidLink,
  itemLink,
  parseReference,
  ReferenceRefusal,
  variantLink,
} from './links';

const PORTAL = 'https://portal.example.org';
const CONNECTION = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const VARIANT = '9e8d7c6b-5a49-4382-a1b0-c9d8e7f6a5b4';
const REQUEST = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

describe('links', () => {
  it('builds every link from PORTAL_URL, with identifiers only', () => {
    expect(connectionLink(CONNECTION, PORTAL)).toBe(`${PORTAL}/form-connections/${CONNECTION}`);
    expect(variantLink(CONNECTION, VARIANT, PORTAL)).toBe(
      `${PORTAL}/form-connections/${CONNECTION}/edit?step=rules&variant=${VARIANT}`
    );
    expect(itemLink(CONNECTION, VARIANT, 'rule-12', PORTAL)).toBe(
      `${PORTAL}/form-connections/${CONNECTION}/edit?step=rules&variant=${VARIANT}&item=rule-12`
    );
    expect(approvalLink(REQUEST, PORTAL)).toBe(`${PORTAL}/approvals/${REQUEST}`);
  });

  it('takes PORTAL_URL from the settings by default', () => {
    expect(connectionLink(CONNECTION)).toBe(`${config.portalUrl}/form-connections/${CONNECTION}`);
  });
});

describe('parseReference', () => {
  it('reads a connection link, with or without /edit and a trailing slash', () => {
    const connection = { kind: 'link', connectionId: CONNECTION };
    expect(parseReference(connectionLink(CONNECTION, PORTAL), PORTAL)).toEqual(connection);
    expect(parseReference(`${PORTAL}/form-connections/${CONNECTION}/`, PORTAL)).toEqual(connection);
    expect(parseReference(`${PORTAL}/form-connections/${CONNECTION}/edit`, PORTAL)).toEqual(
      connection
    );
    expect(parseReference(`${PORTAL}/form-connections/${CONNECTION}/edit/`, PORTAL)).toEqual(
      connection
    );
  });

  it('reads a variant link and an item link', () => {
    expect(parseReference(variantLink(CONNECTION, VARIANT, PORTAL), PORTAL)).toEqual({
      kind: 'link',
      connectionId: CONNECTION,
      variantId: VARIANT,
    });
    expect(parseReference(itemLink(CONNECTION, VARIANT, 'group-3', PORTAL), PORTAL)).toEqual({
      kind: 'link',
      connectionId: CONNECTION,
      variantId: VARIANT,
      itemId: 'group-3',
    });
  });

  it('reads an approval link', () => {
    expect(parseReference(approvalLink(REQUEST, PORTAL), PORTAL)).toEqual({
      kind: 'approval_link',
      requestId: REQUEST,
    });
  });

  it('ignores outer spaces and the order of the query, and lower-cases UUIDs', () => {
    const link = ` ${PORTAL}/form-connections/${CONNECTION.toUpperCase()}/edit?item=rule-1&variant=${VARIANT}&step=rules `;
    expect(parseReference(link, PORTAL)).toEqual({
      kind: 'link',
      connectionId: CONNECTION,
      variantId: VARIANT,
      itemId: 'rule-1',
    });
  });

  it('refuses a link to another origin', () => {
    const foreign = `https://elsewhere.example.org/form-connections/${CONNECTION}`;
    expect(() => parseReference(foreign, PORTAL)).toThrow(ForeignLink);
    expect(() => parseReference(foreign, PORTAL)).toThrow(FOREIGN_LINK_MESSAGE);
    expect(() =>
      parseReference(`https://portal.example.org:8443/form-connections/${CONNECTION}`, PORTAL)
    ).toThrow(ForeignLink);
  });

  it('refuses an http link to an https portal, and the other way round', () => {
    expect(() =>
      parseReference(`http://portal.example.org/form-connections/${CONNECTION}`, PORTAL)
    ).toThrow(ForeignLink);
    expect(() =>
      parseReference(
        `https://localhost:5173/form-connections/${CONNECTION}`,
        'http://localhost:5173'
      )
    ).toThrow(ForeignLink);
  });

  it('gives the foreign link the tool error code and message', () => {
    try {
      parseReference('https://elsewhere.example.org/', PORTAL);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ReferenceRefusal);
      expect(error).toMatchObject({
        code: 'foreign_link',
        message: "This link doesn't belong to Konnekt.",
      });
    }
  });

  it('refuses a link of the portal that names nothing, or names it malformed', () => {
    for (const link of [
      `${PORTAL}/`,
      `${PORTAL}/form-connections`,
      `${PORTAL}/form-connections/not-a-uuid`,
      `${PORTAL}/form-connections/${CONNECTION}/details`,
      `${PORTAL}/form-connections/${CONNECTION}/edit?variant=Standard`,
      `${PORTAL}/form-connections/${CONNECTION}/edit?variant=${VARIANT}&item=Rule%2001`,
      `${PORTAL}/approvals/12`,
    ]) {
      expect(() => parseReference(link, PORTAL)).toThrow(InvalidLink);
    }
  });

  it('reads the links of a portal served under a path', () => {
    const portal = 'https://example.org/portal';
    expect(parseReference(connectionLink(CONNECTION, portal), portal)).toEqual({
      kind: 'link',
      connectionId: CONNECTION,
    });
    expect(() =>
      parseReference(`https://example.org/form-connections/${CONNECTION}`, portal)
    ).toThrow(InvalidLink);
  });

  it('takes a bare UUID as an id', () => {
    expect(parseReference(CONNECTION, PORTAL)).toEqual({ kind: 'uuid', id: CONNECTION });
    expect(parseReference(` ${VARIANT.toUpperCase()} `, PORTAL)).toEqual({
      kind: 'uuid',
      id: VARIANT,
    });
  });

  it('takes rule-n and group-n as item ids', () => {
    expect(parseReference('rule-12', PORTAL)).toEqual({ kind: 'item_id', id: 'rule-12' });
    expect(parseReference('group-3', PORTAL)).toEqual({ kind: 'item_id', id: 'group-3' });
  });

  it('takes anything else as a name, spaces inside kept', () => {
    expect(parseReference('  Ambulance service  ', PORTAL)).toEqual({
      kind: 'name',
      name: 'Ambulance service',
    });
    expect(parseReference('Rule 12', PORTAL)).toEqual({ kind: 'name', name: 'Rule 12' });
    expect(parseReference('rule-0', PORTAL)).toEqual({ kind: 'name', name: 'rule-0' });
    expect(parseReference('Age: 18 or older', PORTAL)).toEqual({
      kind: 'name',
      name: 'Age: 18 or older',
    });
  });
});
