"""The agents' search over the form connections (spec 007, research R9; FR-007).

`GET /api/form-connections/search`: pages of at most 25 with a keyset cursor that
changes between calls don't shift, `q` on the name and the description, the
status filter, deleted rows left out, and the refusals of bad parameters. Every
access level may call it (test_agent_principal.py's table).

Spec 010 (FR-062, data-model 1.2): the filter takes the four states, `scheduled`
too, with the conditions of `state_of()` (`form_connections.STATE_CONDITIONS`), so
that `deactivated` no longer matches a scheduled connection.
"""

import base64
from datetime import date, datetime, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import insert, null, update

from app.db import SessionLocal
from app.models import FormConnection
from tests.helpers import now

SEARCH = '/api/form-connections/search'
VALIDATION_ERROR = 'Validation error'
# A scheduled row's start date; the search doesn't compare it with today
START = date(2026, 12, 1)


def _insert(
    name: str,
    description: str = '',
    status: str = 'draft',
    updated_at: datetime | None = None,
    deleted: bool = False,
) -> str:
    """Store a draft, a scheduled, a live or a deactivated connection directly.

    A published row needs no revision for the search: it reads the row only.
    """
    published = status != 'draft'
    values: dict[str, Any] = {
        'name': name,
        'description': description,
        'is_active': status not in ('scheduled', 'deactivated'),
        'start_date': START if status == 'scheduled' else None,
        'published_at': now() if published else None,
        'current_revision': 1 if published else None,
        'current_rule_set': 1 if published else None,
        # SQL NULL: None would be stored as JSON null
        'draft': null() if published else {},
        'draft_version': None if published else 1,
        'deleted_at': now() if deleted else None,
    }
    if updated_at is not None:
        values['updated_at'] = updated_at
    with SessionLocal() as db:
        row_id = db.scalars(
            insert(FormConnection).values(**values).returning(FormConnection.id)
        ).one()
        db.commit()
        return row_id


def _search(client: TestClient, **params: Any) -> dict[str, Any]:
    response = client.get(SEARCH, params=params)
    assert response.status_code == 200, response.json()
    page: dict[str, Any] = response.json()['data']
    return page


def _ids(page: dict[str, Any]) -> list[str]:
    return [item['id'] for item in page['items']]


def _refused(client: TestClient, **params: Any) -> None:
    response = client.get(SEARCH, params=params)
    assert response.status_code == 400, response.json()
    assert response.json()['error'] == VALIDATION_ERROR


def test_pages_of_25_with_a_stable_cursor(signed_in_client: TestClient) -> None:
    base = now() - timedelta(hours=1)
    # Pairs share their updated_at, so the id decides between them
    ids = [
        _insert(f'Antrag {index}', updated_at=base - timedelta(seconds=index // 2))
        for index in range(60)
    ]
    expected = [
        row_id
        for _, row_id in sorted(
            ((index // 2, row_id) for index, row_id in enumerate(ids)),
            key=lambda pair: (pair[0], pair[1]),
        )
    ]

    first = _search(signed_in_client)
    assert _ids(first) == expected[:25]
    assert first['next_cursor'] is not None

    # A row of the first page changes: it moves to the top, the next pages stay
    with SessionLocal() as db:
        db.execute(
            update(FormConnection)
            .where(FormConnection.id == expected[3])
            .values(name='Antrag geändert')
        )
        db.commit()

    second = _search(signed_in_client, cursor=first['next_cursor'])
    assert _ids(second) == expected[25:50]
    assert second['next_cursor'] is not None
    third = _search(signed_in_client, cursor=second['next_cursor'])
    assert _ids(third) == expected[50:]
    assert third['next_cursor'] is None

    # The changed row now leads a new search
    assert _ids(_search(signed_in_client))[0] == expected[3]


def test_a_page_of_the_summaries(signed_in_client: TestClient) -> None:
    row_id = _insert('Führerscheinantrag', 'FS-20417', status='live')

    page = _search(signed_in_client)

    assert page['next_cursor'] is None
    [item] = page['items']
    assert item.keys() == {
        'id',
        'name',
        'description',
        'is_active',
        'status',
        'updated_at',
        'state',
        'published_at',
        'deactivated_at',
        'start_date',
        'step',
        'example',
    }
    assert item['id'] == row_id
    assert item['status'] == 'published'
    assert item['description'] == 'FS-20417'


def test_limit_sets_the_page_size(signed_in_client: TestClient) -> None:
    base = now()
    ids = [
        _insert(f'Antrag {index}', updated_at=base - timedelta(seconds=index))
        for index in range(3)
    ]

    first = _search(signed_in_client, limit=2)
    second = _search(signed_in_client, limit=2, cursor=first['next_cursor'])

    assert _ids(first) == ids[:2]
    assert _ids(second) == ids[2:]
    assert second['next_cursor'] is None


def test_exactly_a_full_page_has_no_next_cursor(signed_in_client: TestClient) -> None:
    for index in range(25):
        _insert(f'Antrag {index}')

    page = _search(signed_in_client)

    assert len(page['items']) == 25
    assert page['next_cursor'] is None


def test_q_matches_the_name_or_the_description_ignoring_case(
    signed_in_client: TestClient,
) -> None:
    by_name = _insert('Führerscheinantrag', 'FS-20417')
    by_description = _insert('Wohngeld', 'Antrag auf FÜHRERSCHEIN-Umtausch')
    _insert('Anwohnerparken', '')

    assert set(_ids(_search(signed_in_client, q='führerschein'))) == {
        by_name,
        by_description,
    }
    assert _ids(_search(signed_in_client, q='  fs-204  ')) == [by_name]
    assert _ids(_search(signed_in_client, q='WOHNGELD')) == [by_description]


def test_q_without_a_match(signed_in_client: TestClient) -> None:
    # A row without a description isn't found by a word that isn't in its name
    _insert('Anwohnerparken', '')

    page = _search(signed_in_client, q='Bewohner')

    assert page == {'items': [], 'next_cursor': None}


@pytest.mark.parametrize('q', ['', '   '])
def test_an_empty_q_matches_every_row(signed_in_client: TestClient, q: str) -> None:
    ids = {_insert('Eins'), _insert('Zwei', 'mit Beschreibung')}

    assert set(_ids(_search(signed_in_client, q=q))) == ids


@pytest.mark.parametrize(
    ('q', 'found'),
    [('100%', 'percent'), ('a_b', 'underscore'), ('c\\d', 'backslash')],
)
def test_like_wildcards_in_q_are_literal(
    signed_in_client: TestClient, q: str, found: str
) -> None:
    rows = {
        'percent': _insert('Rabatt 100% sicher'),
        'percent_lookalike': _insert('Rabatt 1000 sicher'),
        'underscore': _insert('Feld a_b'),
        'underscore_lookalike': _insert('Feld axb'),
        'backslash': _insert('Pfad c\\d'),
        'backslash_lookalike': _insert('Pfad cd'),
    }

    assert _ids(_search(signed_in_client, q=q)) == [rows[found]]


@pytest.mark.parametrize('status', ['draft', 'scheduled', 'live', 'deactivated'])
def test_status_filters_the_rows(signed_in_client: TestClient, status: str) -> None:
    """One row of each state: each value finds its row alone, the one whose
    `state` it is, so the filter and `state_of()` agree; a scheduled connection
    is neither deactivated nor live (FR-062)."""
    rows = {
        state: _insert(name, status=state)
        for state, name in (
            ('draft', 'Entwurf'),
            ('scheduled', 'Geplant'),
            ('live', 'Live'),
            ('deactivated', 'Deaktiviert'),
        )
    }

    page = _search(signed_in_client, status=status)

    assert _ids(page) == [rows[status]]
    assert [item['state'] for item in page['items']] == [status]
    assert set(_ids(_search(signed_in_client))) == set(rows.values())
    assert _ids(_search(signed_in_client, status='live', q='entwurf')) == []


def test_deleted_rows_are_left_out(signed_in_client: TestClient) -> None:
    kept = _insert('Antrag', status='live')
    _insert('Antrag gelöscht', status='live', deleted=True)
    _insert('Antrag gelöscht', status='deactivated', deleted=True)
    _insert('Antrag gelöscht', status='scheduled', deleted=True)

    assert _ids(_search(signed_in_client, q='antrag')) == [kept]
    assert _ids(_search(signed_in_client, status='deactivated')) == []
    assert _ids(_search(signed_in_client, status='scheduled')) == []


def _cursor(text: str) -> str:
    return base64.urlsafe_b64encode(text.encode()).decode()


@pytest.mark.parametrize(
    'cursor',
    [
        'not a cursor',
        '!!!',
        _cursor('2026-11-06T10:00:00+00:00'),
        _cursor('yesterday|00000000-0000-4000-8000-000000000000'),
        _cursor('2026-11-06T10:00:00|00000000-0000-4000-8000-000000000000'),
        _cursor('2026-11-06T10:00:00+00:00|not-an-id'),
        _cursor('2026-11-06T10:00:00+00:00|a|b'),
    ],
)
def test_a_bad_cursor_is_refused(signed_in_client: TestClient, cursor: str) -> None:
    _insert('Antrag')

    _refused(signed_in_client, cursor=cursor)


@pytest.mark.parametrize('limit', [0, 26, -1, 'many'])
def test_a_limit_outside_1_to_25_is_refused(
    signed_in_client: TestClient, limit: object
) -> None:
    _refused(signed_in_client, limit=limit)


def test_an_unknown_status_is_refused(signed_in_client: TestClient) -> None:
    _refused(signed_in_client, status='published')


def test_the_search_needs_a_sign_in(client: TestClient) -> None:
    response = client.get(SEARCH)

    assert response.status_code == 401
