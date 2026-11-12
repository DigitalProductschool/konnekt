"""Scheduling a connection (spec 010, US1; research R1, R2; data-model 1.3).

T019, publishing with a start date: `POST /api/form-connections` and
`POST …/{id}/publish` with `start_date`, and `drafts.publish_stored_draft()` with
one, which an approved approval request runs. A scheduled connection is published,
not active, with its `start_date` and without `activated_at`; its EUDIPLO
configuration and its links exist at once; its activity reads `published` then
`scheduled` with the date, in one instant. The date is checked with
`clean_start_date()` before EUDIPLO is called and again under the row lock, after
EUDIPLO answered: a day that isn't after today in Germany answers
`400 invalid_start_date` and writes nothing, and a refusal after the call deletes
the configuration that the call created, as a `DraftGuard` refusal does. What
serviceBW's URLs answer for a scheduled connection is in `test_connect.py`.

T020, moving, starting and cancelling a schedule: every row of data-model 1.3
from scheduled, live and deactivated, through `PUT …/{id}/start-date`,
`POST …/{id}/activate` with an `ActivateRequest` and `POST …/{id}/deactivate`,
each with its columns and its entries, the no-ops that change and write nothing,
and the refusals: `409 status_changed` for the state an action doesn't apply to,
`409 not_published` for a draft, `400 invalid_start_date` before the row lock
and again under it, `403 browser_only` for an agent. Scheduling a live
connection cancels its open requests as deactivating does.

T021, the start arrives: the worker's step `activate_scheduled_connections`,
called directly, makes a scheduled connection live on its day, or at the first
cycle after a downtime, active since 00:00 in Germany of its start date, with
`became_active` and no person; its links work then. It leaves alone a connection
whose day hasn't come, and one that was deleted, moved, deactivated or started
"Now" before the day, skips a row that another session holds locked, as every
status change holds it, and takes it in the next cycle. It logs the count only.

The day is controlled by patching `start_dates.today_in_germany` (research R2).
"""

import json
import logging
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta
from typing import Any, Literal

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from httpx2 import Request, Response
from sqlalchemy import func, select

from app.db import SessionLocal
from app.errors import INVALID_PAYLOAD_MESSAGE
from app.language import resolve_text
from app.main import app
from app.models import (
    ConnectionActivity,
    DocumentRequest,
    FormConnection,
    FormConnectionBranch,
    FormConnectionRevision,
    FormConnectionRuleSet,
    UserAccount,
)
from app.schemas import to_iso_utc
from app.services import drafts, form_connections, start_dates, worker
from app.services.activity import Actor
from tests.api.test_form_connection_drafts import (
    create_draft,
    deleted_configs,
    draft_rules,
    editor_publish_body,
    get,
    rows,
)
from tests.conftest import TEST_USERNAME
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    bearer_client,
    create_agent_authorization,
    create_form_connection,
    fail_in_wallet,
    main_branch,
    now,
    pull_url,
    requests_url,
    stored_request,
    trigger,
    variant,
)

BASE = '/api/form-connections'
BASE_URL = 'https://middleware.test'

# The day the tests run on in Germany, unless a test moves it
TODAY = date(2026, 11, 11)
TOMORROW = TODAY + timedelta(days=1)
START = date(2026, 12, 1)

INVALID_START_DATE = {
    'error': 'invalid_start_date',
    'message': 'Enter a date after today.',
}
DOCUMENTS: list[dict[str, Any]] = FORM_CONNECTION['documents']

AGENT_NAME = 'Test agent'
APPROVER = Actor(name=TEST_USERNAME, agent=AGENT_NAME, approved=True)
# An entry's person: (actor_name, agent_name, approved)
IN_THE_BROWSER = (TEST_USERNAME, None, False)
APPROVED = (TEST_USERNAME, AGENT_NAME, True)

# The three paths that publish: the editor's publish of a draft, creating a
# published connection, and an approved approval request's publish of the
# stored draft (spec 007, research R12)
PublishPath = Literal['publish', 'create', 'approval']
PUBLISH_PATHS: list[PublishPath] = ['publish', 'create', 'approval']
# The paths through `create_revision()`, which locks the draft's row twice
DRAFT_PATHS: list[PublishPath] = ['publish', 'approval']


@pytest.fixture
def today(monkeypatch: pytest.MonkeyPatch) -> date:
    """Pin the day in Germany to `TODAY`."""
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: TODAY)
    return TODAY


def publishable_draft(client: TestClient) -> str:
    """A complete draft with two variants, as the editor saved it; its id."""
    return create_draft(
        client,
        documents=DOCUMENTS,
        rules=draft_rules(
            [main_branch([AGE_RULE, CLASS_RULE]), variant([AGE_RULE, CLASS_RULE])]
        ),
        step='test',
    )


def start_date_json(start_date: date | str | None) -> str | None:
    """A start date as a request body carries it: `YYYY-MM-DD`, or any text."""
    return start_date.isoformat() if isinstance(start_date, date) else start_date


def publish_on(
    client: TestClient, draft_id: str, start_date: date | str | None
) -> Response:
    """The editor publishes the draft it loaded, unchanged, with `start_date`."""
    body = editor_publish_body(get(client, draft_id), DOCUMENTS)
    return client.post(
        f'{BASE}/{draft_id}/publish',
        json=body | {'start_date': start_date_json(start_date)},
    )


def create_on(client: TestClient, start_date: date | str | None) -> Response:
    """`POST /api/form-connections` with `start_date`."""
    return client.post(
        BASE, json=FORM_CONNECTION | {'start_date': start_date_json(start_date)}
    )


def prepare(client: TestClient, path: PublishPath) -> str | None:
    """What `path` publishes: a draft's id, or None for creating a connection."""
    return None if path == 'create' else publishable_draft(client)


def schedule(
    client: TestClient,
    path: PublishPath,
    draft_id: str | None,
    start_date: date,
) -> tuple[int, dict[str, Any]]:
    """Publish on `start_date` by `path`; the status code and the body or detail.

    A refusal of the approval's path is answered as `errors.py` answers it
    without a German header (spec 009).
    """
    if path == 'create':
        response = create_on(client, start_date)
        return response.status_code, response.json()
    assert draft_id is not None
    if path == 'publish':
        response = publish_on(client, draft_id, start_date)
        return response.status_code, response.json()
    try:
        with SessionLocal() as db:
            view = drafts.publish_stored_draft(
                db, draft_id, 1, actor=APPROVER, start_date=start_date
            )
    except HTTPException as refusal:
        assert isinstance(refusal.detail, dict)
        detail = {**refusal.detail, 'message': resolve_text(refusal.detail['message'])}
        return refusal.status_code, detail
    return 200, {'data': view.model_dump(mode='json')}


def activity_rows(form_connection_id: str) -> list[ConnectionActivity]:
    """The connection's entries in the list's order, newest first."""
    with SessionLocal() as db:
        entries = db.scalars(
            select(ConnectionActivity)
            .where(ConnectionActivity.form_connection_id == form_connection_id)
            .order_by(
                ConnectionActivity.occurred_at.desc(),
                ConnectionActivity.position.desc(),
                ConnectionActivity.id,
            )
        ).all()
        db.expunge_all()
        return list(entries)


def entries(form_connection_id: str) -> list[tuple[Any, ...]]:
    """Each entry newest first: (kind, position, start date, person)."""
    return [
        (
            row.kind,
            row.position,
            row.start_date,
            (row.actor_name, row.agent_name, row.approved),
        )
        for row in activity_rows(form_connection_id)
    ]


def status_columns(
    form_connection_id: str,
) -> tuple[datetime | None, bool, date | None, datetime | None, datetime | None]:
    """The row's `published_at`, `is_active`, `start_date`, `activated_at` and
    `deactivated_at` (data-model 1.1)."""
    with SessionLocal() as db:
        row = db.get(FormConnection, form_connection_id)
        assert row is not None
        return (
            row.published_at,
            row.is_active,
            row.start_date,
            row.activated_at,
            row.deactivated_at,
        )


def snapshot() -> tuple[Any, ...]:
    """Everything a publish or a status change writes: every connection's status
    columns, draft version and last change, the counts of revisions, rule sets,
    branch rows and activity entries, every entry's kind, time, position and date
    (a merge moves them), and every document request's status."""
    with SessionLocal() as db:
        connections = sorted(
            tuple(row)
            for row in db.execute(
                select(
                    FormConnection.id,
                    FormConnection.name,
                    FormConnection.published_at,
                    FormConnection.is_active,
                    FormConnection.start_date,
                    FormConnection.activated_at,
                    FormConnection.deactivated_at,
                    FormConnection.deleted_at,
                    FormConnection.current_revision,
                    FormConnection.draft_version,
                    FormConnection.updated_at,
                )
            ).all()
        )
        counts = tuple(
            db.scalar(select(func.count()).select_from(model))
            for model in (
                FormConnectionRevision,
                FormConnectionRuleSet,
                FormConnectionBranch,
                ConnectionActivity,
            )
        )
        activity = sorted(
            tuple(row)
            for row in db.execute(
                select(
                    ConnectionActivity.id,
                    ConnectionActivity.kind,
                    ConnectionActivity.occurred_at,
                    ConnectionActivity.position,
                    ConnectionActivity.start_date,
                )
            ).all()
        )
        requests = sorted(
            tuple(row)
            for row in db.execute(select(DocumentRequest.id, DocumentRequest.status))
        )
    return connections, counts, activity, requests


# Publishing on a date (data-model 1.3, "draft | publish, on a date")


def test_publishing_a_draft_on_a_date_schedules_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """FR-001, FR-002: published with its links, not active, until its date."""
    draft_id = publishable_draft(signed_in_client)
    before = now()

    response = publish_on(signed_in_client, draft_id, START)

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Form connection published'
    data = response.json()['data']
    assert (data['status'], data['state'], data['is_active']) == (
        'published',
        'scheduled',
        False,
    )
    assert (data['start_date'], data['activated_at'], data['deactivated_at']) == (
        '2026-12-01',
        None,
        None,
    )
    # The links exist at once, one pull URL per variant (FR-002)
    assert data['trigger_url'] == f'{BASE_URL}/api/connect/{draft_id}/requests'
    assert [branch['name'] for branch in data['branches']] == ['Standard', 'Ambulance']
    assert data['pull_url'] == data['branches'][0]['pull_url']
    assert get(signed_in_client, draft_id) == data

    published_at, is_active, start_date, activated_at, deactivated_at = status_columns(
        draft_id
    )
    assert published_at is not None
    assert before <= published_at <= now()
    assert data['published_at'] == to_iso_utc(published_at)
    assert (is_active, start_date, activated_at, deactivated_at) == (
        False,
        START,
        None,
        None,
    )
    # Published as with "Now": revision 1, rule set 1, the branch rows, and the
    # configuration set up with EUDIPLO
    assert rows(draft_id) == (1, 1, 2)
    assert set(fake_eudiplo.configs) == {f'fc-{draft_id}-r1'}

    # `published` at position 0 and `scheduled` at 1, in one instant (data-model
    # 2.1); nothing else, as the body is the stored draft
    assert entries(draft_id) == [
        ('scheduled', 1, START, IN_THE_BROWSER),
        ('published', 0, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    scheduled, published, _ = activity_rows(draft_id)
    assert scheduled.occurred_at == published.occurred_at
    # The activity reads "Scheduled for …" above "Published" (data-model 2.5)
    page = signed_in_client.get(f'{BASE}/{draft_id}/activity').json()['data']
    assert [(item['kind'], item['start_date']) for item in page['items']] == [
        ('scheduled', '2026-12-01'),
        ('published', None),
        ('created', None),
    ]
    assert data['last_activity'] == page['items'][0]


def test_creating_a_connection_on_a_date_schedules_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """`POST /api/form-connections` with `start_date`, as the publish does."""
    response = create_on(signed_in_client, START)

    assert response.status_code == 201, response.json()
    data = response.json()['data']
    connection_id = data['id']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'scheduled',
        False,
        '2026-12-01',
    )
    assert (data['activated_at'], data['deactivated_at']) == (None, None)
    assert get(signed_in_client, connection_id) == data
    published_at, is_active, start_date, activated_at, _ = status_columns(connection_id)
    assert published_at is not None
    assert (is_active, start_date, activated_at) == (False, START, None)
    assert set(fake_eudiplo.configs) == {f'fc-{connection_id}-r1'}
    assert entries(connection_id) == [
        ('scheduled', 2, START, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    assert len({row.occurred_at for row in activity_rows(connection_id)}) == 1


def test_an_approved_publish_on_a_date_schedules_it(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """`publish_stored_draft(…, start_date=…)`: the approvals' path, the same
    publish, recorded with the team member who approved and the agent."""
    draft_id = publishable_draft(signed_in_client)

    with SessionLocal() as db:
        view = drafts.publish_stored_draft(
            db, draft_id, 1, actor=APPROVER, start_date=START
        )

    assert (view.id, view.state, view.is_active, view.start_date) == (
        draft_id,
        'scheduled',
        False,
        '2026-12-01',
    )
    assert view.activated_at is None
    _, is_active, start_date, activated_at, _ = status_columns(draft_id)
    assert (is_active, start_date, activated_at) == (False, START, None)
    assert entries(draft_id) == [
        ('scheduled', 1, START, APPROVED),
        ('published', 0, None, APPROVED),
        ('created', 0, None, IN_THE_BROWSER),
    ]


@pytest.mark.parametrize('path', ['publish', 'create'])
@pytest.mark.parametrize('body', [{}, {'start_date': None}], ids=['absent', 'null'])
def test_without_a_date_the_connection_is_published_live(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    path: PublishPath,
    body: dict[str, Any],
) -> None:
    """Without a start date, publishing is as before: live, active since now."""
    if path == 'create':
        response = signed_in_client.post(BASE, json=FORM_CONNECTION | body)
        assert response.status_code == 201, response.json()
    else:
        draft_id = publishable_draft(signed_in_client)
        response = signed_in_client.post(
            f'{BASE}/{draft_id}/publish',
            json=editor_publish_body(get(signed_in_client, draft_id), DOCUMENTS) | body,
        )
        assert response.status_code == 200, response.json()

    data = response.json()['data']
    connection_id = data['id']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'live',
        True,
        None,
    )
    published_at, is_active, start_date, activated_at, _ = status_columns(connection_id)
    assert (is_active, start_date, activated_at) == (True, None, published_at)
    assert 'scheduled' not in [entry[0] for entry in entries(connection_id)]


# The date's checks (FR-003; quickstart V2.2)


@pytest.mark.parametrize('days_after_today', [0, -1], ids=['today', 'yesterday'])
@pytest.mark.parametrize('path', PUBLISH_PATHS)
def test_a_start_date_not_after_today_is_refused_and_nothing_is_written(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    path: PublishPath,
    days_after_today: int,
) -> None:
    """400 `invalid_start_date` before EUDIPLO is called: nothing is published,
    no configuration is created and no entry is recorded."""
    draft_id = prepare(signed_in_client, path)
    before = snapshot()

    status_code, answer = schedule(
        signed_in_client,
        path,
        draft_id,
        TODAY + timedelta(days=days_after_today),
    )

    assert (status_code, answer) == (400, INVALID_START_DATE)
    assert snapshot() == before
    assert fake_eudiplo.calls == []


def test_the_refusal_is_answered_in_the_requests_language(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """Spec 009: the message in German; the `error` code stays."""
    draft_id = publishable_draft(signed_in_client)
    body = editor_publish_body(get(signed_in_client, draft_id), DOCUMENTS)

    response = signed_in_client.post(
        f'{BASE}/{draft_id}/publish',
        json=body | {'start_date': TODAY.isoformat()},
        headers={'Accept-Language': 'de'},
    )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'invalid_start_date',
        'message': 'Geben Sie ein Datum nach dem heutigen Tag ein.',
    }


@pytest.mark.parametrize('value', ['abc', '2027-02-31', '01.12.2026'])
@pytest.mark.parametrize('path', ['publish', 'create'])
def test_a_value_that_is_no_date_fails_the_bodys_validation(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    path: PublishPath,
    value: object,
) -> None:
    """contracts/management-api.md "Scheduling": the generic validation error."""
    draft_id = prepare(signed_in_client, path)
    before = snapshot()

    if path == 'create':
        response = signed_in_client.post(
            BASE, json=FORM_CONNECTION | {'start_date': value}
        )
    else:
        assert draft_id is not None
        body = editor_publish_body(get(signed_in_client, draft_id), DOCUMENTS)
        response = signed_in_client.post(
            f'{BASE}/{draft_id}/publish', json=body | {'start_date': value}
        )

    assert response.status_code == 400
    assert response.json() == {
        'error': 'Validation error',
        'message': INVALID_PAYLOAD_MESSAGE.en,
    }
    assert snapshot() == before
    assert fake_eudiplo.calls == []


def _midnight_during_create_config(
    fake_eudiplo: FakeEudiplo, monkeypatch: pytest.MonkeyPatch
) -> list[str]:
    """Let the day in Germany pass from TODAY to TOMORROW while EUDIPLO creates a
    configuration; return the ids of the configurations created."""
    days = [TODAY]
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: days[-1])
    create_config: Callable[[Request], Response] = fake_eudiplo._create_config
    created: list[str] = []

    def create_config_over_midnight(request: Request) -> Response:
        response = create_config(request)
        created.append(json.loads(request.content)['id'])
        days.append(TOMORROW)
        return response

    monkeypatch.setattr(fake_eudiplo, '_create_config', create_config_over_midnight)
    return created


@pytest.mark.parametrize('path', PUBLISH_PATHS)
def test_a_day_that_ends_while_eudiplo_answers_is_refused_and_undone(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    path: PublishPath,
) -> None:
    """The edge case "midnight": checked again under the row lock, after the
    call. TOMORROW was after today when the request came and is today when the
    row is locked again: refused as a `DraftGuard` refusal is, so the draft stays
    a draft, and the configuration the call created is deleted again."""
    draft_id = prepare(signed_in_client, path)
    created = _midnight_during_create_config(fake_eudiplo, monkeypatch)
    before = snapshot()

    status_code, answer = schedule(signed_in_client, path, draft_id, TOMORROW)

    assert (status_code, answer) == (400, INVALID_START_DATE)
    # The call was made, so the refusal came after it, under the lock
    assert len(created) == 1
    assert fake_eudiplo.configs == {}
    assert deleted_configs(fake_eudiplo) == created
    assert snapshot() == before
    if draft_id is None:
        return
    # The draft is a draft, as it was, and can be published on a later day
    assert rows(draft_id) == (0, 0, 0)
    assert status_columns(draft_id) == (None, True, None, None, None)
    assert get(signed_in_client, draft_id)['status'] == 'draft'
    later = TOMORROW + timedelta(days=1)
    assert schedule(signed_in_client, path, draft_id, later)[0] == 200
    assert status_columns(draft_id)[1:4] == (False, later, None)


@pytest.mark.parametrize('path', DRAFT_PATHS)
def test_a_day_that_ends_before_the_lock_is_refused_before_eudiplo(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    path: PublishPath,
) -> None:
    """Under `create_revision()`'s first row lock, as the `DraftGuard` is: a day
    that ended after the first check is refused before anything is reserved."""
    draft_id = prepare(signed_in_client, path)
    # The first check, before the lock, still sees TODAY
    days = iter([TODAY])
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: next(days, TOMORROW))
    before = snapshot()

    status_code, answer = schedule(signed_in_client, path, draft_id, TOMORROW)

    assert (status_code, answer) == (400, INVALID_START_DATE)
    assert snapshot() == before
    assert fake_eudiplo.calls == []


def test_an_eudiplo_failure_leaves_the_draft_a_draft(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """With a date as without one: 502, nothing published, nothing scheduled."""
    draft_id = publishable_draft(signed_in_client)
    draft = get(signed_in_client, draft_id)
    before = snapshot()
    fake_eudiplo.fail('create_config', 503)

    response = publish_on(signed_in_client, draft_id, START)

    assert response.status_code == 502
    assert response.json()['error'] == 'Upstream error'
    assert snapshot() == before
    assert get(signed_in_client, draft_id) == draft
    assert status_columns(draft_id) == (None, True, None, None, None)
    assert rows(draft_id) == (0, 0, 0)
    assert fake_eudiplo.configs == {}

    # It can be scheduled once EUDIPLO answers again
    assert publish_on(signed_in_client, draft_id, START).status_code == 200
    assert status_columns(draft_id)[1:4] == (False, START, None)


# Moving, starting and cancelling a schedule (T020; data-model 1.3, "scheduled",
# "live" and "deactivated"; contracts/management-api.md "Scheduling")

LATER = date(2027, 1, 15)

UNAVAILABLE = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}
STATUS_CHANGED = {
    'error': 'status_changed',
    'message': 'This connection was deactivated or reactivated in the meantime.',
}
NOT_PUBLISHED = {
    'error': 'not_published',
    'message': 'This connection is a draft. Continue it to save or publish it.',
}
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}
BROWSER_ONLY = {
    'error': 'browser_only',
    'message': 'This action is done in Konnekt.',
}
VALIDATION_ERROR = {
    'error': 'Validation error',
    'message': INVALID_PAYLOAD_MESSAGE.en,
}

State = Literal['draft', 'scheduled', 'live', 'deactivated']


def set_start(
    client: TestClient, form_connection_id: str, start_date: date | str | None
) -> Response:
    """`PUT …/{id}/start-date` with `start_date`."""
    return client.put(
        f'{BASE}/{form_connection_id}/start-date',
        json={'start_date': start_date_json(start_date)},
    )


def activate(
    client: TestClient, form_connection_id: str, body: dict[str, Any] | None
) -> Response:
    """`POST …/{id}/activate` with `body`; None sends JSON without a body."""
    if body is None:
        return client.post(
            f'{BASE}/{form_connection_id}/activate',
            headers={'Content-Type': 'application/json'},
        )
    return client.post(f'{BASE}/{form_connection_id}/activate', json=body)


def deactivate(client: TestClient, form_connection_id: str) -> Response:
    return client.post(f'{BASE}/{form_connection_id}/deactivate', json={})


def on(start_date: date) -> dict[str, Any]:
    """An `ActivateRequest` with `start_date`."""
    return {'start_date': start_date.isoformat()}


def scheduled_connection(client: TestClient) -> str:
    """A connection created scheduled for START; its id (needs `today`)."""
    response = create_on(client, START)
    assert response.status_code == 201, response.json()
    form_connection_id: str = response.json()['data']['id']
    return form_connection_id


def deactivated_connection(client: TestClient) -> str:
    """A connection created live and deactivated in the browser; its id."""
    form_connection_id = create_form_connection(client)
    response = deactivate(client, form_connection_id)
    assert response.status_code == 200, response.json()
    return form_connection_id


# A connection in each state, made through the API by the signed-in client
SETUPS: dict[State, Callable[[TestClient], str]] = {
    'draft': publishable_draft,
    'scheduled': scheduled_connection,
    'live': create_form_connection,
    'deactivated': deactivated_connection,
}

# The calls that take a start date, or "now"
ACTIONS: dict[str, Callable[[TestClient, str], Response]] = {
    'set a date': lambda client, id_: set_start(client, id_, LATER),
    'set now': lambda client, id_: set_start(client, id_, None),
    'activate now': lambda client, id_: activate(client, id_, {}),
    'activate on a date': lambda client, id_: activate(client, id_, on(LATER)),
}

# The states that take a date, with the call that takes it there
DATED: list[tuple[State, str]] = [
    ('scheduled', 'set'),
    ('live', 'set'),
    ('deactivated', 'activate'),
]


def send_date(
    client: TestClient, action: str, form_connection_id: str, start_date: date
) -> Response:
    """`action` of DATED with `start_date`."""
    if action == 'set':
        return set_start(client, form_connection_id, start_date)
    return activate(client, form_connection_id, on(start_date))


def manage_agent() -> TestClient:
    """An agent connection of TEST_USERNAME's account with the level 'manage',
    calling with its bearer only."""
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    _, token = create_agent_authorization(
        user_id, 'manage', kind='oauth', client_name=AGENT_NAME
    )
    return bearer_client(TestClient(app), token)


# From scheduled


def test_another_date_moves_a_scheduled_connections_start(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """ "scheduled | change start date, another date": only `start_date` moves,
    and `start_date_changed` records the new date (FR-008)."""
    connection_id = scheduled_connection(signed_in_client)
    published_at = status_columns(connection_id)[0]

    response = set_start(signed_in_client, connection_id, LATER)

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Start date saved'
    data = response.json()['data']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'scheduled',
        False,
        '2027-01-15',
    )
    assert (data['activated_at'], data['deactivated_at']) == (None, None)
    assert get(signed_in_client, connection_id) == data
    assert status_columns(connection_id) == (published_at, False, LATER, None, None)
    assert entries(connection_id) == [
        ('start_date_changed', 0, LATER, IN_THE_BROWSER),
        ('scheduled', 2, START, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    assert (data['last_activity']['kind'], data['last_activity']['start_date']) == (
        'start_date_changed',
        '2027-01-15',
    )
    # Not usable before the new day either
    triggered = signed_in_client.post(requests_url(connection_id))
    assert (triggered.status_code, triggered.json()) == (409, UNAVAILABLE)


def test_now_makes_a_scheduled_connection_live_at_once(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """ "scheduled | change start date, Now": active since now, without its
    start date; `start_date_changed` without a date (FR-008)."""
    connection_id = scheduled_connection(signed_in_client)
    published_at = status_columns(connection_id)[0]
    before = now()

    response = set_start(signed_in_client, connection_id, None)

    assert response.status_code == 200, response.json()
    activated_at = status_columns(connection_id)[3]
    assert activated_at is not None
    assert before <= activated_at <= now()
    assert status_columns(connection_id) == (
        published_at,
        True,
        None,
        activated_at,
        None,
    )
    data = response.json()['data']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'live',
        True,
        None,
    )
    assert (data['activated_at'], data['deactivated_at']) == (
        to_iso_utc(activated_at),
        None,
    )
    assert entries(connection_id) == [
        ('start_date_changed', 0, None, IN_THE_BROWSER),
        ('scheduled', 2, START, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    # Its links work from now on
    trigger(signed_in_client, connection_id)


def test_a_scheduled_connections_own_date_changes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """The date it already has is no "another date": nothing changes and
    nothing is recorded."""
    connection_id = scheduled_connection(signed_in_client)
    before = snapshot()

    response = set_start(signed_in_client, connection_id, START)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert (data['state'], data['start_date']) == ('scheduled', '2026-12-01')
    assert snapshot() == before


@pytest.mark.parametrize('state', ['live', 'scheduled'])
def test_deactivating_records_its_date_and_ends_a_schedule(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date, state: State
) -> None:
    """ "live | deactivate" and "scheduled | deactivate": not active, no start
    date, deactivated since now, `deactivated`; a schedule ends and was never
    active (FR-012). Deactivating again changes nothing and writes nothing; it
    can be activated again, now or on a date."""
    connection_id = SETUPS[state](signed_in_client)
    published_at, _, _, activated_at, _ = status_columns(connection_id)
    assert (activated_at is None) == (state == 'scheduled')
    before = now()

    response = deactivate(signed_in_client, connection_id)

    assert response.status_code == 200, response.json()
    deactivated_at = status_columns(connection_id)[4]
    assert deactivated_at is not None
    assert before <= deactivated_at <= now()
    assert status_columns(connection_id) == (
        published_at,
        False,
        None,
        activated_at,
        deactivated_at,
    )
    data = response.json()['data']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'deactivated',
        False,
        None,
    )
    assert data['deactivated_at'] == to_iso_utc(deactivated_at)
    assert entries(connection_id)[0] == ('deactivated', 0, None, IN_THE_BROWSER)

    stamps = snapshot()
    again = deactivate(signed_in_client, connection_id)
    assert again.status_code == 200
    assert again.json() == response.json()
    assert snapshot() == stamps

    scheduled = activate(signed_in_client, connection_id, on(LATER))
    assert scheduled.status_code == 200, scheduled.json()
    assert scheduled.json()['data']['state'] == 'scheduled'


# From live


def test_a_date_schedules_a_live_connection_and_cancels_its_requests(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """ "live | change start date, a date": not active, with the date,
    `scheduled`; its open requests are cancelled as deactivating cancels them
    (FR-009), and its links answer as a deactivated connection's until then."""
    connection_id = create_form_connection(signed_in_client)
    pending = trigger(signed_in_client, connection_id)['reference']
    declined = trigger(signed_in_client, connection_id)['reference']
    fail_in_wallet(fake_eudiplo, declined, 'access_denied')
    worker.sync_sessions()
    published_at, _, _, activated_at, _ = status_columns(connection_id)
    assert activated_at is not None

    response = set_start(signed_in_client, connection_id, START)

    assert response.status_code == 200, response.json()
    assert status_columns(connection_id) == (
        published_at,
        False,
        START,
        activated_at,
        None,
    )
    data = response.json()['data']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'scheduled',
        False,
        '2026-12-01',
    )
    assert (data['activated_at'], data['deactivated_at']) == (
        to_iso_utc(activated_at),
        None,
    )
    assert entries(connection_id) == [
        ('scheduled', 0, START, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    # The pending request reads unavailable; the one that ended stays as it was
    cancelled = stored_request(pending)
    assert cancelled.status == 'unavailable'
    assert cancelled.ended_at is not None
    assert stored_request(declined).status == 'declined'
    triggered = signed_in_client.post(requests_url(connection_id))
    pulled = signed_in_client.get(pull_url(connection_id, pending))
    assert triggered.status_code == pulled.status_code == 409
    assert triggered.json() == pulled.json() == UNAVAILABLE
    # The worker then deletes the cancelled request's EUDIPLO session
    worker.delete_eudiplo_sessions()
    assert cancelled.eudiplo_session_id not in fake_eudiplo.sessions
    assert stored_request(pending).eudiplo_session_deleted_at is not None
    # Starting it at once revives no request
    assert set_start(signed_in_client, connection_id, None).status_code == 200
    pulled = signed_in_client.get(pull_url(connection_id, pending))
    assert pulled.status_code == 200, pulled.json()
    assert pulled.json()['data']['status'] == 'unavailable'


def test_now_leaves_a_live_connection_as_it_is(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """ "live | change start date, Now": nothing changes, nothing is recorded,
    and its requests go on (FR-009)."""
    connection_id = create_form_connection(signed_in_client)
    pending = trigger(signed_in_client, connection_id)['reference']
    before = snapshot()

    response = set_start(signed_in_client, connection_id, None)

    assert response.status_code == 200, response.json()
    data = response.json()['data']
    assert (data['state'], data['is_active']) == ('live', True)
    assert data == get(signed_in_client, connection_id)
    assert snapshot() == before
    assert stored_request(pending).status == 'pending'


@pytest.mark.parametrize('body', [{}, on(LATER)], ids=['now', 'on a date'])
def test_activating_a_live_connection_changes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    body: dict[str, Any],
) -> None:
    """Activating an active connection changes no date and writes no entry,
    with a date too ("A live connection: nothing, as today")."""
    connection_id = create_form_connection(signed_in_client)
    before = snapshot()

    response = activate(signed_in_client, connection_id, body)

    assert response.status_code == 200, response.json()
    assert response.json()['data']['state'] == 'live'
    assert snapshot() == before


# From deactivated


@pytest.mark.parametrize(
    'body', [{}, {'start_date': None}, None], ids=['empty', 'null', 'no body']
)
def test_activating_again_now_makes_a_deactivated_connection_live(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    body: dict[str, Any] | None,
) -> None:
    """ "deactivated | activate again, Now": an empty object (what `apiFetch`
    sends without a body, research R15 V5), a null date and no body at all."""
    connection_id = deactivated_connection(signed_in_client)
    published_at, _, _, _, deactivated_at = status_columns(connection_id)
    before = now()

    response = activate(signed_in_client, connection_id, body)

    assert response.status_code == 200, response.json()
    assert response.json()['message'] == 'Form connection activated'
    activated_at = status_columns(connection_id)[3]
    assert activated_at is not None
    assert before <= activated_at <= now()
    # The deactivation's date is kept, and answered only while deactivated
    assert status_columns(connection_id) == (
        published_at,
        True,
        None,
        activated_at,
        deactivated_at,
    )
    data = response.json()['data']
    assert (data['state'], data['start_date'], data['deactivated_at']) == (
        'live',
        None,
        None,
    )
    assert data['activated_at'] == to_iso_utc(activated_at)
    assert entries(connection_id)[0] == ('reactivated', 0, None, IN_THE_BROWSER)
    trigger(signed_in_client, connection_id)


def test_activating_again_on_a_date_schedules_a_deactivated_connection(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """ "deactivated | activate again, on a date": only `start_date`; `scheduled`
    with the date (FR-011). Its links answer as before until the day."""
    connection_id = deactivated_connection(signed_in_client)
    published_at, _, _, activated_at, deactivated_at = status_columns(connection_id)
    assert activated_at is not None

    response = activate(signed_in_client, connection_id, on(START))

    assert response.status_code == 200, response.json()
    assert status_columns(connection_id) == (
        published_at,
        False,
        START,
        activated_at,
        deactivated_at,
    )
    data = response.json()['data']
    assert (data['state'], data['is_active'], data['start_date']) == (
        'scheduled',
        False,
        '2026-12-01',
    )
    assert (data['activated_at'], data['deactivated_at']) == (
        to_iso_utc(activated_at),
        None,
    )
    assert entries(connection_id) == [
        ('scheduled', 0, START, IN_THE_BROWSER),
        ('deactivated', 0, None, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    triggered = signed_in_client.post(requests_url(connection_id))
    assert (triggered.status_code, triggered.json()) == (409, UNAVAILABLE)


# Refusals


@pytest.mark.parametrize(
    ('state', 'action', 'answer'),
    [
        ('scheduled', 'activate now', STATUS_CHANGED),
        ('scheduled', 'activate on a date', STATUS_CHANGED),
        ('deactivated', 'set a date', STATUS_CHANGED),
        ('deactivated', 'set now', STATUS_CHANGED),
        ('draft', 'set a date', NOT_PUBLISHED),
        ('draft', 'set now', NOT_PUBLISHED),
        ('draft', 'activate on a date', NOT_PUBLISHED),
    ],
)
def test_an_action_is_refused_for_a_state_it_doesnt_apply_to(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    state: State,
    action: str,
    answer: dict[str, str],
) -> None:
    """contracts "Scheduling": activating a scheduled connection and changing a
    deactivated one's start answer `409 status_changed` (its start date is
    changed, it is activated again instead); a draft `409 not_published`.
    Nothing changes."""
    connection_id = SETUPS[state](signed_in_client)
    before = snapshot()

    response = ACTIONS[action](signed_in_client, connection_id)

    assert (response.status_code, response.json()) == (409, answer)
    assert snapshot() == before


@pytest.mark.parametrize('action', ['set a date', 'set now', 'activate on a date'])
def test_an_unknown_or_deleted_connection_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date, action: str
) -> None:
    deleted_id = create_form_connection(signed_in_client)
    deleted = signed_in_client.request('DELETE', f'{BASE}/{deleted_id}', json={})
    assert deleted.status_code == 200, deleted.json()
    before = snapshot()

    for connection_id in ('unknown', deleted_id):
        response = ACTIONS[action](signed_in_client, connection_id)
        assert (response.status_code, response.json()) == (404, NOT_FOUND)
    assert snapshot() == before


@pytest.mark.parametrize('days_after_today', [0, -1], ids=['today', 'yesterday'])
@pytest.mark.parametrize(('state', 'action'), DATED)
def test_a_start_date_not_after_today_changes_nothing(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    state: State,
    action: str,
    days_after_today: int,
) -> None:
    """FR-003: `400 invalid_start_date`, and nothing changes; a live
    connection's requests go on."""
    connection_id = SETUPS[state](signed_in_client)
    if state == 'live':
        trigger(signed_in_client, connection_id)
    before = snapshot()

    response = send_date(
        signed_in_client,
        action,
        connection_id,
        TODAY + timedelta(days=days_after_today),
    )

    assert (response.status_code, response.json()) == (400, INVALID_START_DATE)
    assert snapshot() == before


@pytest.mark.parametrize(('state', 'action'), DATED)
def test_a_day_that_ends_before_the_lock_is_refused_under_it(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
    state: State,
    action: str,
) -> None:
    """FR-003, the edge case "midnight": the date is checked before the row is
    locked and again under the lock of `_lock_for_status_change()`. TOMORROW is
    after today at the first check and is today under the lock: refused, and
    nothing changes. Either check alone would see TODAY and let it through."""
    connection_id = SETUPS[state](signed_in_client)
    if state == 'live':
        trigger(signed_in_client, connection_id)
    days = iter([TODAY])
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: next(days, TOMORROW))
    before = snapshot()

    response = send_date(signed_in_client, action, connection_id, TOMORROW)

    assert (response.status_code, response.json()) == (400, INVALID_START_DATE)
    assert snapshot() == before


@pytest.mark.parametrize(
    'body',
    [
        {},
        {'start_date': 'abc'},
        {'start_date': '2027-02-31'},
        {'start_date': '15.01.2027'},
    ],
    ids=['no key', 'abc', '31 February', 'DD.MM.YYYY'],
)
def test_a_start_date_that_is_no_date_fails_the_bodys_validation(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    body: dict[str, Any],
) -> None:
    """`StartDateUpdate.start_date` is a required key, null or a date, and an
    `ActivateRequest`'s a date if given: the generic validation error."""
    scheduled_id = scheduled_connection(signed_in_client)
    deactivated_id = deactivated_connection(signed_in_client)
    before = snapshot()

    response = signed_in_client.put(f'{BASE}/{scheduled_id}/start-date', json=body)

    assert (response.status_code, response.json()) == (400, VALIDATION_ERROR)
    if body:
        response = activate(signed_in_client, deactivated_id, body)
        assert (response.status_code, response.json()) == (400, VALIDATION_ERROR)
    assert snapshot() == before


def test_the_start_date_is_sent_as_json(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """`require_json`: 415 otherwise, the CSRF protection."""
    connection_id = scheduled_connection(signed_in_client)
    before = snapshot()

    response = signed_in_client.put(
        f'{BASE}/{connection_id}/start-date',
        content=b'start_date=2027-01-15',
        headers={'Content-Type': 'application/x-www-form-urlencoded'},
    )

    assert response.status_code == 415
    assert snapshot() == before


@pytest.mark.parametrize(
    ('state', 'action'),
    [
        ('scheduled', 'set a date'),
        ('scheduled', 'set now'),
        ('live', 'set a date'),
        ('deactivated', 'activate on a date'),
    ],
)
def test_an_agent_cant_change_a_start_directly(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    today: date,
    state: State,
    action: str,
) -> None:
    """contracts "Who may call what": `PUT …/{id}/start-date` and activating
    with a date are for the browser session; an agent's bearer, even with
    'manage', answers `403 browser_only`, and nothing changes. Agents ask for it
    with an approval request."""
    connection_id = SETUPS[state](signed_in_client)
    agent = manage_agent()
    before = snapshot()

    response = ACTIONS[action](agent, connection_id)

    assert (response.status_code, response.json()) == (403, BROWSER_ONLY)
    assert snapshot() == before


def test_an_approved_reactivation_of_a_connection_scheduled_since_does_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """An approval runs `activate_form_connection()`, never a second path, so a
    connection scheduled after the agent asked meets that service's `409
    status_changed` under its row lock: the approval is refused as cancelled,
    and the connection stays scheduled with nothing recorded."""
    connection_id = deactivated_connection(signed_in_client)
    asked = manage_agent().post(
        '/api/approval-requests',
        json={'form_connection_id': connection_id, 'action': 'reactivate'},
    )
    assert asked.status_code == 201, asked.json()
    request_id = asked.json()['data']['id']
    # Meanwhile, a team member activates it again on a date
    scheduled = activate(signed_in_client, connection_id, on(START))
    assert scheduled.status_code == 200, scheduled.json()
    before = snapshot()

    response = signed_in_client.post(
        f'/api/approval-requests/{request_id}/approve', json={}
    )

    assert response.status_code == 409, response.json()
    assert response.json()['error'] == 'approval_cancelled'
    assert snapshot() == before
    assert status_columns(connection_id)[1:3] == (False, START)


def test_the_service_refuses_a_scheduled_connection_with_any_snapshot(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """`activate_form_connection()` with the approvals' `expected` status: the
    scheduled connection's own status (spec 010, research R9) matches, and it
    still answers `409 status_changed` under the lock."""
    connection_id = scheduled_connection(signed_in_client)
    before = snapshot()
    expected = form_connections.StatusSnapshot(was_active=False, was_start_date=START)

    for start_date in (None, LATER):
        with SessionLocal() as db, pytest.raises(HTTPException) as refused:
            form_connections.activate_form_connection(
                db,
                connection_id,
                actor=APPROVER,
                expected=expected,
                start_date=start_date,
            )
        assert refused.value.status_code == 409
        assert isinstance(refused.value.detail, dict)
        assert refused.value.detail['error'] == 'status_changed'
    assert snapshot() == before


# The start arrives (T021; contracts/management-api.md "The worker"; data-model
# 1.3, "scheduled | the start comes"; quickstart V3.1, V3.2)

# The person of what the middleware does by itself (`SYSTEM`)
NOBODY = (None, None, False)
# START's instant: 00:00 in Germany, which is 23:00 UTC the day before in winter
START_INSTANT = '2026-11-30T23:00:00Z'


def on_day(monkeypatch: pytest.MonkeyPatch, day: date) -> None:
    """Let the day in Germany be `day` from now on."""
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: day)


def delete_connection(client: TestClient, form_connection_id: str) -> Response:
    return client.request('DELETE', f'{BASE}/{form_connection_id}', json={})


# What a team member does to a scheduled connection before its day
BEFORE_THE_DAY: dict[str, Callable[[TestClient, str], Response]] = {
    'deleted': delete_connection,
    'moved to a later date': lambda client, id_: set_start(client, id_, LATER),
    'deactivated': deactivate,
    'started now': lambda client, id_: set_start(client, id_, None),
}


def test_the_scheduled_starts_are_the_first_step() -> None:
    """contracts/management-api.md "The worker": first in every cycle."""
    assert worker.STEPS[0] is worker.activate_scheduled_connections


@pytest.mark.parametrize(
    'days_after_start', [0, 3], ids=['on the start day', 'three days later']
)
def test_the_worker_makes_a_scheduled_connection_live_on_its_day(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
    days_after_start: int,
) -> None:
    """Quickstart V3.1 and V3.2 (FR-005, SC-001): on its start day, or at the
    first cycle after the middleware was down, one call of the step makes it
    live: active, without its start date, active since 00:00 in Germany of the
    start date, three days later too, and `became_active` without a person. Its
    links work, with nobody signed in."""
    connection_id = scheduled_connection(signed_in_client)
    published_at = status_columns(connection_id)[0]
    on_day(monkeypatch, START + timedelta(days=days_after_start))

    worker.activate_scheduled_connections()

    started = start_dates.start_instant(START)
    assert to_iso_utc(started) == START_INSTANT
    assert status_columns(connection_id) == (published_at, True, None, started, None)
    assert entries(connection_id) == [
        ('became_active', 0, None, NOBODY),
        ('scheduled', 2, START, IN_THE_BROWSER),
        ('published', 1, None, IN_THE_BROWSER),
        ('created', 0, None, IN_THE_BROWSER),
    ]
    data = get(signed_in_client, connection_id)
    assert (data['state'], data['is_active'], data['start_date']) == (
        'live',
        True,
        None,
    )
    assert (data['activated_at'], data['deactivated_at']) == (START_INSTANT, None)
    # serviceBW signs in nowhere: the trigger and the pull URL work
    servicebw = TestClient(app)
    reference = trigger(servicebw, connection_id)['reference']
    pulled = servicebw.get(pull_url(connection_id, reference))
    assert pulled.status_code == 200, pulled.json()
    assert pulled.json()['data']['status'] == 'pending'
    # The next cycle has nothing left to do
    before = snapshot()
    worker.activate_scheduled_connections()
    assert snapshot() == before


def test_the_day_before_its_start_nothing_changes(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
) -> None:
    """The start is 00:00 of its day: the day before, it stays scheduled and its
    links answer as a deactivated connection's."""
    connection_id = scheduled_connection(signed_in_client)
    on_day(monkeypatch, START - timedelta(days=1))
    before = snapshot()

    worker.activate_scheduled_connections()

    assert snapshot() == before
    assert status_columns(connection_id)[1:4] == (False, START, None)
    triggered = signed_in_client.post(requests_url(connection_id))
    assert (triggered.status_code, triggered.json()) == (409, UNAVAILABLE)


@pytest.mark.parametrize('change', BEFORE_THE_DAY)
def test_a_connection_changed_before_its_day_is_left_alone(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
    change: str,
) -> None:
    """Only a scheduled connection that isn't deleted becomes active: a deleted
    one keeps its date and stays deleted (data-model 1.3, "Restoring"), and one
    that was moved to a later day, deactivated (FR-012) or started "Now"
    (FR-008) is no longer due. Nothing changes and nothing is recorded."""
    connection_id = scheduled_connection(signed_in_client)
    response = BEFORE_THE_DAY[change](signed_in_client, connection_id)
    assert response.status_code == 200, response.json()
    on_day(monkeypatch, START)
    before = snapshot()

    worker.activate_scheduled_connections()

    assert snapshot() == before
    assert 'became_active' not in [entry[0] for entry in entries(connection_id)]


def test_a_moved_start_comes_on_the_new_day(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
) -> None:
    """A connection whose start was moved becomes active on its new day, active
    since that day's 00:00 in Germany."""
    connection_id = scheduled_connection(signed_in_client)
    assert set_start(signed_in_client, connection_id, LATER).status_code == 200
    on_day(monkeypatch, LATER)

    worker.activate_scheduled_connections()

    assert status_columns(connection_id)[1:4] == (
        True,
        None,
        start_dates.start_instant(LATER),
    )
    assert entries(connection_id)[0] == ('became_active', 0, None, NOBODY)


def test_every_due_connection_becomes_active_in_one_cycle(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, today: date
) -> None:
    """`activate_due_connections()` takes every scheduled connection whose day
    is today or earlier, each active since its own start, answers their ids, and
    leaves a later start and the other states alone."""
    earlier = create_on(signed_in_client, TOMORROW).json()['data']['id']
    due = scheduled_connection(signed_in_client)
    later = create_on(signed_in_client, LATER).json()['data']['id']
    live = create_form_connection(signed_in_client)
    deactivated = deactivated_connection(signed_in_client)
    draft = publishable_draft(signed_in_client)
    untouched = {
        form_connection_id: status_columns(form_connection_id)
        for form_connection_id in (later, live, deactivated, draft)
    }

    with SessionLocal() as db:
        activated = form_connections.activate_due_connections(db, START)

    assert sorted(activated) == sorted([earlier, due])
    assert status_columns(earlier)[1:4] == (
        True,
        None,
        start_dates.start_instant(TOMORROW),
    )
    assert status_columns(due)[1:4] == (True, None, start_dates.start_instant(START))
    for form_connection_id, columns in untouched.items():
        assert status_columns(form_connection_id) == columns


def test_a_row_held_by_another_session_is_skipped_and_taken_next_cycle(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
) -> None:
    """`FOR UPDATE SKIP LOCKED`: while another session holds a due connection's
    row lock, as a status change holds it until its commit, the step neither
    waits for it nor changes it, and still activates the other due connection.
    The next cycle after the lock is released takes it."""
    held = scheduled_connection(signed_in_client)
    free = scheduled_connection(signed_in_client)
    on_day(monkeypatch, START)

    with SessionLocal() as holder:
        holder.scalars(
            select(FormConnection.id).where(FormConnection.id == held).with_for_update()
        ).one()
        # In another thread, so that a step that waits for the lock fails the
        # test instead of hanging it
        with ThreadPoolExecutor(max_workers=1) as pool:
            try:
                pool.submit(worker.activate_scheduled_connections).result(timeout=10)
                while_held = (status_columns(held), status_columns(free))
            finally:
                holder.rollback()

    held_columns, free_columns = while_held
    assert held_columns[1:4] == (False, START, None)
    assert 'became_active' not in [entry[0] for entry in entries(held)]
    assert free_columns[1:4] == (True, None, start_dates.start_instant(START))
    assert entries(free)[0] == ('became_active', 0, None, NOBODY)

    worker.activate_scheduled_connections()

    assert status_columns(held)[1:4] == (True, None, start_dates.start_instant(START))
    assert entries(held)[0] == ('became_active', 0, None, NOBODY)
    assert [entry[0] for entry in entries(free)].count('became_active') == 1


def test_the_step_logs_the_count_only(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    monkeypatch: pytest.MonkeyPatch,
    today: date,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Nothing new in the logs beyond ids and counts: the step writes how many
    connections became active, and neither their ids, names nor dates; a cycle
    with nothing to do writes nothing."""
    connection_id = scheduled_connection(signed_in_client)
    on_day(monkeypatch, START)

    with caplog.at_level(logging.DEBUG):
        worker.activate_scheduled_connections()
        worker.activate_scheduled_connections()

    messages = [
        record.getMessage()
        for record in caplog.records
        if record.name.startswith('app.')
    ]
    assert messages == ['Activated 1 scheduled form connections']
    for detail in (connection_id, FORM_CONNECTION['name'], '2026-12-01', '2026-11-30'):
        assert detail not in messages[0]
