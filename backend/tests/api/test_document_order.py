"""The documents' stored order (spec 010, User Story 6; research R6, data-model 4).

Every save stores the order of the body's `documents` in
`form_connections.document_order`, and every answer lists the documents in it
(`ordered_documents()`): a draft's create, save and publish, a published
connection's create and update, the approval page's preview. The draft's content,
the revisions and their configurations stay in catalog order (FR-051), so a save
that only reorders creates no revision and calls no EUDIPLO, and records
`documents_changed` (data-model 2.3). A connection made before the feature, with an
empty order, answers catalog order (FR-052), and the data items inside a document
stay in catalog order (FR-050). The pull's delivery is pinned in `test_connect.py`.
"""

import copy
import json
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db import SessionLocal
from app.models import ConnectionActivity, FormConnection, FormConnectionRevision
from app.schemas import RequestedDocument
from app.services.form_connections import document_order_of, ordered_documents
from tests.api.test_approval_requests import (
    COMPLETE_DRAFT,
    _agent,
    _approve,
    _ask,
    _preview,
    _user_id,
)
from tests.api.test_form_connection_drafts import (
    create_draft,
    draft_body,
    draft_rules,
    editor_publish_body,
    get,
)
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    FORM_CONNECTION,
    create_form_connection,
    update_form_connection,
)

BASE = '/api/form-connections'

# helpers.FORM_CONNECTION's documents are in catalog order: the personal ID, then
# the driving licence
IN_CATALOG_ORDER: list[dict[str, Any]] = FORM_CONNECTION['documents']
CATALOG_KEYS = ['pid', 'mdl']
# The team's order, the other way round
REVERSED: list[dict[str, Any]] = list(reversed(IN_CATALOG_ORDER))
REVERSED_KEYS = ['mdl', 'pid']


def _keys(view: dict[str, Any]) -> list[str]:
    """The document type keys an answer lists, in its order."""
    return [document['document_type'] for document in view['documents']]


def _row(form_connection_id: str) -> FormConnection:
    with SessionLocal() as db:
        row = db.get(FormConnection, form_connection_id)
        assert row is not None
        return row


def _revisions(form_connection_id: str) -> list[FormConnectionRevision]:
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(FormConnectionRevision)
                .where(FormConnectionRevision.form_connection_id == form_connection_id)
                .order_by(FormConnectionRevision.revision)
            ).all()
        )


def _revision_keys(revision: FormConnectionRevision) -> list[str]:
    return [document['document_type'] for document in revision.documents]


def _kinds(form_connection_id: str) -> list[str]:
    """The activity's kinds, newest first."""
    with SessionLocal() as db:
        return list(
            db.scalars(
                select(ConnectionActivity.kind)
                .where(ConnectionActivity.form_connection_id == form_connection_id)
                .order_by(
                    ConnectionActivity.occurred_at.desc(),
                    ConnectionActivity.position.desc(),
                )
            ).all()
        )


def _document(document_type: str, *fields: str) -> RequestedDocument:
    return RequestedDocument(document_type=document_type, fields=list(fields))


# ordered_documents(): the stored order first, the rest in catalog order


PID = _document('pid', 'family_name')
MDL = _document('mdl', 'expiry_date')


@pytest.mark.parametrize(
    ('documents', 'order', 'expected'),
    [
        # An empty order is catalog order (FR-052)
        ([MDL, PID], [], [PID, MDL]),
        ([PID, MDL], [], [PID, MDL]),
        # The stored order
        ([PID, MDL], ['mdl', 'pid'], [MDL, PID]),
        ([MDL, PID], ['pid', 'mdl'], [PID, MDL]),
        # A document missing from the order follows, in catalog order
        ([PID, MDL], ['mdl'], [MDL, PID]),
        ([MDL, PID], ['pid'], [PID, MDL]),
        # A key the documents don't hold is skipped, and so is one listed twice
        ([PID], ['mdl', 'pid'], [PID]),
        ([PID, MDL], ['mdl', 'mdl', 'pid'], [MDL, PID]),
        ([], ['mdl'], []),
    ],
)
def test_ordered_documents_answers_the_stored_order(
    documents: list[RequestedDocument],
    order: list[str],
    expected: list[RequestedDocument],
) -> None:
    assert ordered_documents(documents, order) == expected


def test_ordered_documents_puts_a_type_the_catalog_lost_last() -> None:
    gone = _document('gone', 'x')
    assert ordered_documents([gone, MDL, PID], []) == [PID, MDL, gone]
    assert ordered_documents([gone, MDL, PID], ['gone']) == [gone, PID, MDL]


def test_the_order_of_a_request_is_its_documents_keys() -> None:
    assert document_order_of([MDL, PID]) == ['mdl', 'pid']
    assert document_order_of([]) == []


# Drafts: create, save and publish keep the order


def test_a_draft_keeps_the_order_through_create_save_and_publish(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    draft_id = create_draft(signed_in_client, documents=REVERSED)

    draft = get(signed_in_client, draft_id)
    assert _keys(draft) == REVERSED_KEYS
    row = _row(draft_id)
    assert row.document_order == REVERSED_KEYS
    # The draft's content stays in catalog order (data-model 4)
    assert row.draft is not None
    assert [d['document_type'] for d in row.draft['documents']] == CATALOG_KEYS

    # A save in catalog order stores that order
    saved = signed_in_client.put(
        f'{BASE}/{draft_id}/draft',
        json=draft_body(documents=IN_CATALOG_ORDER, version=draft['version']),
    )
    assert saved.status_code == 200, saved.json()
    assert _keys(saved.json()['data']) == CATALOG_KEYS
    assert _row(draft_id).document_order == CATALOG_KEYS

    # And back: the publish stores the order it is sent
    draft = get(signed_in_client, draft_id)
    published = signed_in_client.post(
        f'{BASE}/{draft_id}/publish', json=editor_publish_body(draft, REVERSED)
    )
    assert published.status_code == 200, published.json()
    assert _keys(published.json()['data']) == REVERSED_KEYS
    assert _keys(get(signed_in_client, draft_id)) == REVERSED_KEYS
    assert _row(draft_id).document_order == REVERSED_KEYS
    # Revision 1 and its configuration are in catalog order (FR-051)
    [revision] = _revisions(draft_id)
    assert _revision_keys(revision) == CATALOG_KEYS
    config = next(call for call in fake_eudiplo.calls if call.name == 'create_config')
    body = json.loads(config.request.content)
    credentials = body['dcql_query']['credentials']
    assert [credential['id'] for credential in credentials] == CATALOG_KEYS


def _resave(client: TestClient, draft_id: str, documents: list[dict[str, Any]]) -> Any:
    """Save the stored draft again, as the editor would, with `documents`."""
    draft = get(client, draft_id)
    return client.put(
        f'{BASE}/{draft_id}/draft',
        json=draft_body(
            documents=documents,
            version=draft['version'],
            rules=draft_rules(
                draft['branches'],
                rule_base=draft['next_rule_number'],
                group_base=draft['next_group_number'],
            ),
        ),
    )


def test_a_draft_save_that_only_moves_a_document_records_documents_changed(
    signed_in_client: TestClient,
) -> None:
    draft_id = create_draft(signed_in_client, documents=IN_CATALOG_ORDER)

    moved = _resave(signed_in_client, draft_id, REVERSED)

    assert moved.status_code == 200, moved.json()
    assert _keys(moved.json()['data']) == REVERSED_KEYS
    assert _kinds(draft_id) == ['documents_changed', 'created']

    # The same order again changes nothing and records nothing
    again = _resave(signed_in_client, draft_id, REVERSED)
    assert again.status_code == 200, again.json()
    assert _keys(again.json()['data']) == REVERSED_KEYS
    assert _kinds(draft_id) == ['documents_changed', 'created']


def test_an_approved_publish_keeps_the_drafts_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """The approval page's preview, and `publish_stored_draft()` (FR-050)."""
    response = signed_in_client.post(
        f'{BASE}/drafts', json=COMPLETE_DRAFT | {'documents': REVERSED}
    )
    assert response.status_code == 201, response.json()
    draft_id = response.json()['data']['id']
    _, agent = _agent(_user_id())
    request = _ask(agent, draft_id)

    preview = _preview(signed_in_client, request['id'])
    assert _keys(preview['draft']) == REVERSED_KEYS

    approved = _approve(signed_in_client, request['id'])
    assert approved.status_code == 200, approved.json()
    connection = get(signed_in_client, draft_id)
    assert connection['status'] == 'published'
    assert _keys(connection) == REVERSED_KEYS
    assert _row(draft_id).document_order == REVERSED_KEYS
    assert [_revision_keys(r) for r in _revisions(draft_id)] == [CATALOG_KEYS]


def test_the_preview_of_a_published_connection_lists_the_stored_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    connection_id = create_form_connection(signed_in_client, documents=REVERSED)
    _, agent = _agent(_user_id(), 'manage')
    request = _ask(agent, connection_id, 'deactivate')

    preview = _preview(signed_in_client, request['id'])

    assert _keys(preview['connection']) == REVERSED_KEYS


# Published connections: create and update


def test_creating_a_connection_stores_the_order_and_keeps_the_revision_in_catalog_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    response = signed_in_client.post(
        BASE, json=FORM_CONNECTION | {'documents': REVERSED}
    )

    assert response.status_code == 201, response.json()
    connection_id = response.json()['data']['id']
    assert _keys(response.json()['data']) == REVERSED_KEYS
    assert _keys(get(signed_in_client, connection_id)) == REVERSED_KEYS
    assert _row(connection_id).document_order == REVERSED_KEYS
    [revision] = _revisions(connection_id)
    assert _revision_keys(revision) == CATALOG_KEYS


def test_a_save_that_only_reorders_creates_no_revision_and_calls_no_eudiplo(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-051, data-model 4: the order is written like a rename."""
    connection_id = create_form_connection(signed_in_client)
    before = _row(connection_id)
    [revision] = _revisions(connection_id)
    calls = len(fake_eudiplo.calls)

    response = signed_in_client.put(
        f'{BASE}/{connection_id}', json={'documents': REVERSED}
    )

    assert response.status_code == 200, response.json()
    assert _keys(response.json()['data']) == REVERSED_KEYS
    assert _keys(get(signed_in_client, connection_id)) == REVERSED_KEYS
    after = _row(connection_id)
    assert after.document_order == REVERSED_KEYS
    assert after.current_revision == before.current_revision == 1
    assert after.current_rule_set == before.current_rule_set
    [same] = _revisions(connection_id)
    assert (same.id, same.config_hash, same.documents) == (
        revision.id,
        revision.config_hash,
        revision.documents,
    )
    assert len(fake_eudiplo.calls) == calls
    # A move is a change of the documents (data-model 2.3); no status date moved
    assert _kinds(connection_id)[0] == 'documents_changed'
    assert (after.published_at, after.activated_at, after.deactivated_at) == (
        before.published_at,
        before.activated_at,
        before.deactivated_at,
    )

    # The same order again records nothing
    entries = _kinds(connection_id)
    again = signed_in_client.put(
        f'{BASE}/{connection_id}', json={'documents': REVERSED}
    )
    assert again.status_code == 200, again.json()
    assert _kinds(connection_id) == entries
    assert len(fake_eudiplo.calls) == calls


def test_a_reorder_with_a_rename_is_one_save_without_a_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    connection_id = create_form_connection(signed_in_client)
    calls = len(fake_eudiplo.calls)

    response = signed_in_client.put(
        f'{BASE}/{connection_id}',
        json={'name': 'Umbenannt', 'documents': REVERSED},
    )

    assert response.status_code == 200, response.json()
    assert response.json()['data']['name'] == 'Umbenannt'
    assert _keys(response.json()['data']) == REVERSED_KEYS
    assert len(_revisions(connection_id)) == 1
    assert len(fake_eudiplo.calls) == calls
    assert set(_kinds(connection_id)[:2]) == {'renamed', 'documents_changed'}


def test_changed_documents_store_their_order_with_the_new_revision(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    connection_id = create_form_connection(signed_in_client)
    changed = copy.deepcopy(REVERSED)
    # The driving licence loses a field: new documents, a new revision
    changed[0]['fields'] = changed[0]['fields'][:-1]

    response = signed_in_client.put(
        f'{BASE}/{connection_id}', json={'documents': changed}
    )

    assert response.status_code == 200, response.json()
    assert _keys(response.json()['data']) == REVERSED_KEYS
    assert _row(connection_id).document_order == REVERSED_KEYS
    revisions = _revisions(connection_id)
    assert [r.revision for r in revisions] == [1, 2]
    assert _revision_keys(revisions[1]) == CATALOG_KEYS
    assert _row(connection_id).current_revision == 2


def test_a_save_without_documents_keeps_the_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    connection_id = create_form_connection(signed_in_client, documents=REVERSED)

    response = signed_in_client.put(f'{BASE}/{connection_id}', json={'name': 'Neu'})

    assert response.status_code == 200, response.json()
    assert _keys(response.json()['data']) == REVERSED_KEYS
    assert _row(connection_id).document_order == REVERSED_KEYS


# Connections made before the feature, and the data items


def test_a_connection_with_an_empty_order_answers_catalog_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-052: what every connection made before the feature shows."""
    connection_id = create_form_connection(signed_in_client, documents=REVERSED)
    draft_id = create_draft(signed_in_client, documents=REVERSED)
    for row_id in (connection_id, draft_id):
        update_form_connection(row_id, document_order=[])

        assert _keys(get(signed_in_client, row_id)) == CATALOG_KEYS


def test_the_data_items_inside_a_document_stay_in_catalog_order(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    """FR-050: only the documents move; their fields keep the catalog's order."""
    backwards = [
        {**document, 'fields': list(reversed(document['fields']))}
        for document in REVERSED
    ]
    connection_id = create_form_connection(signed_in_client, documents=backwards)
    draft_id = create_draft(signed_in_client, documents=backwards)

    for row_id in (connection_id, draft_id):
        view = get(signed_in_client, row_id)
        assert _keys(view) == REVERSED_KEYS
        assert [
            [field['key'] for field in document['fields']]
            for document in view['documents']
        ] == [document['fields'] for document in REVERSED]
