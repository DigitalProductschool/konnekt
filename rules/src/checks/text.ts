// Text as the evaluator compares it (specs/003-rule-consistency-checks, FR-007, EC "Letter case";
// research R7): `normalisedText()` is `_normalised_text()` of backend/app/services/evaluation.py,
// through which both the citizen's text and the rule's own text go. Its folding is Python's
// `str.casefold()`, read from the generated caseFolding.ts, never `toUpperCase().toLowerCase()` or
// `foldName()` (rules/src/tree.ts), which put the capital sharp s and 58 other code points into
// other classes than Python does. `caseVariants()` inverts that folding for the text theory's
// witnesses (T014). Python's vectors in fixtures/evaluator-vectors.json pin the normalisation
// (research R13)
import { CASE_FOLDING } from './caseFolding';

/**
 * Python's whitespace, which `str.strip()` removes: the 29 code points of `str.isspace()`, as
 * ranges of code points, both ends included. JavaScript's `trim()` differs: it keeps U+001C to
 * U+001F and U+0085, and strips U+FEFF, which Python keeps
 */
const PYTHON_WHITESPACE_RANGES: readonly (readonly [number, number])[] = [
  [0x0009, 0x000d],
  [0x001c, 0x0020],
  [0x0085, 0x0085],
  [0x00a0, 0x00a0],
  [0x1680, 0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f, 0x202f],
  [0x205f, 0x205f],
  [0x3000, 0x3000],
];

/** Python's whitespace, by code point */
const PYTHON_WHITESPACE: ReadonlySet<number> = new Set(
  PYTHON_WHITESPACE_RANGES.flatMap(([first, last]) =>
    Array.from({ length: last - first + 1 }, (_, offset) => first + offset)
  )
);

/** The code point a string starts with, -1 for the empty string, which no table holds */
function codePointOf(text: string): number {
  return text.codePointAt(0) ?? -1;
}

/** Whether a string is exactly one code point */
function isOneCodePoint(text: string): boolean {
  return text !== '' && String.fromCodePoint(codePointOf(text)).length === text.length;
}

/** Whether a string is one code point that `str.casefold()` leaves as it is */
function foldsToItself(text: string): boolean {
  return isOneCodePoint(text) && !CASE_FOLDING.has(codePointOf(text));
}

/** Python's `str.strip()` without arguments: its whitespace removed at both ends */
function stripped(text: string): string {
  // Python's whitespace lies in the BMP, outside the surrogates, so code units suffice
  let start = 0;
  let end = text.length;
  while (start < end && PYTHON_WHITESPACE.has(text.charCodeAt(start))) {
    start += 1;
  }
  while (end > start && PYTHON_WHITESPACE.has(text.charCodeAt(end - 1))) {
    end -= 1;
  }
  return text.slice(start, end);
}

/**
 * Python's `str.casefold()`: each code point replaced by its folding in `CASE_FOLDING`, the others
 * kept. Neither stripped nor normalised: 33 code points fold to text that isn't in NFC, such as
 * U+01F0 to "j" and U+030C. Folding a folded text changes nothing
 */
export function caseFold(text: string): string {
  return Array.from(
    text,
    (character) => CASE_FOLDING.get(codePointOf(character)) ?? character
  ).join('');
}

/**
 * `_normalised_text(text, match_case)` of the evaluator: Python's whitespace stripped at both ends,
 * then Unicode NFC; when letter case doesn't count, then `caseFold()` and NFC again, which
 * recomposes the folds that aren't in NFC. Spaces inside the text count as written. A citizen's
 * text that this leaves empty counts as missing; a rule's text is never left empty
 *
 * NFC is the JavaScript engine's. It gives Python's result for every text of characters that
 * Unicode 15.1 assigns (research R7)
 */
export function normalisedText(text: string, matchCase: boolean): string {
  const normalised = stripped(text).normalize('NFC');
  if (matchCase) {
    return normalised;
  }
  return caseFold(normalised).normalize('NFC');
}

/** Each folded unit with its case variants, built once from `CASE_FOLDING` (see `caseVariants()`) */
function invertedFolding(): Map<string, readonly string[]> {
  const sources = new Map<string, number[]>();
  for (const [codePoint, folded] of CASE_FOLDING) {
    sources.set(folded, [...(sources.get(folded) ?? []), codePoint]);
  }
  const inverse = new Map<string, readonly string[]>();
  for (const [folded, codePoints] of sources) {
    // Folding is idempotent, so a unit of one code point folds to itself and is its own variant
    const variants = foldsToItself(folded) ? [...codePoints, codePointOf(folded)] : codePoints;
    inverse.set(
      folded,
      variants.sort((a, b) => a - b).map((codePoint) => String.fromCodePoint(codePoint))
    );
  }
  return inverse;
}

/** The 1469 units that some other code point folds to, with their case variants */
const CASE_VARIANTS: ReadonlyMap<string, readonly string[]> = invertedFolding();

/**
 * The inverse of the folding: the case variants of a folded unit, meaning every code point whose
 * `caseFold()` is exactly `folded`, each as a string of one code point, in code point order. A
 * unit is the folding of one code point: one code point, or two or three for 73 of them.
 * - A code point that folds to itself is among its own variants: "a" gives ["A", "a"], "k" gives
 *   ["K", "k", U+212A KELVIN SIGN], "s" gives ["S", "s", U+017F LONG S], "σ" gives ["Σ", "ς",
 *   "σ"], "i" gives ["I", "i"], and the dotless "ı" (U+0131), which doesn't fold, gives ["ı"].
 *   A caseless code point, such as "1", gives itself alone
 * - A unit of several code points gives the single code points that fold to all of it: "ss" gives
 *   ["ß", "ẞ"], "i" with U+0307 COMBINING DOT ABOVE gives ["İ"] (U+0130), "ffi" gives [U+FB03].
 *   The texts of several code points that fold to it, such as "SS" or "ſs" for "ss", aren't
 *   listed: they are made of the variants of the unit's own code points
 * - Anything else gives []: a code point that folds to something else, such as "A", "ß", "ẞ",
 *   "İ", "Σ" or the final "ς" (which folds to "σ"), and a text that no single code point folds to,
 *   such as "ab" or ""
 *
 * The variants come from the table and aren't normalised. Check a text built from them with
 * `normalisedText()`, as the evaluator reads it:
 * - Twenty of the units' variants aren't in NFC, so the evaluator's first NFC replaces them before
 *   folding. Six become another variant of the same unit: U+212A KELVIN SIGN, U+212B ANGSTROM
 *   SIGN, U+2126 OHM SIGN, U+1FBE, U+1FD3 and U+1FE3. Fourteen become letters with tonos, variants
 *   of a canonically equivalent unit: the seven Greek small letters with oxia (U+1F71 to U+1F7D,
 *   units of their own) and their capitals (U+1FBB to U+1FFB)
 * - A character of a normalised folded text needn't be a unit, because the second NFC recomposes
 *   the 26 units that aren't in NFC and have a decomposition. "ǰ" (U+01F0) folds to "j" and U+030C,
 *   which NFC recomposes into "ǰ": `caseVariants('ǰ')` is [], and the unit is its decomposition,
 *   `'ǰ'.normalize('NFD')`, whose variants are ["ǰ"]. "J" with U+030C, which no precomposed
 *   letter spells, stays two code points in NFC as written, and folds to "ǰ" too
 * - So a code point whose only variant is itself can still occur in a folded text where the text
 *   as written lacks it. It can come from a unit of several code points: U+0307 of "İ", U+02BC of
 *   "ŉ" and U+02BE of "ẚ" (U+1E9A) stay after NFC; the combining marks U+0300, U+0301, U+0308,
 *   U+030A, U+030C, U+0313, U+0331 and U+0342 of the 26 units that NFC recomposes do so only where
 *   NFC can compose them. And it can come from a recomposition: U+01F0 from "J" with U+030C
 */
export function caseVariants(folded: string): readonly string[] {
  return CASE_VARIANTS.get(folded) ?? (foldsToItself(folded) ? [folded] : []);
}
