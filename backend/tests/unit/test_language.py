"""Tests for the request language and the two-language texts (spec 009, R6)."""

import asyncio
import contextvars
from typing import Any

import pytest
from starlette.types import Message, Receive, Scope, Send

from app.language import (
    DEFAULT_LANGUAGE,
    Language,
    Text,
    current_language,
    language_of,
    language_of_scope,
    request_language,
    resolve_text,
)
from app.main import LanguageMiddleware


@pytest.mark.parametrize(
    ('header', 'expected'),
    [
        ('de', 'de'),
        ('de-AT,de;q=0.9,en;q=0.8', 'de'),
        ('DE-CH', 'de'),
        ('de_DE', 'de'),
        ('en-US', 'en'),
        ('fr', 'en'),
        ('en, de', 'en'),
        ('', 'en'),
        (None, 'en'),
    ],
)
def test_language_of_reads_first_tag(header: str | None, expected: Language) -> None:
    """The first tag's primary subtag `de` gives German, anything else English."""
    assert language_of(header) == expected


def test_default_language_is_english() -> None:
    """Without a German header the texts are English."""
    assert DEFAULT_LANGUAGE == 'en'


def test_text_resolves_both_ways() -> None:
    """A `Text` returns the column of the language asked for."""
    text = Text(en='Save', de='Speichern')
    assert text.resolve('en') == 'Save'
    assert text.resolve('de') == 'Speichern'


def test_resolve_text_passes_a_string_through() -> None:
    """A plain string is returned as it is."""
    assert resolve_text('Plain message') == 'Plain message'


def test_resolve_text_resolves_a_text_in_the_current_language() -> None:
    """A `Text` resolves with the current language, English by default."""
    text = Text(en='Save', de='Speichern')

    def in_german() -> str:
        request_language.set('de')
        return resolve_text(text)

    assert resolve_text(text) == 'Save'
    assert contextvars.copy_context().run(in_german) == 'Speichern'


def test_current_language_defaults_to_english() -> None:
    """Outside a request the language is English."""
    assert contextvars.copy_context().run(current_language) == 'en'


def test_current_language_follows_the_context_variable() -> None:
    """Setting the variable in a fresh context changes only that context."""

    def in_german() -> Language:
        request_language.set('de')
        return current_language()

    assert contextvars.copy_context().run(in_german) == 'de'
    assert current_language() == 'en'


def _scope(
    path: str, accept_language: str | None = None, kind: str = 'http'
) -> dict[str, Any]:
    headers = [(b'host', b'testserver')]
    if accept_language is not None:
        headers.append((b'accept-language', accept_language.encode('latin-1')))
    return {'type': kind, 'path': path, 'headers': headers}


@pytest.mark.parametrize(
    ('path', 'accept_language', 'expected'),
    [
        ('/api/form-connections', 'de', 'de'),
        ('/api/form-connections', 'de-AT,de;q=0.9,en;q=0.8', 'de'),
        ('/api/form-connections', 'en', 'en'),
        ('/api/form-connections', None, 'en'),
        ('/api/connectors', 'de', 'de'),
        # serviceBW's URLs answer in English whatever the header says (FR-017)
        ('/api/connect/x', 'de', 'en'),
        ('/api/connect/fc-1/requests', 'de-AT,de;q=0.9,en;q=0.8', 'en'),
        ('/api/connect/fc-1/branches/b-1/requests/ref', 'de', 'en'),
    ],
)
def test_language_of_scope_reads_the_header_and_pins_the_connection_urls(
    path: str, accept_language: str | None, expected: Language
) -> None:
    """The header's language, except under `/api/connect/`, which stays English."""
    assert language_of_scope(_scope(path, accept_language)) == expected


def test_language_of_scope_reads_the_first_header_in_any_case() -> None:
    """A name in capitals is read too, and the first of two headers counts."""
    scope = {
        'type': 'http',
        'path': '/api/form-connections',
        'headers': [(b'Accept-Language', b'de'), (b'accept-language', b'en')],
    }
    assert language_of_scope(scope) == 'de'


def test_language_of_scope_without_path_or_headers_is_english() -> None:
    """A scope without a path or headers gives English."""
    assert language_of_scope({'type': 'http'}) == 'en'


async def _receive() -> Message:
    return {'type': 'http.request', 'body': b'', 'more_body': False}


async def _send(_message: Message) -> None:
    return None


def _drive(scope: dict[str, Any], fail: bool = False) -> tuple[list[Language], str]:
    """Run the middleware around an app that records `current_language()`.

    Returns the languages the app saw and the language after the middleware, read
    in the same task, so that a missing reset would show.
    """
    seen: list[Language] = []

    async def inner(_scope: Scope, _receive: Receive, _send: Send) -> None:
        seen.append(current_language())
        if fail:
            raise RuntimeError('the app failed')

    async def run() -> str:
        if fail:
            with pytest.raises(RuntimeError):
                await LanguageMiddleware(inner)(scope, _receive, _send)
        else:
            await LanguageMiddleware(inner)(scope, _receive, _send)
        return current_language()

    after = asyncio.run(run())
    return seen, after


@pytest.mark.parametrize(
    ('path', 'accept_language', 'expected'),
    [
        ('/api/form-connections', 'de', 'de'),
        ('/api/form-connections', 'de-AT,de;q=0.9,en;q=0.8', 'de'),
        ('/api/form-connections', None, 'en'),
        ('/api/form-connections', 'fr', 'en'),
        ('/api/connect/x', 'de', 'en'),
        ('/api/connect/fc-1/requests/ref', 'de-AT', 'en'),
    ],
)
def test_the_middleware_sets_the_language_and_resets_it(
    path: str, accept_language: str | None, expected: Language
) -> None:
    """The app sees the request's language; afterwards it is English again."""
    seen, after = _drive(_scope(path, accept_language))

    assert seen == [expected]
    assert after == 'en'


@pytest.mark.parametrize('path', ['/api/form-connections', '/api/connect/x'])
def test_the_middleware_resets_the_language_when_the_app_raises(path: str) -> None:
    """A failing app leaves no language behind."""
    seen, after = _drive(_scope(path, 'de'), fail=True)

    assert seen == ['de' if path == '/api/form-connections' else 'en']
    assert after == 'en'


@pytest.mark.parametrize('kind', ['lifespan', 'websocket'])
def test_the_middleware_leaves_other_scopes_alone(kind: str) -> None:
    """Only HTTP requests get a language; anything else passes through."""
    seen, after = _drive(_scope('/api/form-connections', 'de', kind))

    assert seen == ['en']
    assert after == 'en'
