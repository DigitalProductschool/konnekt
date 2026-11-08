import { describe, expect, it } from 'vitest';

import { CASE_FOLDING } from './caseFolding';
import vectors from './fixtures/evaluator-vectors.json';
import { normalisedText } from './text';
import { decideText, textHolds, textTheory } from './textTheory';
import type { Literal, TextOp, TextTest, Variable, Verdict } from './types';

/** The part of a `rule_outcomes` vector that a text literal replays */
interface OutcomeVector {
  condition: { match_case?: boolean; operator: string; value?: string };
  description: string;
  kind: string;
  outcome: string;
  target: { document_type: string; field: string; part: string | null };
  value: unknown;
}

/** A citizen's text as the evaluator reads it, with letter case and without */
interface Forms {
  respecting: string;
  ignoring: string;
}

/** The API's text operators as the literals' tests, as `literals.ts` maps them */
const OPS: Record<string, TextOp> = {
  equal_to: 'eq',
  not_equal_to: 'ne',
  contains: 'contains',
  not_contains: 'not_contains',
};

const TEXT_OUTCOMES = (vectors.rule_outcomes as OutcomeVector[]).filter(
  (vector) => vector.kind === 'text' && vector.outcome !== 'not_checked'
);

/** "Personal ID – City or town", the field of the edge cases */
const CITY: Variable = { key: 'pid.address_locality', kind: 'text', multiple: false, values: [] };

/** 2026-10-28 as a day number, which the text theory doesn't read */
const TODAY = 739917;

/** Letter case counts */
const RESPECTING = true;

/** Letter case doesn't count */
const IGNORING = false;

/** The separators the theory tries first, every one of them in a single text */
const ASCII_SEPARATORS = '-0123456789_.,:!?#+*/|~^@&%$';

/** The rules' texts of the seeded comparison: a, A, b, ß, ẞ, s and S */
const ALPHABET = ['a', 'A', 'b', '\u{df}', '\u{1e9e}', 's', 'S'];

/** The citizens' texts of the seeded comparison: the rules' letters and the first separator */
const APPLICANT_ALPHABET = [...ALPHABET, '-'];

/** A literal as `literals.ts` builds it, with the rule's text normalised as the evaluator does */
function literal(op: TextOp, text: string, matchCase: boolean, negated = false): Literal<TextTest> {
  return {
    variable: CITY.key,
    test: { kind: 'text', op, text: normalisedText(text, matchCase), matchCase },
    negated,
  };
}

const eq = (text: string, matchCase: boolean) => literal('eq', text, matchCase);
const ne = (text: string, matchCase: boolean) => literal('ne', text, matchCase);
const contains = (text: string, matchCase: boolean) => literal('contains', text, matchCase);
const notContains = (text: string, matchCase: boolean) => literal('not_contains', text, matchCase);

/** The literal's negation: the same test with `negated` flipped */
function not(of: Literal<TextTest>): Literal<TextTest> {
  return { ...of, negated: !of.negated };
}

/**
 * The verdict, once a witness is re-checked: a text as delivered, in the case-respecting form and
 * not empty, that `textHolds()` accepts for every literal
 */
function verdictOf(literals: Literal<TextTest>[]): Verdict {
  const answer = decideText(literals);
  if (answer.verdict === 'sat') {
    const { witness } = answer;
    expect(witness).not.toBe('');
    expect(normalisedText(witness, true)).toBe(witness);
    expect(literals.every((each) => textHolds(each, witness))).toBe(true);
  }
  return answer.verdict;
}

/** The witness, or null when the literals can't be met or the theory can't tell */
function witnessOf(literals: Literal<TextTest>[]): string | null {
  expect(verdictOf(literals)).toBe('sat');
  const answer = decideText(literals);
  return answer.verdict === 'sat' ? answer.witness : null;
}

/** Whether whoever meets `first` meets `second`: the one without the other can't be met */
function implies(first: Literal<TextTest>, second: Literal<TextTest>): boolean {
  return verdictOf([first, not(second)]) === 'unsat';
}

/** Whether the two hold for the same texts */
function sameCheck(first: Literal<TextTest>, second: Literal<TextTest>): boolean {
  return implies(first, second) && implies(second, first);
}

/** A seeded generator of numbers in [0, 1) (mulberry32), so that a failure can be replayed */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** One of `items`, at random */
function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

/** Every text of one to `longest` characters of `alphabet` */
function textsUpTo(alphabet: readonly string[], longest: number): string[] {
  const texts: string[] = [];
  let previous = [''];
  for (let length = 1; length <= longest; length += 1) {
    previous = previous.flatMap((text) => alphabet.map((character) => text + character));
    texts.push(...previous);
  }
  return texts;
}

/** `_text_holds()` on a citizen's text normalised beforehand, for the seeded comparison */
function holdsOn(literal: Literal<TextTest>, forms: Forms): boolean {
  const { op, text, matchCase } = literal.test;
  const value = matchCase ? forms.respecting : forms.ignoring;
  const met = {
    eq: value === text,
    ne: value !== text,
    contains: value.includes(text),
    not_contains: !value.includes(text),
  }[op];
  return met !== literal.negated;
}

/** Whether the literals mix letter-case settings with "contains" or "doesn't contain" */
function mixesWithContains(literals: readonly Literal<TextTest>[]): boolean {
  const settings = new Set(literals.map((each) => each.test.matchCase));
  return (
    settings.size === 2 &&
    literals.some((each) => each.test.op === 'contains' || each.test.op === 'not_contains')
  );
}

/** The text a rule reads of the delivered value: a part of the place of birth, or the field */
function deliveredText(vector: OutcomeVector): string {
  const { part } = vector.target;
  const value = part === null ? vector.value : (vector.value as Record<string, unknown>)[part];
  if (typeof value !== 'string') {
    throw new Error(`Not a text: ${JSON.stringify(vector.value)}`);
  }
  return value;
}

describe('decideText', () => {
  it('meets no literals with "-"', () => {
    expect(decideText([])).toEqual({ verdict: 'sat', witness: '-' });
  });

  describe('EC "Letter case"', () => {
    it('"is equal to Stuttgart" and "is equal to STUTTGART" are the same check ignoring letter case', () => {
      expect(sameCheck(eq('Stuttgart', IGNORING), eq('STUTTGART', IGNORING))).toBe(true);
      expect(witnessOf([eq('Stuttgart', IGNORING), eq('STUTTGART', IGNORING)])).toBe('stuttgart');
    });

    it('they can’t be met together when both respect letter case', () => {
      expect(verdictOf([eq('Stuttgart', RESPECTING), eq('STUTTGART', RESPECTING)])).toBe('unsat');
    });

    it('the first implies the second when only the first respects letter case', () => {
      expect(implies(eq('Stuttgart', RESPECTING), eq('STUTTGART', IGNORING))).toBe(true);
      expect(implies(eq('STUTTGART', IGNORING), eq('Stuttgart', RESPECTING))).toBe(false);
      expect(witnessOf([eq('STUTTGART', IGNORING), not(eq('Stuttgart', RESPECTING))])).toBe(
        'stuttgart'
      );
    });

    it('"contains straße" and "contains STRASSE" are the same check ignoring letter case', () => {
      expect(sameCheck(contains('stra\u{df}e', IGNORING), contains('STRASSE', IGNORING))).toBe(
        true
      );
      expect(sameCheck(contains('STRA\u{1e9e}E', IGNORING), contains('strasse', IGNORING))).toBe(
        true
      );
    });

    it('but not respecting letter case', () => {
      const literals = [contains('stra\u{df}e', RESPECTING), not(contains('STRASSE', RESPECTING))];
      expect(witnessOf(literals)).toBe('stra\u{df}e');
    });
  });

  describe('EC "Text inside other text"', () => {
    it.each([RESPECTING, IGNORING])(
      '"is equal to Stuttgart" and "doesn’t contain gart" can’t be met together (letter case: %s)',
      (matchCase) => {
        expect(verdictOf([eq('Stuttgart', matchCase), notContains('gart', matchCase)])).toBe(
          'unsat'
        );
      }
    );

    it.each([RESPECTING, IGNORING])(
      '"is equal to Stuttgart" implies "contains Stutt" (letter case: %s)',
      (matchCase) => {
        expect(implies(eq('Stuttgart', matchCase), contains('Stutt', matchCase))).toBe(true);
        expect(implies(contains('Stutt', matchCase), eq('Stuttgart', matchCase))).toBe(false);
      }
    );

    it('"contains Stuttgart" and "doesn’t contain gart" can’t be met together', () => {
      expect(verdictOf([contains('Stuttgart', RESPECTING), notContains('gart', RESPECTING)])).toBe(
        'unsat'
      );
      expect(witnessOf([contains('Stutt', RESPECTING), notContains('gart', RESPECTING)])).toBe(
        'Stutt'
      );
    });
  });

  describe('case 1: a case-respecting "is equal to" fixes the text', () => {
    it('evaluates every literal on it, in either form', () => {
      const fixed = eq('Stuttgart', RESPECTING);
      expect(witnessOf([fixed, contains('TT', IGNORING), ne('stuttgart', RESPECTING)])).toBe(
        'Stuttgart'
      );
      expect(verdictOf([fixed, notContains('TT', IGNORING)])).toBe('unsat');
      expect(verdictOf([fixed, ne('STUTTGART', IGNORING)])).toBe('unsat');
      expect(verdictOf([fixed, not(fixed)])).toBe('unsat');
    });
  });

  describe('case 2: every literal in one form', () => {
    it('joins the "contains" texts, so that a "doesn’t contain" text occurs only inside one', () => {
      const literals = [
        contains('ab', RESPECTING),
        contains('cd', RESPECTING),
        notContains('bc', RESPECTING),
      ];
      expect(witnessOf(literals)).toBe('ab-cd');
    });

    it('takes a separator that no "doesn’t contain" text has', () => {
      const literals = [
        contains('ab', IGNORING),
        contains('cd', IGNORING),
        notContains('b-c', IGNORING),
      ];
      expect(witnessOf(literals)).toBe('ab0cd');
      const everySeparator = [
        contains('a', RESPECTING),
        ne('a', RESPECTING),
        notContains(ASCII_SEPARATORS, RESPECTING),
      ];
      expect(witnessOf(everySeparator)).toBe('a\u{4e00}');
    });

    it('adds separators to avoid each "is not equal to"', () => {
      expect(witnessOf([contains('A', IGNORING), ne('a', IGNORING), ne('A-', IGNORING)])).toBe(
        'a--'
      );
      expect(witnessOf([ne('-', RESPECTING), ne('--', RESPECTING)])).toBe('---');
      expect(witnessOf([notContains('-', IGNORING)])).toBe('0');
    });

    it('takes the text of an "is equal to" that ignores letter case, folded', () => {
      expect(witnessOf([eq('STRA\u{1e9e}E', IGNORING), contains('SS', IGNORING)])).toBe('strasse');
      expect(verdictOf([eq('STRA\u{1e9e}E', IGNORING), ne('Strasse', IGNORING)])).toBe('unsat');
      expect(verdictOf([eq('Bonn', IGNORING), eq('K\u{f6}ln', IGNORING)])).toBe('unsat');
    });

    it('swaps the tests of a negated literal', () => {
      expect(verdictOf([not(contains('gart', IGNORING)), contains('STUTTGART', IGNORING)])).toBe(
        'unsat'
      );
      expect(witnessOf([not(ne('Bonn', IGNORING))])).toBe('bonn');
      expect(witnessOf([not(notContains('Bonn', RESPECTING))])).toBe('Bonn');
    });
  });

  describe('case 3: mixed letter case', () => {
    it('spells the text of an "is equal to" that ignores letter case', () => {
      expect(witnessOf([eq('a', IGNORING), ne('a', RESPECTING)])).toBe('A');
      expect(witnessOf([eq('Stuttgart', IGNORING), notContains('stuttgart', RESPECTING)])).toBe(
        'stuttgarT'
      );
      expect(witnessOf([eq('K\u{f6}ln', IGNORING), contains('\u{d6}', RESPECTING)])).toBe(
        'k\u{d6}ln'
      );
    });

    it('finds the spellings that the folding makes', () => {
      const spelled = ['ss', 'sS', 'Ss', 'SS', '\u{df}', '\u{1e9e}'];
      const literals = [eq('ss', IGNORING), ...spelled.map((text) => ne(text, RESPECTING))];
      // The long s, U+017F, folds to s
      expect(witnessOf(literals)).toBe('s\u{17f}');
    });

    it('can’t be met when the case-respecting literals exclude every spelling', () => {
      expect(verdictOf([eq('a', IGNORING), ne('a', RESPECTING), ne('A', RESPECTING)])).toBe(
        'unsat'
      );
      expect(verdictOf([eq('1-2', IGNORING), ne('1-2', RESPECTING)])).toBe('unsat');
      // Kelvin sign U+212A folds to k, but NFC makes it K
      expect(verdictOf([eq('k', IGNORING), ne('k', RESPECTING), ne('K', RESPECTING)])).toBe(
        'unsat'
      );
      // A Hangul syllable has no other spelling: its jamo in a row aren't in NFC
      expect(verdictOf([eq('\u{ac01}', IGNORING), ne('\u{ac01}', RESPECTING)])).toBe('unsat');
    });

    it('spells a code point that only a fold or a composition brings', () => {
      // İ folds to i with U+0307; ŉ to U+02BC and n; "J" with U+030C to ǰ
      expect(witnessOf([contains('\u{130}', IGNORING), notContains('\u{307}', RESPECTING)])).toBe(
        '\u{130}'
      );
      expect(witnessOf([contains('\u{149}', IGNORING), notContains('\u{2bc}', RESPECTING)])).toBe(
        '\u{149}'
      );
      expect(witnessOf([eq('\u{1f0}', IGNORING), ne('\u{1f0}', RESPECTING)])).toBe('J\u{30c}');
      expect(witnessOf([contains('\u{1f0}', IGNORING), notContains('\u{1f0}', RESPECTING)])).toBe(
        'J\u{30c}'
      );
    });

    it('refutes a case-respecting "doesn’t contain" text of rigid characters in the folded text', () => {
      expect(verdictOf([contains('12-34', IGNORING), notContains('2-3', RESPECTING)])).toBe(
        'unsat'
      );
      expect(verdictOf([eq('Bad Cannstatt', IGNORING), notContains(' ', RESPECTING)])).toBe(
        'unsat'
      );
    });

    it('takes no letter for rigid', () => {
      expect(witnessOf([contains('ab', IGNORING), notContains('ab', RESPECTING)])).toBe('aB');
    });

    it('meets mixed "contains" literals with the joined texts', () => {
      expect(witnessOf([contains('Stutt', RESPECTING), contains('GART', IGNORING)])).toBe(
        'Stutt-gart'
      );
      expect(witnessOf([ne('a', RESPECTING), ne('-', IGNORING)])).toBe('--');
    });

    it('answers "unknown" in the corner, rather than guess', () => {
      // No text contains "Stutt" without "stutt" in its folding, which the theory can't prove
      expect(verdictOf([contains('Stutt', RESPECTING), notContains('stutt', IGNORING)])).toBe(
        'unknown'
      );
      // "=" occurs in the decomposition of "≠", so it isn't rigid
      expect(verdictOf([contains('a=b', IGNORING), notContains('=', RESPECTING)])).toBe('unknown');
      // The same refutation as the first would be wrong here: "J" with U+030C contains "J", and
      // its folding, ǰ in NFC, doesn't contain "j"
      const literals = [contains('J', RESPECTING), notContains('j', IGNORING)];
      expect(literals.every((each) => textHolds(each, 'J\u{30c}'))).toBe(true);
      expect(verdictOf(literals)).toBe('unknown');
    });
  });

  it('agrees with an enumeration of texts for 1500 seeded sets of literals', () => {
    const applicants: Forms[] = textsUpTo(APPLICANT_ALPHABET, 4).map((text) => ({
      respecting: normalisedText(text, true),
      ignoring: normalisedText(text, false),
    }));
    const ops: TextOp[] = ['eq', 'ne', 'contains', 'not_contains'];
    const random = seeded(14);
    const counts: Record<Verdict, number> = { sat: 0, unsat: 0, unknown: 0 };
    for (let run = 0; run < 1500; run += 1) {
      const literals = Array.from({ length: 1 + Math.floor(random() * 4) }, () => {
        const length = random() < 0.15 ? 3 : 1 + Math.floor(random() * 2);
        const text = Array.from({ length }, () => pick(ALPHABET, random)).join('');
        return literal(pick(ops, random), text, random() < 0.5, random() < 0.25);
      });
      const context = `run ${run}: ${JSON.stringify(literals)}`;
      // `verdictOf()` re-checks every witness with `textHolds()`
      const verdict = verdictOf(literals);
      counts[verdict] += 1;
      const met = applicants.some((forms) => literals.every((each) => holdsOn(each, forms)));
      if (verdict === 'unsat') {
        expect(met, context).toBe(false);
      }
      if (verdict === 'unknown') {
        expect(mixesWithContains(literals), context).toBe(true);
      }
    }
    expect(counts.sat).toBeGreaterThan(0);
    expect(counts.unsat).toBeGreaterThan(0);
  });

  it('is the solver’s text theory', () => {
    const literals = [eq('Stuttgart', RESPECTING), eq('STUTTGART', RESPECTING)];
    expect(textTheory.decide(literals, CITY, TODAY)).toEqual({ verdict: 'unsat' });
    expect(textTheory.holds(eq('Stuttgart', IGNORING), 'STUTTGART', TODAY)).toBe(true);
  });
});

describe('the Unicode facts that the text theory rests on', () => {
  /** Every code point outside the surrogates, below `end`, as a string */
  function codePointsBelow(end: number): string[] {
    const characters: string[] = [];
    for (let codePoint = 0; codePoint < end; codePoint += 1) {
      if (codePoint < 0xd800 || codePoint > 0xdfff) {
        characters.push(String.fromCodePoint(codePoint));
      }
    }
    return characters;
  }

  /** Every code point with a canonical decomposition, with it */
  const DECOMPOSABLE = codePointsBelow(0x110000)
    .map((character) => [character, character.normalize('NFD')] as const)
    .filter(([character, decomposed]) => decomposed !== character);

  it('has every canonical decomposition in planes 0 to 2, which the theory scans', () => {
    expect(DECOMPOSABLE.length).toBeGreaterThan(13000);
    expect(DECOMPOSABLE.every(([character]) => (character.codePointAt(0) ?? 0) < 0x30000)).toBe(
      true
    );
  });

  it('folds each code point that NFC keeps to a text in NFC or in NFD', () => {
    for (const [codePoint, folded] of CASE_FOLDING) {
      const character = String.fromCodePoint(codePoint);
      if (character.normalize('NFC') === character) {
        const normalised = [folded.normalize('NFC'), folded.normalize('NFD')];
        expect(normalised, codePoint.toString(16)).toContain(folded);
      }
    }
  });

  it('spells no code point with more than 4 code points in NFD (LONGEST_UNIT)', () => {
    const longestFolding = Math.max(
      ...Array.from(CASE_FOLDING.values(), (folded) => Array.from(folded.normalize('NFD')).length)
    );
    const longestComposite = Math.max(
      ...DECOMPOSABLE.filter(([character]) => character.normalize('NFC') === character).map(
        ([, decomposed]) => Array.from(decomposed).length
      )
    );
    expect(longestFolding).toBe(4);
    expect(longestComposite).toBeLessThanOrEqual(4);
  });

  it('takes separators that are caseless and in no folding or decomposition', () => {
    const folded = new Set(Array.from(CASE_FOLDING.values()).flatMap((text) => Array.from(text)));
    const decomposed = new Set(DECOMPOSABLE.flatMap(([, parts]) => Array.from(parts)));
    for (const separator of [...ASCII_SEPARATORS, '\u{4e00}']) {
      const codePoint = separator.codePointAt(0) ?? -1;
      expect(CASE_FOLDING.has(codePoint), separator).toBe(false);
      expect(folded.has(separator), separator).toBe(false);
      expect(separator.normalize('NFD'), separator).toBe(separator);
      expect(decomposed.has(separator), separator).toBe(false);
      expect(normalisedText(`a${separator}\u{301}`, true), separator).toBe(`a${separator}\u{301}`);
    }
  });
});

describe('textHolds, the membership test', () => {
  it('normalises the delivered text as the evaluator does', () => {
    expect(textHolds(eq('Stuttgart', RESPECTING), ' Stuttgart\u{85}')).toBe(true);
    expect(textHolds(eq('stra\u{df}e', IGNORING), 'STRA\u{1e9e}E')).toBe(true);
    expect(textHolds(not(eq('stra\u{df}e', IGNORING)), 'STRASSE')).toBe(false);
  });

  it('is what the seeded comparison evaluates', () => {
    const texts = textsUpTo(APPLICANT_ALPHABET, 3);
    const literals = ['a', 'S', '\u{df}', 'Ab'].flatMap((text) =>
      (['eq', 'ne', 'contains', 'not_contains'] as const).flatMap((op) =>
        [RESPECTING, IGNORING].map((matchCase) => literal(op, text, matchCase, text === 'S'))
      )
    );
    for (const text of texts) {
      const forms = {
        respecting: normalisedText(text, true),
        ignoring: normalisedText(text, false),
      };
      for (const each of literals) {
        expect(textHolds(each, text), `${text}: ${JSON.stringify(each)}`).toBe(
          holdsOn(each, forms)
        );
      }
    }
  });

  it('has text vectors to replay', () => {
    expect(TEXT_OUTCOMES.length).toBeGreaterThan(0);
  });

  it.each(TEXT_OUTCOMES)('agrees with the evaluator: $description', (vector) => {
    const { operator, value, match_case: matchCase } = vector.condition;
    const test = literal(OPS[operator], value ?? '', matchCase === true);
    const text = deliveredText(vector);
    expect(textHolds(test, text)).toBe(vector.outcome === 'met');
    expect(textHolds(not(test), text)).toBe(vector.outcome !== 'met');
  });
});
