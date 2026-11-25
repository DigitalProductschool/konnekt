"""The sign-in throttle (spec 012, research R6, finding 4).

Every attempt counts against its username, existing or not, before the password
is checked; after SIGN_IN_FAILURES_BEFORE_WAIT attempts without a correct one the
username waits, doubling up to SIGN_IN_MAX_WAIT_SECONDS, and an attempt during
the wait answers 429 with Retry-After without running the hash. The clock is
`sign_in_throttle._now()`, which the tests stop and move.
"""

import hashlib
import logging
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx2
import pytest
from argon2 import PasswordHasher
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.config import settings
from app.db import SessionLocal
from app.models import SignInThrottle
from app.schemas import LoginRequest
from app.services import auth, sign_in_throttle, worker
from tests.conftest import TEST_PASSWORD, TEST_USERNAME, create_user

WRONG_PASSWORD = 'not the password'
INVALID_CREDENTIALS = {
    'error': 'Unauthorized',
    'message': 'Username or password is wrong. Check both and try again.',
}
INVALID_PAYLOAD = {'error': 'Validation error', 'message': 'Invalid request payload'}
GERMAN = {'accept-language': 'de'}


def refused(duration: str) -> dict[str, str]:
    """The English body of a refusal during a wait of `duration`."""
    return {
        'error': 'rate_limited',
        'message': (
            f'Too many failed attempts for this username. Try again in {duration}.'
        ),
    }


class Clock:
    """The throttle's clock, stopped, moved by the tests."""

    def __init__(self) -> None:
        self.now = datetime.now(tz=timezone.utc)

    def __call__(self) -> datetime:
        return self.now

    def move(self, seconds: float) -> None:
        self.now += timedelta(seconds=seconds)


class CountingHasher:
    """The app's password hasher, counting the verifications (the hashes run)."""

    def __init__(self, hasher: PasswordHasher) -> None:
        self.hasher = hasher
        self.verifications = 0

    def verify(self, password_hash: str, password: str) -> bool:
        self.verifications += 1
        return self.hasher.verify(password_hash, password)

    def hash(self, password: str) -> str:
        return self.hasher.hash(password)

    def check_needs_rehash(self, password_hash: str) -> bool:
        return self.hasher.check_needs_rehash(password_hash)


@pytest.fixture(autouse=True)
def limits(monkeypatch: pytest.MonkeyPatch) -> None:
    """The default limits, whatever backend/.env sets."""
    monkeypatch.setattr(settings, 'sign_in_failures_before_wait', 5)
    monkeypatch.setattr(settings, 'sign_in_first_wait_seconds', 30)
    monkeypatch.setattr(settings, 'sign_in_max_wait_seconds', 900)


@pytest.fixture
def clock(monkeypatch: pytest.MonkeyPatch) -> Clock:
    """Stop the throttle's clock."""
    stopped = Clock()
    monkeypatch.setattr(sign_in_throttle, '_now', stopped)
    return stopped


@pytest.fixture
def hasher(monkeypatch: pytest.MonkeyPatch) -> CountingHasher:
    """Count the password hashes that sign-in runs."""
    counting = CountingHasher(PasswordHasher())
    monkeypatch.setattr(auth, '_password_hasher', counting)
    return counting


def attempt(
    client: TestClient,
    username: str = TEST_USERNAME,
    password: str = WRONG_PASSWORD,
    headers: dict[str, str] | None = None,
) -> httpx2.Response:
    return client.post(
        '/api/auth/login',
        json={'username': username, 'password': password},
        headers=headers or {},
    )


def answer(response: httpx2.Response) -> tuple[int, Any, str | None]:
    """What an attacker sees of an answer: status, body and Retry-After."""
    return response.status_code, response.json(), response.headers.get('retry-after')


def fail(client: TestClient, times: int, username: str = TEST_USERNAME) -> None:
    """Sign in with a wrong password `times` times, each answered 401."""
    for _ in range(times):
        assert answer(attempt(client, username)) == (401, INVALID_CREDENTIALS, None)


def row_count() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(SignInThrottle)) or 0


def test_attempts_count_alike_for_known_and_unknown_usernames(
    client: TestClient, clock: Clock
) -> None:
    create_user()

    known = [answer(attempt(client, TEST_USERNAME)) for _ in range(7)]
    unknown = [answer(attempt(client, 'mallory')) for _ in range(7)]

    assert known == unknown
    assert known[:5] == [(401, INVALID_CREDENTIALS, None)] * 5
    assert known[5:] == [(429, refused('30 seconds'), '30')] * 2


def test_an_attempt_during_the_wait_runs_no_hash(
    client: TestClient, clock: Clock, hasher: CountingHasher
) -> None:
    create_user()
    fail(client, 5)
    fail(client, 5, 'mallory')
    assert hasher.verifications == 10

    right = attempt(client, TEST_USERNAME, TEST_PASSWORD)
    unknown = attempt(client, 'mallory')

    assert right.status_code == unknown.status_code == 429
    assert 'set-cookie' not in right.headers
    assert hasher.verifications == 10


def test_attempts_during_the_wait_do_not_count(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    fail(client, 5)

    assert answer(attempt(client)) == (429, refused('30 seconds'), '30')
    clock.move(10)
    assert answer(attempt(client)) == (429, refused('20 seconds'), '20')
    clock.move(19.5)
    assert answer(attempt(client)) == (429, refused('1 second'), '1')
    clock.move(0.5)

    assert attempt(client, password=TEST_PASSWORD).status_code == 200


def test_the_wait_doubles_with_each_failure_up_to_the_longest(
    client: TestClient, clock: Clock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'sign_in_max_wait_seconds', 100)
    create_user()
    fail(client, 5)

    waits = []
    for _ in range(4):
        response = attempt(client)
        assert response.status_code == 429
        waits.append(int(response.headers['retry-after']))
        clock.move(waits[-1])
        fail(client, 1)

    assert waits == [30, 60, 100, 100]


def test_a_right_password_after_the_wait_signs_in_and_forgets_the_attempts(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    fail(client, 5)
    assert attempt(client, password=TEST_PASSWORD).status_code == 429
    clock.move(30)

    response = attempt(client, password=TEST_PASSWORD)

    assert response.status_code == 200
    assert response.headers['set-cookie'].startswith('session=')
    assert row_count() == 0
    # Counted from none again: five failures, then the first wait
    fail(client, 5)
    assert answer(attempt(client)) == (429, refused('30 seconds'), '30')


def test_a_right_password_forgets_the_failures_before_it(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    fail(client, 4)

    assert attempt(client, password=TEST_PASSWORD).status_code == 200

    fail(client, 5)
    assert attempt(client).status_code == 429


def test_the_attempts_count_per_username_in_its_stored_form(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    create_user('bob')

    for username in ('alice', 'ALICE', ' Alice ', 'alice ', 'Alice'):
        fail(client, 1, username)

    assert attempt(client, 'alice', TEST_PASSWORD).status_code == 429
    assert attempt(client, 'bob', TEST_PASSWORD).status_code == 200


def test_the_attempts_are_forgotten_the_longest_wait_after_the_wait(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    create_user('bob')
    fail(client, 5)
    fail(client, 5, 'bob')

    # A second before: alice's failures still count, and the next wait is longer
    clock.move(30 + 900 - 1)
    fail(client, 1)
    assert answer(attempt(client)) == (429, refused('1 minute'), '60')
    # Then: bob's are forgotten, and he has five attempts again
    clock.move(1)
    fail(client, 5, 'bob')
    assert answer(attempt(client, 'bob')) == (429, refused('30 seconds'), '30')


def test_failures_without_a_wait_are_forgotten_the_longest_wait_later(
    client: TestClient, clock: Clock
) -> None:
    create_user()
    fail(client, 4)

    clock.move(900)

    fail(client, 5)
    assert attempt(client).status_code == 429


def test_a_first_wait_of_0_switches_the_waits_off(
    client: TestClient, clock: Clock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'sign_in_first_wait_seconds', 0)
    create_user()

    fail(client, 12)

    assert attempt(client, password=TEST_PASSWORD).status_code == 200


def test_the_refusal_answers_in_german(
    client: TestClient, clock: Clock, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, 'sign_in_first_wait_seconds', 600)
    create_user()
    fail(client, 5)

    german = attempt(client, headers=GERMAN)

    assert answer(german) == (
        429,
        {
            'error': 'rate_limited',
            'message': (
                'Zu viele fehlgeschlagene Anmeldeversuche für diesen Benutzernamen. '
                'Versuchen Sie es in 10 Minuten erneut.'
            ),
        },
        '600',
    )
    assert answer(attempt(client)) == (429, refused('10 minutes'), '600')


@pytest.mark.parametrize(
    ('seconds', 'english', 'german'),
    [
        (1, '1 second', '1 Sekunde'),
        (59, '59 seconds', '59 Sekunden'),
        (60, '1 minute', '1 Minute'),
        (61, '2 minutes', '2 Minuten'),
        (900, '15 minutes', '15 Minuten'),
    ],
)
def test_the_wait_in_words_rounds_up(seconds: int, english: str, german: str) -> None:
    duration = sign_in_throttle._duration(seconds)

    assert (duration.en, duration.de) == (english, german)


def test_parallel_attempts_all_count(clock: Clock) -> None:
    """Eight attempts at once for one new username: the row lock serializes them,
    so exactly five pass to the password check and three are refused."""
    parallel = 8
    barrier = threading.Barrier(parallel)

    def one_attempt(_: int) -> int:
        with SessionLocal() as db:
            barrier.wait()
            try:
                sign_in_throttle.count_attempt(db, TEST_USERNAME)
            except HTTPException as error:
                return error.status_code
            return 200

    with ThreadPoolExecutor(max_workers=parallel) as pool:
        statuses = sorted(pool.map(one_attempt, range(parallel)))

    assert statuses == [200] * 5 + [429] * 3
    with SessionLocal() as db:
        assert db.scalars(select(SignInThrottle.failures)).one() == 5


@pytest.mark.parametrize('field', ['username', 'password'])
def test_an_overlong_field_is_refused_before_the_attempt_counts(
    client: TestClient, hasher: CountingHasher, field: str
) -> None:
    create_user()
    longest = LoginRequest.model_json_schema()['properties'][field]['maxLength']
    credentials = {'username': TEST_USERNAME, 'password': TEST_PASSWORD}

    at_most = client.post('/api/auth/login', json=credentials | {field: 'x' * longest})
    too_long = client.post(
        '/api/auth/login', json=credentials | {field: 'x' * (longest + 1)}
    )

    assert at_most.status_code == 401
    assert answer(too_long) == (400, INVALID_PAYLOAD, None)
    # Only the value at the limit was checked and counted
    assert hasher.verifications == 1
    assert row_count() == 1


def test_the_worker_deletes_forgotten_attempts(
    client: TestClient, clock: Clock
) -> None:
    fail(client, 1, 'alice')
    clock.move(600)
    fail(client, 1, 'bob')
    clock.move(300)

    worker.delete_expired_sign_in_throttles()

    with SessionLocal() as db:
        remaining = db.scalars(select(SignInThrottle.username_hash)).all()
    assert remaining == [hashlib.sha256(b'bob').hexdigest()]


def test_the_table_and_the_log_hold_no_username(
    client: TestClient, clock: Clock, caplog: pytest.LogCaptureFixture
) -> None:
    # The app's loggers only: SQLAlchemy's would echo the statements' parameters,
    # which it never does outside a debugging session
    caplog.set_level(logging.DEBUG, logger='app')
    username = 'mallory.example'
    key = hashlib.sha256(username.encode()).hexdigest()

    fail(client, 5, username)
    assert attempt(client, username).status_code == 429

    with SessionLocal() as db:
        assert db.scalars(select(SignInThrottle.username_hash)).all() == [key]
    messages = [record.getMessage() for record in caplog.records]
    assert 'Refused a sign-in attempt: its username has to wait' in messages
    for message in messages:
        assert username not in message
        assert key not in message
        assert WRONG_PASSWORD not in message
