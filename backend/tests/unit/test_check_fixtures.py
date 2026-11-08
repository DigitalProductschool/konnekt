"""scripts/export_check_fixtures: the rule checks' generated files (research R13).

The case-folding table and the evaluator's vectors in rules/src/checks/
are generated from this interpreter and app/services/evaluation.py. These tests fail
when they are stale: run `uv run python -m scripts.export_check_fixtures` and commit
the result.
"""

import json
import re
import sys
from pathlib import Path
from typing import Any

import pytest

from app.services.rules import (
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    TEXT_OPERATORS,
)
from scripts.export_check_fixtures import (
    CASE_FOLDING_FILE,
    REPO_ROOT,
    VECTORS_FILE,
    main,
)

CAPITAL_SHARP_S = 0x1E9E
# The lines of caseFolding.ts that hold the table
_RANGE = re.compile(r'  \[0x([0-9a-f]+), 0x([0-9a-f]+), ([0-9]+), (-?[0-9]+)\],')
_TEXT = re.compile(r"  \[0x([0-9a-f]+), '([^']*)'\],")
_ESCAPE = re.compile(r'\\u\{([0-9a-f]+)\}|\\u([0-9a-f]{4})')


def _committed_table() -> dict[int, str]:
    """The committed caseFolding.ts, read back: code point to folded text."""
    table: dict[int, str] = {}
    for line in (REPO_ROOT / CASE_FOLDING_FILE).read_text().splitlines():
        if match := _RANGE.fullmatch(line):
            first, last = int(match[1], 16), int(match[2], 16)
            step, delta = int(match[3]), int(match[4])
            for code_point in range(first, last + 1, step):
                assert code_point not in table
                table[code_point] = chr(code_point + delta)
        elif match := _TEXT.fullmatch(line):
            code_point = int(match[1], 16)
            assert code_point not in table
            table[code_point] = _ESCAPE.sub(
                lambda escape: chr(int(escape[1] or escape[2], 16)), match[2]
            )
    return table


def _committed_vectors() -> dict[str, object]:
    vectors = json.loads((REPO_ROOT / VECTORS_FILE).read_text())
    assert isinstance(vectors, dict)
    return vectors


def test_the_committed_files_match_the_interpreter_and_the_evaluator(
    capsys: pytest.CaptureFixture[str],
) -> None:
    assert main(['--check']) == 0
    assert capsys.readouterr() == ('', '')


def test_check_names_each_stale_file_and_writes_nothing(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([], root=tmp_path) == 0
    assert main(['--check'], root=tmp_path) == 0
    table = tmp_path / CASE_FOLDING_FILE
    table.write_text(table.read_text().replace('[0x0041, 0x005a, 1, 32]', ''))
    (tmp_path / VECTORS_FILE).unlink()
    capsys.readouterr()

    assert main(['--check'], root=tmp_path) == 1

    errors = capsys.readouterr().err
    assert f'{CASE_FOLDING_FILE.as_posix()} is stale' in errors
    assert f'{VECTORS_FILE.as_posix()} is stale' in errors
    assert 'uv run python -m scripts.export_check_fixtures' in errors
    assert not (tmp_path / VECTORS_FILE).exists()


def test_the_table_names_unicode_15_1_0() -> None:
    text = (REPO_ROOT / CASE_FOLDING_FILE).read_text()

    assert "export const UNICODE_VERSION = '15.1.0';" in text
    assert 'Unicode 15.1.0' in text.splitlines()[1]
    assert _committed_vectors()['unicode_version'] == '15.1.0'


def test_the_header_names_the_generator() -> None:
    header = (REPO_ROOT / CASE_FOLDING_FILE).read_text().splitlines()[:3]

    assert 'backend/scripts/export_check_fixtures.py' in header[0]
    assert 'Never edit it by hand' in header[1]


def test_the_capital_sharp_s_folds_to_ss_in_the_table() -> None:
    assert _committed_table()[CAPITAL_SHARP_S] == 'ss'


def test_the_table_holds_casefold_of_every_code_point_it_changes() -> None:
    expected = {
        code_point: chr(code_point).casefold()
        for code_point in range(sys.maxunicode + 1)
        if chr(code_point).casefold() != chr(code_point)
    }

    assert _committed_table() == expected


def test_casefold_works_code_point_by_code_point() -> None:
    # What checks/text.ts relies on: folding each code point gives the text's casefold
    table = _committed_table()
    text = ''.join(chr(code_point) for code_point in table) + 'ΣΊΣΥΦΟΣ σίσυφος'

    assert ''.join(table.get(ord(character), character) for character in text) == (
        text.casefold()
    )


def test_the_outcomes_cover_every_operator_of_every_kind() -> None:
    outcomes = _committed_vectors()['rule_outcomes']
    assert isinstance(outcomes, list)
    operators = {
        kind: {
            outcome['condition']['operator']
            for outcome in outcomes
            if outcome['kind'] == kind
        }
        for kind in ('number', 'text', 'enum', 'date')
    }

    assert operators == {
        'number': NUMBER_OPERATORS,
        'text': TEXT_OPERATORS,
        'enum': ENUM_OPERATORS,
        'date': DATE_OPERATORS,
    }


def test_the_outcomes_cover_a_class_held_and_one_not_held() -> None:
    outcomes = _committed_vectors()['rule_outcomes']
    assert isinstance(outcomes, list)

    for part in ('issue_date', 'expiry_date'):
        class_dates = [
            outcome
            for outcome in outcomes
            if outcome['target']['part'] == part and outcome['target']['licence_class']
        ]
        held = [outcome for outcome in class_dates if _holds_class(outcome)]
        not_held = [outcome for outcome in class_dates if not _holds_class(outcome)]
        assert {outcome['outcome'] for outcome in held} >= {'met', 'not_met'}
        assert not_held
        assert {outcome['outcome'] for outcome in not_held} == {'not_met'}


def _holds_class(outcome: dict[str, Any]) -> bool:
    """Whether the licence lists the class whose date the rule checks."""
    wanted = outcome['target']['licence_class'].casefold()
    return any(
        entry['vehicle_category_code'].strip().casefold() == wanted
        for entry in outcome['value']
    )
