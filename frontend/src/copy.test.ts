// The completeness of the website's copy tables (spec 009, R8, SC-002, V10; data-model "Copy
// table"): every table of a `constants.ts` under `src/` has the same keys and kinds in both
// languages, no empty text, and a German text that differs from the English one unless the word
// is the same in both languages. `tsc` checks the keys too (`defineTexts`); this test also finds
// a table built without it. Node only, no DOM

import { describe, expect, it } from 'vitest';

// The English texts that are the same in German (identifiers, product names and words German
// shares); single characters and punctuation are allowed too (`isEqualInBothLanguages`)
const EQUAL_IN_BOTH_LANGUAGES = new Set([
  'Standard',
  'Status',
  'Details',
  'Test',
  'DE',
  'EN',
  'Konnekt',
  'Optional',
  'optional',
  'Link',
  'Wallet',
  'Agent',
  'Name',
  'Region',
  'serviceBW',
  'EUDI Wallet',
  'Version',
  '/',
  '…',
]);

// Only punctuation, symbols and spaces ("/", " · ", "…")
const PUNCTUATION_ONLY = /^[\p{P}\p{S}\s]*$/u;

type CopyTable = { en: Record<string, unknown>; de: Record<string, unknown> };

const modules = import.meta.glob<Record<string, unknown>>('./**/constants.ts', { eager: true });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** A copy table: a plain object whose own keys are exactly `en` and `de`, both objects. */
function isCopyTable(value: unknown): value is CopyTable {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  return (
    keys.length === 2 &&
    keys[0] === 'de' &&
    keys[1] === 'en' &&
    typeof value.en === 'object' &&
    value.en !== null &&
    typeof value.de === 'object' &&
    value.de !== null
  );
}

function isEqualInBothLanguages(english: string): boolean {
  return (
    EQUAL_IN_BOTH_LANGUAGES.has(english) ||
    [...english].length === 1 ||
    PUNCTUATION_ONLY.test(english)
  );
}

const tables = Object.entries(modules).flatMap(([path, module]) =>
  Object.entries(module)
    .filter((entry): entry is [string, CopyTable] => isCopyTable(entry[1]))
    .map(([name, table]) => ({ name: `${path} ${name}`, table }))
);

describe('the copy tables (R8)', () => {
  it('finds the constants and at least one table (a broken glob fails here)', () => {
    expect(Object.keys(modules)).toContain('./constants.ts');
    expect(tables.length).toBeGreaterThan(0);
  });

  for (const { name, table } of tables) {
    describe(name, () => {
      it('has the same keys in both languages', () => {
        expect(Object.keys(table.de).sort()).toEqual(Object.keys(table.en).sort());
      });

      it('has the same kind of entry under every key', () => {
        for (const key of Object.keys(table.en)) {
          expect(typeof table.de[key], key).toBe(typeof table.en[key]);
        }
      });

      // A function entry is checked by key and kind only: its sentences are tested by its
      // module's own test
      it('has no empty text, and German that differs from the English', () => {
        for (const [key, english] of Object.entries(table.en)) {
          const german = table.de[key];
          if (typeof english !== 'string' || typeof german !== 'string') {
            continue;
          }
          expect(english.trim(), `${key} (en)`).not.toBe('');
          expect(german.trim(), `${key} (de)`).not.toBe('');
          if (!isEqualInBothLanguages(english)) {
            expect(german, `${key} (de)`).not.toBe(english);
          }
        }
      });
    });
  }
});
