from collections.abc import Callable

import pytest
from fastapi.testclient import TestClient

from app.errors import INTERNAL_ERROR_MESSAGE
from app.main import app
from app.services import drafts
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user

# The kind of text an exception's message can quote, such as a database address
SENSITIVE_TEXT = 'postgresql://middleware:s3cret@db.internal:5432/middleware'
FORM_CONNECTION_ID = '7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b'


def test_an_unexpected_error_answers_500_with_only_an_error_id(
    monkeypatch: pytest.MonkeyPatch, error_log: Callable[[str], str]
) -> None:
    def fail(*_args: object) -> None:
        raise RuntimeError(SENSITIVE_TEXT)

    monkeypatch.setattr(drafts, 'get_form_connection_or_draft', fail)
    create_user()

    # Answers the 500 as the server does, instead of raising the error in the test
    with TestClient(app, raise_server_exceptions=False) as client:
        signed_in = client.post(
            '/api/auth/login',
            json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
        )
        assert signed_in.status_code == 200
        response = client.get(f'/api/form-connections/{FORM_CONNECTION_ID}')

    assert response.status_code == 500
    error_id = response.json()['error_id']
    assert response.json() == {
        'error': 'Internal server error',
        'message': INTERNAL_ERROR_MESSAGE.en,
        'error_id': error_id,
    }
    # The tests run with APP_ENV=development, which used to echo the message
    assert SENSITIVE_TEXT not in response.text
    line = error_log(error_id)
    assert 'RuntimeError' in line
    assert SENSITIVE_TEXT not in line
    # The route's template rather than the URL, which can hold a request reference
    assert 'GET /api/form-connections/{form_connection_id}' in line
    assert FORM_CONNECTION_ID not in line
