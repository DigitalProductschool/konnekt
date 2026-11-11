"""A connection's activity: writing, merging and reading it (spec 010, research R4).

data-model.md sections 2.4 and 2.5. `activity.record()` under the connection's
row lock: one instant per action, the positions in the kinds' order, and the merge
of FR-026 (the same kind, person and variant with nothing in between is one
entry). `GET /api/form-connections/{id}/activity`: newest first, 50 per page with
a keyset cursor, open to every principal, 404 for an unknown or deleted
connection, and the backfilled entries of a connection made before the feature.
`last_activity` on the details: the closed card's line (FR-024, FR-032).

Last, what every existing path records and which status dates it moves (T011;
data-model 1.3, 2.3; FR-018, FR-025 to FR-027, FR-067): each row of section 1.3
that exists today, an agent's saves merging into one entry, an approved action
naming who approved and who asked, and nothing for a save without a change or a
failed EUDIPLO call.
"""

import base64
import copy
import uuid
from collections.abc import Sequence
from datetime import date, datetime, timedelta, timezone
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, null, select

from app.db import SessionLocal, engine
from app.main import app
from app.models import ConnectionActivity, FormConnection, UserAccount
from app.schemas import AccessLevel
from app.services import activity
from app.services.activity import Actor, Entry
from tests.api.test_form_connection_drafts import (
    create_draft,
    draft_body,
    draft_rules,
    editor_publish_body,
    get,
)
from tests.api.test_migration_status_dates import (
    insert_connection,
    status_dates_migration,
)
from tests.conftest import TEST_USERNAME, create_user
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    bearer_client,
    create_agent_authorization,
    create_form_connection,
    main_branch,
    now,
    rule,
    rules_input,
    target,
    variant,
)

BASE = '/api/form-connections'
VARIANT_ID = 'a5d7c0de-0000-4000-8000-000000000001'
OTHER_VARIANT_ID = 'a5d7c0de-0000-4000-8000-000000000002'

ALICE = Actor(name='alice')
BOB = Actor(name='bob')
ALICE_AGENT = Actor(name='alice', agent='Claude Code')
ALICE_APPROVED = Actor(name='alice', agent='Claude Code', approved=True)

DRAFT_CONTENT: dict[str, Any] = {
    'documents': [],
    'branches': [main_branch([], branch_id=VARIANT_ID)],
    'step': 'connection',
}


def _insert(
    *,
    state: str = 'live',
    deleted: bool = False,
) -> str:
    """Store a draft, a live or a deactivated connection directly, without entries.

    A published row has no revision: the activity reads the row only.
    """
    published = state != 'draft'
    values: dict[str, Any] = {
        'name': 'Taxi licence',
        'description': '',
        'is_active': state != 'deactivated',
        'published_at': now() if published else None,
        'current_revision': 1 if published else None,
        'current_rule_set': 1 if published else None,
        # SQL NULL: None would be stored as JSON null
        'draft': null() if published else DRAFT_CONTENT,
        'draft_version': None if published else 1,
        'deleted_at': now() if deleted else None,
    }
    with SessionLocal() as db:
        row_id = db.scalars(
            insert(FormConnection).values(**values).returning(FormConnection.id)
        ).one()
        db.commit()
        return row_id


def _record(form_connection_id: str, entries: Sequence[Entry], actor: Actor) -> None:
    """Record one action as a service does: under the row lock, then commit."""
    with SessionLocal() as db:
        db.scalars(
            select(FormConnection)
            .where(FormConnection.id == form_connection_id)
            .with_for_update()
        ).one()
        activity.record(db, form_connection_id, entries, actor)
        db.commit()


def _rows(form_connection_id: str) -> list[ConnectionActivity]:
    """The connection's entries in the list's order, newest first."""
    with SessionLocal() as db:
        rows = db.scalars(
            select(ConnectionActivity)
            .where(ConnectionActivity.form_connection_id == form_connection_id)
            .order_by(
                ConnectionActivity.occurred_at.desc(),
                ConnectionActivity.position.desc(),
                ConnectionActivity.id,
            )
        ).all()
        db.expunge_all()
        return list(rows)


def _summary(row: ConnectionActivity) -> tuple[Any, ...]:
    """What an entry says: the kind, the variant, the date and the person."""
    return (
        row.kind,
        row.variant_id,
        row.variant_name,
        row.start_date,
        row.actor_name,
        row.agent_name,
        row.approved,
    )


def _rules_changed(variant_name: str = 'Ambulance') -> Entry:
    return Entry('rules_changed', VARIANT_ID, variant_name)


# Writing and merging (FR-026)


def test_one_action_shares_one_instant_with_positions_in_the_kinds_order() -> None:
    connection_id = _insert()
    before = now()
    _record(
        connection_id,
        [_rules_changed(), Entry('documents_changed'), Entry('renamed')],
        ALICE,
    )
    rows = _rows(connection_id)

    # Newest first, so an action reads last cause first
    assert [(row.kind, row.position) for row in rows] == [
        ('rules_changed', 2),
        ('documents_changed', 1),
        ('renamed', 0),
    ]
    assert len({row.occurred_at for row in rows}) == 1
    assert before <= rows[0].occurred_at <= now()
    assert _summary(rows[0]) == (
        'rules_changed',
        VARIANT_ID,
        'Ambulance',
        None,
        'alice',
        None,
        False,
    )


def test_the_same_kind_person_and_variant_twice_is_one_entry() -> None:
    connection_id = _insert()
    _record(connection_id, [_rules_changed()], ALICE_AGENT)
    first = _rows(connection_id)[0]
    # The variant renamed in the meantime: the entry takes the latest name
    _record(connection_id, [_rules_changed('Patient transport')], ALICE_AGENT)

    rows = _rows(connection_id)
    assert len(rows) == 1
    assert rows[0].id == first.id
    assert rows[0].occurred_at > first.occurred_at
    assert _summary(rows[0]) == (
        'rules_changed',
        VARIANT_ID,
        'Patient transport',
        None,
        'alice',
        'Claude Code',
        False,
    )

    # Twenty saves of an agent stay one entry
    for _ in range(18):
        _record(connection_id, [_rules_changed()], ALICE_AGENT)
    assert len(_rows(connection_id)) == 1


def test_the_merge_moves_the_date_and_the_position_too() -> None:
    connection_id = _insert(state='deactivated')
    _record(connection_id, [Entry('scheduled', start_date=date(2027, 1, 4))], ALICE)
    _record(
        connection_id,
        [Entry('renamed'), Entry('scheduled', start_date=date(2027, 2, 1))],
        ALICE,
    )
    rows = _rows(connection_id)
    assert [(row.kind, row.position, row.start_date) for row in rows] == [
        ('scheduled', 1, date(2027, 2, 1)),
        ('renamed', 0, None),
    ]
    assert rows[0].occurred_at == rows[1].occurred_at


def test_another_person_in_between_starts_a_new_entry() -> None:
    connection_id = _insert()
    _record(connection_id, [_rules_changed()], ALICE)
    _record(connection_id, [_rules_changed()], BOB)
    _record(connection_id, [_rules_changed()], ALICE)
    assert [row.actor_name for row in _rows(connection_id)] == ['alice', 'bob', 'alice']


@pytest.mark.parametrize(
    ('first', 'second'),
    [
        # Another variant
        (_rules_changed(), Entry('rules_changed', OTHER_VARIANT_ID, 'Rental')),
        # Another kind
        (_rules_changed(), Entry('variant_renamed', VARIANT_ID, 'Ambulance')),
    ],
)
def test_another_kind_or_variant_is_another_entry(first: Entry, second: Entry) -> None:
    connection_id = _insert()
    _record(connection_id, [first], ALICE)
    _record(connection_id, [second], ALICE)
    _record(connection_id, [first], ALICE)
    assert len(_rows(connection_id)) == 3


@pytest.mark.parametrize(
    'other',
    [
        # The same team member through an agent, or approving an agent's request
        ALICE_AGENT,
        ALICE_APPROVED,
        Actor(name='alice', agent='Cursor'),
        # The middleware by itself
        activity.SYSTEM,
    ],
)
def test_the_person_is_the_name_the_agent_and_the_approval(other: Actor) -> None:
    connection_id = _insert()
    _record(connection_id, [_rules_changed()], ALICE)
    _record(connection_id, [_rules_changed()], other)
    rows = _rows(connection_id)
    assert len(rows) == 2
    assert (rows[0].actor_name, rows[0].agent_name, rows[0].approved) == (
        other.name,
        other.agent,
        other.approved,
    )


def test_two_kinds_in_one_action_merge_kind_by_kind() -> None:
    connection_id = _insert()
    _record(connection_id, [Entry('documents_changed'), _rules_changed()], ALICE)
    first = _rows(connection_id)
    _record(connection_id, [Entry('documents_changed'), _rules_changed()], ALICE)

    rows = _rows(connection_id)
    assert [row.id for row in rows] == [row.id for row in first]
    assert len({row.occurred_at for row in rows}) == 1
    assert rows[0].occurred_at > first[0].occurred_at

    # Only the newest instant merges: the rules alone move ahead of the documents,
    # and the next change of the documents is a new entry
    _record(connection_id, [_rules_changed()], ALICE)
    _record(connection_id, [Entry('documents_changed')], ALICE)
    assert [row.kind for row in _rows(connection_id)] == [
        'documents_changed',
        'rules_changed',
        'documents_changed',
    ]


def test_an_action_without_entries_writes_nothing() -> None:
    connection_id = _insert()
    _record(connection_id, [], ALICE)
    assert _rows(connection_id) == []


# Reading: the list (FR-023, FR-031)


def _activity(client: TestClient, connection_id: str, **params: Any) -> dict[str, Any]:
    response = client.get(f'{BASE}/{connection_id}/activity', params=params)
    assert response.status_code == 200, response.json()
    page: dict[str, Any] = response.json()['data']
    return page


def _insert_entries(connection_id: str, count: int) -> list[str]:
    """`count` entries directly, three to an instant, some with equal positions.

    Returns their ids in the list's order.
    """
    start = datetime(2026, 3, 1, 8, 0, tzinfo=timezone.utc)
    with SessionLocal() as db:
        for index in range(count):
            db.add(
                ConnectionActivity(
                    form_connection_id=connection_id,
                    kind='rules_changed',
                    occurred_at=start + timedelta(minutes=index // 3),
                    # Two entries of an instant share a position: the id decides
                    position=min(index % 3, 1),
                    variant_id=VARIANT_ID,
                    variant_name='Ambulance',
                    actor_name='alice',
                )
            )
        db.commit()
    return [row.id for row in _rows(connection_id)]


def test_pages_of_50_newest_first_with_a_stable_cursor(
    signed_in_client: TestClient,
) -> None:
    connection_id = _insert()
    expected = _insert_entries(connection_id, 120)

    first = _activity(signed_in_client, connection_id)
    assert len(first['items']) == 50
    # An entry written between two calls doesn't shift the pages
    _record(connection_id, [Entry('renamed')], BOB)
    second = _activity(signed_in_client, connection_id, cursor=first['next_cursor'])
    assert len(second['items']) == 50
    third = _activity(signed_in_client, connection_id, cursor=second['next_cursor'])
    assert len(third['items']) == 20
    assert third['next_cursor'] is None

    pages = first['items'] + second['items'] + third['items']
    assert [item['id'] for item in pages] == expected
    # The new entry heads the next first page
    assert _activity(signed_in_client, connection_id)['items'][0]['kind'] == 'renamed'


def test_an_entry_as_the_api_answers_it(signed_in_client: TestClient) -> None:
    connection_id = _insert(state='deactivated')
    _record(connection_id, [_rules_changed()], ALICE_AGENT)
    _record(
        connection_id, [Entry('scheduled', start_date=date(2027, 1, 4))], ALICE_APPROVED
    )
    _record(connection_id, [Entry('became_active')], activity.SYSTEM)
    rows = _rows(connection_id)

    page = _activity(signed_in_client, connection_id)
    assert page == {
        'items': [
            {
                'id': rows[0].id,
                'kind': 'became_active',
                'at': rows[0].occurred_at.isoformat().replace('+00:00', 'Z'),
                'variant': None,
                'start_date': None,
                'actor': None,
            },
            {
                'id': rows[1].id,
                'kind': 'scheduled',
                'at': rows[1].occurred_at.isoformat().replace('+00:00', 'Z'),
                'variant': None,
                'start_date': '2027-01-04',
                'actor': {'name': 'alice', 'agent': 'Claude Code', 'approved': True},
            },
            {
                'id': rows[2].id,
                'kind': 'rules_changed',
                'at': rows[2].occurred_at.isoformat().replace('+00:00', 'Z'),
                'variant': 'Ambulance',
                'start_date': None,
                'actor': {'name': 'alice', 'agent': 'Claude Code', 'approved': False},
            },
        ],
        'next_cursor': None,
    }


def test_an_agent_with_read_access_reads_the_activity(client: TestClient) -> None:
    user_id = create_user()
    _, token = create_agent_authorization(user_id, 'read')
    bearer_client(client, token)
    connection_id = _insert(state='draft')
    _record(connection_id, [Entry('created')], ALICE_AGENT)

    page = _activity(client, connection_id)
    assert [item['kind'] for item in page['items']] == ['created']


def test_the_backfilled_entries_of_a_connection_made_before_the_feature(
    signed_in_client: TestClient,
) -> None:
    connection_id = insert_connection(published=True, active=False)
    with engine.begin() as connection:
        status_dates_migration().backfill_status_dates_and_activity(connection)

    page = _activity(signed_in_client, connection_id)
    assert [(item['kind'], item['actor']) for item in page['items']] == [
        ('deactivated', None),
        ('published', None),
        ('created', None),
    ]
    assert page['next_cursor'] is None


def test_an_unknown_or_deleted_connection_answers_404(
    signed_in_client: TestClient,
) -> None:
    deleted = _insert(deleted=True)
    _record(deleted, [Entry('deleted')], ALICE)
    for connection_id in (deleted, str(uuid.uuid4()), 'not-an-id'):
        response = signed_in_client.get(f'{BASE}/{connection_id}/activity')
        assert response.status_code == 404, connection_id
        assert response.json()['error'] == 'Not found'


def _cursor(text: str) -> str:
    return base64.urlsafe_b64encode(text.encode()).decode('ascii')


@pytest.mark.parametrize(
    'cursor',
    [
        'not base64 !',
        _cursor('2026-03-01T08:00:00+00:00|1'),
        _cursor('2026-03-01T08:00:00|1|' + str(uuid.uuid4())),
        _cursor('2026-03-01T08:00:00+00:00|first|' + str(uuid.uuid4())),
        _cursor('2026-03-01T08:00:00+00:00|1|not-a-uuid'),
        _cursor('yesterday|1|' + str(uuid.uuid4())),
    ],
)
def test_an_unknown_cursor_answers_400(
    signed_in_client: TestClient, cursor: str
) -> None:
    connection_id = _insert()
    response = signed_in_client.get(
        f'{BASE}/{connection_id}/activity', params={'cursor': cursor}
    )
    assert response.status_code == 400, response.json()
    assert response.json() == {
        'error': 'Validation error',
        'message': 'Unknown cursor.',
    }


def test_nothing_writes_an_entry(signed_in_client: TestClient) -> None:
    connection_id = _insert()
    for method in ('POST', 'PUT', 'DELETE'):
        response = signed_in_client.request(
            method, f'{BASE}/{connection_id}/activity', json={}
        )
        assert response.status_code == 405, method


# Reading: the closed card's line (FR-024, FR-032)


def _last(connection_id: str) -> dict[str, Any] | None:
    with SessionLocal() as db:
        form_connection = db.get(FormConnection, connection_id)
        assert form_connection is not None
        entry = activity.last_activity(db, form_connection)
        return None if entry is None else entry.model_dump()


def test_the_line_names_the_newest_entry_with_a_person() -> None:
    connection_id = _insert()
    assert _last(connection_id) is None

    _record(connection_id, [Entry('published')], activity.SYSTEM)
    last = _last(connection_id)
    # Only entries without a person: the newest, shown as the time alone
    assert last is not None
    assert (last['kind'], last['actor']) == ('published', None)

    _record(connection_id, [_rules_changed()], ALICE_AGENT)
    _record(connection_id, [Entry('became_active')], activity.SYSTEM)
    last = _last(connection_id)
    assert last is not None
    assert (last['kind'], last['actor']) == (
        'rules_changed',
        {'name': 'alice', 'agent': 'Claude Code', 'approved': False},
    )


def test_while_deactivated_the_line_names_the_deactivation() -> None:
    connection_id = _insert(state='deactivated')
    _record(connection_id, [Entry('deactivated')], ALICE)
    _record(connection_id, [_rules_changed()], BOB)
    last = _last(connection_id)
    assert last is not None
    assert (last['kind'], last['actor']['name']) == ('deactivated', 'alice')

    # A deactivated connection without that entry: the newest with a person
    other = _insert(state='deactivated')
    _record(other, [_rules_changed()], BOB)
    _record(other, [Entry('became_active')], activity.SYSTEM)
    last = _last(other)
    assert last is not None
    assert (last['kind'], last['actor']['name']) == ('rules_changed', 'bob')


def test_the_details_carry_the_last_activity(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = _insert(state='draft')
    assert (
        signed_in_client.get(f'{BASE}/{draft_id}').json()['data']['last_activity']
        is None
    )
    _record(draft_id, [Entry('created')], ALICE)
    draft = signed_in_client.get(f'{BASE}/{draft_id}').json()['data']
    assert draft['status'] == 'draft'
    assert draft['last_activity'] == _activity(signed_in_client, draft_id)['items'][0]

    connection_id = create_form_connection(signed_in_client)
    _record(connection_id, [Entry('renamed')], BOB)
    connection = signed_in_client.get(f'{BASE}/{connection_id}').json()['data']
    assert connection['status'] == 'published'
    assert connection['last_activity']['kind'] == 'renamed'
    assert connection['last_activity']['actor'] == {
        'name': 'bob',
        'agent': None,
        'approved': False,
    }


# What every existing path records, and the status dates it moves (T011;
# data-model 1.3, 2.3)

DOCUMENTS: list[dict[str, Any]] = FORM_CONNECTION['documents']
AGENT_NAME = 'Claude Code'
# An entry's person: (actor_name, agent_name, approved)
IN_THE_BROWSER = (TEST_USERNAME, None, False)
THROUGH_THE_AGENT = (TEST_USERNAME, AGENT_NAME, False)
APPROVED = (TEST_USERNAME, AGENT_NAME, True)


def _entries(connection_id: str) -> list[tuple[Any, ...]]:
    """The entries newest first, each as (kind, variant name, person)."""
    return [
        (row.kind, row.variant_name, (row.actor_name, row.agent_name, row.approved))
        for row in _rows(connection_id)
    ]


def _stamps(connection_id: str) -> list[tuple[str, datetime, int]]:
    """Each entry's id, time and position: what any write or merge changes."""
    return [(row.id, row.occurred_at, row.position) for row in _rows(connection_id)]


def _dates(
    connection_id: str,
) -> tuple[datetime | None, datetime | None, datetime | None]:
    """The row's `published_at`, `activated_at` and `deactivated_at`."""
    with SessionLocal() as db:
        row = db.get(FormConnection, connection_id)
        assert row is not None
        return row.published_at, row.activated_at, row.deactivated_at


def _iso(value: datetime | None) -> str | None:
    """A stored instant as the API answers it."""
    if value is None:
        return None
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def _agent_client(level: AccessLevel) -> TestClient:
    """The agent "Claude Code" acting for TEST_USERNAME, with its bearer only."""
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
    assert user_id is not None
    _, token = create_agent_authorization(
        user_id, level, kind='oauth', client_name=AGENT_NAME
    )
    return bearer_client(TestClient(app), token)


def _ask_and_approve(
    client: TestClient, agent: TestClient, connection_id: str, action: str
) -> None:
    """The agent asks for `action`, and the signed-in team member approves it."""
    asked = agent.post(
        '/api/approval-requests',
        json={'form_connection_id': connection_id, 'action': action},
    )
    assert asked.status_code == 201, asked.json()
    request_id = asked.json()['data']['id']
    approved = client.post(f'/api/approval-requests/{request_id}/approve', json={})
    assert approved.status_code == 200, approved.json()


def test_creating_and_saving_a_draft_record_created_and_what_changed(
    signed_in_client: TestClient,
) -> None:
    """data-model 2.3: one entry per kind and variant, in section 2.2's order."""
    before = now()
    draft_id = create_draft(signed_in_client)

    [created] = _rows(draft_id)
    assert _summary(created) == (
        'created',
        None,
        None,
        None,
        TEST_USERNAME,
        None,
        False,
    )
    assert before <= created.occurred_at <= now()
    draft = get(signed_in_client, draft_id)
    assert draft['last_activity'] == _activity(signed_in_client, draft_id)['items'][0]
    # A draft has no status date
    assert _dates(draft_id) == (None, None, None)

    response = signed_in_client.put(
        f'{BASE}/{draft_id}/draft',
        json=draft_body(
            version=1,
            name='Taxischein',
            description='FS-1',
            documents=DOCUMENTS,
            rules=draft_rules(
                [
                    draft['branches'][0],
                    variant([AGE_RULE], origin='empty', branch_id=VARIANT_ID),
                ]
            ),
            step='rules',
        ),
    )

    assert response.status_code == 200, response.json()
    rows = _rows(draft_id)
    assert [
        (row.kind, row.position, row.variant_id, row.variant_name) for row in rows
    ] == [
        ('rules_changed', 4, VARIANT_ID, 'Ambulance'),
        ('variant_added', 3, VARIANT_ID, 'Ambulance'),
        ('documents_changed', 2, None, None),
        ('description_changed', 1, None, None),
        ('renamed', 0, None, None),
        ('created', 0, None, None),
    ]
    assert len({row.occurred_at for row in rows[:5]}) == 1
    assert rows[0].occurred_at > created.occurred_at
    saved = response.json()['data']
    assert saved['last_activity'] == _activity(signed_in_client, draft_id)['items'][0]

    # The same content again, as the editor sends it, in another step: no change
    stamps = _stamps(draft_id)
    response = signed_in_client.put(
        f'{BASE}/{draft_id}/draft',
        json=draft_body(
            version=saved['version'],
            name=saved['name'],
            description=saved['description'],
            documents=DOCUMENTS,
            rules=draft_rules(
                saved['branches'],
                rule_base=saved['next_rule_number'],
                group_base=saved['next_group_number'],
            ),
            step='test',
        ),
    )
    assert response.status_code == 200, response.json()
    assert response.json()['data']['version'] == saved['version'] + 1
    assert _stamps(draft_id) == stamps


def test_publishing_a_draft_records_published_and_its_activation(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """data-model 1.3, "draft | publish, Now": the draft as stored, published."""
    draft_id = create_draft(
        signed_in_client,
        documents=DOCUMENTS,
        rules=draft_rules(
            [main_branch([AGE_RULE, CLASS_RULE]), variant([AGE_RULE, CLASS_RULE])]
        ),
        step='test',
    )
    draft = get(signed_in_client, draft_id)
    before = now()

    response = signed_in_client.post(
        f'{BASE}/{draft_id}/publish', json=editor_publish_body(draft, DOCUMENTS)
    )

    assert response.status_code == 200, response.json()
    published_at, activated_at, deactivated_at = _dates(draft_id)
    assert published_at is not None
    assert before <= published_at <= now()
    assert (activated_at, deactivated_at) == (published_at, None)
    data = response.json()['data']
    assert (
        data['state'],
        data['published_at'],
        data['activated_at'],
        data['deactivated_at'],
    ) == ('live', _iso(published_at), _iso(published_at), None)
    # Nothing changed since the last save: "published" alone
    assert _entries(draft_id) == [
        ('published', None, IN_THE_BROWSER),
        ('created', None, IN_THE_BROWSER),
    ]
    assert data['last_activity'] == _activity(signed_in_client, draft_id)['items'][0]


def test_publishing_records_the_bodys_changes_against_the_stored_draft(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """data-model 2.3: the publish body against the stored draft, then published,
    in one instant."""
    draft_id = create_draft(
        signed_in_client,
        documents=[{'document_type': 'pid', 'fields': ['birthdate']}],
        rules=draft_rules([main_branch([AGE_RULE]), variant([AGE_RULE])]),
    )
    draft = get(signed_in_client, draft_id)
    body = editor_publish_body(copy.deepcopy(draft), DOCUMENTS) | {'name': 'Taxischein'}
    body['rules']['branches'][1]['name'] = 'Krankentransport'

    response = signed_in_client.post(f'{BASE}/{draft_id}/publish', json=body)

    assert response.status_code == 200, response.json()
    rows = _rows(draft_id)
    assert [(row.kind, row.position, row.variant_name) for row in rows] == [
        ('published', 3, None),
        ('variant_renamed', 2, 'Krankentransport'),
        ('documents_changed', 1, None),
        ('renamed', 0, None),
        ('created', 0, None),
    ]
    assert rows[1].variant_id == draft['branches'][1]['id']
    assert len({row.occurred_at for row in rows[:4]}) == 1


def test_creating_a_published_connection_records_created_and_published(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    before = now()

    connection_id = create_form_connection(signed_in_client)

    rows = _rows(connection_id)
    assert [(row.kind, row.position) for row in rows] == [
        ('published', 1),
        ('created', 0),
    ]
    assert rows[0].occurred_at == rows[1].occurred_at
    assert {(row.actor_name, row.agent_name, row.approved) for row in rows} == {
        IN_THE_BROWSER
    }
    published_at, activated_at, deactivated_at = _dates(connection_id)
    assert published_at is not None
    assert before <= published_at <= now()
    assert (activated_at, deactivated_at) == (published_at, None)


def test_deactivating_and_activating_again_move_their_dates_once(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """data-model 1.3: "live | deactivate", "deactivated | activate again, Now",
    and a connection already in that state changes no date and writes nothing."""
    connection_id = create_form_connection(signed_in_client)
    published_at, activated_at, _ = _dates(connection_id)
    before = now()

    deactivated = signed_in_client.post(f'{BASE}/{connection_id}/deactivate', json={})

    assert deactivated.status_code == 200, deactivated.json()
    deactivated_at = _dates(connection_id)[2]
    assert deactivated_at is not None
    assert before <= deactivated_at <= now()
    assert _dates(connection_id) == (published_at, activated_at, deactivated_at)
    data = deactivated.json()['data']
    assert (data['state'], data['activated_at'], data['deactivated_at']) == (
        'deactivated',
        _iso(activated_at),
        _iso(deactivated_at),
    )
    assert data['last_activity']['kind'] == 'deactivated'
    assert _entries(connection_id)[0] == ('deactivated', None, IN_THE_BROWSER)

    stamps = _stamps(connection_id)
    again = signed_in_client.post(f'{BASE}/{connection_id}/deactivate', json={})
    assert again.json() == deactivated.json()
    assert _dates(connection_id) == (published_at, activated_at, deactivated_at)
    assert _stamps(connection_id) == stamps

    before = now()
    reactivated = signed_in_client.post(f'{BASE}/{connection_id}/activate', json={})

    assert reactivated.status_code == 200, reactivated.json()
    reactivated_at = _dates(connection_id)[1]
    assert reactivated_at is not None
    assert before <= reactivated_at <= now()
    # "Published" stays; the deactivation's date is kept, and answered only while
    # the connection is deactivated
    assert _dates(connection_id) == (published_at, reactivated_at, deactivated_at)
    data = reactivated.json()['data']
    assert (data['state'], data['activated_at'], data['deactivated_at']) == (
        'live',
        _iso(reactivated_at),
        None,
    )
    assert data['last_activity']['kind'] == 'reactivated'

    stamps = _stamps(connection_id)
    again = signed_in_client.post(f'{BASE}/{connection_id}/activate', json={})
    assert again.json() == reactivated.json()
    assert _dates(connection_id) == (published_at, reactivated_at, deactivated_at)
    assert _stamps(connection_id) == stamps
    assert _entries(connection_id) == [
        ('reactivated', None, IN_THE_BROWSER),
        ('deactivated', None, IN_THE_BROWSER),
        ('published', None, IN_THE_BROWSER),
        ('created', None, IN_THE_BROWSER),
    ]


def test_deleting_records_deleted(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """data-model 1.3, "any | delete": no status date moves."""
    connection_id = create_form_connection(signed_in_client)
    dates = _dates(connection_id)
    before = now()

    response = signed_in_client.request('DELETE', f'{BASE}/{connection_id}', json={})

    assert response.status_code == 200, response.json()
    [deleted, *_] = _rows(connection_id)
    assert _summary(deleted) == (
        'deleted',
        None,
        None,
        None,
        TEST_USERNAME,
        None,
        False,
    )
    assert before <= deleted.occurred_at <= now()
    assert _dates(connection_id) == dates


def _rules_of(
    connection: dict[str, Any], branches: list[dict[str, Any]]
) -> dict[str, Any]:
    """The rules of an edit of `connection`, as the rules step sends them."""
    return rules_input(
        branches,
        rule_base=connection['next_rule_number'],
        group_base=connection['next_group_number'],
        base_version=connection['rule_set_version'],
    )


def test_saving_renaming_and_a_description_move_no_date(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-018, data-model 1.3 "any | save, rename": the entries of section 2.3, in
    both of the update's paths, and no status date moves."""
    connection_id = create_form_connection(
        signed_in_client, rules=rules_input([main_branch([AGE_RULE])])
    )
    response = signed_in_client.post(f'{BASE}/{connection_id}/deactivate', json={})
    assert response.status_code == 200, response.json()
    dates = _dates(connection_id)
    assert None not in dates

    def put(**changes: Any) -> dict[str, Any]:
        response = signed_in_client.put(f'{BASE}/{connection_id}', json=changes)
        assert response.status_code == 200, response.json()
        data: dict[str, Any] = response.json()['data']
        return data

    # Without a revision: the name and the description
    connection = put(name='Taxischein', description='FS-1')
    assert _entries(connection_id)[:2] == [
        ('description_changed', None, IN_THE_BROWSER),
        ('renamed', None, IN_THE_BROWSER),
    ]
    assert _dates(connection_id) == dates

    # With a revision: the documents and Standard's rules
    standard_id = connection['branches'][0]['id']
    too_young = AGE_RULE | {'message': 'Too young.'}
    connection = put(
        documents=[{'document_type': 'pid', 'fields': ['birthdate']}],
        rules=_rules_of(connection, [main_branch([too_young], branch_id=standard_id)]),
    )
    assert connection['rule_set_version'] == 2
    assert _entries(connection_id)[:2] == [
        ('rules_changed', 'Standard', IN_THE_BROWSER),
        ('documents_changed', None, IN_THE_BROWSER),
    ]
    assert _dates(connection_id) == dates

    # Without a revision: a variant added, with Standard's rules only
    connection = put(
        rules=_rules_of(connection, [connection['branches'][0], variant([too_young])])
    )
    variant_id = connection['branches'][1]['id']
    [added, *_] = _rows(connection_id)
    assert (added.kind, added.variant_id, added.variant_name) == (
        'variant_added',
        variant_id,
        'Ambulance',
    )
    assert _dates(connection_id) == dates
    assert connection['deactivated_at'] == _iso(dates[2])


def test_a_put_without_a_change_records_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """`PUT /api/form-connections/{id}` that leaves everything as stored."""
    connection_id = create_form_connection(
        signed_in_client, rules=rules_input([main_branch([AGE_RULE, CLASS_RULE])])
    )
    connection = get(signed_in_client, connection_id)
    stamps = _stamps(connection_id)
    dates = _dates(connection_id)
    unchanged_rules = _rules_of(
        connection,
        [
            main_branch(
                [AGE_RULE, CLASS_RULE], branch_id=connection['branches'][0]['id']
            )
        ],
    )
    # The same selection in another order
    reordered = [
        {**document, 'fields': list(reversed(document['fields']))}
        for document in reversed(DOCUMENTS)
    ]

    for body in (
        {},
        {'name': f' {connection["name"]} ', 'description': connection['description']},
        {'documents': reordered},
        {'rules': unchanged_rules},
        {
            'name': connection['name'],
            'description': connection['description'],
            'documents': DOCUMENTS,
            'rules': unchanged_rules,
        },
    ):
        response = signed_in_client.put(f'{BASE}/{connection_id}', json=body)
        assert response.status_code == 200, (body, response.json())
        assert _stamps(connection_id) == stamps, body

    assert _dates(connection_id) == dates
    assert get(signed_in_client, connection_id)['rule_set_version'] == 1


def test_a_failed_eudiplo_call_records_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Creating, publishing and editing with new documents: EUDIPLO answers before
    anything is recorded, and a failure leaves the activity as it was."""
    fake_eudiplo.fail('create_config', 503)
    response = signed_in_client.post(BASE, json=FORM_CONNECTION)
    assert response.status_code == 502, response.json()
    with SessionLocal() as db:
        assert db.scalars(select(ConnectionActivity)).all() == []

    draft_id = create_draft(signed_in_client, documents=DOCUMENTS)
    draft = get(signed_in_client, draft_id)
    stamps = _stamps(draft_id)
    fake_eudiplo.fail('create_config', 503)
    response = signed_in_client.post(
        f'{BASE}/{draft_id}/publish',
        json=editor_publish_body(draft, DOCUMENTS) | {'name': 'Taxischein'},
    )
    assert response.status_code == 502, response.json()
    assert _stamps(draft_id) == stamps
    assert _dates(draft_id) == (None, None, None)

    connection_id = create_form_connection(signed_in_client)
    stamps = _stamps(connection_id)
    fake_eudiplo.fail('create_config', 503)
    response = signed_in_client.put(
        f'{BASE}/{connection_id}',
        json={
            'name': 'Taxischein',
            'documents': [{'document_type': 'pid', 'fields': ['family_name']}],
        },
    )
    assert response.status_code == 502, response.json()
    assert _stamps(connection_id) == stamps


def _save_rules(client: TestClient, draft_id: str, message: str) -> None:
    """Save the draft with a new message for the variant's rule, nothing else."""
    response = client.get(f'{BASE}/{draft_id}')
    assert response.status_code == 200, response.json()
    draft = response.json()['data']
    response = client.put(
        f'{BASE}/{draft_id}/draft',
        json=draft_body(
            version=draft['version'],
            documents=DOCUMENTS,
            rules=draft_rules(
                [
                    draft['branches'][0],
                    variant(
                        [rule(1, target('pid', 'birthdate'), None, message)],
                        origin='empty',
                        branch_id=VARIANT_ID,
                    ),
                ],
                rule_base=draft['next_rule_number'],
            ),
            step='rules',
        ),
    )
    assert response.status_code == 200, response.json()


def test_an_agents_twenty_saves_of_a_variants_rules_are_one_entry(
    signed_in_client: TestClient,
) -> None:
    """FR-026: the same kind, person and variant with nothing in between is one
    entry with the latest time; a team member's entry between starts a new one."""
    agent = _agent_client('drafts')
    response = agent.post(
        f'{BASE}/drafts',
        json=draft_body(
            documents=DOCUMENTS,
            rules=draft_rules(
                [main_branch([]), variant([], origin='empty', branch_id=VARIANT_ID)]
            ),
        ),
    )
    assert response.status_code == 201, response.json()
    draft_id = response.json()['data']['id']

    for edit in range(19):
        _save_rules(agent, draft_id, f'Message {edit}')
    last_save = now()
    _save_rules(agent, draft_id, 'Message 19')

    [merged, created] = _rows(draft_id)
    assert _entries(draft_id) == [
        ('rules_changed', 'Ambulance', THROUGH_THE_AGENT),
        ('created', None, THROUGH_THE_AGENT),
    ]
    assert merged.occurred_at >= last_save

    _save_rules(signed_in_client, draft_id, 'By the team member')
    _save_rules(agent, draft_id, 'Message 20')

    assert _entries(draft_id) == [
        ('rules_changed', 'Ambulance', THROUGH_THE_AGENT),
        ('rules_changed', 'Ambulance', IN_THE_BROWSER),
        ('rules_changed', 'Ambulance', THROUGH_THE_AGENT),
        ('created', None, THROUGH_THE_AGENT),
    ]
    # The twenty saves' entry stays as it was
    assert _stamps(draft_id)[2] == (merged.id, merged.occurred_at, merged.position)


def test_an_approved_publish_is_recorded_as_approved(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-027, FR-067: the team member who approved, with the agent that asked."""
    draft_id = create_draft(
        signed_in_client,
        documents=DOCUMENTS,
        rules=draft_rules([main_branch([AGE_RULE]), variant([AGE_RULE])]),
        step='test',
    )
    agent = _agent_client('drafts')
    before = now()

    _ask_and_approve(signed_in_client, agent, draft_id, 'publish')

    assert _entries(draft_id) == [
        ('published', None, APPROVED),
        ('created', None, IN_THE_BROWSER),
    ]
    published_at, activated_at, _ = _dates(draft_id)
    assert published_at is not None
    assert before <= published_at <= now()
    assert activated_at == published_at
    assert get(signed_in_client, draft_id)['last_activity']['actor'] == {
        'name': TEST_USERNAME,
        'agent': AGENT_NAME,
        'approved': True,
    }


def test_approved_status_changes_are_recorded_as_approved(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-067: deactivating, reactivating and deleting through approvals."""
    connection_id = create_form_connection(signed_in_client)
    agent = _agent_client('manage')

    for action in ('deactivate', 'reactivate', 'delete'):
        _ask_and_approve(signed_in_client, agent, connection_id, action)

    assert _entries(connection_id) == [
        ('deleted', None, APPROVED),
        ('reactivated', None, APPROVED),
        ('deactivated', None, APPROVED),
        ('published', None, IN_THE_BROWSER),
        ('created', None, IN_THE_BROWSER),
    ]
