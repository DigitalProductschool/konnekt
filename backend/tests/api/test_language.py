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
from datetime import datetime, timezone
from typing import Any, cast

import pytest
from fastapi import HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.errors import INTERNAL_ERROR_MESSAGE
from app.language import Language, Text, request_language
from app.main import LanguageMiddleware, RedactReferencesFilter, app
from app.models import ApprovalRequest, UserAccount
from app.schemas import AccessLevel, RequestedDocument
from app.services import (
    approvals,
    document_requests,
    drafts,
    form_connections,
    worker,
)
from app.services.auth import ACCESS_LEVELS
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    DELIVERED_DOCUMENTS,
    FORM_CONNECTION,
    bearer_client,
    create_agent_authorization,
    create_form_connection,
    main_branch,
    pull_url,
    requests_url,
    rule,
    rules_input,
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


def test_what_reaches_eudiplo_is_the_same_with_a_german_header(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """A German save and trigger send EUDIPLO what an English one sends (FR-017).

    The configuration's DCQL query, name and settings are the same apart from the
    id that names the connection; the offers name their configuration and
    reference only; no call to EUDIPLO carries a language.
    """
    english_id = create_form_connection(signed_in_client)
    created = signed_in_client.post(
        '/api/form-connections', json=FORM_CONNECTION, headers=GERMAN
    )
    assert created.status_code == 201, created.json()
    german_id = created.json()['data']['id']
    trigger(signed_in_client, english_id)
    started = signed_in_client.post(requests_url(german_id), headers=GERMAN)
    assert started.status_code == 201, started.json()

    english = fake_eudiplo.configs[f'fc-{english_id}-r1']
    german = fake_eudiplo.configs[f'fc-{german_id}-r1']
    assert german | {'id': english['id']} == english
    assert german['description'] == FORM_CONNECTION['name']
    offers = [
        json.loads(call.request.content)
        for call in fake_eudiplo.calls
        if call.name == 'create_offer'
    ]
    assert [offer['requestId'] for offer in offers] == [
        f'fc-{english_id}-r1',
        f'fc-{german_id}-r1',
    ]
    assert [sorted(offer) for offer in offers] == [
        ['reference', 'requestId', 'response_type'],
        ['reference', 'requestId', 'response_type'],
    ]
    assert offers[0]['response_type'] == offers[1]['response_type']
    assert all(
        'accept-language' not in call.request.headers for call in fake_eudiplo.calls
    )


# The option sets' labels (T014; glossary §4, contracts/api-language.md)


def test_the_option_sets_have_german_labels_and_the_same_values(
    signed_in_client: TestClient,
) -> None:
    """Only labels and descriptions follow the header: keys, values and order stay."""
    english = signed_in_client.get('/api/option-sets').json()['data']
    german = signed_in_client.get('/api/option-sets', headers=GERMAN).json()['data']

    assert [option_set['key'] for option_set in german] == [
        option_set['key'] for option_set in english
    ]
    for english_set, german_set in zip(english, german, strict=True):
        assert [option['value'] for option in german_set['options']] == [
            option['value'] for option in english_set['options']
        ]
    sets_en = {option_set['key']: option_set['options'] for option_set in english}
    sets_de = {option_set['key']: option_set['options'] for option_set in german}
    countries_en = {option['value']: option['label'] for option in sets_en['countries']}
    countries_de = {option['value']: option['label'] for option in sets_de['countries']}
    assert (countries_en['DE'], countries_de['DE']) == ('Germany', 'Deutschland')
    assert (countries_en['GB'], countries_de['GB']) == (
        'United Kingdom',
        'Vereinigtes Königreich',
    )
    assert [option['label'] for option in sets_de['sex']][:3] == [
        'Unbekannt',
        'Männlich',
        'Weiblich',
    ]
    assert [option['label'] for option in sets_de['eye_colours']][:3] == [
        'Schwarz',
        'Blau',
        'Braun',
    ]
    # The licence classes keep their codes as labels; their descriptions are German
    classes_en = {option['value']: option for option in sets_en['licence_classes']}
    classes_de = {option['value']: option for option in sets_de['licence_classes']}
    assert classes_de['B'] == {
        'value': 'B',
        'label': 'B',
        'description': 'Pkw bis 3,5 t',
    }
    assert classes_en['B']['description'] == 'Cars up to 3.5 t'
    for code, option in classes_de.items():
        assert option['label'] == classes_en[code]['label'] == code
        assert option['description']
        assert option['description'] != classes_en[code]['description']
    # The other sets have no description in either language
    for key in ('countries', 'sex', 'eye_colours', 'hair_colours'):
        assert all(option['description'] is None for option in sets_de[key])


# The rules' validation messages (T015; glossary §3, contracts/api-language.md)


@pytest.mark.parametrize(
    ('headers', 'message'),
    [
        (GERMAN, 'Rule 01 in Standard: Wählen Sie die zu prüfenden Daten.'),
        ({}, 'Rule 01 in Standard: choose the data to check.'),
    ],
)
def test_a_rules_validation_message_follows_the_header(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    headers: dict[str, str],
    message: str,
) -> None:
    """A connection's `PUT` with a rule without data: German with `de`.

    A draft's `PUT` keeps a rule without data (spec 005, FR-004), so the published
    connection's `PUT` runs the check. The stored names stay as they are.
    """
    form_connection_id = create_form_connection(signed_in_client)
    created = signed_in_client.get(f'/api/form-connections/{form_connection_id}')
    data = created.json()['data']
    rules = rules_input(
        [
            main_branch(
                [rule(1, None, {'operator': 'on', 'date': '2020-01-01'}, 'Hi.')],
                branch_id=data['branches'][0]['id'],
            )
        ],
        base_version=data['rule_set_version'],
    )

    response = signed_in_client.put(
        f'/api/form-connections/{form_connection_id}',
        json={'rules': rules},
        headers=headers,
    )

    assert response.status_code == 400
    assert response.json() == {'error': 'Validation error', 'message': message}


# Sign-in, agent access and the access levels (T016; glossary §2)


def test_a_wrong_password_answers_in_german(client: TestClient) -> None:
    """The sign-in's 401 follows the header; its `error` stays."""
    create_user()
    credentials = {'username': TEST_USERNAME, 'password': 'not the password'}

    german = client.post('/api/auth/login', json=credentials, headers=GERMAN)
    english = client.post('/api/auth/login', json=credentials)

    assert german.status_code == english.status_code == 401
    assert german.json() == {
        'error': 'Unauthorized',
        'message': (
            'Benutzername oder Passwort ist falsch. Überprüfen Sie beides und '
            'versuchen Sie es erneut.'
        ),
    }
    assert english.json() == {
        'error': 'Unauthorized',
        'message': 'Username or password is wrong. Check both and try again.',
    }


def test_the_access_levels_have_german_names_and_the_same_codes(
    signed_in_client: TestClient,
) -> None:
    """`GET /api/agent-access`: German `name` and `allows`, same levels in order."""
    german = signed_in_client.get('/api/agent-access', headers=GERMAN)
    english = signed_in_client.get('/api/agent-access')

    assert german.status_code == english.status_code == 200
    levels_de = german.json()['data']['levels']
    levels_en = english.json()['data']['levels']
    assert [level['level'] for level in levels_de] == ['read', 'drafts', 'manage']
    assert [level['level'] for level in levels_en] == ['read', 'drafts', 'manage']
    assert [level['name'] for level in levels_de] == [
        'Nur lesen',
        'Lesen und Entwürfe bearbeiten',
        'Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten',
    ]
    assert levels_en == [info.model_dump() for info in ACCESS_LEVELS]
    for german_level, english_level in zip(levels_de, levels_en, strict=True):
        assert german_level.keys() == english_level.keys()
        assert (
            german_level['allows']
            and german_level['allows'] != (english_level['allows'])
        )


def test_an_insufficient_access_answers_in_german(client: TestClient) -> None:
    """A read-only agent's 403 names the German level; `needs_access_level` stays."""
    _, token = create_agent_authorization(create_user(), 'read')
    agent = bearer_client(client, token)
    body = {'form_connection_id': UNKNOWN_ID, 'action': 'publish'}

    german = agent.post('/api/approval-requests', json=body, headers=GERMAN)
    english = agent.post('/api/approval-requests', json=body)

    assert german.status_code == english.status_code == 403
    assert german.json() == {
        'error': 'insufficient_access',
        'message': (
            'Das Bearbeiten von Entwürfen erfordert die Zugriffsstufe „Lesen und '
            'Entwürfe bearbeiten“.'
        ),
        'needs_access_level': 'drafts',
    }
    assert english.json() == {
        'error': 'insufficient_access',
        'message': "Changing drafts needs the access level 'Read and edit drafts'.",
        'needs_access_level': 'drafts',
    }


def test_the_consent_page_answers_an_unknown_client_in_german(
    signed_in_client: TestClient,
) -> None:
    """The consent page's `invalid_client` follows the header (T016)."""
    url = '/api/oauth/clients/cp_client_unknown'

    german = signed_in_client.get(url, headers=GERMAN)
    english = signed_in_client.get(url)

    assert german.status_code == english.status_code == 404
    assert german.json() == {
        'error': 'invalid_client',
        'message': 'Der Client ist unbekannt.',
    }
    assert english.json() == {
        'error': 'invalid_client',
        'message': 'The client is unknown.',
    }


def test_the_token_endpoints_rfc_body_stays_english(client: TestClient) -> None:
    """RFC 6749's body is for clients, not the website: English with `de`."""
    response = client.post(
        '/api/oauth/token', data={'grant_type': 'password'}, headers=GERMAN
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'invalid_request',
        'error_description': (
            'The grant_type must be authorization_code or refresh_token.'
        ),
    }


# Connections, drafts and EUDIPLO (T017; glossary §2)


DRAFT: dict[str, Any] = {
    'name': 'Führerscheinantrag Entwurf',
    'description': '',
    'documents': FORM_CONNECTION['documents'],
    'rules': {
        'branches': [main_branch([])],
        'numbering_base': {'rule': 1, 'group': 1},
    },
    'step': 'connection',
}


def _create_draft(client: TestClient) -> str:
    response = client.post('/api/form-connections/drafts', json=DRAFT)
    assert response.status_code == 201, response.json()
    draft_id: str = response.json()['data']['id']
    return draft_id


def test_deactivating_a_draft_answers_in_german(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The 409 `not_published` follows the header; its `error` stays."""
    draft_id = _create_draft(signed_in_client)
    url = f'/api/form-connections/{draft_id}/deactivate'

    german = signed_in_client.post(url, json={}, headers=GERMAN)
    english = signed_in_client.post(url, json={})

    assert german.status_code == english.status_code == 409
    assert german.json() == {
        'error': 'not_published',
        'message': (
            'Diese Anbindung ist ein Entwurf. Setzen Sie ihn fort, um ihn zu '
            'speichern oder zu veröffentlichen.'
        ),
    }
    assert english.json() == {
        'error': 'not_published',
        'message': 'This connection is a draft. Continue it to save or publish it.',
    }


def test_a_drafts_connection_url_stays_english(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """A draft's trigger URL answers serviceBW's English 409 with `de` (FR-017)."""
    draft_id = _create_draft(signed_in_client)

    response = signed_in_client.post(requests_url(draft_id), headers=GERMAN)

    assert response.status_code == 409
    assert response.json() == {
        'error': 'unavailable',
        'message': 'This form connection is deactivated or deleted',
    }
    assert response.json() == document_requests.UNAVAILABLE_DETAIL


def test_a_eudiplo_failure_answers_in_german_with_its_error_id(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
) -> None:
    """The 502 of a failed EUDIPLO call follows the header (G§2 "try again")."""
    fake_eudiplo.fail('create_config', 503)

    response = signed_in_client.post(
        '/api/form-connections', json=FORM_CONNECTION, headers=GERMAN
    )

    assert response.status_code == 502
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Upstream error',
        'message': (
            'Der Wallet-Dienst konnte die Anfragekonfiguration nicht erstellen, '
            'daher wurde nichts gespeichert. Versuchen Sie es in einem Moment '
            'erneut.'
        ),
        'error_id': error_id,
    }
    assert 'EudiploUnavailable' in error_log(error_id)


# Approval requests (T018; glossary §2 "approval request")


def _user_id() -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    return user_id


def _agent(level: AccessLevel) -> TestClient:
    _, token = create_agent_authorization(_user_id(), level)
    return bearer_client(TestClient(app), token)


def _ask(agent: TestClient, form_connection_id: str, action: str) -> str:
    response = agent.post(
        '/api/approval-requests',
        json={'form_connection_id': form_connection_id, 'action': action},
    )
    assert response.status_code == 201, response.json()
    request_id: str = response.json()['data']['id']
    return request_id


DECLINED_DE = {
    'error': 'approval_declined',
    'message': 'Sie haben diese Anfrage abgelehnt. Es wurde nichts geändert.',
}
DECLINED_EN = {
    'error': 'approval_declined',
    'message': 'You declined this request. Nothing has changed.',
}


@pytest.mark.parametrize('call', ['approve', 'decline'])
def test_a_declined_request_answers_in_german(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, call: str
) -> None:
    """Approving or declining a declined request: the German sentence, same code."""
    draft_id = _create_draft(signed_in_client)
    request_id = _ask(_agent('drafts'), draft_id, 'publish')
    url = f'/api/approval-requests/{request_id}'
    declined = signed_in_client.post(f'{url}/decline', json={}, headers=GERMAN)
    assert declined.status_code == 200
    # `ApiResponse.message` stays English (spec 009, R6)
    assert declined.json()['message'] == 'Declined'

    german = signed_in_client.post(f'{url}/{call}', json={}, headers=GERMAN)
    english = signed_in_client.post(f'{url}/{call}', json={})
    view = signed_in_client.get(url, headers=GERMAN)

    assert german.status_code == english.status_code == 409
    assert german.json() == DECLINED_DE
    assert english.json() == DECLINED_EN
    # The page's view carries codes only: the same with `de`
    assert view.json()['data']['request']['status'] == 'declined'
    assert view.json()['data']['request']['outcome'] == 'declined'


def test_asking_to_deactivate_a_deactivated_connection_answers_in_german(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The approval's 409 `not_allowed` follows the header; its `error` stays."""
    form_connection_id = create_form_connection(signed_in_client)
    deactivated = signed_in_client.post(
        f'/api/form-connections/{form_connection_id}/deactivate', json={}
    )
    assert deactivated.status_code == 200
    body = {'form_connection_id': form_connection_id, 'action': 'deactivate'}
    agent = _agent('manage')

    german = agent.post('/api/approval-requests', json=body, headers=GERMAN)
    english = agent.post('/api/approval-requests', json=body)

    assert german.status_code == english.status_code == 409
    assert german.json() == {
        'error': 'not_allowed',
        'message': 'Diese Anbindung ist bereits deaktiviert.',
    }
    assert english.json() == {
        'error': 'not_allowed',
        'message': 'This connection is already deactivated.',
    }


def _ended_request(**values: Any) -> ApprovalRequest:
    return ApprovalRequest(
        id=UNKNOWN_ID,
        form_connection_id=FORM_CONNECTION_ID,
        action='deactivate',
        requested_by='Claude Code',
        user_account_id=UNKNOWN_ID,
        status='waiting',
        expires_at=datetime(2026, 11, 9, 13, 3, tzinfo=timezone.utc),
        **values,
    )


def test_the_outcome_sentences_fill_both_columns() -> None:
    """The expired time and the connection's change are in both languages."""
    expired = approvals.state_text(_ended_request(), approvals.RequestState('expired'))
    changed = approvals.state_text(
        _ended_request(was_active=True),
        approvals.RequestState('cancelled', 'connection_changed'),
    )
    reactivated = approvals.state_text(
        _ended_request(was_active=False),
        approvals.RequestState('cancelled', 'connection_changed'),
    )

    assert expired == Text(
        en='This request expired at 14:03. Nothing has changed. The agent can ask '
        'again.',
        de='Diese Anfrage ist um 14:03 Uhr abgelaufen. Es wurde nichts geändert. '
        'Der Agent kann erneut fragen.',
    )
    assert changed == Text(
        en='The connection was deactivated in the meantime.',
        de='Die Anbindung wurde in der Zwischenzeit deaktiviert.',
    )
    assert reactivated == Text(
        en='The connection was reactivated in the meantime.',
        de='Die Anbindung wurde in der Zwischenzeit reaktiviert.',
    )


@pytest.mark.parametrize(('language', 'message'), [('de', 'Weg'), ('en', 'Gone')])
def test_a_caught_details_text_is_resolved_not_dropped(
    language: Language, message: str
) -> None:
    """V3: a `Text` in a caught detail reads as the request's language, never ''."""
    refusal = HTTPException(
        status_code=409,
        detail={'error': 'gone', 'message': Text(en='Gone', de='Weg')},
    )
    token = request_language.set(language)
    try:
        assert approvals._detail_of(refusal, 'message') == message
        assert approvals._detail_of(refusal, 'error') == 'gone'
        assert approvals._detail_of(refusal, 'error_id') == ''
    finally:
        request_language.reset(token)
