"""Write the rule checks' generated files, the server's messages and the example.

Run from backend/: `uv run python -m scripts.export_check_fixtures`. The rule checks
in the browser (rules/src/checks/) compare texts and count days as
app/services/evaluation.py does. This script reads the interpreter and the evaluator
themselves (research R7, R13) and writes

- `caseFolding.ts`: Python's `str.casefold()` for every code point it changes,
  compressed into ranges, which `checks/text.ts` folds texts with;
- `fixtures/evaluator-vectors.json`: inputs and Python's results for
  `_normalised_text()`, `years_after()`, `months_after()`, `date.toordinal()`,
  rule outcomes and whole-branch evaluations (`evaluate_branch()`: met, results and
  messages; spec 004, research R2), which the Vitest tests replay;
- `rules/src/fixtures/server-messages.json` (spec 009, research R8): the validation
  messages of app/services/rules_texts.py that `rules/src/constants.ts` mirrors word
  for word (`RULES_MESSAGES`, `CONDITION_PROBLEM_MESSAGES`,
  `EDIT_MESSAGES.unknownVariant`), in English and German, rendered with fixed sample
  parameters. Each case's `params` are the TS function's arguments by its parameter
  names, in its parameter order, so `fn(...Object.values(params))` renders the case;
  `params_de`, where a case has it, replaces them for German (a catalog label in
  German). A condition problem's case is the part after `condition_problem_prefix`,
  as the TS table holds it. The keys the server has no message for are listed under
  `client_only`, each with its reason;
- `rules/src/fixtures/example-connection.json` (spec 010, research R7, FR-056): the
  example connection of app/example.py in English and German, as the editor loads it
  (the stored draft's documents, branches with fixed ids and counters, and the
  catalog's document types and value sets it needs), on which `rules/src/
  example.test.ts` runs the rules package's validation and the rule checks.

All four are generated, never edited by hand. Run the script again after a Python
upgrade, a change to the evaluator's comparisons or a change to a mirrored message.
With --check it writes nothing: it names each committed file that differs from what
it would write and exits with 1.

The script never imports app.config (ARCHITECTURE, "Developer scripts"), so it takes
the messages from the leaf module rules_texts.py, not from app/services/rules.py,
and the example from the leaf module app/example.py.
"""

import argparse
import json
import re
import sys
import unicodedata
from collections.abc import Iterator, Mapping, Sequence
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any, Literal

from app.catalog import DOCUMENT_TYPES, CatalogField
from app.catalog import label_of as catalog_label_of
from app.example import NEXT_GROUP_NUMBER, NEXT_RULE_NUMBER, example_content
from app.language import Language, Text, request_language
from app.option_sets import OPTION_SETS
from app.option_sets import description_of as option_description_of
from app.option_sets import label_of as option_label_of
from app.schemas import (
    Combinator,
    Condition,
    DeliveredDocument,
    DeliveredField,
    DocumentField,
    DocumentType,
    FieldPart,
    GroupItem,
    Mark,
    Option,
    OptionSet,
    RequestedDocumentView,
    RuleItem,
    RuleTarget,
    SnapshotBranch,
)
from app.services import rules_texts
from app.services.evaluation import (
    _kind_of,
    _normalised_text,
    evaluate_branch,
    months_after,
    years_after,
)

# The repository's root, which the generated files' paths are relative to
REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKS_DIR = Path('rules/src/checks')
CASE_FOLDING_FILE = CHECKS_DIR / 'caseFolding.ts'
VECTORS_FILE = CHECKS_DIR / 'fixtures' / 'evaluator-vectors.json'
SERVER_MESSAGES_FILE = Path('rules/src/fixtures/server-messages.json')
EXAMPLE_FILE = Path('rules/src/fixtures/example-connection.json')
COMMAND = 'uv run python -m scripts.export_check_fixtures'
GENERATOR = 'backend/scripts/export_check_fixtures.py'

# The day of sharing of the rule outcomes that don't name another
TODAY = date(2026, 10, 28)

# Characters of a TS string literal that the table writes as they are
_PLAIN = re.compile(r'[A-Za-z0-9 ]')


# The case-folding table


@dataclass(frozen=True)
class FoldRange:
    """Every `step`-th code point from `first` to `last` folds to itself + `delta`."""

    first: int
    last: int
    step: int
    delta: int


def case_folding() -> dict[int, str]:
    """Python's `str.casefold()` of every code point it changes."""
    folded = {
        code_point: chr(code_point).casefold()
        for code_point in range(sys.maxunicode + 1)
    }
    return {
        code_point: text
        for code_point, text in folded.items()
        if text != chr(code_point)
    }


def fold_ranges(
    folding: Mapping[int, str],
) -> tuple[list[FoldRange], list[tuple[int, str]]]:
    """The table compressed: ranges of single code points, then the longer texts.

    A code point that folds to one code point joins the longest run, of neighbours
    (step 1) or of every other code point (step 2, as in Latin Extended-A), that
    moves by the same distance. One that folds to several code points, such as sharp s
    to "ss", is listed with its text.
    """
    deltas = {
        code_point: ord(text) - code_point
        for code_point, text in folding.items()
        if len(text) == 1
    }
    ranges: list[FoldRange] = []
    covered: set[int] = set()
    for first in sorted(deltas):
        if first in covered:
            continue
        delta = deltas[first]
        best = FoldRange(first, first, 1, delta)
        for step in (1, 2):
            last = first
            while deltas.get(last + step) == delta and last + step not in covered:
                last += step
            if (last - first) // step > (best.last - best.first) // best.step:
                best = FoldRange(first, last, step, delta)
        ranges.append(best)
        covered.update(range(best.first, best.last + 1, best.step))
    texts = sorted(
        (code_point, text) for code_point, text in folding.items() if len(text) > 1
    )
    return ranges, texts


def _ts_string(text: str) -> str:
    """A single-quoted TS string literal, with escapes for all but ASCII letters."""
    characters = (
        character
        if _PLAIN.fullmatch(character)
        else f'\\u{ord(character):04x}'
        if ord(character) <= 0xFFFF
        else f'\\u{{{ord(character):x}}}'
        for character in text
    )
    return "'" + ''.join(characters) + "'"


def case_folding_source() -> str:
    """The text of `caseFolding.ts`."""
    folding = case_folding()
    ranges, texts = fold_ranges(folding)
    python = f'{sys.version_info.major}.{sys.version_info.minor}'
    unicode_version = unicodedata.unidata_version
    lines = [
        f"// Generated by {GENERATOR} from Python {python}'s",
        f'// str.casefold(), Unicode {unicode_version} (research R7). Never edit it by '
        'hand: after a Python',
        f'// upgrade, run `{COMMAND}` from backend/.',
        '',
        '/** The Unicode version of the interpreter whose case folding this table '
        'holds */',
        f"export const UNICODE_VERSION = '{unicode_version}';",
        '',
        '/**',
        ' * Code points that fold to one code point, as [first, last, step, delta]: '
        'every step-th code',
        ' * point from first to last folds to the code point delta away',
        ' */',
        'const RANGES: readonly (readonly [number, number, number, number])[] = [',
        *(
            f'  [0x{entry.first:04x}, 0x{entry.last:04x}, {entry.step}, {entry.delta}],'
            for entry in ranges
        ),
        '];',
        '',
        '/** Code points that fold to several code points, as [code point, folded '
        'text] */',
        'const TEXTS: readonly (readonly [number, string])[] = [',
        *(f'  [0x{code_point:04x}, {_ts_string(text)}],' for code_point, text in texts),
        '];',
        '',
        'function expanded(): Map<number, string> {',
        '  const table = new Map<number, string>();',
        '  for (const [first, last, step, delta] of RANGES) {',
        '    for (let codePoint = first; codePoint <= last; codePoint += step) {',
        '      table.set(codePoint, String.fromCodePoint(codePoint + delta));',
        '    }',
        '  }',
        '  for (const [codePoint, text] of TEXTS) {',
        '    table.set(codePoint, text);',
        '  }',
        '  return table;',
        '}',
        '',
        '/**',
        f" * Python's `str.casefold()` of each of the {len(folding)} code points it "
        'changes, by code point. A',
        ' * code point that the table lacks folds to itself. Python folds a text code '
        'point by code point',
        ' */',
        'export const CASE_FOLDING: ReadonlyMap<number, string> = expanded();',
    ]
    return '\n'.join(lines) + '\n'


# The evaluator's vectors


def _normalised_text_vectors() -> Iterator[dict[str, object]]:
    """`_normalised_text()` on each text, respecting and ignoring letter case."""
    texts: list[tuple[str, str]] = [
        *(
            (
                f'{chr(code_point)}K\u00d6LN{chr(code_point)}',
                f'U+{code_point:04X} at both ends',
            )
            for code_point in range(sys.maxunicode + 1)
            if chr(code_point).isspace()
        ),
        *(
            (
                f'{chr(code_point)}K\u00d6LN{chr(code_point)}',
                f'U+{code_point:04X}, which str.isspace() rejects, at both ends',
            )
            for code_point in (0x180E, 0x200B, 0x2060, 0xFEFF)
        ),
        ('Bad  Cannstatt', 'two spaces inside the text'),
        ('Bad\u00a0Cannstatt', 'U+00A0 inside the text'),
        ('Bad\u0085Cannstatt', 'U+0085 inside the text'),
        ('', 'an empty text'),
        (' \t\n\u0085\u00a0\u3000 ', 'whitespace only'),
        ('\ufeff', 'U+FEFF only'),
        ('Stra\u00dfe', 'sharp s'),
        ('STRASSE', 'SS'),
        ('STRA\u1e9eE', 'the capital sharp s, U+1E9E'),
        ('\u1e9e', 'the capital sharp s alone'),
        ('\u0130stanbul', 'the dotted capital I, U+0130'),
        ('ISTANBUL', 'the dotless capital I'),
        ('\u0131stanbul', 'the dotless i, U+0131'),
        ('i\u0307stanbul', 'i with a combining dot above'),
        ('Ko\u0308ln', 'a combining diaeresis'),
        ('KO\u0308LN', 'a capital with a combining diaeresis'),
        ('K\u00d6LN', 'a precomposed capital O with diaeresis'),
        ('\u212b', 'the angstrom sign, which NFC maps to U+00C5'),
        ('A\u030a', 'A with a combining ring above'),
        ('e\u0301', 'e with a combining acute accent'),
        ('\u01f0', 'U+01F0, which folds to j and a combining caron'),
        ('J\u030c', 'J with a combining caron'),
        ('\u0390', 'U+0390, which folds to three code points'),
        ('\u1fd3', 'iota with dialytika and oxia, U+1FD3'),
        ('\u1fbb', 'capital alpha with oxia, U+1FBB'),
        ('\u1fb3', 'alpha with ypogegrammeni, U+1FB3'),
        ('\u1fbc', 'capital alpha with prosgegrammeni, U+1FBC'),
        ('\u03a3\u038a\u03a3\u03a5\u03a6\u039f\u03a3', 'capital sigmas'),
        ('\u03c3\u03af\u03c3\u03c5\u03c6\u03bf\u03c2', 'a final sigma'),
        ('\u00b5', 'the micro sign'),
        ('\u212a', 'the Kelvin sign'),
        ('\u017f', 'the long s'),
        ('\u01c5', 'the titlecase Dz with caron, U+01C5'),
        ('\ufb03', 'the ligature ffi'),
        ('\ufb05', 'the ligature long st'),
        ('\u0149', 'n after an apostrophe, U+0149, which folds to two code points'),
        ('\uab70', 'a Cherokee small letter, which folds to its capital'),
        ('\u13f8', 'Cherokee small ye'),
        ('\U0001e900', 'an Adlam capital, outside the BMP'),
        ('\ua7cb', 'U+A7CB, a capital that Unicode 15.1 lacks'),
        ('\U00010d50', 'U+10D50, a Garay capital that Unicode 15.1 lacks'),
        ('\u1100\u1161', 'Hangul jamo, which NFC composes'),
    ]
    for text, description in texts:
        for match_case in (False, True):
            yield {
                'description': description,
                'match_case': match_case,
                'result': _normalised_text(text, match_case),
                'text': text,
            }


def _years_after_vectors() -> Iterator[dict[str, object]]:
    cases: list[tuple[date, int, str]] = [
        (date(2026, 10, 28), 1, 'an ordinary day'),
        (date(1999, 12, 31), 1, 'the last day of a year'),
        (date(2008, 10, 28), 18, 'an 18th birthday'),
        (date(2000, 2, 29), 1, '29 February in a year without one'),
        (date(2000, 2, 29), 4, '29 February in a leap year'),
        (date(2000, 2, 29), 100, '29 February in 2100, which is no leap year'),
        (date(2000, 2, 29), 400, '29 February in 2400, a leap year'),
        (date(2008, 2, 29), 18, 'an 18th birthday of someone born on 29 February'),
        (date(1, 1, 1), 1, "the calendar's first day"),
        (date(9998, 6, 15), 1, "into the calendar's last year"),
        (date(9996, 2, 29), 3, "29 February into the calendar's last year"),
        (date(9996, 2, 29), 4, 'beyond the calendar, from 29 February'),
        (date(9999, 1, 1), 1, 'beyond the calendar'),
        (date(9999, 12, 31), 1, 'beyond the calendar, from its last day'),
        (date(2026, 10, 28), 7973, "the calendar's last year"),
        (date(2026, 10, 28), 7974, 'one year beyond the calendar'),
        (date(2026, 10, 28), 1_000_000, 'far beyond the calendar'),
    ]
    for day, years, description in cases:
        yield {
            'day': day.isoformat(),
            'description': description,
            'result': years_after(day, years).isoformat(),
            'years': years,
        }


def _months_after_vectors() -> Iterator[dict[str, object]]:
    cases: list[tuple[date, int, str]] = [
        (date(2026, 10, 28), 1, 'an ordinary day'),
        (date(2026, 12, 15), 1, 'into the next year'),
        (date(2026, 12, 31), 1, 'from 31 December'),
        (date(2026, 1, 31), 1, '31 January into February'),
        (date(2024, 1, 31), 1, '31 January into a leap February'),
        (date(2024, 1, 29), 1, '29 January into a leap February'),
        (date(2023, 1, 29), 1, '29 January into a February without 29 days'),
        (date(2026, 3, 31), 1, '31 March into April'),
        (date(2026, 5, 31), 1, '31 May into June'),
        (date(2026, 8, 31), 1, '31 August into September'),
        (date(2026, 10, 31), 1, '31 October into November'),
        (date(2026, 11, 30), 3, '30 November into February'),
        (date(2026, 10, 28), 6, 'six months'),
        (date(2026, 10, 28), 12, 'twelve months'),
        (date(2026, 10, 28), 25, 'over two years'),
        (date(2024, 2, 29), 12, '29 February plus twelve months'),
        (date(2024, 2, 29), 48, '29 February plus 48 months'),
        (date(9999, 10, 31), 1, "31 October of the calendar's last year"),
        (date(9999, 11, 30), 1, "within the calendar's last month"),
        (date(9999, 12, 1), 1, 'beyond the calendar'),
        (date(9999, 12, 31), 1, 'beyond the calendar, from its last day'),
        (date(2026, 10, 28), 120_000, 'far beyond the calendar'),
    ]
    for day, months, description in cases:
        yield {
            'day': day.isoformat(),
            'description': description,
            'months': months,
            'result': months_after(day, months).isoformat(),
        }


def _day_number_vectors() -> Iterator[dict[str, object]]:
    cases: list[tuple[date, str]] = [
        (date(1, 1, 1), "the calendar's first day"),
        (date(1, 12, 31), 'the end of year 1'),
        (date(4, 2, 29), 'the first 29 February'),
        (date(100, 3, 1), '1 March 100, after a February without 29 days'),
        (date(1582, 10, 15), "the Gregorian calendar's introduction"),
        (date(1900, 3, 1), '1 March 1900, after a February without 29 days'),
        (date(1970, 1, 1), 'the Unix epoch'),
        (date(2000, 2, 29), '29 February 2000'),
        (date(2026, 10, 28), 'a recent day'),
        (date(9999, 12, 31), "the calendar's last day"),
    ]
    for day, description in cases:
        yield {
            'day': day.isoformat(),
            'description': description,
            'number': day.toordinal(),
        }


@dataclass(frozen=True)
class _Outcome:
    """A rule on one field, its value in the documents, and the day of sharing."""

    description: str
    # document type, field, part, licence class
    target: tuple[str, str, str | None, str | None]
    condition: dict[str, object]
    value: object
    today: date = TODAY


# The driving licence's classes: B held since 2020, BE since 29 October 2024
PRIVILEGES = [
    {
        'vehicle_category_code': 'B',
        'issue_date': '2020-03-01',
        'expiry_date': '2035-02-28',
    },
    {
        'vehicle_category_code': 'BE',
        'issue_date': '2024-10-29',
        'expiry_date': '2035-02-28',
    },
]
HEIGHT = ('mdl', 'height', None, None)
FAMILY_NAME = ('pid', 'family_name', None, None)
LOCALITY = ('pid', 'address_locality', None, None)
BIRTH_LOCALITY = ('pid', 'place_of_birth', 'locality', None)
SEX = ('pid', 'sex', None, None)
NATIONALITIES = ('pid', 'nationalities', None, None)
NATIONALITY = ('mdl', 'nationality', None, None)
BIRTH_COUNTRY = ('pid', 'place_of_birth', 'country', None)
EYE_COLOUR = ('mdl', 'eye_colour', None, None)
CLASSES = ('mdl', 'driving_privileges', 'classes', None)
EXPIRY = ('pid', 'date_of_expiry', None, None)
BIRTH_DATE = ('pid', 'birthdate', None, None)
MDL_BIRTH_DATE = ('mdl', 'birth_date', None, None)


def _class_date(part: str, licence_class: str) -> tuple[str, str, str, str]:
    return ('mdl', 'driving_privileges', part, licence_class)


def _number(operator: str, value: float) -> dict[str, object]:
    return {'operator': operator, 'value': value}


def _text(operator: str, value: str, match_case: bool) -> dict[str, object]:
    return {'operator': operator, 'value': value, 'match_case': match_case}


def _enum(operator: str, *values: str | int) -> dict[str, object]:
    return {'operator': operator, 'values': list(values)}


def _fixed(operator: str, day: str) -> dict[str, object]:
    return {'operator': operator, 'date': day}


def _years_ago(operator: str, years: int) -> dict[str, object]:
    return {'operator': operator, 'years': years}


def _from_now(operator: str, amount: int, unit: str) -> dict[str, object]:
    return {'operator': operator, 'amount': amount, 'unit': unit}


def _outcome_cases() -> list[_Outcome]:
    """Rules, values and days: every operator of every kind (OPERATORS)."""
    return [
        # Numbers: strict comparisons, with whole and decimal limits
        _Outcome('greater', HEIGHT, _number('greater_than', 170), 180),
        _Outcome('not greater when equal', HEIGHT, _number('greater_than', 180), 180),
        _Outcome('greater than a decimal', HEIGHT, _number('greater_than', 20.5), 21),
        _Outcome(
            'not greater than a decimal', HEIGHT, _number('greater_than', 20.5), 20
        ),
        _Outcome('a decimal value', HEIGHT, _number('greater_than', 72), 72.5),
        _Outcome('less', HEIGHT, _number('less_than', 190), 180),
        _Outcome('not less when equal', HEIGHT, _number('less_than', 180), 180),
        _Outcome('less than a decimal', HEIGHT, _number('less_than', 180.5), 180),
        _Outcome('not less than a decimal', HEIGHT, _number('less_than', 180.5), 181),
        _Outcome('nothing is less than 0', HEIGHT, _number('less_than', 0), 0),
        _Outcome('equal', HEIGHT, _number('equal_to', 180), 180),
        _Outcome('not equal', HEIGHT, _number('equal_to', 181), 180),
        _Outcome(
            "a whole value isn't a decimal", HEIGHT, _number('equal_to', 20.5), 20
        ),
        _Outcome('a decimal value equals', HEIGHT, _number('equal_to', 20.5), 20.5),
        _Outcome('not equal to', HEIGHT, _number('not_equal_to', 181), 180),
        _Outcome('equal to', HEIGHT, _number('not_equal_to', 180), 180),
        _Outcome('not equal to a decimal', HEIGHT, _number('not_equal_to', 20.5), 20),
        _Outcome(
            "a text isn't a number (can't be checked)",
            HEIGHT,
            _number('greater_than', 170),
            '180',
        ),
        # Texts: trimmed, NFC, and case-folded unless letter case counts
        _Outcome(
            'equal ignoring case',
            LOCALITY,
            _text('equal_to', 'Stuttgart', False),
            'STUTTGART',
        ),
        _Outcome(
            'not equal respecting case',
            LOCALITY,
            _text('equal_to', 'Stuttgart', True),
            'STUTTGART',
        ),
        _Outcome(
            'letter case is ignored without match_case',
            LOCALITY,
            {'operator': 'equal_to', 'value': 'Stuttgart'},
            'stuttgart',
        ),
        _Outcome(
            'trimmed, U+0085 included',
            LOCALITY,
            _text('equal_to', 'Stuttgart', True),
            ' Stuttgart\u0085',
        ),
        _Outcome(
            'U+FEFF is kept',
            LOCALITY,
            _text('equal_to', 'Stuttgart', False),
            '\ufeffStuttgart',
        ),
        _Outcome(
            'spaces inside count',
            LOCALITY,
            _text('equal_to', 'Bad Cannstatt', False),
            'Bad  Cannstatt',
        ),
        _Outcome(
            'the capital sharp s folds to ss',
            FAMILY_NAME,
            _text('equal_to', 'stra\u00dfe', False),
            'STRA\u1e9eE',
        ),
        _Outcome(
            'sharp s folds to ss',
            FAMILY_NAME,
            _text('equal_to', 'stra\u00dfe', False),
            'STRASSE',
        ),
        _Outcome(
            "sharp s isn't ss respecting case",
            FAMILY_NAME,
            _text('equal_to', 'stra\u00dfe', True),
            'strasse',
        ),
        _Outcome(
            'the dotted capital I folds to i with a dot above',
            BIRTH_LOCALITY,
            _text('equal_to', 'istanbul', False),
            {'locality': '\u0130STANBUL'},
        ),
        _Outcome(
            "the dotless i doesn't fold to i",
            BIRTH_LOCALITY,
            _text('equal_to', '\u0131stanbul', False),
            {'locality': 'ISTANBUL'},
        ),
        _Outcome(
            'the final sigma folds to sigma',
            FAMILY_NAME,
            _text('equal_to', '\u03a3\u038a\u03a3\u03a5\u03a6\u039f\u03a3', False),
            '\u03c3\u03af\u03c3\u03c5\u03c6\u03bf\u03c2',
        ),
        _Outcome(
            "the rule's text is folded too",
            FAMILY_NAME,
            _text('contains', 'STRA\u1e9e', False),
            'Strasse',
        ),
        _Outcome(
            "the rule's text is trimmed and in NFC too",
            LOCALITY,
            _text('equal_to', ' Ko\u0308ln ', True),
            'K\u00f6ln',
        ),
        _Outcome(
            'not equal to, NFC and folded',
            LOCALITY,
            _text('not_equal_to', 'K\u00f6ln', False),
            'KO\u0308LN',
        ),
        _Outcome(
            'not equal to, NFC respecting case',
            LOCALITY,
            _text('not_equal_to', 'K\u00f6ln', True),
            'Ko\u0308ln',
        ),
        _Outcome(
            'not equal to a different text',
            LOCALITY,
            _text('not_equal_to', 'K\u00f6ln', False),
            'Bonn',
        ),
        _Outcome(
            'contains ignoring case',
            LOCALITY,
            _text('contains', 'gart', False),
            'STUTTGART',
        ),
        _Outcome(
            "doesn't contain respecting case",
            LOCALITY,
            _text('contains', 'gart', True),
            'STUTTGART',
        ),
        _Outcome(
            'contains the whole text',
            LOCALITY,
            _text('contains', 'Stuttgart', True),
            'Stuttgart',
        ),
        _Outcome(
            'SS is inside a folded sharp s',
            FAMILY_NAME,
            _text('contains', 'SS', False),
            'Stra\u00dfe',
        ),
        _Outcome(
            'a folded sharp s is inside SS',
            FAMILY_NAME,
            _text('contains', '\u00df', False),
            'STRASSE',
        ),
        _Outcome(
            "doesn't contain sharp s respecting case",
            FAMILY_NAME,
            _text('not_contains', '\u00df', True),
            'Strasse',
        ),
        _Outcome(
            'a folded dotted capital I contains i',
            BIRTH_LOCALITY,
            _text('not_contains', 'i', False),
            {'locality': '\u0130stanbul'},
        ),
        _Outcome(
            "doesn't contain ignoring case",
            LOCALITY,
            _text('not_contains', 'berg', False),
            'Stuttgart',
        ),
        _Outcome(
            "whitespace only (can't be checked)",
            LOCALITY,
            _text('equal_to', 'Stuttgart', False),
            ' \u0085\u00a0',
        ),
        # Enums: codes as integers, texts case-folded; a single value is a list of one
        _Outcome('one code', SEX, _enum('includes_one_of', 1), 1),
        _Outcome('another code', SEX, _enum('includes_one_of', 1), 2),
        _Outcome('a code written as text', SEX, _enum('includes_one_of', 1), '1'),
        _Outcome('a code with spaces', SEX, _enum('includes_one_of', 2), ' 2 '),
        _Outcome('none of two codes', SEX, _enum('includes_none_of', 0, 2), 1),
        _Outcome('one of the excluded codes', SEX, _enum('includes_none_of', 0, 2), 0),
        _Outcome(
            'several values, one of them',
            NATIONALITIES,
            _enum('includes_one_of', 'DE'),
            ['FR', 'DE'],
        ),
        _Outcome(
            'several values, none of them',
            NATIONALITIES,
            _enum('includes_one_of', 'DE'),
            ['FR'],
        ),
        _Outcome(
            'several values, one of two',
            NATIONALITIES,
            _enum('includes_one_of', 'DE', 'AT'),
            ['AT', 'FR'],
        ),
        _Outcome(
            'a single value where several can be',
            NATIONALITIES,
            _enum('includes_one_of', 'DE'),
            'DE',
        ),
        _Outcome(
            'texts are case-folded and trimmed',
            NATIONALITIES,
            _enum('includes_one_of', 'DE'),
            [' de '],
        ),
        _Outcome(
            'several values, none excluded',
            NATIONALITIES,
            _enum('includes_none_of', 'DE', 'AT'),
            ['FR'],
        ),
        _Outcome(
            'several values, one excluded',
            NATIONALITIES,
            _enum('includes_none_of', 'DE', 'AT'),
            ['FR', 'AT'],
        ),
        _Outcome(
            "an empty list (can't be checked)",
            NATIONALITIES,
            _enum('includes_one_of', 'DE'),
            [],
        ),
        _Outcome(
            'one value, one of two',
            NATIONALITY,
            _enum('includes_one_of', 'DE', 'AT'),
            'AT',
        ),
        _Outcome(
            'one value in lower case',
            NATIONALITY,
            _enum('includes_one_of', 'DE', 'AT'),
            'at',
        ),
        _Outcome(
            'one value, not one of them',
            NATIONALITY,
            _enum('includes_one_of', 'DE', 'AT'),
            'fr',
        ),
        _Outcome(
            'one value, none of them',
            NATIONALITY,
            _enum('includes_none_of', 'DE'),
            'FR',
        ),
        _Outcome(
            'one value, excluded',
            NATIONALITY,
            _enum('includes_none_of', 'DE'),
            'de',
        ),
        _Outcome(
            'a part of the place of birth',
            BIRTH_COUNTRY,
            _enum('includes_one_of', 'DE'),
            {'country': 'DE', 'locality': 'Stuttgart'},
        ),
        _Outcome(
            'another part of the place of birth',
            BIRTH_COUNTRY,
            _enum('includes_one_of', 'DE'),
            {'country': 'AT', 'locality': 'Wien'},
        ),
        _Outcome(
            'a colour in capitals',
            EYE_COLOUR,
            _enum('includes_one_of', 'blue'),
            'BLUE',
        ),
        _Outcome(
            'a colour, none of them',
            EYE_COLOUR,
            _enum('includes_none_of', 'green'),
            'blue',
        ),
        _Outcome(
            'a class held',
            CLASSES,
            _enum('includes_one_of', 'B'),
            PRIVILEGES,
        ),
        _Outcome(
            'a class not held',
            CLASSES,
            _enum('includes_one_of', 'A', 'C'),
            PRIVILEGES,
        ),
        _Outcome(
            'none of the classes held',
            CLASSES,
            _enum('includes_none_of', 'C'),
            PRIVILEGES,
        ),
        _Outcome(
            'one of the excluded classes held',
            CLASSES,
            _enum('includes_none_of', 'A', 'BE'),
            PRIVILEGES,
        ),
        _Outcome(
            'class codes are case-folded and trimmed',
            CLASSES,
            _enum('includes_one_of', 'BE'),
            [{'vehicle_category_code': ' be ', 'issue_date': '2024-10-29'}],
        ),
        # Fixed dates: strict comparisons
        _Outcome('before', EXPIRY, _fixed('before', '2030-01-01'), '2029-12-31'),
        _Outcome('not before', EXPIRY, _fixed('before', '2030-01-01'), '2030-01-01'),
        _Outcome('after', EXPIRY, _fixed('after', '2029-12-31'), '2030-01-01'),
        _Outcome('not after', EXPIRY, _fixed('after', '2029-12-31'), '2029-12-31'),
        _Outcome('on', EXPIRY, _fixed('on', '2030-01-01'), '2030-01-01'),
        _Outcome('not on', EXPIRY, _fixed('on', '2030-01-01'), '2030-01-02'),
        _Outcome(
            "the calendar's first day",
            EXPIRY,
            _fixed('before', '0001-01-02'),
            '0001-01-01',
        ),
        _Outcome(
            "the calendar's last day",
            EXPIRY,
            _fixed('after', '9999-12-30'),
            '9999-12-31',
        ),
        _Outcome(
            "a year alone (can't be checked)",
            BIRTH_DATE,
            _fixed('before', '2030-01-01'),
            '2008',
        ),
        # Years ago, counted from the day of sharing
        _Outcome(
            '18 today',
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 18),
            '2008-10-28',
        ),
        _Outcome(
            '18 tomorrow',
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 18),
            '2008-10-29',
        ),
        _Outcome(
            'born on 29 February, the day before 1 March',
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 18),
            '2008-02-29',
            date(2026, 2, 28),
        ),
        _Outcome(
            'born on 29 February, on 1 March',
            MDL_BIRTH_DATE,
            _years_ago('at_least_years_ago', 18),
            '2008-02-29',
            date(2026, 3, 1),
        ),
        _Outcome(
            'long ago',
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 100),
            '0001-01-01',
        ),
        _Outcome(
            'under 18 until tomorrow',
            BIRTH_DATE,
            _years_ago('less_than_years_ago', 18),
            '2008-10-29',
        ),
        _Outcome(
            'not under 18 from today',
            BIRTH_DATE,
            _years_ago('less_than_years_ago', 18),
            '2008-10-28',
        ),
        _Outcome(
            '21 from today',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2005-10-28',
        ),
        _Outcome(
            '21 for a last day',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-10-29',
        ),
        _Outcome(
            '22 from today',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-10-28',
        ),
        _Outcome(
            '21 from tomorrow',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2005-10-29',
        ),
        _Outcome(
            'born on 29 February, 20 until 1 March',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-02-29',
            date(2025, 2, 28),
        ),
        _Outcome(
            'born on 29 February, 21 from 1 March',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-02-29',
            date(2025, 3, 1),
        ),
        _Outcome(
            'born on 29 February, 21 until 1 March a year later',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-02-29',
            date(2026, 2, 28),
        ),
        _Outcome(
            'born on 29 February, 22 from 1 March a year later',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 21),
            '2004-02-29',
            date(2026, 3, 1),
        ),
        _Outcome(
            'the anniversary beyond the calendar is its last day',
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 1),
            '9999-12-31',
            date(9999, 12, 31),
        ),
        _Outcome(
            "the day before the calendar's last day",
            BIRTH_DATE,
            _years_ago('at_least_years_ago', 1),
            '9999-12-30',
            date(9999, 12, 30),
        ),
        _Outcome(
            'less than, with the anniversary beyond the calendar',
            BIRTH_DATE,
            _years_ago('less_than_years_ago', 1),
            '9999-12-31',
            date(9999, 12, 31),
        ),
        _Outcome(
            'exactly, with both anniversaries beyond the calendar',
            BIRTH_DATE,
            _years_ago('exactly_years_ago', 1),
            '9999-12-31',
            date(9999, 12, 31),
        ),
        # Time from now, counted from the day of sharing
        _Outcome(
            'six months from now',
            EXPIRY,
            _from_now('at_least_from_now', 6, 'months'),
            '2027-04-28',
        ),
        _Outcome(
            'a day short of six months',
            EXPIRY,
            _from_now('at_least_from_now', 6, 'months'),
            '2027-04-27',
        ),
        _Outcome(
            'a month from 31 January is 1 March',
            EXPIRY,
            _from_now('at_least_from_now', 1, 'months'),
            '2026-03-01',
            date(2026, 1, 31),
        ),
        _Outcome(
            'the last day of February is short of a month from 31 January',
            EXPIRY,
            _from_now('at_least_from_now', 1, 'months'),
            '2026-02-28',
            date(2026, 1, 31),
        ),
        _Outcome(
            'less than a month from 31 January',
            EXPIRY,
            _from_now('less_than_from_now', 1, 'months'),
            '2026-02-28',
            date(2026, 1, 31),
        ),
        _Outcome(
            'not less than a month from 31 January',
            EXPIRY,
            _from_now('less_than_from_now', 1, 'months'),
            '2026-03-01',
            date(2026, 1, 31),
        ),
        _Outcome(
            'a year from 29 February is 1 March',
            EXPIRY,
            _from_now('at_least_from_now', 1, 'years'),
            '2025-03-01',
            date(2024, 2, 29),
        ),
        _Outcome(
            'short of a year from 29 February',
            EXPIRY,
            _from_now('at_least_from_now', 1, 'years'),
            '2025-02-28',
            date(2024, 2, 29),
        ),
        _Outcome(
            'twelve months from 29 February',
            EXPIRY,
            _from_now('at_least_from_now', 12, 'months'),
            '2025-03-01',
            date(2024, 2, 29),
        ),
        _Outcome(
            'less than a year from 29 February',
            EXPIRY,
            _from_now('less_than_from_now', 1, 'years'),
            '2025-02-28',
            date(2024, 2, 29),
        ),
        _Outcome(
            'beyond the calendar is its last day',
            EXPIRY,
            _from_now('at_least_from_now', 8000, 'years'),
            '9999-12-31',
        ),
        _Outcome(
            "the day before the calendar's last day",
            EXPIRY,
            _from_now('at_least_from_now', 8000, 'years'),
            '9999-12-30',
        ),
        _Outcome(
            'less than, beyond the calendar',
            EXPIRY,
            _from_now('less_than_from_now', 8000, 'years'),
            '9999-12-30',
        ),
        _Outcome(
            'not less than, beyond the calendar',
            EXPIRY,
            _from_now('less_than_from_now', 8000, 'years'),
            '9999-12-31',
        ),
        _Outcome(
            'a month beyond the calendar',
            EXPIRY,
            _from_now('at_least_from_now', 1, 'months'),
            '9999-12-31',
            date(9999, 12, 15),
        ),
        _Outcome(
            "within the calendar's last month",
            EXPIRY,
            _from_now('less_than_from_now', 1, 'months'),
            '9999-12-30',
            date(9999, 11, 30),
        ),
        # A licence class's dates: the class's own, not met when it isn't held
        _Outcome(
            "a held class's issue date",
            _class_date('issue_date', 'B'),
            _years_ago('at_least_years_ago', 2),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's issue date, two years from tomorrow",
            _class_date('issue_date', 'BE'),
            _years_ago('at_least_years_ago', 2),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's issue date, two years from today",
            _class_date('issue_date', 'BE'),
            _years_ago('at_least_years_ago', 2),
            PRIVILEGES,
            date(2026, 10, 29),
        ),
        _Outcome(
            "a held class's issue date, before",
            _class_date('issue_date', 'B'),
            _fixed('before', '2020-03-01'),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's issue date, on",
            _class_date('issue_date', 'B'),
            _fixed('on', '2020-03-01'),
            PRIVILEGES,
        ),
        _Outcome(
            'a class not held, at least',
            _class_date('issue_date', 'C'),
            _years_ago('at_least_years_ago', 2),
            PRIVILEGES,
        ),
        _Outcome(
            'a class not held, less than',
            _class_date('issue_date', 'C'),
            _years_ago('less_than_years_ago', 2),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's expiry date",
            _class_date('expiry_date', 'B'),
            _from_now('at_least_from_now', 6, 'months'),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's expiry date, less than",
            _class_date('expiry_date', 'BE'),
            _from_now('less_than_from_now', 10, 'years'),
            PRIVILEGES,
        ),
        _Outcome(
            "a held class's expiry date, after",
            _class_date('expiry_date', 'BE'),
            _fixed('after', '2036-01-01'),
            PRIVILEGES,
        ),
        _Outcome(
            'a class not held, expiry date',
            _class_date('expiry_date', 'C'),
            _fixed('before', '2100-01-01'),
            PRIVILEGES,
        ),
        _Outcome(
            'a class held with codes case-folded and trimmed',
            _class_date('issue_date', 'BE'),
            _fixed('on', '2024-10-29'),
            [{'vehicle_category_code': ' be ', 'issue_date': '2024-10-29'}],
        ),
        _Outcome(
            "a class held without the date (can't be checked)",
            _class_date('issue_date', 'C'),
            _years_ago('at_least_years_ago', 1),
            [{'vehicle_category_code': 'C'}],
        ),
    ]


def _rule_outcome_vectors() -> Iterator[dict[str, object]]:
    """Each case's outcome, from `evaluate_branch()` on a branch of that one rule."""
    for case in _outcome_cases():
        document_type, field, part, licence_class = case.target
        target = RuleTarget(
            document_type=document_type,
            field=field,
            part=part,
            licence_class=licence_class,
        )
        condition = Condition.model_validate(case.condition)
        rule = RuleItem(
            type='rule',
            id='rule-1',
            name='Rule 01',
            target=target,
            condition=condition,
            message='Not met.',
        )
        branch = SnapshotBranch(
            id='main', name='Standard', origin='main', operator='and', items=[rule]
        )
        documents = [
            DeliveredDocument(
                document_type=document_type,
                label=document_type,
                fields=[
                    DeliveredField.model_validate(
                        {'key': field, 'label': field, 'value': case.value}
                    )
                ],
            )
        ]
        evaluation = evaluate_branch(branch, documents, case.today)
        kind, option_set = _kind_of(target)
        yield {
            'condition': condition.model_dump(mode='json'),
            'description': case.description,
            'kind': kind,
            'option_set': option_set,
            'outcome': evaluation.results[0].outcome,
            'target': target.model_dump(mode='json'),
            'today': case.today.isoformat(),
            'value': case.value,
        }


# Whole branches (spec 004, research R2)

# A target and a condition, the rule a branch case numbers and names
_Check = tuple[tuple[str, str, str | None, str | None], dict[str, object]]

# The applicant's results on TODAY: ADULT, IN_STUTTGART, GERMAN, HOLDS_B and B_HELD
# are met, TALLER_THAN_190 and AUSTRIAN aren't, VALID_ID can't be checked (the
# documents have no date of expiry), and C_HELD isn't met (the licence doesn't list C)
ADULT: _Check = (BIRTH_DATE, _years_ago('at_least_years_ago', 18))
IN_STUTTGART: _Check = (LOCALITY, _text('equal_to', 'stuttgart', False))
GERMAN: _Check = (NATIONALITIES, _enum('includes_one_of', 'DE'))
HOLDS_B: _Check = (CLASSES, _enum('includes_one_of', 'B'))
B_HELD: _Check = (
    _class_date('issue_date', 'B'),
    _years_ago('at_least_years_ago', 2),
)
TALLER_THAN_190: _Check = (HEIGHT, _number('greater_than', 190))
AUSTRIAN: _Check = (NATIONALITIES, _enum('includes_one_of', 'AT'))
VALID_ID: _Check = (EXPIRY, _from_now('at_least_from_now', 6, 'months'))
C_HELD: _Check = (
    _class_date('issue_date', 'C'),
    _years_ago('at_least_years_ago', 1),
)
OVER_21: _Check = (BIRTH_DATE, _years_ago('at_least_years_ago', 21))
MUSTER: _Check = (FAMILY_NAME, _text('contains', 'Muster', False))

# The applicant's fields, by document type
PID_FIELDS: dict[str, object] = {
    'family_name': 'Mustermann',
    'birthdate': '2005-10-23',
    'address_locality': 'Stuttgart',
    'nationalities': ['DE'],
}
MDL_FIELDS: dict[str, object] = {'height': 180, 'driving_privileges': PRIVILEGES}


def _rule(number: int, check: _Check, mark: Mark | None = None) -> RuleItem:
    """Rule `number` with its check, as a saved branch holds it."""
    (document_type, field_key, part, licence_class), condition = check
    return RuleItem(
        type='rule',
        id=f'rule-{number}',
        name=f'Rule {number:02d}',
        mark=mark,
        target=RuleTarget(
            document_type=document_type,
            field=field_key,
            part=part,
            licence_class=licence_class,
        ),
        condition=Condition.model_validate(condition),
        message=f'Rule {number:02d} is not met.',
    )


def _group(
    number: int,
    operator: Combinator,
    items: Sequence[RuleItem | GroupItem],
    message: str | None = None,
    mark: Mark | None = None,
) -> GroupItem:
    """Group `number` with its members, and its own message if it has one."""
    return GroupItem(
        type='group',
        id=f'group-{number}',
        name=f'Group {number:02d}',
        mark=mark,
        operator=operator,
        message=message,
        items=list(items),
    )


def _documents(
    pid: Mapping[str, object] | None = PID_FIELDS,
    mdl: Mapping[str, object] | None = MDL_FIELDS,
) -> list[DeliveredDocument]:
    """The delivered documents with these fields; None leaves the document out."""
    return [
        DeliveredDocument(
            document_type=document_type,
            label=document_type,
            fields=[
                DeliveredField.model_validate(
                    {'key': key, 'label': key, 'value': value}
                )
                for key, value in fields.items()
            ],
        )
        for document_type, fields in (('pid', pid), ('mdl', mdl))
        if fields is not None
    ]


# The documents that a case doesn't name
APPLICANT = tuple(_documents())


@dataclass(frozen=True)
class _BranchCase:
    """A branch, the documents delivered for it, and the day of sharing."""

    name: str
    origin: Literal['main', 'based', 'empty']
    operator: Combinator
    items: Sequence[RuleItem | GroupItem]
    documents: Sequence[DeliveredDocument] = APPLICANT
    shared_on: date = TODAY


def _branch_cases() -> list[_BranchCase]:
    """Branches covering research R2's list, each case named after what it pins."""
    return [
        # AND and OR levels
        _BranchCase(
            'AND level, every rule met',
            'main',
            'and',
            [_rule(1, ADULT), _rule(2, IN_STUTTGART)],
        ),
        _BranchCase(
            "AND level, rules met, not met and couldn't be checked",
            'main',
            'and',
            [_rule(1, ADULT), _rule(2, TALLER_THAN_190), _rule(3, VALID_ID)],
        ),
        _BranchCase(
            'OR level, one rule met',
            'main',
            'or',
            [_rule(1, TALLER_THAN_190), _rule(2, GERMAN)],
        ),
        _BranchCase(
            'OR level, no rule met, reports every rule',
            'main',
            'or',
            [_rule(1, TALLER_THAN_190), _rule(2, AUSTRIAN), _rule(3, VALID_ID)],
        ),
        _BranchCase(
            'OR level met by a group',
            'main',
            'or',
            [
                _rule(1, AUSTRIAN),
                _group(1, 'and', [_rule(2, ADULT), _rule(3, HOLDS_B)]),
            ],
        ),
        # Groups and sub-groups, with and without a message of their own
        _BranchCase(
            'A group with a message of its own reports it instead of its members',
            'main',
            'and',
            [
                _rule(1, ADULT),
                _group(
                    1,
                    'and',
                    [_rule(2, TALLER_THAN_190), _rule(3, AUSTRIAN)],
                    'Group 01 is not met.',
                ),
            ],
        ),
        _BranchCase(
            'OR group without a message reports its members',
            'main',
            'and',
            [
                _rule(1, IN_STUTTGART),
                _group(1, 'or', [_rule(2, TALLER_THAN_190), _rule(3, VALID_ID)]),
            ],
        ),
        _BranchCase(
            'An OR group met by one member reports nothing',
            'main',
            'and',
            [
                _group(1, 'or', [_rule(1, AUSTRIAN), _rule(2, GERMAN)]),
                _rule(3, TALLER_THAN_190),
            ],
        ),
        _BranchCase(
            'Sub-groups with and without a message of their own',
            'main',
            'and',
            [
                _group(
                    1,
                    'and',
                    [
                        _rule(1, ADULT),
                        _group(
                            2, 'or', [_rule(2, TALLER_THAN_190), _rule(3, AUSTRIAN)]
                        ),
                        _group(
                            3,
                            'and',
                            [_rule(4, VALID_ID), _rule(5, IN_STUTTGART)],
                            'Group 03 is not met.',
                        ),
                    ],
                ),
                _rule(6, GERMAN),
            ],
        ),
        _BranchCase(
            "A group's own message replaces its sub-group's",
            'main',
            'and',
            [
                _group(
                    1,
                    'or',
                    [
                        _rule(1, TALLER_THAN_190),
                        _group(
                            2,
                            'and',
                            [_rule(2, AUSTRIAN), _rule(3, ADULT)],
                            'Group 02 is not met.',
                        ),
                    ],
                    'Group 01 is not met.',
                ),
            ],
        ),
        # A based branch: removed items and dissolved inherited groups
        _BranchCase(
            'A based branch with removed items and a dissolved inherited group',
            'based',
            'and',
            [
                _rule(1, ADULT),
                _rule(2, TALLER_THAN_190, 'removed'),
                _group(
                    1,
                    'and',
                    [_rule(3, AUSTRIAN, 'removed'), _rule(4, IN_STUTTGART)],
                    'Group 01 is not met.',
                ),
                _group(
                    2,
                    'or',
                    [_rule(5, VALID_ID, 'removed'), _rule(6, AUSTRIAN, 'removed')],
                ),
                _group(
                    3,
                    'and',
                    [_rule(7, TALLER_THAN_190), _rule(8, VALID_ID)],
                    'Group 03 is not met.',
                    'removed',
                ),
                _group(
                    4,
                    'or',
                    [_rule(9, AUSTRIAN, 'added'), _rule(10, VALID_ID, 'changed')],
                    mark='added',
                ),
                _rule(11, GERMAN, 'changed'),
            ],
        ),
        _BranchCase(
            "A dissolved inherited group's sub-group takes its place",
            'based',
            'and',
            [
                _group(
                    1,
                    'and',
                    [
                        _rule(1, ADULT, 'removed'),
                        _group(
                            2, 'or', [_rule(2, TALLER_THAN_190), _rule(3, AUSTRIAN)]
                        ),
                    ],
                    'Group 01 is not met.',
                ),
                _rule(4, IN_STUTTGART),
            ],
        ),
        _BranchCase(
            'A based branch whose items are all removed is met',
            'based',
            'and',
            [
                _rule(1, TALLER_THAN_190, 'removed'),
                _group(
                    1,
                    'and',
                    [_rule(2, AUSTRIAN), _rule(3, VALID_ID)],
                    mark='removed',
                ),
            ],
        ),
        # Branches without items
        _BranchCase('An AND branch without items is met', 'main', 'and', []),
        _BranchCase('An OR branch without items is met', 'main', 'or', []),
        _BranchCase('A branch that started empty, without items', 'empty', 'and', []),
        _BranchCase(
            'A branch that started empty, with rules of its own',
            'empty',
            'or',
            [_rule(1, AUSTRIAN), _rule(2, VALID_ID)],
        ),
        # Rules that couldn't be checked
        _BranchCase(
            "Rules that couldn't be checked: a missing document, an empty text, a year",
            'main',
            'or',
            [_rule(1, MUSTER), _rule(2, TALLER_THAN_190), _rule(3, ADULT)],
            _documents(pid={'family_name': '   ', 'birthdate': '2005'}, mdl=None),
        ),
        # Licence classes
        _BranchCase(
            "A rule on a class that the licence doesn't list",
            'main',
            'and',
            [_rule(1, HOLDS_B), _rule(2, B_HELD), _rule(3, C_HELD)],
        ),
        _BranchCase(
            'A class list that is empty',
            'main',
            'or',
            [_rule(1, HOLDS_B), _rule(2, B_HELD), _rule(3, C_HELD)],
            _documents(mdl={'driving_privileges': []}),
        ),
        # The day of sharing
        _BranchCase(
            'The day before a 21st birthday',
            'main',
            'and',
            [_rule(1, OVER_21)],
            _documents(pid={'birthdate': '2005-10-29'}, mdl=None),
        ),
        _BranchCase(
            'On a 21st birthday',
            'main',
            'and',
            [_rule(1, OVER_21)],
            _documents(pid={'birthdate': '2005-10-29'}, mdl=None),
            date(2026, 10, 29),
        ),
    ]


def _branch_evaluation_vectors() -> Iterator[dict[str, object]]:
    """Each branch case with `evaluate_branch()`'s answer, without names.

    The branch keeps what the evaluation reads of a `SnapshotBranch` (origin,
    operator, items) and the documents what it reads of a `DeliveredDocument`
    (document type, field keys and values).
    """
    for case in _branch_cases():
        branch = SnapshotBranch(
            id='branch',
            name='Branch',
            origin=case.origin,
            operator=case.operator,
            items=list(case.items),
        )
        evaluation = evaluate_branch(branch, case.documents, case.shared_on)
        yield {
            'name': case.name,
            'branch': branch.model_dump(
                mode='json', include={'origin', 'operator', 'items'}
            ),
            'documents': [
                {
                    'document_type': document.document_type,
                    'fields': [
                        {'key': delivered.key, 'value': delivered.value}
                        for delivered in document.fields
                    ],
                }
                for document in case.documents
            ],
            'shared_on': case.shared_on.isoformat(),
            'met': evaluation.met,
            'results': [
                {'id': result.id, 'group': result.group, 'outcome': result.outcome}
                for result in evaluation.results
            ],
            'messages': [
                {'id': message.id, 'message': message.message}
                for message in evaluation.messages
            ],
        }


def vectors_json() -> str:
    """The text of `fixtures/evaluator-vectors.json`."""
    vectors: dict[str, Any] = {
        'generator': (
            f'{GENERATOR}: run `{COMMAND}` from backend/. Never edit this file by hand.'
        ),
        'unicode_version': unicodedata.unidata_version,
        'normalised_text': list(_normalised_text_vectors()),
        'years_after': list(_years_after_vectors()),
        'months_after': list(_months_after_vectors()),
        'day_numbers': list(_day_number_vectors()),
        'rule_outcomes': list(_rule_outcome_vectors()),
        'branch_evaluations': list(_branch_evaluation_vectors()),
    }
    return json.dumps(vectors, indent=2, sort_keys=True, ensure_ascii=True) + '\n'


# The server's messages that the rules step mirrors (spec 009, research R8)

# The sample parameters
SAMPLE_RULE = 'Rule 01'
SAMPLE_BRANCH = 'Standard'
SAMPLE_GROUP = 'Group 01'
SAMPLE_SUB_GROUP = 'Sub-group 01'
SAMPLE_VARIANT = 'Taxi'
SAMPLE_NAME = 'Lives in Stuttgart'
# A field's catalog label in both languages (catalog.py, glossary §4)
SAMPLE_FIELD = Text(en='Place of birth', de='Geburtsort')
# A reserved default name, by the noun it is kept for, with its number
SAMPLE_RESERVED: dict[rules_texts.ItemNoun, tuple[str, str]] = {
    'rule': ('Rule 08', '08'),
    'group': ('Group 02', '02'),
    'sub-group': ('Sub-group 03', '03'),
}
NOUNS: tuple[rules_texts.ItemNoun, ...] = ('rule', 'group', 'sub-group')
UNITS: tuple[rules_texts.TimeUnit, ...] = ('years', 'months')

MessageTable = Literal['RULES_MESSAGES', 'CONDITION_PROBLEM_MESSAGES', 'EDIT_MESSAGES']


@dataclass(frozen=True)
class _MessageCase:
    """A key of a TS table, its arguments by name in the TS order, and its text."""

    key: str
    table: MessageTable
    params: Mapping[str, str]
    text: Text
    # The German arguments where they differ: a catalog label
    params_de: Mapping[str, str] | None = None


def _rules_message_cases() -> Iterator[_MessageCase]:
    """`RULES_MESSAGES`: one case per key, one per noun where the key takes one."""
    texts = rules_texts
    table: MessageTable = 'RULES_MESSAGES'
    rule = {'rule': SAMPLE_RULE, 'branch': SAMPLE_BRANCH}
    # The variants: their number, names and descriptions (clean_branches)
    yield _MessageCase('tooManyBranches', table, {}, texts.too_many_branches())
    yield _MessageCase('mainBranch', table, {}, texts.main_branch())
    yield _MessageCase('branchNameMissing', table, {}, texts.branch_name_missing())
    yield _MessageCase('branchNameTooLong', table, {}, texts.branch_name_too_long())
    yield _MessageCase(
        'branchNameTwice',
        table,
        {'name': SAMPLE_VARIANT},
        texts.branch_name_twice(SAMPLE_VARIANT),
    )
    yield _MessageCase(
        'descriptionTooLong',
        table,
        {'branch': SAMPLE_BRANCH},
        texts.description_too_long(SAMPLE_BRANCH),
    )
    yield _MessageCase(
        'tooManyItems',
        table,
        {'branch': SAMPLE_BRANCH},
        texts.too_many_items(SAMPLE_BRANCH),
    )
    # A rule's or group's identifier (`_clean_branch`, `_allocate`)
    yield _MessageCase('invalidIdentifier', table, {}, texts.INVALID_IDENTIFIER)
    # Names (`_item_name`, `reserved_name_problem`): every noun, since German
    # declines it
    for noun in NOUNS:
        yield _MessageCase(
            'itemNameMissing',
            table,
            {'noun': noun, 'branch': SAMPLE_BRANCH},
            texts.item_name_missing(noun, SAMPLE_BRANCH),
        )
    for noun in NOUNS:
        yield _MessageCase(
            'itemNameTooLong',
            table,
            {'noun': noun, 'branch': SAMPLE_BRANCH},
            texts.item_name_too_long(noun, SAMPLE_BRANCH),
        )
    for noun in NOUNS:
        yield _MessageCase(
            'nameTaken',
            table,
            {'noun': noun, 'branch': SAMPLE_BRANCH, 'name': SAMPLE_NAME},
            texts.name_taken(noun, SAMPLE_BRANCH, SAMPLE_NAME),
        )
    for noun in NOUNS:
        name, number = SAMPLE_RESERVED[noun]
        yield _MessageCase(
            'nameReserved',
            table,
            {'name': name, 'noun': noun, 'number': number},
            texts.name_reserved(name, noun, number),
        )
    # What a rule checks (`_clean_target`)
    yield _MessageCase(
        'chooseData', table, rule, texts.choose_data(SAMPLE_RULE, SAMPLE_BRANCH)
    )
    yield _MessageCase(
        'notRequested', table, rule, texts.not_requested(SAMPLE_RULE, SAMPLE_BRANCH)
    )
    yield _MessageCase(
        'unknownPart',
        table,
        rule | {'field': SAMPLE_FIELD.en},
        texts.unknown_part(SAMPLE_RULE, SAMPLE_BRANCH, SAMPLE_FIELD),
        params_de=rule | {'field': SAMPLE_FIELD.de},
    )
    # A rule's or group's message (`_clean_item`)
    yield _MessageCase(
        'noMessage', table, rule, texts.no_message(SAMPLE_RULE, SAMPLE_BRANCH)
    )
    yield _MessageCase(
        'messageTooLong',
        table,
        {'item': SAMPLE_GROUP, 'branch': SAMPLE_BRANCH},
        texts.message_too_long(SAMPLE_GROUP, SAMPLE_BRANCH),
    )
    # Groups and sub-groups (`_check_members`)
    yield _MessageCase(
        'rulesOnly',
        table,
        {'subGroup': SAMPLE_SUB_GROUP, 'branch': SAMPLE_BRANCH},
        texts.rules_only(SAMPLE_SUB_GROUP, SAMPLE_BRANCH),
    )
    yield _MessageCase(
        'tooFewMembers',
        table,
        {'group': SAMPLE_GROUP, 'branch': SAMPLE_BRANCH},
        texts.too_few_members(SAMPLE_GROUP, SAMPLE_BRANCH),
    )


def _condition_problem_cases() -> Iterator[_MessageCase]:
    """`CONDITION_PROBLEM_MESSAGES`: the part after the prefix, as the server
    composes it (`condition_problem`); `amount_at_least_1` once per unit."""
    table: MessageTable = 'CONDITION_PROBLEM_MESSAGES'
    problems: list[tuple[str, dict[str, str], Text]] = [
        (key, {}, problem) for key, problem in rules_texts.CONDITION_PROBLEMS.items()
    ]
    problems += [
        ('amount_at_least_1', {'unit': unit}, rules_texts.amount_at_least_1(unit))
        for unit in UNITS
    ]
    for key, params, problem in problems:
        yield _MessageCase(key, table, params, _after_prefix(problem))


def _condition_prefix() -> Text:
    return rules_texts.condition_prefix(SAMPLE_RULE, SAMPLE_BRANCH)


def _after_prefix(problem: Text) -> Text:
    """A condition problem's message without its prefix, checked to have it."""
    message = rules_texts.condition_problem(SAMPLE_RULE, SAMPLE_BRANCH, problem)
    prefix = _condition_prefix()
    assert message.en.startswith(prefix.en) and message.de.startswith(prefix.de)
    return Text(en=message.en[len(prefix.en) :], de=message.de[len(prefix.de) :])


def _edit_message_cases() -> Iterator[_MessageCase]:
    """`EDIT_MESSAGES`: only `unknownVariant` is the server's (`UNKNOWN_BRANCH`)."""
    yield _MessageCase(
        'unknownVariant', 'EDIT_MESSAGES', {}, rules_texts.UNKNOWN_BRANCH
    )


def message_cases() -> list[_MessageCase]:
    """Every mirrored message, in the order of the TS tables."""
    return [
        *_rules_message_cases(),
        *_condition_problem_cases(),
        *_edit_message_cases(),
    ]


# The keys of `RULES_MESSAGES` that the server has no message for: the rules step's
# own texts, which its validation mirrors from the design, not from the server
CLIENT_ONLY: dict[str, str] = {
    'variantNameMissing': (
        'The Add variant and Edit variant dialogs; the server answers branchNameMissing'
    ),
    'variantNameTaken': (
        'The Add variant and Edit variant dialogs; the server answers branchNameTwice'
    ),
    'nameMissing': 'Inline renaming; the server answers itemNameMissing',
    'nameTooLong': 'Inline renaming; the server answers itemNameTooLong',
}


def _case_json(case: _MessageCase) -> dict[str, object]:
    # Insertion order, not sorted: `params` keeps the TS parameter order
    entry: dict[str, object] = {
        'key': case.key,
        'table': case.table,
        'params': dict(case.params),
    }
    if case.params_de is not None:
        entry['params_de'] = dict(case.params_de)
    entry['en'] = case.text.en
    entry['de'] = case.text.de
    return entry


def server_messages_json() -> str:
    """The text of `rules/src/fixtures/server-messages.json`."""
    prefix = _condition_prefix()
    messages: dict[str, object] = {
        'generator': (
            f'{GENERATOR}: run `{COMMAND}` from backend/. Never edit this file by hand.'
        ),
        'about': (
            "The server's validation messages that rules/src/constants.ts mirrors "
            "word for word, in English and German. params: the TS function's "
            'arguments by parameter name, in its parameter order, so '
            'fn(...Object.values(params)) renders the case; params_de, where present, '
            'replaces them for German. A CONDITION_PROBLEM_MESSAGES case is the part '
            'after condition_problem_prefix. client_only: the keys the server has '
            'no message for.'
        ),
        'condition_problem_prefix': {
            'params': {'rule': SAMPLE_RULE, 'branch': SAMPLE_BRANCH},
            'en': prefix.en,
            'de': prefix.de,
        },
        'cases': [_case_json(case) for case in message_cases()],
        'client_only': [
            {'key': key, 'table': 'RULES_MESSAGES', 'reason': reason}
            for key, reason in CLIENT_ONLY.items()
        ],
    }
    # Not sorted (`params`' order counts); German as it reads
    return json.dumps(messages, indent=2, ensure_ascii=False) + '\n'


# The example connection (spec 010, research R7, FR-056)

# The stored example's branch ids: the server assigns UUIDs; the fixture fixes them
EXAMPLE_BRANCH_IDS = (
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
)
EXAMPLE_LANGUAGES: tuple[Language, ...] = ('en', 'de')


@contextmanager
def _in_language(language: Language) -> Iterator[None]:
    """Resolve the catalog's and the value sets' labels in `language`, as a request."""
    token = request_language.set(language)
    try:
        yield
    finally:
        request_language.reset(token)


def _field_view(field: CatalogField) -> DocumentField:
    """A catalog field as GET /api/document-types answers it, in its language."""
    return DocumentField(
        key=field.key,
        label=catalog_label_of(field),
        kind=field.kind,
        option_set=field.option_set,
        date_of_birth=field.date_of_birth,
        parts=(
            None
            if field.parts is None
            else [
                FieldPart(
                    key=part.key,
                    label=catalog_label_of(part),
                    kind=part.kind,
                    option_set=part.option_set,
                    per_licence_class=part.per_licence_class,
                    multiple_values=part.multiple_values,
                )
                for part in field.parts
            ]
        ),
        multiple_values=field.multiple_values,
    )


def _example_language_json(language: Language) -> dict[str, object]:
    """The example in one language: the draft as the editor loads it, and its catalog.

    `draft` holds the stored draft's content as GET /api/form-connections/{id}
    answers it (the documents with their labels, the branches with ids, the
    counters, the step and the mark); `document_types` the catalog's entries of
    its documents and `option_sets` the value sets their requested data names, as
    GET /api/document-types and GET /api/option-sets answer them.
    """
    content = example_content(language)
    assert content.rules is not None
    assert len(content.rules.branches) == len(EXAMPLE_BRANCH_IDS)
    with _in_language(language):
        document_types = [
            DocumentType(
                key=document_type.key,
                label=catalog_label_of(document_type),
                fields=[_field_view(field) for field in document_type.fields],
            )
            for document_type in DOCUMENT_TYPES
            if any(
                document.document_type == document_type.key
                for document in content.documents
            )
        ]
        views = {document_type.key: document_type for document_type in document_types}
        documents = [
            RequestedDocumentView(
                document_type=document.document_type,
                label=views[document.document_type].label,
                fields=[
                    field
                    for key in document.fields
                    for field in views[document.document_type].fields
                    if field.key == key
                ],
            )
            for document in content.documents
        ]
        named = {
            name
            for document in documents
            for field in document.fields
            for name in (
                field.option_set,
                *(part.option_set for part in field.parts or []),
            )
            if name is not None
        }
        option_sets = [
            OptionSet(
                key=key,
                options=[
                    Option(
                        value=option.value,
                        label=option_label_of(option),
                        description=option_description_of(option),
                    )
                    for option in options
                ],
            )
            for key, options in OPTION_SETS.items()
            if key in named
        ]
    branches = [
        branch.model_copy(update={'id': branch_id})
        for branch, branch_id in zip(
            content.rules.branches, EXAMPLE_BRANCH_IDS, strict=True
        )
    ]
    draft: dict[str, object] = {
        'name': content.name,
        'description': content.description,
        'documents': [document.model_dump(mode='json') for document in documents],
        'branches': [branch.model_dump(mode='json') for branch in branches],
        'next_rule_number': NEXT_RULE_NUMBER,
        'next_group_number': NEXT_GROUP_NUMBER,
        'step': content.step,
        'example': 'unchanged',
    }
    return {
        'draft': draft,
        'document_types': [entry.model_dump(mode='json') for entry in document_types],
        'option_sets': [entry.model_dump(mode='json') for entry in option_sets],
    }


def example_connection_json() -> str:
    """The text of `rules/src/fixtures/example-connection.json`."""
    example: dict[str, object] = {
        'generator': (
            f'{GENERATOR}: run `{COMMAND}` from backend/. Never edit this file by hand.'
        ),
        'about': (
            'The example connection of app/example.py (spec 010, research R7) in '
            'English and German, as the editor loads it: draft is the stored '
            "draft's content (documents with labels, branches with fixed ids, the "
            'counters, the step and the mark); document_types and option_sets are '
            "the catalog's entries and value sets it needs, in that language."
        ),
        **{
            language: _example_language_json(language) for language in EXAMPLE_LANGUAGES
        },
    }
    # Not sorted (the documents', branches' and fields' order counts); German as it
    # reads
    return json.dumps(example, indent=2, ensure_ascii=False) + '\n'


# Writing and checking


def generated_files() -> dict[Path, str]:
    """Each generated file's path, relative to the repository, and its text."""
    return {
        CASE_FOLDING_FILE: case_folding_source(),
        VECTORS_FILE: vectors_json(),
        SERVER_MESSAGES_FILE: server_messages_json(),
        EXAMPLE_FILE: example_connection_json(),
    }


def stale_files(root: Path = REPO_ROOT) -> list[Path]:
    """The generated files under `root` that differ from what the script writes."""
    stale: list[Path] = []
    for path, text in generated_files().items():
        file = root / path
        if not file.is_file() or file.read_bytes() != text.encode():
            stale.append(path)
    return stale


def main(argv: Sequence[str] | None = None, root: Path = REPO_ROOT) -> int:
    """Run the script and return its exit status. Tests pass another `root`."""
    args = _parse_arguments(argv)
    if args.check:
        stale = stale_files(root)
        for path in stale:
            print(
                f'{path.as_posix()} is stale: it differs from what this interpreter, '
                'the evaluator and the messages give.',
                file=sys.stderr,
            )
        if stale:
            print(f'Run `{COMMAND}` from backend/.', file=sys.stderr)
            return 1
        return 0

    for path, text in generated_files().items():
        file = root / path
        content = text.encode()
        if file.is_file() and file.read_bytes() == content:
            print(f'Unchanged {path.as_posix()}')
            continue
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(content)
        print(f'Wrote {path.as_posix()}')
    return 0


def _parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog='python -m scripts.export_check_fixtures',
        description=(
            "Write the rule checks' case-folding table and the evaluator's vectors "
            'from this interpreter and app/services/evaluation.py, the mirrored '
            'validation messages from app/services/rules_texts.py, and the example '
            'connection from app/example.py.'
        ),
    )
    parser.add_argument(
        '--check',
        action='store_true',
        help=(
            'write nothing; name each generated file that differs from what the '
            'script would write, and exit with 1 if any does'
        ),
    )
    return parser.parse_args(argv)


if __name__ == '__main__':
    sys.exit(main())
