"""Every server text in both languages, and what stays English (spec 009, R8).

Three checks (contracts/api-language.md, "Tests (pytest)"; FR-005, FR-017):

- every `Text` the services hold has two non-empty, different columns: found by
  walking the modules' constants (through nested dicts, tuples and lists) and,
  for the `Text`s built inline at the raise sites, by reading the `Text(...)` calls
  in `app/`'s source;
- the rules' sentence templates (`app/services/rules_texts.py`), rendered with the
  samples of the parity fixture (`scripts/export_check_fixtures.py`), end with the
  same punctuation and contain the same stored names in both columns;
- the strings kept English on purpose (serviceBW's answers, the approval requests'
  stored messages, the English access levels, the OAuth RFC bodies) are plain
  `str` without German. `ApiResponse.message` values are inline literals in the
  routers, typed `str` by `ApiResponse` and checked by mypy: not repeated here.
"""

import ast
import importlib
import re
from collections.abc import Iterator, Mapping
from pathlib import Path
from types import ModuleType
from typing import Any, cast

import pytest
from sqlalchemy.orm import Session

from app.language import Text
from app.routers import connect
from app.schemas import RegisterRequest
from app.services import approvals, auth, document_requests, oauth, rules_texts
from app.services.oauth import OauthError
from scripts.export_check_fixtures import (
    SAMPLE_BRANCH,
    SAMPLE_GROUP,
    SAMPLE_RULE,
    SAMPLE_SUB_GROUP,
    SAMPLE_VARIANT,
    UNITS,
    message_cases,
)

APP_DIR = Path(__file__).resolve().parents[2] / 'app'

# The modules whose constants hold the server's texts. `app.catalog` and
# `app.option_sets` keep `label_de` fields instead (tests/unit/test_catalog.py
# checks them) and are walked all the same, so a `Text` added there is checked too
TEXT_MODULES = (
    'app.errors',
    'app.catalog',
    'app.option_sets',
    'app.services.auth',
    'app.services.agent_access',
    'app.services.approvals',
    'app.services.document_requests',
    'app.services.eudiplo',
    'app.services.form_connections',
    'app.services.oauth',
    'app.services.rules',
    'app.services.rules_texts',
)
# The walk found 73 distinct `Text`s when this test was written: fewer than this
# means it stopped finding them, not that the texts went away
MIN_TEXTS = 60

# Constant texts equal in both languages, as `frontend/src/copy.test.ts` has them.
# Empty: every constant `Text` differs. An entry needs a reason beside it
EQUAL_IN_BOTH_LANGUAGES: frozenset[str] = frozenset()

# The functions whose `Text(...)` calls may have the same columns in the source,
# by file (relative to `app/`) and function, with the reason
SAME_SOURCE_IN_BOTH_LANGUAGES: dict[tuple[str, str], str] = {
    # A variant's stored name, which is the same in both languages (FR-007)
    ('services/rules_texts.py', 'variant_label'): 'a stored name',
    # "Rule 01 in Standard: ": both columns are a stored name, "in", a stored name;
    # the German preposition is the English one
    ('services/rules_texts.py', 'condition_prefix'): '"in" is German too',
}

# Characters that only the German texts use
GERMAN_CHARACTERS = re.compile('[äöüÄÖÜß„“]')

# The parameters of the parity fixture's cases that aren't stored names: the
# German sentence declines the noun and names the unit in German
NOT_A_NAME = frozenset({'noun', 'unit'})


def _texts_in(value: object, seen: set[int]) -> Iterator[Text]:
    """Every `Text` in a value, through nested dicts (keys and values), tuples,
    lists and sets."""
    if isinstance(value, Text):
        yield value
        return
    if not isinstance(value, dict | tuple | list | set | frozenset):
        return
    if id(value) in seen:
        return
    seen.add(id(value))
    items: list[object] = (
        [*value.keys(), *value.values()] if isinstance(value, dict) else list(value)
    )
    for item in items:
        yield from _texts_in(item, seen)


def _module_texts(module: ModuleType) -> list[Text]:
    """The `Text`s among a module's attributes, and inside its container constants.

    Re-exported ones count too (`rules` imports `rules_texts`' constants): a
    duplicate is checked twice, which costs nothing.
    """
    found: list[Text] = []
    seen: set[int] = set()
    for value in vars(module).values():
        found.extend(_texts_in(value, seen))
    return found


def _all_texts() -> dict[str, list[Text]]:
    return {name: _module_texts(importlib.import_module(name)) for name in TEXT_MODULES}


def _check_columns(text: Text, where: str) -> None:
    assert text.en.strip(), f'{where}: the English column is empty'
    assert text.de.strip(), f'{where}: the German column is empty'
    if text.en not in EQUAL_IN_BOTH_LANGUAGES:
        assert text.en != text.de, f'{where}: untranslated: {text.en!r}'


# Every Text


def test_every_constant_text_has_two_different_columns() -> None:
    """Every `Text` the modules hold, nested or not, is translated."""
    texts = _all_texts()
    for module, found in texts.items():
        for text in found:
            _check_columns(text, module)
    distinct = {id(text) for found in texts.values() for text in found}
    assert len(distinct) >= MIN_TEXTS


def test_the_walk_reaches_nested_texts() -> None:
    """The walk goes through dicts and the tuples inside them, so a nested `Text`
    isn't skipped (`ACCESS_LEVEL_TEXTS`: dict → tuple → `Text`)."""
    nested = list(_texts_in(auth.ACCESS_LEVEL_TEXTS, set()))
    assert len(nested) == 2 * len(auth.ACCESS_LEVEL_TEXTS)
    found = {id(text) for text in _module_texts(auth)}
    assert {id(text) for text in nested} <= found
    # The modules known to hold texts hold some
    texts = _all_texts()
    for module in (
        'app.errors',
        'app.services.auth',
        'app.services.agent_access',
        'app.services.approvals',
        'app.services.eudiplo',
        'app.services.form_connections',
        'app.services.oauth',
        'app.services.rules_texts',
    ):
        assert texts[module], f'{module}: no Text found'


class _TextCalls(ast.NodeVisitor):
    """The `Text(...)` calls of a module, with the function each is in."""

    def __init__(self) -> None:
        self.functions: list[str] = []
        self.calls: list[tuple[str, ast.Call]] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        self.functions.append(node.name)
        self.generic_visit(node)
        self.functions.pop()

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name) and node.func.id == 'Text':
            self.calls.append((self.functions[-1] if self.functions else '', node))
        self.generic_visit(node)


def _columns(call: ast.Call) -> tuple[ast.expr, ast.expr]:
    keywords = {keyword.arg: keyword.value for keyword in call.keywords}
    positional = list(call.args)
    en = keywords.get('en') or positional[0]
    de = keywords.get('de') or positional[1]
    return en, de


def _literal(expr: ast.expr) -> str | None:
    """The literal text of a string or an f-string, without its placeholders."""
    if isinstance(expr, ast.Constant) and isinstance(expr.value, str):
        return expr.value
    if isinstance(expr, ast.JoinedStr):
        return ''.join(
            part.value
            for part in expr.values
            if isinstance(part, ast.Constant) and isinstance(part.value, str)
        )
    return None


def _text_calls() -> Iterator[tuple[str, str, ast.Call]]:
    for path in sorted(APP_DIR.rglob('*.py')):
        visitor = _TextCalls()
        visitor.visit(ast.parse(path.read_text(encoding='utf-8')))
        relative = path.relative_to(APP_DIR).as_posix()
        for function, call in visitor.calls:
            yield relative, function, call


def test_every_text_in_the_source_is_translated() -> None:
    """The `Text`s built at the raise sites and in the helpers: their columns
    differ in the source, and a literal or f-string's words differ, not only its
    placeholders. A function in `SAME_SOURCE_IN_BOTH_LANGUAGES` is exempt."""
    calls = list(_text_calls())
    assert len(calls) >= 100
    for relative, function, call in calls:
        where = f'{relative}:{call.lineno} ({function})'
        en, de = _columns(call)
        if (relative, function) in SAME_SOURCE_IN_BOTH_LANGUAGES:
            continue
        assert ast.unparse(en) != ast.unparse(de), f'{where}: the same columns'
        en_literal, de_literal = _literal(en), _literal(de)
        if en_literal is None or de_literal is None:
            continue
        if isinstance(en, ast.Constant) and isinstance(de, ast.Constant):
            assert en_literal.strip() and de_literal.strip(), f'{where}: empty'
        assert en_literal != de_literal, f'{where}: untranslated words'


# The rules' sentence templates


def _final_punctuation(text: str) -> str:
    return text[-1] if text and text[-1] in '.!?:' else ''


def _check_template(text: Text, names_en: list[str], names_de: list[str]) -> None:
    _check_columns(text, text.en)
    assert _final_punctuation(text.en), f'no final punctuation: {text.en!r}'
    assert _final_punctuation(text.en) == _final_punctuation(text.de), text
    for name in names_en:
        assert name in text.en, f'{name!r} missing from {text.en!r}'
    for name in names_de:
        assert name in text.de, f'{name!r} missing from {text.de!r}'


def test_the_mirrored_templates_keep_punctuation_and_names() -> None:
    """Every case of the parity fixture: the same final punctuation, and the
    stored names of its parameters in both columns.

    The legitimate differences: a noun or unit parameter is translated, not a
    stored name (`NOT_A_NAME`); `unknownPart` names the field by its German catalog
    label (the case's `params_de`); a condition problem is the fragment after
    "Rule 01 in Standard: " (lower case in English, a sentence in German), so its
    names are checked in the whole message below.
    """
    cases = message_cases()
    assert len(cases) >= 39
    checked_names = 0
    for case in cases:
        params_de = case.params_de if case.params_de is not None else case.params
        names_en = [v for k, v in case.params.items() if k not in NOT_A_NAME]
        names_de = [v for k, v in params_de.items() if k not in NOT_A_NAME]
        _check_template(case.text, names_en, names_de)
        checked_names += len(names_en)
    assert checked_names >= 20
    # `unknownPart` is the only case whose German parameters differ
    assert [case.key for case in cases if case.params_de is not None] == ['unknownPart']


def test_the_condition_problems_in_their_whole_message() -> None:
    """A condition problem's message: the prefix with the rule and variant, and the
    problem's punctuation, in both columns."""
    prefix = rules_texts.condition_prefix(SAMPLE_RULE, SAMPLE_BRANCH)
    assert prefix.en == prefix.de == f'{SAMPLE_RULE} in {SAMPLE_BRANCH}: '
    problems = [
        *rules_texts.CONDITION_PROBLEMS.values(),
        *(rules_texts.amount_at_least_1(unit) for unit in UNITS),
    ]
    for problem in problems:
        _check_template(problem, [], [])
        message = rules_texts.condition_problem(SAMPLE_RULE, SAMPLE_BRANCH, problem)
        names = [SAMPLE_RULE, SAMPLE_BRANCH]
        _check_template(message, names, names)
        assert message.en.startswith(prefix.en) and message.de.startswith(prefix.de)


def test_variant_label() -> None:
    """A named variant keeps its name in both languages; an unnamed one is
    "Variant 3" / "Variante 3"."""
    named = rules_texts.variant_label(SAMPLE_VARIANT, 3)
    assert named.en == named.de == SAMPLE_VARIANT
    unnamed = rules_texts.variant_label('', 3)
    assert (unnamed.en, unnamed.de) == ('Variant 3', 'Variante 3')
    # A template given an unnamed variant names it in each language
    message = rules_texts.choose_data(SAMPLE_RULE, unnamed)
    _check_template(message, [SAMPLE_RULE, 'Variant 3'], [SAMPLE_RULE, 'Variante 3'])


@pytest.mark.parametrize(
    ('branch', 'main'),
    [
        (SAMPLE_VARIANT, SAMPLE_BRANCH),
        (SAMPLE_BRANCH, SAMPLE_BRANCH),
        (rules_texts.variant_label('', 2), SAMPLE_BRANCH),
    ],
)
def test_out_of_step(branch: str | Text, main: str) -> None:
    """The variant out of step, with and without the main branch named."""
    text = rules_texts.out_of_step(branch, main)
    branch_en, branch_de = (
        (branch.en, branch.de) if isinstance(branch, Text) else (branch, branch)
    )
    names_en, names_de = [branch_en, main], [branch_de, main]
    _check_template(text, names_en, names_de)


@pytest.mark.parametrize(
    ('deleted', 'returning'),
    [
        ([], []),
        ([SAMPLE_VARIANT], []),
        ([], [SAMPLE_VARIANT]),
        (['Taxi', 'Bus'], []),
        ([], ['Taxi', 'Bus', 'Night service']),
        (['Taxi'], ['Bus', 'Night service']),
    ],
)
def test_rules_changed(deleted: list[str], returning: list[str]) -> None:
    """The `409 rules_changed` names every variant it deletes or brings back."""
    names = [*deleted, *returning]
    _check_template(rules_texts.rules_changed(deleted, returning), names, names)


def test_the_constant_rules_texts() -> None:
    """The constants beside the templates, with the item names a template takes."""
    for text in (rules_texts.INVALID_IDENTIFIER, rules_texts.UNKNOWN_BRANCH):
        _check_template(text, [], [])
    for name in (SAMPLE_RULE, SAMPLE_GROUP, SAMPLE_SUB_GROUP):
        text = rules_texts.message_too_long(name, SAMPLE_BRANCH)
        _check_template(text, [name, SAMPLE_BRANCH], [name, SAMPLE_BRANCH])


# What stays English


def _check_english(value: object, where: str) -> None:
    assert type(value) is str, f'{where} must stay a plain English str'
    assert value.strip(), f'{where} is empty'
    assert not GERMAN_CHARACTERS.search(value), f'{where} reads German: {value!r}'


def test_service_bw_answers_stay_english() -> None:
    """`/api/connect/`'s answers are plain English whatever the header (FR-017)."""
    details: Mapping[str, Mapping[str, Any]] = {
        'FORM_CONNECTION_NOT_FOUND': document_requests.FORM_CONNECTION_NOT_FOUND,
        'REQUEST_NOT_FOUND': document_requests.REQUEST_NOT_FOUND,
        'UNAVAILABLE_DETAIL': document_requests.UNAVAILABLE_DETAIL,
        'BRANCH_DELETED_DETAIL': document_requests.BRANCH_DELETED_DETAIL,
        'BRANCH_ADDED_LATER_DETAIL': document_requests.BRANCH_ADDED_LATER_DETAIL,
    }
    for name, detail in details.items():
        _check_english(detail['message'], f'document_requests.{name}')
        _check_english(detail['error'], f'document_requests.{name}["error"]')
    _check_english(connect.TRIGGER_FAILED, 'connect.TRIGGER_FAILED')
    _check_english(connect.PULL_FAILED, 'connect.PULL_FAILED')


def test_approval_messages_stay_english() -> None:
    """The approval requests' stored messages stay English (FR-017: stored data)."""
    assert approvals.APPROVED_MESSAGES
    for action, message in approvals.APPROVED_MESSAGES.items():
        _check_english(message, f'approvals.APPROVED_MESSAGES[{action!r}]')
    _check_english(approvals.DECLINED_MESSAGE, 'approvals.DECLINED_MESSAGE')


def test_access_levels_stay_english() -> None:
    """`ACCESS_LEVELS` is the English view; the API answers `access_levels_view()`."""
    assert [info.level for info in auth.ACCESS_LEVELS] == list(auth.ACCESS_LEVEL_TEXTS)
    for info in auth.ACCESS_LEVELS:
        name, allows = auth.ACCESS_LEVEL_TEXTS[info.level]
        _check_english(info.name, f'ACCESS_LEVELS[{info.level!r}].name')
        _check_english(info.allows, f'ACCESS_LEVELS[{info.level!r}].allows')
        assert (info.name, info.allows) == (name.en, allows.en)


class _NoDatabase:
    """A session the refusals below must not touch."""

    def __getattr__(self, name: str) -> Any:
        raise AssertionError(f'the refusal used the database ({name})')


NO_DATABASE = cast(Session, _NoDatabase())


def _register(**fields: Any) -> RegisterRequest:
    data: dict[str, Any] = {
        'client_name': 'Agent',
        'redirect_uris': ['https://agent.test/callback'],
        'token_endpoint_auth_method': 'none',
    }
    return RegisterRequest(**(data | fields))


@pytest.mark.parametrize(
    'params',
    [
        {},
        {'grant_type': 'password'},
        {'grant_type': 'authorization_code'},
        {'grant_type': 'refresh_token'},
    ],
)
def test_token_refusals_stay_english(params: dict[str, str]) -> None:
    """The token endpoint's RFC bodies refused before any database access."""
    with pytest.raises(OauthError) as refused:
        oauth.token_grant(NO_DATABASE, params)
    _check_english(refused.value.description, f'token_grant({params})')
    assert refused.value.body()['error_description'] == refused.value.description


@pytest.mark.parametrize(
    'data',
    [
        _register(token_endpoint_auth_method='client_secret_basic'),
        _register(redirect_uris=[]),
        _register(redirect_uris=['http://agent.test/callback']),
        _register(client_name='  '),
    ],
)
def test_registration_refusals_stay_english(data: RegisterRequest) -> None:
    """The registration endpoint's RFC bodies (RFC 7591)."""
    with pytest.raises(OauthError) as refused:
        oauth.register_client(NO_DATABASE, data)
    assert refused.value.error == 'invalid_client_metadata'
    _check_english(refused.value.description, 'register_client')


def _calls_text(node: ast.AST) -> bool:
    return any(
        isinstance(child, ast.Call)
        and isinstance(child.func, ast.Name)
        and child.func.id == 'Text'
        for child in ast.walk(node)
    )


def test_every_rfc_body_in_the_source_stays_english() -> None:
    """Every refusal marked `# RFC body, English` in `oauth.py`, including those
    that need a database to reach: the statement after the marker raises with
    literal English and no `Text`."""
    path = APP_DIR / 'services' / 'oauth.py'
    source = path.read_text(encoding='utf-8')
    raises = {
        node.lineno: node
        for node in ast.walk(ast.parse(source))
        if isinstance(node, ast.Raise)
    }
    lines = source.splitlines()
    markers = [
        number
        for number, line in enumerate(lines, start=1)
        if line.strip() == '# RFC body, English'
    ]
    assert len(markers) >= 15
    for marker in markers:
        statement = raises.get(marker + 1)
        assert statement is not None, f'oauth.py:{marker}: no raise after the marker'
        assert not _calls_text(statement), f'oauth.py:{marker + 1} raises a Text'
        call = statement.exc
        assert isinstance(call, ast.Call)
        description = (
            call.args[1] if _function_name(call) == 'refusal' else call.args[0]
        )
        literal = _literal(description)
        assert literal, f'oauth.py:{marker + 1}: the description is not a literal'
        assert not GERMAN_CHARACTERS.search(literal), f'oauth.py:{marker + 1}'


def _function_name(call: ast.Call) -> str:
    return call.func.id if isinstance(call.func, ast.Name) else ''
