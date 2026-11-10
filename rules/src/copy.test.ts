/// <reference types="vite/client" />
// (Vite's `import.meta.glob` types: `rules/`'s tsconfig has only Node's, and Vitest runs on Vite)

// The completeness of the rules logic's copy tables (spec 009, R8, SC-002, V10; data-model "Copy
// table"): every exported table of a module under `src/` has the same keys and kinds in both
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
  '/',
  '…',
  // The redundant finding's hidden kind text (glossary §2: "redundant")
  'Redundant:',
]);

// Only punctuation, symbols and spaces ("/", " · ", "…")
const PUNCTUATION_ONLY = /^[\p{P}\p{S}\s]*$/u;

// More modules than this means the glob reached the package's subfolders, not just a few files
const MIN_MODULES = 20;

// At least one table, so that a glob that finds none fails as the frontend's does
const MIN_TABLES = 1;

// The languages' own names: each language's name in that language, not a translation
const NOT_TABLES = new Set(['./language.ts languageNames']);

type Column = Record<string, unknown>;
type CopyTable = { en: Column; de: Column };

const modules = import.meta.glob<Record<string, unknown>>(
  ['./**/*.ts', '!./**/*.test.ts', '!./testData.ts', '!./checks/fixtures/**'],
  { eager: true }
);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * A copy table: a plain object whose own keys are exactly `en` and `de`, both objects, or both
 * strings (a table of one text, such as `DATE_OF_BIRTH_RULE_LABEL`).
 */
function isCopyTable(value: unknown): value is { en: unknown; de: unknown } {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value).sort();
  const columns = [value.en, value.de];
  return (
    keys.length === 2 &&
    keys[0] === 'de' &&
    keys[1] === 'en' &&
    (columns.every((column) => typeof column === 'object' && column !== null) ||
      columns.every((column) => typeof column === 'string'))
  );
}

/**
 * A column with its nested columns' entries under dotted keys (`OPERATOR_LABELS`' `date.on`), so
 * that every text of a table is checked; a column that is one text is the entry `text`.
 */
function flatColumn(column: unknown, path = ''): Column {
  if (!isPlainObject(column)) {
    return { [path || 'text']: column };
  }
  return Object.fromEntries(
    Object.entries(column).flatMap(([key, value]) =>
      Object.entries(flatColumn(value, path ? `${path}.${key}` : key))
    )
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
    .filter(([name, value]) => isCopyTable(value) && !NOT_TABLES.has(`${path} ${name}`))
    .map(([name, value]) => {
      const { en, de } = value as { en: unknown; de: unknown };
      const table: CopyTable = { en: flatColumn(en), de: flatColumn(de) };
      return { name: `${path} ${name}`, table };
    })
);

describe('the copy tables (R8)', () => {
  it('finds the modules (a broken glob fails here)', () => {
    const paths = Object.keys(modules);
    expect(paths).toContain('./language.ts');
    expect(paths).toContain('./checks/findingMessages.ts');
    expect(paths.length).toBeGreaterThan(MIN_MODULES);
    expect(paths.filter((path) => path.endsWith('.test.ts'))).toEqual([]);
  });

  it(`finds the tables (${tables.length})`, () => {
    expect(tables.length).toBeGreaterThanOrEqual(MIN_TABLES);
  });

  it('does not take the languages’ names for a table', () => {
    expect(tables.map(({ name }) => name)).not.toContain('./language.ts languageNames');
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
