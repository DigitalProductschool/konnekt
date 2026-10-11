"""Shared fixtures (research R17).

The tests need PostgreSQL and empty their database, so they only run against one
whose name ends in `_test`: set DATABASE_URL to it, as in quickstart.md §3.
"""

import os

from tests.fake_eudiplo import (
    FAKE_CLIENT_ID,
    FAKE_CLIENT_SECRET,
    FAKE_EUDIPLO_URL,
    FAKE_TRUST_LIST_ID,
    FakeEudiplo,
)

# Set before the app is imported: no worker thread, and EUDIPLO settings that point
# at the fake, whatever backend/.env contains
os.environ['APP_ENV'] = 'development'
os.environ['WORKER_ENABLED'] = 'false'
os.environ['CONNECTION_BASE_URL'] = 'https://middleware.test'
os.environ['EUDIPLO_URL'] = FAKE_EUDIPLO_URL
os.environ['EUDIPLO_CLIENT_ID'] = FAKE_CLIENT_ID
os.environ['EUDIPLO_CLIENT_SECRET'] = FAKE_CLIENT_SECRET
os.environ['EUDIPLO_TRUST_LIST_ID'] = FAKE_TRUST_LIST_ID

import logging
import uuid
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

from alembic import command
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import UserAccount
from app.services import eudiplo
from app.services.auth import hash_password

BACKEND_DIR = Path(__file__).resolve().parents[1]

TEST_USERNAME = 'alice'
TEST_PASSWORD = 'correct horse battery staple'


def pytest_configure(config: pytest.Config) -> None:
    """Refuse to run against a database that isn't a test database."""
    database = make_url(settings.database_url).database or ''
    if not database.endswith('_test'):
        pytest.exit(
            f"The tests empty their database, and '{database}' doesn't end in "
            '_test. Point DATABASE_URL at a test database.',
            returncode=1,
        )


@pytest.fixture(scope='session', autouse=True)
def database_schema() -> None:
    """Build the schema from the migrations, once per test run."""
    with engine.begin() as connection:
        connection.execute(text('DROP SCHEMA public CASCADE'))
        connection.execute(text('CREATE SCHEMA public'))
    # No alembic.ini: its logging setup would silence the app's loggers
    config = Config()
    config.set_main_option('script_location', str(BACKEND_DIR / 'alembic'))
    command.upgrade(config, 'head')


@pytest.fixture(autouse=True)
def empty_tables(database_schema: None) -> None:
    """Start every test with empty tables."""
    tables = ', '.join(table.name for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(text(f'TRUNCATE {tables} CASCADE'))


def create_user(username: str = TEST_USERNAME, password: str = TEST_PASSWORD) -> str:
    """Add an account directly in the database and return its id."""
    with SessionLocal() as db:
        user = UserAccount(username=username, password_hash=hash_password(password))
        db.add(user)
        db.commit()
        return user.id


@pytest.fixture
def client() -> Iterator[TestClient]:
    """A client for the app, with its lifespan running."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def signed_in_client(client: TestClient) -> TestClient:
    """A client signed in as TEST_USERNAME, holding the session cookie."""
    create_user()
    response = client.post(
        '/api/auth/login',
        json={'username': TEST_USERNAME, 'password': TEST_PASSWORD},
    )
    assert response.status_code == 200
    return client


@pytest.fixture
def error_log(caplog: pytest.LogCaptureFixture) -> Callable[[str], str]:
    """Look up the log line of the error id that a 5xx answer carries.

    The lookup checks that the id is a UUID and that exactly one ERROR line names it.
    """

    def line_of(error_id: str) -> str:
        assert uuid.UUID(error_id).version == 4
        lines = [
            record.getMessage()
            for record in caplog.records
            if record.levelno == logging.ERROR and error_id in record.getMessage()
        ]
        assert len(lines) == 1, lines
        return lines[0]

    return line_of


@pytest.fixture
def fake_eudiplo(monkeypatch: pytest.MonkeyPatch) -> FakeEudiplo:
    """Route every EUDIPLO call of the app and the worker to a fake."""
    fake = FakeEudiplo()
    monkeypatch.setattr(
        eudiplo, '_client', eudiplo.EudiploClient(transport=fake.transport)
    )
    return fake
