"""The example connection (spec 010, T064; research R7, R15 V4 and V7).

`POST /api/form-connections/example` stores a complete, publishable draft in the
request's language, at the connection step, marked `example: 'unchanged'`
(FR-054 to FR-057, FR-061; data-model.md section 5; contracts/management-api.md
"The example"). Its content is compared with data-model.md section 5 and
contracts/copy.md section 6 written out here, word for word, not with
`app/example.py`. Publishing's checks pass on it in both languages (R15 V7); the
mark moves to `changed` on any saved change, a variant's description too, never
back, not on a save that only moves the step, and publishing clears it (FR-059).
Agents can't create it (FR-068), so it never touches an agent's draft limit. The
rules package's validation and rule checks on it are `rules/src/example.test.ts`
(T065). That no other kind of row carries the mark is
test_form_connection_drafts.py's `test_no_existing_kind_of_row_is_the_example`.
"""

import uuid
from typing import Any, Literal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.db import SessionLocal
from app.example import NEXT_GROUP_NUMBER, NEXT_RULE_NUMBER
from app.main import app
from app.models import (
    AgentAuthorization,
    ConnectionActivity,
    FormConnection,
    UserAccount,
)
from app.schemas import AccessLevel
from app.services import drafts
from tests.conftest import TEST_USERNAME
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import bearer_client, create_agent_authorization

BASE = '/api/form-connections'
EXAMPLE = f'{BASE}/example'
NOT_FOUND = {'error': 'Not found', 'message': 'Form connection not found'}
BROWSER_ONLY = {'error': 'browser_only', 'message': 'This action is done in Konnekt.'}

Language = Literal['en', 'de']
HEADERS: dict[Language, dict[str, str]] = {
    'en': {'Accept-Language': 'en'},
    'de': {'Accept-Language': 'de-DE'},
}

# data-model.md section 5 and contracts/copy.md section 6, word for word
TEXTS: dict[Language, dict[str, str]] = {
    'en': {
        'name': 'Passenger transport licence (example)',
        'description': (
            'Licence to drive taxis, rental cars and ambulances. Checks age and '
            'driving experience.'
        ),
        'variant': 'Ambulance',
        'variant_description': (
            'For ambulance services. Some rules differ from Standard.'
        ),
        'age_21': 'You need to be at least 21 years old.',
        'age_19': 'You need to be at least 19 years old.',
        'held_2': (
            'You need to have held a class B driving licence for at least 2 years.'
        ),
        'held_1': (
            'You need to have held a class B driving licence for at least 1 year.'
        ),
        'pid': 'Personal ID',
        'mdl': 'Driving licence',
    },
    'de': {
        'name': 'Personenbeförderungsschein (Beispiel)',
        'description': (
            'Erlaubnis zum Fahren von Taxis, Mietwagen und Krankenwagen. Prüft Alter '
            'und Fahrpraxis.'
        ),
        'variant': 'Krankentransport',
        'variant_description': (
            'Für Krankentransporte. Einige Regeln weichen von Standard ab.'
        ),
        'age_21': 'Sie müssen mindestens 21 Jahre alt sein.',
        'age_19': 'Sie müssen mindestens 19 Jahre alt sein.',
        'held_2': (
            'Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B '
            'besitzen.'
        ),
        'held_1': (
            'Sie müssen seit mindestens 1 Jahr einen Führerschein der Klasse B '
            'besitzen.'
        ),
        'pid': 'Personalausweis',
        'mdl': 'Führerschein',
    },
}

# design-notes section 4.1, call 3: seven Personal ID data items, two of the licence,
# each document's in catalog order (FR-050)
PID_FIELDS = [
    'family_name',
    'given_name',
    'birthdate',
    'address_street_address',
    'address_house_number',
    'address_postal_code',
    'address_locality',
]
MDL_FIELDS = ['expiry_date', 'driving_privileges']
AGE_TARGET = {
    'document_type': 'pid',
    'field': 'birthdate',
    'part': None,
    'licence_class': None,
}
HELD_TARGET = {
    'document_type': 'mdl',
    'field': 'driving_privileges',
    'part': 'issue_date',
    'licence_class': 'B',
}


def _rule(
    number: int,
    rule_target: dict[str, Any],
    years: int,
    message: str,
    mark: str | None,
) -> dict[str, Any]:
    """A rule as the example stores it: "Rule NN", at least `years` years ago."""
    return {
        'type': 'rule',
        'id': f'rule-{number}',
        'name': f'Rule {number:02d}',
        'mark': mark,
        'target': rule_target,
        'condition': {'operator': 'at_least_years_ago', 'years': years},
        'message': message,
    }


def expected_branches(language: Language) -> list[dict[str, Any]]:
    """Standard with Rule 01 AND Rule 02, and the linked variant with both changed,
    without their ids (data-model.md section 5)."""
    texts = TEXTS[language]
    return [
        {
            'name': 'Standard',
            'description': None,
            'origin': 'main',
            'operator': 'and',
            'operator_mark': None,
            'items': [
                _rule(1, AGE_TARGET, 21, texts['age_21'], None),
                _rule(2, HELD_TARGET, 2, texts['held_2'], None),
            ],
        },
        {
            'name': texts['variant'],
            'description': texts['variant_description'],
            'origin': 'based',
            'operator': 'and',
            'operator_mark': None,
            'items': [
                _rule(1, AGE_TARGET, 19, texts['age_19'], 'changed'),
                _rule(2, HELD_TARGET, 1, texts['held_1'], 'changed'),
            ],
        },
    ]


def create_example(client: TestClient, language: Language = 'en') -> dict[str, Any]:
    """Create the example through the API in `language`; its draft view."""
    response = client.post(EXAMPLE, json={}, headers=HEADERS[language])
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def get(client: TestClient, form_connection_id: str) -> dict[str, Any]:
    """A connection or draft as `GET /api/form-connections/{id}` answers it."""
    response = client.get(f'{BASE}/{form_connection_id}')
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def stored(form_connection_id: str) -> FormConnection:
    """The row as it is stored now."""
    with SessionLocal() as db:
        row = db.get(FormConnection, form_connection_id)
        assert row is not None
        return row


def save_body(draft: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """The editor's save of a loaded draft as it is (`DraftUpdate`): its content,
    numbered from its counters, over its version; `changes` replaces keys."""
    body = {
        'name': draft['name'],
        'description': draft['description'],
        'documents': [
            {
                'document_type': document['document_type'],
                'fields': [field['key'] for field in document['fields']],
            }
            for document in draft['documents']
        ],
        'rules': {
            'branches': draft['branches'],
            'numbering_base': {
                'rule': draft['next_rule_number'],
                'group': draft['next_group_number'],
            },
        },
        'step': draft['step'],
        'version': draft['version'],
    }
    return body | changes


def save(client: TestClient, draft: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """Save the loaded draft with `changes`; the answered draft."""
    response = client.put(
        f'{BASE}/{draft["id"]}/draft', json=save_body(draft, **changes)
    )
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def publish(client: TestClient, draft: dict[str, Any]) -> dict[str, Any]:
    """Publish the loaded draft as the editor does (`DraftPublish`); the answer."""
    body = save_body(draft)
    body['rules'] |= {'base_version': None, 'replace': False}
    del body['step']
    response = client.post(f'{BASE}/{draft["id"]}/publish', json=body)
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def with_rule(
    branches: list[dict[str, Any]], branch: int, rule: int, **changes: Any
) -> list[dict[str, Any]]:
    """`branches` with one rule's keys replaced (`condition`, `message`, …)."""
    copied = [
        dict(entry, items=[dict(item) for item in entry['items']]) for entry in branches
    ]
    copied[branch]['items'][rule] |= changes
    return copied


def activity_kinds(client: TestClient, form_connection_id: str) -> list[str]:
    """The connection's activity, newest first, as its kinds."""
    response = client.get(f'{BASE}/{form_connection_id}/activity')
    assert response.status_code == 200, response.json()
    return [entry['kind'] for entry in response.json()['data']['items']]


def _user_id() -> str:
    with SessionLocal() as db:
        user_id = db.scalar(
            select(UserAccount.id).where(UserAccount.username == TEST_USERNAME)
        )
        assert user_id is not None
        return user_id


def _rows() -> int:
    with SessionLocal() as db:
        return db.scalar(select(func.count()).select_from(FormConnection)) or 0


# The content (FR-055, FR-061)


@pytest.mark.parametrize('language', ['en', 'de'])
def test_the_example_is_data_models_draft_in_the_requests_language(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, language: Language
) -> None:
    texts = TEXTS[language]

    response = signed_in_client.post(EXAMPLE, json={}, headers=HEADERS[language])

    assert response.status_code == 201, response.json()
    assert response.json()['message'] == 'Draft saved'
    data = response.json()['data']
    assert data['status'] == 'draft'
    assert data['state'] == 'draft'
    assert data['example'] == 'unchanged'
    assert data['step'] == 'connection'
    assert data['version'] == 1
    assert data['name'] == texts['name']
    assert data['description'] == texts['description']
    # In the example's own order, each with its data items in catalog order
    assert [
        (
            document['document_type'],
            document['label'],
            [field['key'] for field in document['fields']],
        )
        for document in data['documents']
    ] == [('pid', texts['pid'], PID_FIELDS), ('mdl', texts['mdl'], MDL_FIELDS)]
    branch_ids = [branch['id'] for branch in data['branches']]
    assert all(str(uuid.UUID(branch_id)) == branch_id for branch_id in branch_ids)
    assert len(set(branch_ids)) == 2
    assert [
        {key: value for key, value in branch.items() if key != 'id'}
        for branch in data['branches']
    ] == expected_branches(language)
    assert (data['next_rule_number'], data['next_group_number']) == (3, 1)
    assert (NEXT_RULE_NUMBER, NEXT_GROUP_NUMBER) == (3, 1)
    assert data['last_activity']['kind'] == 'created'
    assert data['last_activity']['actor'] == {
        'name': TEST_USERNAME,
        'agent': None,
        'approved': False,
    }
    # The draft-creation path: no EUDIPLO call, the stored order, one entry
    assert fake_eudiplo.calls == []
    row = stored(data['id'])
    assert row.example == 'unchanged'
    assert row.published_at is None
    assert row.document_order == ['pid', 'mdl']
    assert row.draft is not None
    assert row.draft['step'] == 'connection'
    assert activity_kinds(signed_in_client, data['id']) == ['created']
    read = signed_in_client.get(f'{BASE}/{data["id"]}', headers=HEADERS[language])
    assert read.json()['data'] == data


def test_the_examples_texts_are_content_once_created(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-061: created in German, it stays German when read in English."""
    created = create_example(signed_in_client, 'de')

    read_in_english = signed_in_client.get(
        f'{BASE}/{created["id"]}', headers=HEADERS['en']
    ).json()['data']

    assert read_in_english['name'] == TEXTS['de']['name']
    assert read_in_english['description'] == TEXTS['de']['description']
    assert read_in_english['branches'] == created['branches']
    # The catalog's labels follow the request, as for every draft (spec 009)
    assert [document['label'] for document in read_in_english['documents']] == [
        TEXTS['en']['pid'],
        TEXTS['en']['mdl'],
    ]


def test_every_call_creates_another_example(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The edge case "created twice": two drafts, both listed as the example."""
    first = create_example(signed_in_client)
    second = create_example(signed_in_client)

    summaries = signed_in_client.get(BASE).json()['data']

    assert first['id'] != second['id']
    assert {branch['id'] for branch in first['branches']}.isdisjoint(
        branch['id'] for branch in second['branches']
    )
    assert {s['id']: (s['state'], s['step'], s['example']) for s in summaries} == {
        first['id']: ('draft', 'connection', 'unchanged'),
        second['id']: ('draft', 'connection', 'unchanged'),
    }
    found = signed_in_client.get(f'{BASE}/search').json()['data']['items']
    assert {s['id']: s['example'] for s in found} == {
        first['id']: 'unchanged',
        second['id']: 'unchanged',
    }


@pytest.mark.parametrize('language', ['en', 'de'])
def test_publishings_checks_pass_on_the_example(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, language: Language
) -> None:
    """R15 V7, FR-056: the checks of publishing (`complete=True`), on the stored
    example as created, in both languages."""
    created = create_example(signed_in_client, language)

    with SessionLocal() as db:
        row = db.get(FormConnection, created['id'])
        assert row is not None
        name, description, documents, save = drafts.check_publishable(db, row)

    texts = TEXTS[language]
    assert (name, description) == (texts['name'], texts['description'])
    assert [document.document_type for document in documents] == ['pid', 'mdl']
    assert save is not None
    assert [branch.name for branch in save.branches] == [
        'Standard',
        TEXTS[language]['variant'],
    ]


# The mark (FR-059, FR-060; data-model.md section 5)


def test_a_save_that_only_moves_the_step_leaves_the_mark(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = create_example(signed_in_client)

    unchanged = save(signed_in_client, created)
    moved = save(signed_in_client, unchanged, step='documents')
    moved_on = save(signed_in_client, moved, step='test')

    assert [draft['example'] for draft in (unchanged, moved, moved_on)] == [
        'unchanged',
        'unchanged',
        'unchanged',
    ]
    assert moved_on['step'] == 'test'
    assert stored(created['id']).example == 'unchanged'
    assert activity_kinds(signed_in_client, created['id']) == ['created']


def test_a_changed_age_marks_it_changed_for_good(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """Rule 01 at 18 years: changed; back at 21 years, it stays changed."""
    created = create_example(signed_in_client)
    age_18 = with_rule(
        created['branches'],
        0,
        0,
        condition={'operator': 'at_least_years_ago', 'years': 18},
    )

    changed = save(
        signed_in_client,
        created,
        rules={'branches': age_18, 'numbering_base': {'rule': 3, 'group': 1}},
    )
    back = save(signed_in_client, changed, rules=save_body(created)['rules'])

    assert changed['example'] == 'changed'
    assert back['example'] == 'changed'
    assert back['branches'] == created['branches']
    summary = signed_in_client.get(BASE).json()['data'][0]
    assert (summary['id'], summary['example']) == (created['id'], 'changed')
    assert stored(created['id']).example == 'changed'


def test_a_changed_variant_description_alone_marks_it_changed(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """A variant's description writes no activity entry (design-notes section 4.1,
    call 4), but it is a change of the example (`Changes.changed`)."""
    created = create_example(signed_in_client)
    branches = [dict(branch) for branch in created['branches']]
    branches[1]['description'] = 'For patient transport.'

    changed = save(
        signed_in_client,
        created,
        rules={'branches': branches, 'numbering_base': {'rule': 3, 'group': 1}},
    )

    assert changed['example'] == 'changed'
    assert activity_kinds(signed_in_client, created['id']) == ['created']


def test_a_changed_name_marks_it_changed(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = create_example(signed_in_client)

    changed = save(signed_in_client, created, name='T064 passenger transport')
    moved = save(signed_in_client, changed, step='rules')

    assert (changed['example'], moved['example']) == ('changed', 'changed')
    assert activity_kinds(signed_in_client, created['id']) == ['renamed', 'created']


@pytest.mark.parametrize('changed', [False, True])
def test_publishing_clears_the_mark(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, changed: bool
) -> None:
    """FR-059: published unchanged or changed, it is no longer the example, and
    publishing it works through the draft's publish (FR-060)."""
    draft = create_example(signed_in_client)
    if changed:
        draft = save(signed_in_client, draft, name='T064 published changed')
        assert draft['example'] == 'changed'

    published = publish(signed_in_client, draft)

    assert published['status'] == 'published'
    assert published['state'] == 'live'
    assert 'example' not in published
    assert [branch['name'] for branch in published['branches']] == [
        'Standard',
        'Ambulance',
    ]
    assert stored(draft['id']).example is None
    summary = signed_in_client.get(BASE).json()['data'][0]
    assert (summary['id'], summary['state'], summary['example']) == (
        draft['id'],
        'live',
        None,
    )


# Who may create it (FR-068) and the route (R15 V4)


@pytest.mark.parametrize('level', ['read', 'drafts', 'manage'])
def test_an_agent_cant_create_the_example(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, level: AccessLevel
) -> None:
    """403 `browser_only` at every level, nothing stored, and the agent's draft
    window untouched."""
    authorization_id, token = create_agent_authorization(_user_id(), level)
    agent = bearer_client(TestClient(app), token)

    response = agent.post(EXAMPLE, json={})

    assert (response.status_code, response.json()) == (403, BROWSER_ONLY)
    assert _rows() == 0
    with SessionLocal() as db:
        authorization = db.get(AgentAuthorization, authorization_id)
        assert authorization is not None
        assert authorization.drafts_window_started_at is None
        assert authorization.drafts_in_window == 0


def test_the_example_doesnt_count_towards_the_agents_draft_limit(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The team member's example leaves the draft window of the account's agent
    as it was (contracts/management-api.md "The example")."""
    authorization_id, _ = create_agent_authorization(_user_id(), 'drafts')

    create_example(signed_in_client)
    create_example(signed_in_client)

    with SessionLocal() as db:
        authorization = db.get(AgentAuthorization, authorization_id)
        assert authorization is not None
        assert authorization.drafts_window_started_at is None
        assert authorization.drafts_in_window == 0
    assert _rows() == 2


def test_creating_the_example_needs_a_session_and_a_json_body(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The management API's rules: 401 without a session, 415 without JSON (the
    CSRF protection); neither creates anything."""
    anonymous = TestClient(app).post(EXAMPLE, json={})
    not_json = signed_in_client.post(
        EXAMPLE, content='{}', headers={'Content-Type': 'text/plain'}
    )

    assert anonymous.status_code == 401
    assert not_json.status_code == 415
    assert _rows() == 0


def test_the_example_route_is_not_taken_by_a_connections_route(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """R15 V4: `POST …/example` is declared before `/{form_connection_id}`: it
    creates the example, while the connections' routes read "example" as an
    unknown connection's id, as before."""
    created = create_example(signed_in_client)

    details = signed_in_client.get(EXAMPLE)
    activity = signed_in_client.get(f'{EXAMPLE}/activity')
    draft_save = signed_in_client.put(f'{EXAMPLE}/draft', json=save_body(created))

    assert (details.status_code, details.json()) == (404, NOT_FOUND)
    assert (activity.status_code, activity.json()) == (404, NOT_FOUND)
    assert (draft_save.status_code, draft_save.json()) == (404, NOT_FOUND)
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(ConnectionActivity)) == 1
