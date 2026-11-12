"""scripts/export_check_fixtures: the rule checks' generated files (research R13).

The case-folding table and the evaluator's vectors in rules/src/checks/
are generated from this interpreter and app/services/evaluation.py, and
rules/src/fixtures/server-messages.json from app/services/rules_texts.py (spec 009,
research R8), and rules/src/fixtures/example-connection.json from app/example.py
(spec 010, research R7). These tests fail when they are stale: run
`uv run python -m scripts.export_check_fixtures` and commit the result.
"""

import json
import re
import subprocess
import sys
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

import pytest

from app.example import example_content
from app.language import Language, request_language
from app.routers.document_types import list_document_types
from app.routers.option_sets import list_option_sets
from app.services.form_connections import documents_view
from app.services.rules import (
    DATE_OPERATORS,
    ENUM_OPERATORS,
    NUMBER_OPERATORS,
    TEXT_OPERATORS,
)
from scripts import export_check_fixtures
from scripts.export_check_fixtures import (
    CASE_FOLDING_FILE,
    EXAMPLE_FILE,
    REPO_ROOT,
    SERVER_MESSAGES_FILE,
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


# The server's messages that the rules step mirrors (spec 009, research R8)

CONSTANTS_FILE = Path('rules/src/constants.ts')
# A key of a TS table, and its parameters if it is a function
_KEY = re.compile(r'^ {2,4}([A-Za-z_][A-Za-z0-9_]*):(?:\s*\(([^)]*)\) =>)?', re.M)


def _committed_messages() -> dict[str, Any]:
    messages = json.loads((REPO_ROOT / SERVER_MESSAGES_FILE).read_text())
    assert isinstance(messages, dict)
    return messages


def _ts_table(name: str) -> dict[str, list[str]]:
    """A table of rules/src/constants.ts, read back from its English column
    (`const <name>_EN = {…}`, which the German column's type follows): each key
    with the names of its function's parameters, in order ([] for a text)."""
    source = (REPO_ROOT / CONSTANTS_FILE).read_text()
    start = source.index(f'const {name}_EN = {{')
    end = source.index('\n}', start)
    keys: dict[str, list[str]] = {}
    for match in _KEY.finditer(source[start:end]):
        parameters = [
            parameter.split(':', 1)[0].strip()
            for parameter in (match[2] or '').split(',')
            if parameter.strip()
        ]
        keys.setdefault(match[1], parameters)
    return keys


def test_the_server_messages_are_written_and_checked() -> None:
    assert SERVER_MESSAGES_FILE in export_check_fixtures.generated_files()
    text = (REPO_ROOT / SERVER_MESSAGES_FILE).read_text()

    assert text == export_check_fixtures.server_messages_json()
    assert text.endswith('}\n')
    assert (
        'backend/scripts/export_check_fixtures.py' in _committed_messages()['generator']
    )


def test_check_names_the_server_messages_when_a_sample_changes(
    monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(export_check_fixtures, 'SAMPLE_BRANCH', 'Taxi')

    assert main(['--check']) == 1

    errors = capsys.readouterr().err
    assert f'{SERVER_MESSAGES_FILE.as_posix()} is stale' in errors
    assert f'{VECTORS_FILE.as_posix()} is stale' not in errors


def test_check_names_the_server_messages_when_the_file_was_edited(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([], root=tmp_path) == 0
    messages = tmp_path / SERVER_MESSAGES_FILE
    messages.write_text(messages.read_text().replace('Wählen Sie', 'Wähle'))
    capsys.readouterr()

    assert main(['--check'], root=tmp_path) == 1
    assert f'{SERVER_MESSAGES_FILE.as_posix()} is stale' in capsys.readouterr().err


def test_every_rules_message_is_a_case_or_client_only() -> None:
    messages = _committed_messages()
    cases = {
        case['key'] for case in messages['cases'] if case['table'] == 'RULES_MESSAGES'
    }
    client_only = {entry['key'] for entry in messages['client_only']}

    assert not cases & client_only
    assert cases | client_only == set(_ts_table('RULES_MESSAGES'))
    assert all(entry['reason'] for entry in messages['client_only'])


def test_every_condition_problem_is_a_case_and_unknown_variant_too() -> None:
    cases = _committed_messages()['cases']
    condition_cases = [
        case for case in cases if case['table'] == 'CONDITION_PROBLEM_MESSAGES'
    ]

    assert {case['key'] for case in condition_cases} == set(
        _ts_table('CONDITION_PROBLEM_MESSAGES')
    )
    assert [
        case['params'] for case in condition_cases if case['key'] == 'amount_at_least_1'
    ] == [{'unit': 'years'}, {'unit': 'months'}]
    edits = [case['key'] for case in cases if case['table'] == 'EDIT_MESSAGES']
    assert edits == ['unknownVariant']
    assert 'unknownVariant' in _ts_table('EDIT_MESSAGES')


def test_each_cases_params_follow_the_ts_parameters_in_order() -> None:
    """So that `fn(...Object.values(params))` renders the case in the TS test."""
    tables = {
        table: _ts_table(table)
        for table in ('RULES_MESSAGES', 'CONDITION_PROBLEM_MESSAGES', 'EDIT_MESSAGES')
    }

    for case in _committed_messages()['cases']:
        parameters = tables[case['table']][case['key']]
        assert list(case['params']) == parameters, case['key']
        if 'params_de' in case:
            assert list(case['params_de']) == parameters, case['key']


def test_the_cases_are_complete_and_translated() -> None:
    messages = _committed_messages()
    prefix = messages['condition_problem_prefix']

    assert (prefix['en'], prefix['de']) == (
        'Rule 01 in Standard: ',
        'Rule 01 in Standard: ',
    )
    for case in messages['cases']:
        assert case['en'] and case['de'], case['key']
        assert case['en'] != case['de'], case['key']


def test_the_reference_sentence_is_the_glossarys() -> None:
    """Glossary §3's last row, word for word."""
    [choose_data] = [
        case for case in _committed_messages()['cases'] if case['key'] == 'chooseData'
    ]

    assert choose_data == {
        'key': 'chooseData',
        'table': 'RULES_MESSAGES',
        'params': {'rule': 'Rule 01', 'branch': 'Standard'},
        'en': 'Rule 01 in Standard: choose the data to check.',
        'de': 'Rule 01 in Standard: Wählen Sie die zu prüfenden Daten.',
    }


# The example connection (spec 010, research R7, FR-056)


def _committed_example() -> dict[str, Any]:
    example = json.loads((REPO_ROOT / EXAMPLE_FILE).read_text())
    assert isinstance(example, dict)
    return example


@contextmanager
def _in_language(language: Language) -> Iterator[None]:
    token = request_language.set(language)
    try:
        yield
    finally:
        request_language.reset(token)


def test_the_example_is_written_and_checked() -> None:
    assert EXAMPLE_FILE in export_check_fixtures.generated_files()
    text = (REPO_ROOT / EXAMPLE_FILE).read_text()

    assert text == export_check_fixtures.example_connection_json()
    assert text.endswith('}\n')
    generator = _committed_example()['generator']
    assert 'backend/scripts/export_check_fixtures.py' in generator


def test_check_names_the_example_when_the_file_was_edited(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    assert main([], root=tmp_path) == 0
    example = tmp_path / EXAMPLE_FILE
    example.write_text(example.read_text().replace('"years": 21', '"years": 18'))
    capsys.readouterr()

    assert main(['--check'], root=tmp_path) == 1
    errors = capsys.readouterr().err
    assert f'{EXAMPLE_FILE.as_posix()} is stale' in errors
    assert f'{SERVER_MESSAGES_FILE.as_posix()} is stale' not in errors


@pytest.mark.parametrize('language', ['en', 'de'])
def test_the_example_is_the_draft_as_the_editor_loads_it(language: Language) -> None:
    """The fixture holds what the API answers for the stored example."""
    committed = _committed_example()[language]
    content = example_content(language)
    assert content.rules is not None
    with _in_language(language):
        documents = documents_view(content.documents)
        document_types = list_document_types().data
        option_sets = list_option_sets().data
    assert document_types is not None and option_sets is not None
    draft = committed['draft']

    assert (draft['name'], draft['description']) == (
        content.name,
        content.description,
    )
    assert draft['documents'] == [
        document.model_dump(mode='json') for document in documents
    ]
    assert [branch['id'] for branch in draft['branches']] == list(
        export_check_fixtures.EXAMPLE_BRANCH_IDS
    )
    assert draft['branches'] == [
        branch.model_copy(update={'id': branch_id}).model_dump(mode='json')
        for branch, branch_id in zip(
            content.rules.branches,
            export_check_fixtures.EXAMPLE_BRANCH_IDS,
            strict=True,
        )
    ]
    assert (draft['next_rule_number'], draft['next_group_number']) == (3, 1)
    assert (draft['step'], draft['example']) == ('connection', 'unchanged')
    assert committed['document_types'] == [
        entry.model_dump(mode='json')
        for entry in document_types
        if entry.key in {'pid', 'mdl'}
    ]
    assert committed['option_sets'] == [
        entry.model_dump(mode='json')
        for entry in option_sets
        if entry.key == 'licence_classes'
    ]


def test_the_script_never_imports_the_settings() -> None:
    """Developer scripts never import app.config (CLAUDE.md)."""
    probe = (
        'import sys, scripts.export_check_fixtures; '
        "sys.exit('app.config' in sys.modules)"
    )

    result = subprocess.run(
        [sys.executable, '-c', probe],
        cwd=REPO_ROOT / 'backend',
        check=False,
    )

    assert result.returncode == 0
