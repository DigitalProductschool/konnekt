// The text theory (specs/003-rule-consistency-checks, FR-007, EC "Letter case", EC "Text inside
// other text"; research R7): whether the literals of one text variable can be met together.
//
// `_text_holds()` in backend/app/services/evaluation.py normalises the applicant's text and the
// rule's text alike with `_normalised_text()` (`normalisedText()`), with the rule's letter-case
// setting, and compares them with ==, !=, `in` and `not in`. `literals.ts` has normalised the
// rules' texts already. So an applicant is one text R in the case-respecting form: any text in NFC
// without Python's whitespace at either end, and not empty. A case-respecting literal reads R, a
// case-ignoring one its folded form F = normalisedText(R, false), Python's `str.casefold()` of R
// in NFC. A negated literal swaps "is equal to" and "is not equal to", "contains" and "doesn't
// contain". `decideText()` describes the three cases of research R7.
import { CASE_FOLDING } from './caseFolding';
import { caseVariants, normalisedText } from './text';
import type {
  Literal,
  TextOp,
  TextTest,
  Theory,
  TheoryAnswer,
  UnknownAnswer,
  UnsatAnswer,
} from './types';

/** A literal as it is compared: its test with `negated` applied */
interface Condition {
  op: TextOp;
  /** The rule's text, normalised with `matchCase` by `literals.ts` */
  text: string;
  matchCase: boolean;
}

/** One way to write the next code points of a folded text in NFD: `length` of them by `source` */
interface Spelling {
  length: number;
  /** One code point whose folding, in NFD, is those code points */
  source: string;
}

/** A step of the search for spellings: where it is in the folded text, and in the text written */
interface Frame {
  /** Code points of the folded text, in NFD, spelled so far */
  position: number;
  /** Length of the text written for them */
  written: number;
  /** The next of the spellings at `position` to try */
  next: number;
}

/**
 * What a search for spellings came to: a witness, every spelling tried, or out of steps before
 * either
 */
type SearchResult = { found: string } | 'exhausted' | 'stopped';

const UNSAT: UnsatAnswer = { verdict: 'unsat' };

const UNKNOWN: UnknownAnswer = { verdict: 'unknown' };

/** The complement of each test, for a negated literal */
const COMPLEMENT: Record<TextOp, TextOp> = {
  eq: 'ne',
  ne: 'eq',
  contains: 'not_contains',
  not_contains: 'contains',
};

/**
 * The separators of a joined witness, in the order they are tried: caseless characters that no
 * code point folds to, without a canonical decomposition, in none, and composing with nothing,
 * so that NFC and the folding leave them, and the texts on either side, as they are
 */
const SEPARATORS: readonly string[] = Array.from('-0123456789_.,:!?#+*/|~^@&%$');

/**
 * The CJK Unified Ideographs, the separators once every one of `SEPARATORS` occurs in a "doesn't
 * contain" text: caseless, without a decomposition, and composing with nothing
 */
const FIRST_IDEOGRAPH = 0x4e00;
const LAST_IDEOGRAPH = 0x9fff;

/**
 * The most code points one code point stands for in a folded text in NFD: 4, for U+1F82, whose
 * folding "ἂι" is α, U+0313, U+0300 and ι in NFD, and for the composites with three marks. A
 * composite without two marks in a row, such as a Hangul syllable, stands for at most 3
 */
const LONGEST_UNIT = 4;

/**
 * The steps a search for spellings may take, each a code point tried at a place, besides
 * `STEPS_PER_CODE_POINT` for each code point of the folded text: a search that runs out answers
 * `'unknown'`. They cover every realistic mixed text field, in a few milliseconds
 */
const SEARCH_STEPS = 5000;

/**
 * The steps a search may take for each code point of the folded text, besides `SEARCH_STEPS`:
 * enough to write the text as written, which takes up to 9 for a letter with an accent
 */
const STEPS_PER_CODE_POINT = 16;

/** U+0345 COMBINING GREEK YPOGEGRAMMENI, the only mark of the highest combining class, 240 */
const HIGHEST_CLASS_MARK = String.fromCodePoint(0x345);

/** U+0334 COMBINING TILDE OVERLAY, a mark of the lowest combining class but 0, 1 */
const LOWEST_CLASS_MARK = String.fromCodePoint(0x334);

/** Every code point that occurs in another code point's folding */
const FOLDING_PARTS: ReadonlySet<number> = new Set(
  Array.from(CASE_FOLDING.values()).flatMap((folded) => Array.from(folded, codePointOf))
);

/** Planes 0 to 2, where every code point with a canonical decomposition lies */
const DECOMPOSABLE_BELOW = 0x30000;

/** `decompositionParts()`, once it has been built */
let decompositionPartsBuilt: ReadonlySet<number> | null = null;

/**
 * Whether an applicant whose text is `value`, as delivered, meets the literal, as the evaluator
 * compares: `value` normalised with the literal's letter-case setting, as `_text_holds()` does, so
 * any delivered text can be passed, against the literal's text, which `literals.ts` has
 * normalised; `negated` flips the outcome. An applicant's text is never empty after normalisation,
 * where the evaluator counts it as missing, so `value` isn't either
 */
export function textHolds(literal: Literal<TextTest>, value: string): boolean {
  const { op, text, matchCase } = literal.test;
  return compares(op, text, normalisedText(value, matchCase)) !== literal.negated;
}

/**
 * Whether one text meets every literal (research R7). The witness is a text as delivered, already
 * in the evaluator's case-respecting form (`normalisedText(witness, true)` is the witness itself,
 * not empty), and `textHolds()` accepts it for every literal: each `'sat'` is re-checked so before
 * it is returned, and one that failed the re-check would come back `'unknown'`. Without literals,
 * the witness is "-".
 * 1. A case-respecting "is equal to" fixes the text, and every literal is evaluated on it. Exact.
 * 2. All literals respect letter case, or all ignore it. With an "is equal to" (ignoring case),
 *    every literal is evaluated on its text, which is also the witness: folding a folded text
 *    changes nothing. Without, `'unsat'` when a "doesn't contain" text occurs inside a "contains"
 *    text, since no text contains the one without the other. Otherwise the witness is the
 *    "contains" texts joined by a separator that occurs in no "doesn't contain" text, so that one
 *    occurs only inside a "contains" text, followed by as many more separators as it takes to
 *    avoid every "is not equal to". Never `'unknown'`.
 * 3. Letter case is mixed. `'unsat'` when case 2 refutes the literals of one form, which every
 *    witness must meet, or when a case-respecting "doesn't contain" text of rigid characters
 *    occurs in every folded text that meets the case-ignoring literals: inside the "is equal to"
 *    text, or inside a "contains" text. A rigid character occurs in the folded text only where the
 *    text as written has it, between the same neighbours (`isRigid()`), so the text as written
 *    contains it too. Otherwise the witnesses are searched (`spellings()`):
 *    - with a case-ignoring "is equal to", the spellings of its text: the texts whose folding is
 *      that text, made of the case variants of its code points (`caseVariants()`), the text as
 *      written first, without those that contain a case-respecting "doesn't contain" text. When
 *      the search tries them all and none meets the case-respecting literals, `'unsat'`, as long
 *      as the text, in NFD, has no two marks in a row: the search then finds every spelling
 *      (`spellingsAt()`). Otherwise `'unknown'`;
 *    - without, the rules' texts, then the case-respecting "contains" texts as written joined with
 *      spellings of the case-ignoring ones, followed by separators as in case 2. When none meets
 *      every literal, `'unknown'`. Without "contains" and "doesn't contain" literals, the
 *      separators alone meet them.
 *
 *    So `'unknown'` arises only when one text field mixes letter-case settings with "contains" or
 *    "doesn't contain" conditions. Without them, it would take a case-ignoring "is equal to" text
 *    with two marks in a row, or one so long that the search runs out of steps, whose every
 *    spelling found a case-respecting "is not equal to" excludes
 */
export function decideText(literals: readonly Literal<TextTest>[]): TheoryAnswer<string> {
  const conditions = literals.map(conditionOf);
  const fixed = conditions.find((condition) => condition.matchCase && condition.op === 'eq');
  let answer: TheoryAnswer<string>;
  if (fixed === undefined) {
    answer = decideUnfixed(conditions);
  } else {
    answer = meets(conditions, fixed.text) ? sat(fixed.text) : UNSAT;
  }
  return rechecked(literals, answer);
}

/** The text theory, for the solver (`Theory`) */
export const textTheory: Theory<TextTest, string> = {
  holds: textHolds,
  decide: decideText,
};

/** The literal's test with `negated` applied */
function conditionOf(literal: Literal<TextTest>): Condition {
  const { op, text, matchCase } = literal.test;
  return { op: literal.negated ? COMPLEMENT[op] : op, text, matchCase };
}

/** The evaluator's comparison of a normalised value with a rule's normalised text */
function compares(op: TextOp, text: string, value: string): boolean {
  switch (op) {
    case 'eq':
      return value === text;
    case 'ne':
      return value !== text;
    case 'contains':
      return value.includes(text);
    case 'not_contains':
      return !value.includes(text);
  }
}

function sat(witness: string): TheoryAnswer<string> {
  return { verdict: 'sat', witness };
}

/**
 * Whether `text` is in the case-respecting form, not empty, and meets every condition: its folded
 * form for those that ignore letter case
 */
function meets(conditions: readonly Condition[], text: string): boolean {
  if (text === '' || normalisedText(text, true) !== text) {
    return false;
  }
  let folded: string | null = null;
  for (const condition of conditions) {
    const value = condition.matchCase ? text : (folded ??= normalisedText(text, false));
    if (!compares(condition.op, condition.text, value)) {
      return false;
    }
  }
  return true;
}

/** `answer`, unless it is a `'sat'` whose witness `textHolds()` rejects: then `'unknown'` */
function rechecked(
  literals: readonly Literal<TextTest>[],
  answer: TheoryAnswer<string>
): TheoryAnswer<string> {
  if (answer.verdict !== 'sat') {
    return answer;
  }
  const { witness } = answer;
  const valid =
    witness !== '' &&
    normalisedText(witness, true) === witness &&
    literals.every((literal) => textHolds(literal, witness));
  return valid ? answer : UNKNOWN;
}

/** Cases 2 and 3 of `decideText()`: no case-respecting "is equal to" */
function decideUnfixed(conditions: readonly Condition[]): TheoryAnswer<string> {
  const respecting = conditions.filter((condition) => condition.matchCase);
  const ignoring = conditions.filter((condition) => !condition.matchCase);
  const equal = ignoring.find((condition) => condition.op === 'eq');
  // Case 2 within each form: every witness meets the literals of either form
  if (equal !== undefined) {
    if (!ignoring.every((condition) => compares(condition.op, condition.text, equal.text))) {
      return UNSAT;
    }
  } else if (excludedInside(ignoring)) {
    return UNSAT;
  }
  if (excludedInside(respecting)) {
    return UNSAT;
  }
  // Texts that every folded text meeting the case-ignoring literals contains
  const forced = equal === undefined ? textsOf(ignoring, 'contains') : [equal.text];
  if (rigidlyExcluded(respecting, forced)) {
    return UNSAT;
  }
  if (equal !== undefined) {
    return spelledValue(equal.text, conditions);
  }
  return joinedValue(conditions, respecting.length > 0 && ignoring.length > 0);
}

/** The texts of the conditions with this test */
function textsOf(conditions: readonly Condition[], op: TextOp): string[] {
  return conditions.filter((condition) => condition.op === op).map((condition) => condition.text);
}

/** Whether a "doesn't contain" text occurs inside a "contains" text */
function excludedInside(conditions: readonly Condition[]): boolean {
  const contained = textsOf(conditions, 'contains');
  return textsOf(conditions, 'not_contains').some((excluded) =>
    contained.some((text) => text.includes(excluded))
  );
}

/**
 * Whether a case-respecting "doesn't contain" text of rigid characters occurs inside one of
 * `forced`, which every folded text that meets the case-ignoring literals contains
 */
function rigidlyExcluded(respecting: readonly Condition[], forced: readonly string[]): boolean {
  return textsOf(respecting, 'not_contains').some(
    (excluded) =>
      forced.some((text) => text.includes(excluded)) && Array.from(excluded).every(isRigid)
  );
}

/**
 * A case-ignoring "is equal to" fixes the folded text: the first of its spellings that meets every
 * condition, `'unsat'` when the search tried them all and they are all found (`hasStackedMarks()`)
 */
function spelledValue(folded: string, conditions: readonly Condition[]): TheoryAnswer<string> {
  if (meets(conditions, folded)) {
    return sat(folded);
  }
  const avoided = textsOf(
    conditions.filter((condition) => condition.matchCase),
    'not_contains'
  );
  const result = spellings(folded, '', avoided, (text) => (meets(conditions, text) ? text : null));
  if (typeof result === 'object') {
    return sat(result.found);
  }
  return result === 'exhausted' && !hasStackedMarks(folded) ? UNSAT : UNKNOWN;
}

/**
 * No "is equal to": the "contains" texts joined by a separator that occurs in no "doesn't contain"
 * text, then separators to avoid every "is not equal to". When letter case is mixed, the rules'
 * texts come first, and the case-ignoring "contains" texts are spelled to avoid the
 * case-respecting "doesn't contain" texts
 */
function joinedValue(conditions: readonly Condition[], mixed: boolean): TheoryAnswer<string> {
  const separator = separatorAvoiding(textsOf(conditions, 'not_contains'));
  if (separator === null) {
    return UNKNOWN;
  }
  // Each "is not equal to" excludes one text, and the texts with more separators differ in both
  // forms, so one of tries + 1 of them is left
  const tries = textsOf(conditions, 'ne').length;
  const respecting = conditions.filter((condition) => condition.matchCase);
  const kept = textsOf(respecting, 'contains');
  const spelled = textsOf(
    conditions.filter((condition) => !condition.matchCase),
    'contains'
  );
  if (!mixed) {
    const joined = [...kept, ...spelled].join(separator);
    const witness = withSeparators(joined, separator, conditions, tries);
    return witness === null ? UNKNOWN : sat(witness);
  }
  for (const condition of conditions) {
    if (meets(conditions, condition.text)) {
      return sat(condition.text);
    }
  }
  const start = kept.join(separator);
  const result = spellings(
    spelled.join(separator),
    start !== '' && spelled.length > 0 ? start + separator : start,
    textsOf(respecting, 'not_contains'),
    (text) => withSeparators(text, separator, conditions, tries)
  );
  return typeof result === 'object' ? sat(result.found) : UNKNOWN;
}

/** The first separator that occurs in none of `texts`, null if every one does */
function separatorAvoiding(texts: readonly string[]): string | null {
  const used = new Set(texts.flatMap((text) => Array.from(text)));
  const separator = SEPARATORS.find((candidate) => !used.has(candidate));
  if (separator !== undefined) {
    return separator;
  }
  for (let codePoint = FIRST_IDEOGRAPH; codePoint <= LAST_IDEOGRAPH; codePoint += 1) {
    const candidate = String.fromCodePoint(codePoint);
    if (!used.has(candidate)) {
      return candidate;
    }
  }
  return null;
}

/**
 * The first text that meets every condition among `base` followed by none, one, … `tries`
 * separators, or from one separator on when `base` is empty; null if none does
 */
function withSeparators(
  base: string,
  separator: string,
  conditions: readonly Condition[],
  tries: number
): string | null {
  const first = base === '' ? 1 : 0;
  for (let count = first; count <= first + tries; count += 1) {
    const text = base + separator.repeat(count);
    if (meets(conditions, text)) {
      return text;
    }
  }
  return null;
}

/**
 * Searches the texts in NFC that start with `prefix` and continue with a spelling of `folded`: a
 * text whose folding, in NFD, is `folded` in NFD, one code point at a time (`spellingsAt()`). The
 * text as written comes first. A text that contains one of `avoided` is left out with every text
 * that continues it. `accept` turns a text found into a witness, or rejects it with null
 */
function spellings(
  folded: string,
  prefix: string,
  avoided: readonly string[],
  accept: (text: string) => string | null
): SearchResult {
  const units = Array.from(folded.normalize('NFD'));
  let steps = SEARCH_STEPS + STEPS_PER_CODE_POINT * units.length;
  const choicesAt: (readonly Spelling[] | undefined)[] = [];
  const frames: Frame[] = [{ position: 0, written: prefix.length, next: 0 }];
  let text = prefix;
  while (frames.length > 0) {
    const frame = frames[frames.length - 1];
    text = text.slice(0, frame.written);
    steps -= 1;
    if (steps < 0) {
      return 'stopped';
    }
    if (frame.position === units.length) {
      frames.pop();
      const witness = accept(text);
      if (witness !== null) {
        return { found: witness };
      }
      continue;
    }
    const choices = (choicesAt[frame.position] ??= spellingsAt(units, frame.position));
    if (frame.next === choices.length) {
      frames.pop();
      continue;
    }
    const choice = choices[frame.next];
    frame.next += 1;
    const extended = text + choice.source;
    // A text in NFC keeps each pair of neighbours as it is, and a text that contains an avoided
    // text ends with it where it first does
    if (keepsPair(text, choice.source) && !avoided.some((each) => extended.endsWith(each))) {
      text = extended;
      frames.push({ position: frame.position + choice.length, written: text.length, next: 0 });
    }
  }
  return 'exhausted';
}

/**
 * The code points that can write the code points of a folded text in NFD from `position` on: for
 * each key of one to `LONGEST_UNIT` of them, every code point that NFC keeps whose folding, in NFD,
 * is the key (`sourcesOf()`). While the folded text has no two marks in a row, canonical ordering
 * moves no mark, so every text whose folding in NFC is the folded text writes it, in NFD, key by
 * key in this way: the search then finds every spelling
 */
function spellingsAt(units: readonly string[], position: number): Spelling[] {
  const choices: Spelling[] = [];
  let key = '';
  for (let length = 1; length <= LONGEST_UNIT && position + length <= units.length; length += 1) {
    key += units[position + length - 1];
    for (const source of sourcesOf(key)) {
      choices.push({ length, source });
    }
  }
  return choices;
}

/**
 * The code points that NFC keeps whose folding, in NFD, is `key`, a text in NFD: the case
 * variants of the key in NFC and of the key itself. A code point that NFC keeps folds to a text in
 * NFC or in NFD, and one that folds to itself is the key in NFC. The key in NFC comes first
 */
function sourcesOf(key: string): string[] {
  const composed = key.normalize('NFC');
  const variants =
    composed === key ? caseVariants(key) : [...caseVariants(composed), ...caseVariants(key)];
  const kept = variants.filter((variant) => variant.normalize('NFC') === variant);
  return kept.includes(composed)
    ? [composed, ...kept.filter((variant) => variant !== composed)]
    : kept;
}

/** Whether NFC keeps the last code point of `text` and the code point `next` as they are */
function keepsPair(text: string, next: string): boolean {
  const pair = lastCharacter(text) + next;
  return pair.normalize('NFC') === pair;
}

/** The last code point of `text` as a string, '' for the empty text */
function lastCharacter(text: string): string {
  const last = text.charCodeAt(text.length - 1);
  const isLowSurrogate = last >= 0xdc00 && last <= 0xdfff && text.length > 1;
  return text.slice(text.length - (isLowSurrogate ? 2 : 1));
}

/** Whether `folded` has, in NFD, two marks in a row: two code points of a combining class but 0 */
function hasStackedMarks(folded: string): boolean {
  let previous = false;
  for (const character of folded.normalize('NFD')) {
    const mark = isNonStarter(character);
    if (mark && previous) {
      return true;
    }
    previous = mark;
  }
  return false;
}

/**
 * Whether a code point without a canonical decomposition has a combining class but 0, read from
 * canonical ordering: a mark of a class from 1 to 239 moves before U+0345 (240), one of a class
 * from 2 to 240 moves U+0334 (1) before itself
 */
function isNonStarter(character: string): boolean {
  const after = HIGHEST_CLASS_MARK + character;
  const before = character + LOWEST_CLASS_MARK;
  return after.normalize('NFD') !== after || before.normalize('NFD') !== before;
}

/**
 * Whether a code point occurs in a folded text only where the text as written has the same code
 * point, between the same neighbours (case 3 of `decideText()`): it folds to itself and no other
 * code point folds to a text with it; it has no canonical decomposition and occurs in none; and
 * its combining class is 0. NFC then neither makes nor takes it, nor moves anything across it,
 * and a code point between two of them in the text as written leaves one between them in the
 * folded text. Caseless characters such as digits, "-" and " " are rigid. Letters aren't, nor are
 * U+0307 (from "İ"), U+02BC (from "ŉ"), U+01F0 ("J" with U+030C folds to it), "=" (in "≠") or ";"
 * (U+037E decomposes to it)
 */
function isRigid(character: string): boolean {
  const codePoint = codePointOf(character);
  return (
    !CASE_FOLDING.has(codePoint) &&
    !FOLDING_PARTS.has(codePoint) &&
    character.normalize('NFD') === character &&
    !isNonStarter(character) &&
    !decompositionParts().has(codePoint)
  );
}

/**
 * Every code point that occurs in another code point's canonical decomposition, from the JavaScript
 * engine's NFD. Scanning planes 0 to 2 takes some 50 milliseconds, so the set is built when
 * `isRigid()` first needs it, and kept
 */
function decompositionParts(): ReadonlySet<number> {
  if (decompositionPartsBuilt === null) {
    const parts = new Set<number>();
    for (let codePoint = 0; codePoint < DECOMPOSABLE_BELOW; codePoint += 1) {
      if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
        continue;
      }
      const character = String.fromCodePoint(codePoint);
      const decomposed = character.normalize('NFD');
      if (decomposed !== character) {
        for (const part of decomposed) {
          parts.add(codePointOf(part));
        }
      }
    }
    decompositionPartsBuilt = parts;
  }
  return decompositionPartsBuilt;
}

/** The code point a string starts with, -1 for the empty string */
function codePointOf(text: string): number {
  return text.codePointAt(0) ?? -1;
}
