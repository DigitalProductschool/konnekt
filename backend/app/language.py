"""The language of a request's texts: English or German (spec 009, R6).

A leaf module: it imports nothing from the app, so that `errors.py`, the catalog
and every service can import it. Nothing here logs the header or a text.
"""

from collections.abc import Mapping
from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any, Literal

Language = Literal['en', 'de']
"""The languages the website's texts come in."""

DEFAULT_LANGUAGE: Language = 'en'
"""The language of a request without a German `Accept-Language` header."""

CONNECT_PATH_PREFIX = '/api/connect/'
"""serviceBW's connection URLs, which answer in English whatever the header says."""


def language_of(header: str | None) -> Language:
    """Read the language from an `Accept-Language` header.

    Only the first tag counts (the browser sends one; a list's first tag is its most
    preferred) and the `q` weights are not read. Its primary subtag `de` (`de`,
    `de-AT`, `de_DE`, any case) gives German; anything else, an empty or a missing
    header gives English.
    """
    if not header:
        return DEFAULT_LANGUAGE
    first_tag = header.split(',', 1)[0].strip().lower()
    primary_subtag = first_tag.replace('_', '-').split('-', 1)[0]
    return 'de' if primary_subtag == 'de' else DEFAULT_LANGUAGE


def language_of_scope(scope: Mapping[str, Any]) -> Language:
    """Read the language of an HTTP request's texts from its ASGI scope.

    English for every path under `/api/connect/` whatever the header says (FR-017:
    serviceBW's integration answers in English), otherwise the `Accept-Language`
    header's (`language_of`). The language middleware sets `request_language` from
    it, and the generic exception handler, which Starlette runs outside every
    middleware, reads it again: one rule for both.
    """
    path = scope.get('path')
    if isinstance(path, str) and path.startswith(CONNECT_PATH_PREFIX):
        return DEFAULT_LANGUAGE
    header: str | None = None
    for name, value in scope.get('headers') or ():
        # ASGI servers lower-case the names; the first header counts, as in Starlette
        if name.lower() == b'accept-language':
            header = value.decode('latin-1')
            break
    return language_of(header)


@dataclass(frozen=True)
class Text:
    """A text in both languages, resolved to the request's language at the edge."""

    en: str
    de: str

    def resolve(self, language: Language) -> str:
        """Return the text in the given language."""
        return self.de if language == 'de' else self.en


request_language: ContextVar[Language] = ContextVar(
    'request_language', default=DEFAULT_LANGUAGE
)
"""The current request's language, set by the language middleware in `main.py`
from `language_of_scope`."""


def current_language() -> Language:
    """Return the current request's language (English outside a request)."""
    return request_language.get()


def resolve_text(value: str | Text) -> str:
    """Resolve a `Text` in the current language; a plain string passes through."""
    if isinstance(value, Text):
        return value.resolve(current_language())
    return value
