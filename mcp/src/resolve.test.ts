import type { BranchInput, GroupItem } from '@connection-portal/api-types/form-connections';
import { MDL, OPTION_SETS, PID, rule, target } from '@connection-portal/rules/testData';
import { describe, expect, it } from 'vitest';

import { config } from './config';
import { approvalLink, connectionLink, ForeignLink, itemLink, variantLink } from './links';
import {
  AmbiguousName,
  InvalidReference,
  ReferenceNotFound,
  resolveConnectionId,
  resolveField,
  resolveItem,
  resolveVariant,
} from './resolve';

const CONNECTION = '3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b';
const OTHER_CONNECTION = '7c6b5a49-3827-4161-8f0e-d9c8b7a6f5e4';
const STANDARD = '11111111-1111-4111-8111-111111111111';
const AMBULANCE = '22222222-2222-4222-8222-222222222222';
const SECOND_AMBULANCE = '33333333-3333-4333-8333-333333333333';
const REQUEST = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';

const GROUP: GroupItem = {
  type: 'group',
  id: 'group-1',
  name: 'Licence',
  mark: null,
  operator: 'and',
  message: null,
  items: [
    rule(2, target('mdl', 'driving_privileges', 'classes'), null, '', 'Holds class B'),
    rule(3, target('mdl', 'driving_privileges', 'issue_date', 'B'), null, '', 'Age'),
  ],
};

function branch(
  id: string,
  name: string,
  origin: BranchInput['origin'],
  items: BranchInput['items'] = []
): BranchInput {
  return { id, name, description: null, origin, operator: 'and', operator_mark: null, items };
}

const STANDARD_BRANCH = branch(STANDARD, 'Standard', 'main', [
  rule(1, target('pid', 'birthdate'), null, '', 'Age'),
  GROUP,
  { ...rule(4, null, null, '', 'Old rule'), mark: 'removed' },
]);
const AMBULANCE_BRANCH = branch(AMBULANCE, 'Ambulance', 'based');
const BRANCHES = [STANDARD_BRANCH, AMBULANCE_BRANCH];

/** The refusal `run` throws */
function refusalOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('Nothing was refused');
}

describe('resolveConnectionId', () => {
  it('takes a UUID and any link that names the connection', () => {
    expect(resolveConnectionId(CONNECTION)).toBe(CONNECTION);
    expect(resolveConnectionId(connectionLink(CONNECTION))).toBe(CONNECTION);
    expect(resolveConnectionId(variantLink(CONNECTION, STANDARD))).toBe(CONNECTION);
    expect(resolveConnectionId(itemLink(CONNECTION, STANDARD, 'rule-1'))).toBe(CONNECTION);
  });

  it('refuses an approval link, a name and an item id', () => {
    for (const reference of [approvalLink(REQUEST), 'Parking permit', 'rule-1']) {
      expect(() => resolveConnectionId(reference)).toThrow(InvalidReference);
    }
    expect(refusalOf(() => resolveConnectionId(approvalLink(REQUEST)))).toMatchObject({
      code: 'validation',
    });
  });

  it('refuses a link to another address', () => {
    expect(() =>
      resolveConnectionId(`https://elsewhere.example.org/form-connections/${CONNECTION}`)
    ).toThrow(ForeignLink);
  });
});

describe('resolveVariant', () => {
  it('finds a variant by its id, in any letter case', () => {
    expect(resolveVariant(BRANCHES, AMBULANCE, CONNECTION)).toBe(AMBULANCE_BRANCH);
    expect(resolveVariant(BRANCHES, AMBULANCE.toUpperCase(), CONNECTION)).toBe(AMBULANCE_BRANCH);
  });

  it('finds a variant by its link, or an item link of it', () => {
    expect(resolveVariant(BRANCHES, variantLink(CONNECTION, AMBULANCE), CONNECTION)).toBe(
      AMBULANCE_BRANCH
    );
    expect(resolveVariant(BRANCHES, itemLink(CONNECTION, STANDARD, 'rule-1'), CONNECTION)).toBe(
      STANDARD_BRANCH
    );
  });

  it('finds a variant by its name, ignoring letter case and outer spaces', () => {
    expect(resolveVariant(BRANCHES, 'Standard', CONNECTION)).toBe(STANDARD_BRANCH);
    expect(resolveVariant(BRANCHES, '  standard ', CONNECTION)).toBe(STANDARD_BRANCH);
    expect(resolveVariant(BRANCHES, 'AMBULANCE', CONNECTION)).toBe(AMBULANCE_BRANCH);
  });

  it('finds the main variant by its new name once renamed, and no longer as "Standard"', () => {
    const renamed = [{ ...STANDARD_BRANCH, name: 'Residents' }, AMBULANCE_BRANCH];
    expect(resolveVariant(renamed, 'residents', CONNECTION)).toBe(renamed[0]);
    expect(() => resolveVariant(renamed, 'Standard', CONNECTION)).toThrow(ReferenceNotFound);
  });

  it('refuses a name that several variants have, with them and their links', () => {
    const second = branch(SECOND_AMBULANCE, ' ambulance ', 'empty');
    const error = refusalOf(() => resolveVariant([...BRANCHES, second], 'Ambulance', CONNECTION));
    expect(error).toBeInstanceOf(AmbiguousName);
    const first = variantLink(CONNECTION, AMBULANCE);
    const other = variantLink(CONNECTION, SECOND_AMBULANCE);
    expect(error).toMatchObject({
      code: 'ambiguous_name',
      message: `Two variants are called 'Ambulance'. Name one by its link: ${first}, ${other}`,
      candidates: [
        { id: AMBULANCE, name: 'Ambulance', link: first },
        { id: SECOND_AMBULANCE, name: ' ambulance ', link: other },
      ],
    });
  });

  it('refuses a variant that no longer exists, by id, link or name', () => {
    const gone = '44444444-4444-4444-8444-444444444444';
    for (const reference of [gone, variantLink(CONNECTION, gone), 'Night shift']) {
      const error = refusalOf(() => resolveVariant(BRANCHES, reference, CONNECTION));
      expect(error).toBeInstanceOf(ReferenceNotFound);
      expect(error).toMatchObject({
        code: 'not_found',
        message: 'This variant no longer exists.',
      });
    }
  });

  it('refuses a link that names another connection', () => {
    const error = refusalOf(() =>
      resolveVariant(BRANCHES, variantLink(OTHER_CONNECTION, STANDARD), CONNECTION)
    );
    expect(error).toMatchObject({
      code: 'not_found',
      message: 'This link names another connection.',
    });
  });

  it('refuses a connection link and an approval link, which name no variant', () => {
    expect(() => resolveVariant(BRANCHES, connectionLink(CONNECTION), CONNECTION)).toThrow(
      InvalidReference
    );
    expect(() => resolveVariant(BRANCHES, approvalLink(REQUEST), CONNECTION)).toThrow(
      InvalidReference
    );
  });

  it('refuses a link to another address', () => {
    const foreign = `https://elsewhere.example.org/form-connections/${CONNECTION}/edit?variant=${STANDARD}`;
    expect(() => resolveVariant(BRANCHES, foreign, CONNECTION)).toThrow(ForeignLink);
  });

  it('reads links from PORTAL_URL', () => {
    expect(variantLink(CONNECTION, STANDARD).startsWith(config.portalUrl)).toBe(true);
  });
});

describe('resolveItem', () => {
  it('finds a rule or group by its id, at any level, with where it sits', () => {
    expect(resolveItem(STANDARD_BRANCH, 'rule-1', CONNECTION)).toMatchObject({
      item: { id: 'rule-1' },
      parentId: null,
      depth: 0,
    });
    expect(resolveItem(STANDARD_BRANCH, 'group-1', CONNECTION).item).toBe(GROUP);
    expect(resolveItem(STANDARD_BRANCH, 'rule-3', CONNECTION)).toMatchObject({
      item: { id: 'rule-3' },
      parentId: 'group-1',
      index: 1,
      depth: 1,
    });
  });

  it('finds an item by its link', () => {
    expect(
      resolveItem(STANDARD_BRANCH, itemLink(CONNECTION, STANDARD, 'rule-2'), CONNECTION).item.id
    ).toBe('rule-2');
  });

  it('finds an item by its name, folded, removed items included', () => {
    expect(resolveItem(STANDARD_BRANCH, 'holds CLASS b ', CONNECTION).item.id).toBe('rule-2');
    expect(resolveItem(STANDARD_BRANCH, 'licence', CONNECTION).item.id).toBe('group-1');
    expect(resolveItem(STANDARD_BRANCH, 'Old rule', CONNECTION).item.id).toBe('rule-4');
  });

  it('refuses a name that several items have, with them and their links', () => {
    const error = refusalOf(() => resolveItem(STANDARD_BRANCH, 'age', CONNECTION));
    expect(error).toBeInstanceOf(AmbiguousName);
    const rule1 = itemLink(CONNECTION, STANDARD, 'rule-1');
    const rule3 = itemLink(CONNECTION, STANDARD, 'rule-3');
    expect(error).toMatchObject({
      code: 'ambiguous_name',
      message: `Two rules or groups are called 'age'. Name one by its link: ${rule1}, ${rule3}`,
      candidates: [
        { id: 'rule-1', type: 'rule', name: 'Age', link: rule1 },
        { id: 'rule-3', type: 'rule', name: 'Age', link: rule3 },
      ],
    });
  });

  it('refuses an item that no longer exists, by id, link or name', () => {
    for (const reference of ['rule-9', itemLink(CONNECTION, STANDARD, 'group-7'), 'Residency']) {
      expect(refusalOf(() => resolveItem(STANDARD_BRANCH, reference, CONNECTION))).toMatchObject({
        code: 'not_found',
        message: 'This rule or group no longer exists.',
      });
    }
    // A UUID names no item
    expect(() => resolveItem(STANDARD_BRANCH, STANDARD, CONNECTION)).toThrow(ReferenceNotFound);
  });

  it('refuses a link that names another connection, or another variant', () => {
    expect(
      refusalOf(() =>
        resolveItem(STANDARD_BRANCH, itemLink(OTHER_CONNECTION, STANDARD, 'rule-1'), CONNECTION)
      )
    ).toMatchObject({ code: 'not_found', message: 'This link names another connection.' });
    expect(
      refusalOf(() =>
        resolveItem(STANDARD_BRANCH, itemLink(CONNECTION, AMBULANCE, 'rule-1'), CONNECTION)
      )
    ).toMatchObject({ code: 'not_found', message: 'This link names another variant.' });
  });

  it('refuses a link that names no item', () => {
    expect(() =>
      resolveItem(STANDARD_BRANCH, variantLink(CONNECTION, STANDARD), CONNECTION)
    ).toThrow(InvalidReference);
  });
});

describe('links to something deleted since (FR-031)', () => {
  it("answers not_found for a deleted variant's link and its items' links, never another variant", () => {
    const remaining = [STANDARD_BRANCH];
    for (const reference of [
      variantLink(CONNECTION, AMBULANCE),
      itemLink(CONNECTION, AMBULANCE, 'rule-1'),
    ]) {
      const error = refusalOf(() => resolveVariant(remaining, reference, CONNECTION));
      expect(error).toBeInstanceOf(ReferenceNotFound);
      expect(error).toMatchObject({ code: 'not_found', message: 'This variant no longer exists.' });
    }
  });

  it("answers not_found for a deleted rule's or group's link, never another item", () => {
    const linked = itemLink(CONNECTION, STANDARD, 'rule-1');
    expect(resolveItem(STANDARD_BRANCH, linked, CONNECTION).item.id).toBe('rule-1');
    // rule-1 deleted; rule-3 is still called "Age" as rule-1 was
    const withoutRule = { ...STANDARD_BRANCH, items: STANDARD_BRANCH.items.slice(1) };
    // The group deleted with its members
    const withoutGroup = {
      ...STANDARD_BRANCH,
      items: STANDARD_BRANCH.items.filter((item) => item.id !== 'group-1'),
    };
    for (const [branch, reference] of [
      [withoutRule, linked],
      [withoutGroup, itemLink(CONNECTION, STANDARD, 'group-1')],
      [withoutGroup, itemLink(CONNECTION, STANDARD, 'rule-2')],
    ] as const) {
      const error = refusalOf(() => resolveItem(branch, reference, CONNECTION));
      expect(error).toBeInstanceOf(ReferenceNotFound);
      expect(error).toMatchObject({
        code: 'not_found',
        message: 'This rule or group no longer exists.',
      });
    }
  });
});

describe('resolveField', () => {
  const CATALOG = [PID, MDL];
  const resolve = (documentType: string, key: string) =>
    resolveField(CATALOG, OPTION_SETS, documentType, key);

  it('resolves a field', () => {
    expect(resolve('pid', 'birthdate')).toEqual(target('pid', 'birthdate'));
  });

  it('resolves a part', () => {
    expect(resolve('pid', 'place_of_birth.country')).toEqual(
      target('pid', 'place_of_birth', 'country')
    );
    expect(resolve('mdl', 'driving_privileges.classes')).toEqual(
      target('mdl', 'driving_privileges', 'classes')
    );
  });

  it('resolves a licence class’s date, with the class as the set writes it', () => {
    expect(resolve('mdl', 'driving_privileges.issue_date#B')).toEqual(
      target('mdl', 'driving_privileges', 'issue_date', 'B')
    );
    expect(resolve('mdl', ' driving_privileges.expiry_date#be ')).toEqual(
      target('mdl', 'driving_privileges', 'expiry_date', 'BE')
    );
  });

  it('refuses an unknown document type with the known ones', () => {
    expect(refusalOf(() => resolve('passport', 'birthdate'))).toMatchObject({
      code: 'validation',
      message: "The catalog has no document type 'passport'. Its document types: pid, mdl.",
    });
  });

  it('refuses an unknown field, and an image, with the fields rules can check', () => {
    const error = refusalOf(() => resolve('mdl', 'shoe_size'));
    expect(error).toBeInstanceOf(InvalidReference);
    const message = (error as Error).message;
    expect(message).toMatch(/^Driving licence has no field 'shoe_size' that rules can check\./);
    expect(message).toContain('birth_date, issue_date, expiry_date, driving_privileges');
    expect(message).not.toContain('portrait');
    expect(() => resolve('mdl', 'portrait')).toThrow(InvalidReference);
  });

  it('refuses a field made of parts without its part, and an unknown part, with the parts', () => {
    expect(refusalOf(() => resolve('pid', 'place_of_birth'))).toMatchObject({
      message:
        "'place_of_birth' is made of parts: name one as place_of_birth.<part>. Its parts: country, region, locality.",
    });
    expect(refusalOf(() => resolve('pid', 'place_of_birth.planet'))).toMatchObject({
      message: "'place_of_birth' has no part 'planet'. Its parts: country, region, locality.",
    });
    expect(() => resolve('pid', 'birthdate.year')).toThrow("'birthdate' has no parts.");
  });

  it('refuses a per-class part without its class, and an unknown class, with the classes', () => {
    expect(refusalOf(() => resolve('mdl', 'driving_privileges.issue_date'))).toMatchObject({
      message:
        "'driving_privileges.issue_date' is checked per licence class: name one as driving_privileges.issue_date#<class>. The licence classes: A, B, BE, C.",
    });
    expect(refusalOf(() => resolve('mdl', 'driving_privileges.issue_date#Z'))).toMatchObject({
      message: "There is no licence class 'Z'. The licence classes: A, B, BE, C.",
    });
  });

  it('refuses a class on data that isn’t checked per licence class', () => {
    expect(() => resolve('mdl', 'driving_privileges.classes#B')).toThrow(InvalidReference);
    expect(() => resolve('pid', 'birthdate#B')).toThrow(InvalidReference);
  });

  it('takes the class as given while the licence classes aren’t known', () => {
    expect(resolveField(CATALOG, [], 'mdl', 'driving_privileges.issue_date#B')).toEqual(
      target('mdl', 'driving_privileges', 'issue_date', 'B')
    );
  });
});
