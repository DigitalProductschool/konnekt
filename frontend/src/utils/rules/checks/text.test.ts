import { describe, expect, it } from 'vitest';

import { CASE_FOLDING } from './caseFolding';
import vectors from './fixtures/evaluator-vectors.json';
import { caseFold, caseVariants, normalisedText } from './text';

/** A `normalised_text` vector: Python's `_normalised_text(text, match_case)` */
interface NormalisedTextVector {
  description: string;
  match_case: boolean;
  result: string;
  text: string;
}

const NORMALISED_TEXT: readonly NormalisedTextVector[] = vectors.normalised_text;

/** The 29 code points of Python's `str.isspace()`, as the task lists them */
const PYTHON_WHITESPACE = [
  0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x1c, 0x1d, 0x1e, 0x1f, 0x20, 0x85, 0xa0, 0x1680, 0x2000, 0x2001,
  0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f,
  0x205f, 0x3000,
];

/** The code points of a text */
function codePoints(text: string): number[] {
  return Array.from(text, (character) => character.codePointAt(0) ?? -1);
}

/**
 * The code points worth sweeping, as strings: the BMP without the surrogates, where all of
 * Python's whitespace lies, and every code point that the folding changes or produces, those
 * beyond the BMP included. Any other code point folds to itself alone
 */
function sweptCodePoints(): string[] {
  const swept = new Set<number>();
  for (let codePoint = 0; codePoint <= 0xffff; codePoint += 1) {
    if (codePoint < 0xd800 || codePoint > 0xdfff) {
      swept.add(codePoint);
    }
  }
  for (const [codePoint, folded] of CASE_FOLDING) {
    [codePoint, ...codePoints(folded)].forEach((each) => swept.add(each));
  }
  return [...swept].map((codePoint) => String.fromCodePoint(codePoint));
}

const SWEPT = sweptCodePoints();

describe('normalisedText', () => {
  it('has every vector of _normalised_text()', () => {
    expect(NORMALISED_TEXT).toHaveLength(150);
  });

  it.each(NORMALISED_TEXT)(
    '$description, match_case $match_case',
    ({ text, match_case, result }) => {
      expect(normalisedText(text, match_case)).toBe(result);
    }
  );

  it("strips Python's whitespace and nothing else, unlike trim()", () => {
    const stripped = SWEPT.filter(
      (character) => normalisedText(`${character}x${character}`, true) === 'x'
    ).map((character) => character.codePointAt(0));
    expect(stripped).toEqual(PYTHON_WHITESPACE);
    expect(normalisedText('\u{feff}x\u{feff}', true)).toBe('\u{feff}x\u{feff}');
    expect(normalisedText('\u{1c}\u{85}x\u{85}\u{1c}', true)).toBe('x');
  });

  it('keeps spaces inside the text as written', () => {
    expect(normalisedText(' Bad  Cannstatt ', false)).toBe('bad  cannstatt');
  });

  it('"STRA\u{1e9e}E" equals "stra\u{df}e" when letter case is ignored', () => {
    expect(normalisedText('STRA\u{1e9e}E', false)).toBe('strasse');
    expect(normalisedText('stra\u{df}e', false)).toBe('strasse');
    expect(normalisedText('STRA\u{1e9e}E', true)).not.toBe(normalisedText('stra\u{df}e', true));
  });

  it('folds the dotted capital I to i with a dot above, and not the dotless i', () => {
    expect(normalisedText('\u{130}STANBUL', false)).toBe('i\u{307}stanbul');
    expect(normalisedText('\u{130}STANBUL', false)).not.toBe(normalisedText('istanbul', false));
    expect(normalisedText('\u{131}', false)).toBe('\u{131}');
  });

  it('folds the final sigma to sigma, whatever its place', () => {
    expect(normalisedText('\u{3c2}\u{3a3}\u{3c3}', false)).toBe('\u{3c3}\u{3c3}\u{3c3}');
  });

  it('recomposes a folding that is not in NFC', () => {
    expect(caseFold('\u{1f0}')).toBe('j\u{30c}');
    expect(normalisedText('\u{1f0}', false)).toBe('\u{1f0}');
    expect(normalisedText('J\u{30c}', false)).toBe('\u{1f0}');
    expect(normalisedText('J\u{30c}', true)).toBe('J\u{30c}');
  });
});

describe('caseFold', () => {
  it('folds code point by code point, without stripping or normalising', () => {
    expect(caseFold(' \u{3a3}\u{1e9e}\u{130}1 ')).toBe(' \u{3c3}ssi\u{307}1 ');
  });

  it('changes nothing in a folded text', () => {
    const changed = [...CASE_FOLDING.values()].filter((folded) => caseFold(folded) !== folded);
    expect(changed).toEqual([]);
  });
});

describe('caseVariants', () => {
  it('gives a letter its capital and itself', () => {
    expect(caseVariants('a')).toEqual(['A', 'a']);
    expect(caseVariants('i')).toEqual(['I', 'i']);
  });

  it('gives k the Kelvin sign too, and s the long s', () => {
    expect(caseVariants('k')).toEqual(['K', 'k', '\u{212a}']);
    expect(caseVariants('s')).toEqual(['S', 's', '\u{17f}']);
  });

  it('gives sigma the capital and the final sigma, which have no variants of their own', () => {
    expect(caseVariants('\u{3c3}')).toEqual(['\u{3a3}', '\u{3c2}', '\u{3c3}']);
    expect(caseVariants('\u{3c2}')).toEqual([]);
    expect(caseVariants('\u{3a3}')).toEqual([]);
  });

  it('gives ss the sharp s and its capital, which fold to it', () => {
    expect(caseVariants('ss')).toEqual(['\u{df}', '\u{1e9e}']);
    expect(caseVariants('\u{df}')).toEqual([]);
    expect(caseVariants('\u{1e9e}')).toEqual([]);
  });

  it('gives i with a dot above the dotted capital I, and the dotless i only itself', () => {
    expect(caseVariants('i\u{307}')).toEqual(['\u{130}']);
    expect(caseVariants('\u{130}')).toEqual([]);
    expect(caseVariants('\u{131}')).toEqual(['\u{131}']);
  });

  it('gives a caseless code point itself, and a text that is no folding nothing', () => {
    expect(caseVariants('1')).toEqual(['1']);
    expect(caseVariants('\u{307}')).toEqual(['\u{307}']);
    expect(caseVariants('A')).toEqual([]);
    expect(caseVariants('ab')).toEqual([]);
    expect(caseVariants('')).toEqual([]);
  });

  it('finds a recomposed folding through its decomposition', () => {
    expect(caseVariants('\u{1f0}')).toEqual([]);
    expect(caseVariants('\u{1f0}'.normalize('NFD'))).toEqual(['\u{1f0}']);
  });

  it('lists only single code points in code point order, each folding back to its unit', () => {
    const units = [...SWEPT, ...new Set(CASE_FOLDING.values())];
    const wrong = units.filter((unit) => {
      const variants = caseVariants(unit);
      const order = variants.map((variant) => codePoints(variant)[0]);
      return variants.some(
        (variant, index) =>
          codePoints(variant).length !== 1 ||
          caseFold(variant) !== unit ||
          (index > 0 && order[index - 1] >= order[index])
      );
    });
    expect(wrong).toEqual([]);
  });

  it('lists every code point among the variants of its own folding', () => {
    const missing = SWEPT.filter(
      (character) => !caseVariants(caseFold(character)).includes(character)
    );
    expect(missing).toEqual([]);
  });
});
