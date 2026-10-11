from collections.abc import Callable
from datetime import datetime, timedelta, timezone
from typing import Any, cast

import httpx2
import pytest

from app.config import settings
from app.services.eudiplo import (
    NOT_CONFIGURED_MESSAGE,
    EudiploClient,
    EudiploConflict,
    EudiploError,
    EudiploNotConfigured,
    EudiploNotFound,
    EudiploUnavailable,
    get_eudiplo_client,
    http_error_for,
)
from tests.fake_eudiplo import FAKE_CLIENT_SECRET, FakeEudiplo

CONFIG_ID = 'fc-7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b-r1'
CONFIG: dict[str, Any] = {
    'id': CONFIG_ID,
    'description': 'Test form',
    'lifeTime': 600,
    'statusCheckMode': 'strict',
    'dcql_query': {'credentials': []},
}
CREDENTIALS = [{'id': 'pid', 'values': [{'family_name': 'Mustermann'}]}]


@pytest.mark.parametrize(
    ('setting', 'name'),
    [
        ('eudiplo_url', 'EUDIPLO_URL'),
        ('eudiplo_client_id', 'EUDIPLO_CLIENT_ID'),
        ('eudiplo_client_secret', 'EUDIPLO_CLIENT_SECRET'),
        ('eudiplo_trust_list_id', 'EUDIPLO_TRUST_LIST_ID'),
    ],
)
def test_saving_a_configuration_needs_every_setting(
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    error_log: Callable[[str], str],
    setting: str,
    name: str,
) -> None:
    monkeypatch.setattr(settings, setting, '')

    with pytest.raises(EudiploNotConfigured) as raised:
        get_eudiplo_client().create_config(CONFIG)

    error = http_error_for(raised.value, 'unused')
    assert error.status_code == 503
    detail = cast(dict[str, str], error.detail)
    error_id = detail['error_id']
    assert detail == {
        'error': 'Not configured',
        'message': NOT_CONFIGURED_MESSAGE,
        'error_id': error_id,
    }
    # Only the log names the setting, under the id the answer carries, and no value
    assert name not in str(detail)
    line = error_log(error_id)
    assert f'{name} is not set' in line
    assert FAKE_CLIENT_SECRET not in line
    assert fake_eudiplo.calls == []


def test_other_calls_dont_need_the_trust_list(
    fake_eudiplo: FakeEudiplo, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'eudiplo_trust_list_id', '')

    assert get_eudiplo_client().delete_session('unknown') is False


def test_the_token_is_cached_and_fetched_again_after_a_401(
    fake_eudiplo: FakeEudiplo,
) -> None:
    client = get_eudiplo_client()
    client.create_config(CONFIG)
    client.create_config(CONFIG)
    assert fake_eudiplo.call_names() == ['token', 'create_config', 'create_config']

    fake_eudiplo.expire_tokens()
    client.create_config(CONFIG)

    assert fake_eudiplo.call_names()[3:] == ['create_config', 'token', 'create_config']


def test_wrong_client_credentials(
    fake_eudiplo: FakeEudiplo, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'eudiplo_client_secret', 'wrong')

    with pytest.raises(EudiploUnavailable):
        get_eudiplo_client().create_config(CONFIG)


def test_a_presentation_from_offer_to_deletion(fake_eudiplo: FakeEudiplo) -> None:
    client = get_eudiplo_client()
    client.create_config(CONFIG)
    assert fake_eudiplo.configs[CONFIG_ID] == CONFIG

    offer = client.create_offer(CONFIG_ID, reference='request-id')
    assert offer.uri.startswith('openid4vp://')
    assert offer.cross_device_uri is not None
    assert fake_eudiplo.sessions[offer.session].reference == 'request-id'

    pending = client.get_session(offer.session)
    assert (pending.status, pending.credentials) == ('active', None)

    consumed_at = datetime.now(tz=timezone.utc)
    fake_eudiplo.set_session(
        offer.session, 'completed', consumed_at=consumed_at, credentials=CREDENTIALS
    )
    completed = client.get_session(offer.session)
    assert completed.status == 'completed'
    assert completed.consumed_at is not None
    assert abs(completed.consumed_at - consumed_at) < timedelta(milliseconds=1)
    assert completed.credentials is not None
    assert completed.credentials[0].id == 'pid'
    assert completed.credentials[0].values == CREDENTIALS[0]['values']
    # The documents never show up in a repr, so they can't reach a log by accident
    assert 'Mustermann' not in repr(completed)

    assert client.delete_session(offer.session) is True
    assert client.delete_session(offer.session) is False
    assert client.delete_config(CONFIG_ID) is True
    assert client.delete_config(CONFIG_ID) is False


def test_listing_sessions(fake_eudiplo: FakeEudiplo) -> None:
    client = get_eudiplo_client()
    client.create_config(CONFIG)
    session_id = client.create_offer(CONFIG_ID, reference='r').session
    fake_eudiplo.set_session(
        session_id,
        'failed',
        failure_code='access_denied',
        credentials=CREDENTIALS,
    )

    page = client.list_sessions(
        updated_from=datetime.now(tz=timezone.utc) - timedelta(minutes=1)
    )

    assert [(s.id, s.status, s.failure_code) for s in page.items] == [
        (session_id, 'failed', 'access_denied')
    ]
    # List items may carry credentials; the client leaves them out
    assert not hasattr(page.items[0], 'credentials')
    params = fake_eudiplo.calls[-1].request.url.params
    assert params['type'] == 'presentation'
    assert params['updatedFrom'].endswith('Z')
    assert (params['sortBy'], params['sortOrder'], params['pageSize']) == (
        'updatedAt',
        'asc',
        '100',
    )


@pytest.mark.parametrize(
    ('status_code', 'error_class'),
    [(404, EudiploNotFound), (409, EudiploConflict), (500, EudiploUnavailable)],
)
def test_error_answers(
    fake_eudiplo: FakeEudiplo,
    error_log: Callable[[str], str],
    status_code: int,
    error_class: type[EudiploError],
) -> None:
    client = get_eudiplo_client()
    client.create_config(CONFIG)
    fake_eudiplo.fail('create_offer', status_code)

    with pytest.raises(error_class) as raised:
        client.create_offer(CONFIG_ID, reference='r')

    assert isinstance(raised.value, EudiploError)
    error = http_error_for(raised.value, 'The wallet service could not start it')
    assert error.status_code == 502
    detail = cast(dict[str, str], error.detail)
    error_id = detail['error_id']
    assert detail == {
        'error': 'Upstream error',
        'message': 'The wallet service could not start it',
        'error_id': error_id,
    }
    assert error_class.__name__ in error_log(error_id)


def test_timeouts_and_unexpected_answers_are_unavailable() -> None:
    def time_out(request: httpx2.Request) -> httpx2.Response:
        raise httpx2.ReadTimeout('timed out', request=request)

    with pytest.raises(EudiploUnavailable):
        EudiploClient(transport=httpx2.MockTransport(time_out)).get_session('s')

    def nonsense(request: httpx2.Request) -> httpx2.Response:
        if request.url.path == '/api/oauth2/token':
            return httpx2.Response(200, json={'access_token': 't', 'expires_in': 60})
        return httpx2.Response(200, json={'status': 'completed', 'secret': 'claim'})

    with pytest.raises(EudiploUnavailable) as raised:
        EudiploClient(transport=httpx2.MockTransport(nonsense)).get_session('s')
    # A validation error would quote the body; the client's error doesn't
    assert 'claim' not in str(raised.value)
    assert raised.value.__cause__ is None
