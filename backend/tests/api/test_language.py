"""The language of the API's texts (spec 009, R6; contracts/api-language.md).

`Accept-Language` chooses the messages' language; the `error` codes stay, and
serviceBW's connection URLs answer in English whatever the header says (FR-017).
Nothing about the language reaches a log (FR-018).
"""

import asyncio
import json
import logging
import re
from collections.abc import Awaitable, Callable, Iterator
from contextvars import copy_context
from typing import Any, cast

import pytest
from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.testclient import TestClient

from app.errors import INTERNAL_ERROR_MESSAGE
from app.language import Language, Text, request_language
from app.main import LanguageMiddleware, RedactReferencesFilter, app
from app.schemas import RequestedDocument
from app.services import document_requests, drafts, form_connections, worker
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    DELIVERED_DOCUMENTS,
    FORM_CONNECTION,
    create_form_connection,
    pull_url,
    requests_url,
    share,
    trigger,
)

GERMAN = {'Accept-Language': 'de'}
BROWSER_LIST = 'de-AT,de;q=0.9,en;q=0.8'
FORM_CONNECTION_ID = '7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b'
UNKNOWN_ID = '00000000-0000-4000-8000-000000000000'

NAME_REQUIRED = {
    'error': 'Validation error',
    'message': 'Enter a name for the connection.',
}
NAME_REQUIRED_DE = {
    'error': 'Validation error',
    'message': 'Geben Sie einen Namen für die Anbindung ein.',
}
INVALID_PAYLOAD = {'error': 'Validation error', 'message': 'Invalid request payload'}
INVALID_PAYLOAD_DE = {'error': 'Validation error', 'message': 'Ungültige Anfrage.'}
INTERNAL_ERROR_EN = (
    'Something went wrong on our side. Contact an administrator and give them the '
    'error ID.'
)
INTERNAL_ERROR_DE = (
    'Etwas ist auf unserer Seite schiefgelaufen. Wenden Sie sich an eine '
    'Administratorin oder einen Administrator und nennen Sie die Fehler-ID.'
)
FORM_CONNECTION_NOT_FOUND = {
    'error': 'Not found',
    'message': 'Form connection not found',
}


@pytest.fixture
def failing_client(monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """A signed-in client whose form connection reads and triggers fail with a 5xx.

    It answers the 500 as the server does, instead of raising the error in the test.
    """

    def fail(*_args: object) -> None:
        raise RuntimeError('the database is gone')

    monkeypatch.setattr(drafts, 'get_form_connection_or_draft', fail)
    monkeypatch.setattr(document_requests, 'trigger', fail)
    create_user()
    with TestClient(app, raise_server_exceptions=False) as client:
        signed_in = client.post(
            '/api/auth/login',
            json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
        )
        assert signed_in.status_code == 200
        yield client


def _create_without_name(
    client: TestClient, headers: dict[str, str]
) -> tuple[int, Any]:
    response = client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'name': ''}, headers=headers
    )
    return response.status_code, response.json()


def _post_invalid_json(client: TestClient, headers: dict[str, str]) -> tuple[int, Any]:
    response = client.post(
        '/api/form-connections',
        content=b'{"name": ',
        headers={'Content-Type': 'application/json'} | headers,
    )
    return response.status_code, response.json()


@pytest.mark.parametrize('accept_language', ['de', BROWSER_LIST, 'DE-CH'])
def test_a_service_message_follows_a_german_header(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, accept_language: str
) -> None:
    """The message raised in a plain `def` handler's service is German (V2)."""
    status_code, body = _create_without_name(
        signed_in_client, {'Accept-Language': accept_language}
    )

    assert status_code == 400
    # The error code stays English: the frontend and the MCP branch on it
    assert body == NAME_REQUIRED_DE
    assert fake_eudiplo.calls == []


@pytest.mark.parametrize(
    'headers',
    [{}, {'Accept-Language': 'en'}, {'Accept-Language': 'fr'}, {'Accept-Language': ''}],
)
def test_a_service_message_stays_english_without_a_german_header(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, headers: dict[str, str]
) -> None:
    """Without a German header the message is spec 008's English."""
    status_code, body = _create_without_name(signed_in_client, headers)

    assert status_code == 400
    assert body == NAME_REQUIRED


def test_a_german_request_leaves_the_next_one_english(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The language lasts one request: the next one without a header is English."""
    assert _create_without_name(signed_in_client, GERMAN)[1] == NAME_REQUIRED_DE
    assert _create_without_name(signed_in_client, {})[1] == NAME_REQUIRED


def test_an_invalid_body_answers_in_the_requests_language(
    signed_in_client: TestClient,
) -> None:
    """The generic 400 of a body that isn't JSON follows the header."""
    assert _post_invalid_json(signed_in_client, GERMAN) == (400, INVALID_PAYLOAD_DE)
    assert _post_invalid_json(signed_in_client, {}) == (400, INVALID_PAYLOAD)


def test_a_server_error_answers_in_german_with_its_error_id(
    failing_client: TestClient, error_log: Callable[[str], str]
) -> None:
    """The 5xx handler runs outside the middleware and still answers in German."""
    response = failing_client.get(
        f'/api/form-connections/{FORM_CONNECTION_ID}', headers=GERMAN
    )

    assert response.status_code == 500
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Internal server error',
        'message': INTERNAL_ERROR_DE,
        'error_id': error_id,
    }
    assert 'RuntimeError' in error_log(error_id)


def test_a_server_error_without_a_header_stays_english(
    failing_client: TestClient,
) -> None:
    """Without a header the 5xx message is spec 008's English, word for word."""
    response = failing_client.get(f'/api/form-connections/{FORM_CONNECTION_ID}')

    assert response.status_code == 500
    assert response.json()['message'] == INTERNAL_ERROR_EN == INTERNAL_ERROR_MESSAGE.en


def test_a_server_error_of_a_connection_url_stays_english(
    failing_client: TestClient,
) -> None:
    """serviceBW's URLs answer a 5xx in English whatever the header says (FR-017)."""
    response = failing_client.post(requests_url(UNKNOWN_ID), headers=GERMAN)

    assert response.status_code == 500
    assert response.json()['message'] == INTERNAL_ERROR_EN
    assert response.json()['error_id']


def test_the_connection_urls_answer_in_english_whatever_the_header_says(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The trigger URL's messages stay English with a German header (FR-017)."""
    form_connection_id = create_form_connection(signed_in_client)

    not_found = signed_in_client.post(requests_url(UNKNOWN_ID), headers=GERMAN)
    started = signed_in_client.post(requests_url(form_connection_id), headers=GERMAN)

    assert not_found.status_code == 404
    assert not_found.json() == FORM_CONNECTION_NOT_FOUND
    assert started.status_code == 201
    assert started.json()['message'] == 'Document request started'


def _handle(exception: HTTPException, language: Language) -> tuple[int, Any]:
    """Answer an `HTTPException` with the app's handler in the given language."""
    handler = cast(
        Callable[[Request, Exception], Awaitable[Response]],
        app.exception_handlers[HTTPException],
    )
    request = Request({'type': 'http', 'method': 'GET', 'path': '/', 'headers': []})

    async def run() -> Response:
        request_language.set(language)
        return await handler(request, exception)

    response = asyncio.run(run())
    return response.status_code, json.loads(bytes(response.body))


def test_the_handler_resolves_a_text_and_keeps_the_rest_of_the_detail() -> None:
    """Every other key stays, and the exception keeps the detail it was raised with."""
    message = Text(en='Not there.', de='Nicht vorhanden.')
    detail = {'error': 'Not found', 'message': message, 'error_id': 'id-1', 'n': [1]}
    exception = HTTPException(status_code=404, detail=detail)

    german = {'error': 'Not found', 'message': 'Nicht vorhanden.', 'error_id': 'id-1'}
    assert _handle(exception, 'de') == (404, german | {'n': [1]})
    assert _handle(exception, 'en')[1]['message'] == 'Not there.'
    assert exception.detail is detail
    assert detail['message'] is message


@pytest.mark.parametrize(
    ('detail', 'answer'),
    [
        (
            {'error': 'conflict', 'message': 'Already there.', 'error_id': 'id-2'},
            {'error': 'conflict', 'message': 'Already there.', 'error_id': 'id-2'},
        ),
        ('Not Found', {'error': 'Request error', 'message': 'Not Found'}),
        (
            {'error': 'conflict'},
            {'error': 'Request error', 'message': "{'error': 'conflict'}"},
        ),
    ],
)
def test_the_handler_answers_a_plain_detail_as_before(
    detail: object, answer: dict[str, str]
) -> None:
    """A plain-string message and a detail without a message don't change."""
    assert _handle(HTTPException(status_code=409, detail=detail), 'de') == (409, answer)


def test_the_language_middleware_runs_inside_cors() -> None:
    """CORS stays outside the language middleware (Starlette's first is outermost)."""
    classes: list[object] = [middleware.cls for middleware in app.user_middleware]
    assert classes.index(CORSMiddleware) < classes.index(LanguageMiddleware)


def test_the_access_log_keeps_its_one_filter() -> None:
    """The access log's filter is the one that redacts references, unchanged."""
    filters = logging.getLogger('uvicorn.access').filters
    assert [type(log_filter) for log_filter in filters] == [RedactReferencesFilter]


def test_no_log_line_of_a_german_request_names_its_language(
    failing_client: TestClient,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Neither the header nor the language nor a German text reaches a log (FR-018)."""
    caplog.set_level(logging.DEBUG)
    # Statements and rows logged at DEBUG are no request's text
    caplog.set_level(logging.WARNING, logger='sqlalchemy')

    for headers in (GERMAN, {'Accept-Language': BROWSER_LIST}):
        assert _create_without_name(failing_client, headers)[0] == 400
        assert _post_invalid_json(failing_client, headers)[0] == 400
        assert (
            failing_client.get(
                f'/api/form-connections/{FORM_CONNECTION_ID}', headers=headers
            ).status_code
            == 500
        )

    assert caplog.records
    for record in caplog.records:
        text = f'{record.getMessage()} {record.args!r}'
        assert 'accept-language' not in text.lower()
        assert BROWSER_LIST not in text
        assert not re.search(r'\bde\b', text)
        assert 'Text(' not in text
        for german in (
            NAME_REQUIRED_DE['message'],
            INVALID_PAYLOAD_DE['message'],
            INTERNAL_ERROR_DE,
        ):
            assert german not in text


# The catalog's labels (T009; glossary §4, contracts/api-language.md)


def _without_labels(document_types: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """The document types' values apart from every label."""
    return [
        {
            'key': document_type['key'],
            'fields': [
                {key: value for key, value in field.items() if key != 'label'}
                | {
                    'parts': field['parts']
                    and [
                        {key: value for key, value in part.items() if key != 'label'}
                        for part in field['parts']
                    ]
                }
                for field in document_type['fields']
            ],
        }
        for document_type in document_types
    ]


def _labels(document_types: list[dict[str, Any]]) -> list[str]:
    return [
        label
        for document_type in document_types
        for label in [
            document_type['label'],
            *(
                label
                for field in document_type['fields']
                for label in [
                    field['label'],
                    *(part['label'] for part in field['parts'] or ()),
                ]
            ),
        ]
    ]


def test_the_document_types_have_german_labels_and_the_same_values(
    signed_in_client: TestClient,
) -> None:
    """Only the labels follow the header: keys, kinds, flags, parts and order stay."""
    english = signed_in_client.get('/api/document-types').json()['data']
    german = signed_in_client.get('/api/document-types', headers=GERMAN).json()['data']

    assert _without_labels(german) == _without_labels(english)
    assert [document_type['label'] for document_type in english] == [
        'Personal ID',
        'Driving licence',
    ]
    assert [document_type['label'] for document_type in german] == [
        'Personalausweis',
        'Führerschein',
    ]
    pid_fields = {field['key']: field for field in german[0]['fields']}
    mdl_fields = {field['key']: field for field in german[1]['fields']}
    assert pid_fields['birthdate']['label'] == 'Geburtsdatum'
    assert [part['label'] for part in pid_fields['place_of_birth']['parts']] == [
        'Land',
        'Region',
        'Ort',
    ]
    assert mdl_fields['driving_privileges']['label'] == 'Führerscheinklassen'
    assert [part['label'] for part in mdl_fields['driving_privileges']['parts']] == [
        'Führerscheinklassen',
        'Ausstellungsdatum',
        'Ablaufdatum',
    ]
    # Every label is German but the one word both languages share
    shared = [
        en for en, de in zip(_labels(english), _labels(german), strict=True) if en == de
    ]
    assert shared == ['Region']


def test_a_connections_documents_have_german_labels(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """A connection's documents show the catalog's German; the keys stay."""
    form_connection_id = create_form_connection(signed_in_client)
    url = f'/api/form-connections/{form_connection_id}'

    english = signed_in_client.get(url).json()['data']['documents']
    german = signed_in_client.get(url, headers=GERMAN).json()['data']['documents']

    assert [document['label'] for document in english] == [
        'Personal ID',
        'Driving licence',
    ]
    assert [document['label'] for document in german] == [
        'Personalausweis',
        'Führerschein',
    ]
    assert [field['label'] for field in german[0]['fields']] == [
        'Familienname',
        'Vorname',
        'Geburtsdatum',
        'Ort',
    ]
    assert [document['document_type'] for document in german] == ['pid', 'mdl']
    assert _without_labels(
        [{'key': d['document_type'], 'fields': d['fields']} for d in german]
    ) == _without_labels(
        [{'key': d['document_type'], 'fields': d['fields']} for d in english]
    )


def test_a_document_or_field_the_catalog_lost_keeps_its_key_in_german() -> None:
    """A dropped document type or field shows its key in both languages."""

    def run() -> list[dict[str, Any]]:
        request_language.set('de')
        views = form_connections.documents_view(
            [
                RequestedDocument(document_type='passport', fields=['number']),
                RequestedDocument(document_type='pid', fields=['shoe_size']),
            ]
        )
        return [view.model_dump() for view in views]

    views = copy_context().run(run)

    assert [view['label'] for view in views] == ['passport', 'Personalausweis']
    assert [field['label'] for view in views for field in view['fields']] == [
        'number',
        'shoe_size',
    ]


def test_the_delivered_documents_stay_english_with_a_german_header(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """serviceBW's pull answers the catalog's English labels (FR-017)."""
    form_connection_id = create_form_connection(signed_in_client)
    reference = trigger(signed_in_client, form_connection_id)['reference']
    share(fake_eudiplo, reference)
    worker.sync_sessions()

    response = signed_in_client.get(
        pull_url(form_connection_id, reference), headers=GERMAN
    )

    assert response.json()['data']['documents'] == DELIVERED_DOCUMENTS
