"""The backfill of the migration that adds the status dates and the activity.

Spec 010, data-model.md section 9 (revision 1), research R3 and R4; FR-021,
FR-032. The test runs the migration's own statements, imported from its module by
path (alembic/ is no package), on rows of each state made before it: a draft, a
live, a deactivated and a deleted connection. It checks the dates, the entries
without a person and that no row's updated_at moved.
"""

import importlib.util
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest
from sqlalchemy import text

from app.db import engine

MIGRATION = (
    Path(__file__).resolve().parents[2]
    / 'alembic'
    / 'versions'
    / 'bfd1be13755d_status_dates_and_activity.py'
)

CREATED = datetime(2026, 1, 5, 9, 0, tzinfo=timezone.utc)
PUBLISHED = CREATED + timedelta(days=2)
UPDATED = CREATED + timedelta(days=30)
DELETED = CREATED + timedelta(days=40)


def status_dates_migration() -> ModuleType:
    """The migration's module, imported by its path."""
    spec = importlib.util.spec_from_file_location('status_dates', MIGRATION)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def insert_connection(
    *, published: bool, active: bool = True, deleted: bool = False
) -> str:
    """Insert a row with SQL, as the code before the migration stored it."""
    connection_id = str(uuid.uuid4())
    with engine.begin() as connection:
        connection.execute(
            text(
                'INSERT INTO form_connections (id, name, description, is_active, '
                'published_at, current_revision, current_rule_set, draft, '
                'draft_version, deleted_at, created_at, updated_at) VALUES (:id, '
                "'Antrag', '', :active, :published_at, :revision, :revision, "
                'CAST(:draft AS JSONB), :draft_version, :deleted_at, :created_at, '
                ':updated_at)'
            ),
            {
                'id': connection_id,
                'active': active,
                'published_at': PUBLISHED if published else None,
                'revision': 1 if published else None,
                'draft': None if published else '{}',
                'draft_version': None if published else 1,
                'deleted_at': DELETED if deleted else None,
                'created_at': CREATED,
                'updated_at': UPDATED,
            },
        )
    return connection_id


def dates_of(connection_id: str) -> tuple[Any, Any, Any]:
    """The row's activated_at, deactivated_at and updated_at."""
    with engine.connect() as connection:
        row = connection.execute(
            text(
                'SELECT activated_at, deactivated_at, updated_at '
                'FROM form_connections WHERE id = :id'
            ),
            {'id': connection_id},
        ).one()
    return row[0], row[1], row[2]


def entries_of(connection_id: str) -> list[tuple[Any, ...]]:
    """The connection's entries, oldest first, with every field but the ids."""
    with engine.connect() as connection:
        rows = connection.execute(
            text(
                'SELECT kind, occurred_at, position, variant_id, variant_name, '
                'start_date, actor_name, agent_name, approved, id '
                'FROM connection_activity WHERE form_connection_id = :id '
                'ORDER BY occurred_at, position'
            ),
            {'id': connection_id},
        ).all()
    for row in rows:
        assert str(uuid.UUID(row[-1])) == row[-1]
    return [tuple(row[:-1]) for row in rows]


def without_person(kind: str, occurred_at: datetime, position: int) -> tuple[Any, ...]:
    """An entry without a variant, a date or a person, as the backfill writes it."""
    return (kind, occurred_at, position, None, None, None, None, None, False)


def test_the_backfill_fills_the_dates_and_the_first_entries() -> None:
    draft = insert_connection(published=False)
    live = insert_connection(published=True)
    deactivated = insert_connection(published=True, active=False)
    deleted = insert_connection(published=True, active=False, deleted=True)
    backfill = status_dates_migration().backfill_status_dates_and_activity

    with engine.begin() as connection:
        backfill(connection)

    # A draft: no date; created only
    assert dates_of(draft) == (None, None, UPDATED)
    assert entries_of(draft) == [without_person('created', CREATED, 0)]
    # Live: active since it was published; created and published
    assert dates_of(live) == (PUBLISHED, None, UPDATED)
    assert entries_of(live) == [
        without_person('created', CREATED, 0),
        without_person('published', PUBLISHED, 1),
    ]
    # Deactivated: deactivated at its last change; the three entries
    assert dates_of(deactivated) == (PUBLISHED, UPDATED, UPDATED)
    assert entries_of(deactivated) == [
        without_person('created', CREATED, 0),
        without_person('published', PUBLISHED, 1),
        without_person('deactivated', UPDATED, 2),
    ]
    # Deleted: its dates as any published row's, and no entry
    assert dates_of(deleted) == (PUBLISHED, UPDATED, UPDATED)
    assert entries_of(deleted) == []


@pytest.mark.parametrize(
    'published_at',
    [CREATED, CREATED - timedelta(milliseconds=2)],
    ids=['at-creation', 'just-before-creation'],
)
def test_a_connection_created_published_lists_published_above_created(
    published_at: datetime,
) -> None:
    # The code of spec 001 created connections published, its published_at taken
    # in Python just before the database's now() set created_at: the published
    # entry is never older than the created one, both share a time, and the
    # position keeps their order total. activated_at keeps the published_at
    connection_id = insert_connection(published=True)
    with engine.begin() as connection:
        connection.execute(
            text('UPDATE form_connections SET published_at = :at WHERE id = :id'),
            {'at': published_at, 'id': connection_id},
        )
        status_dates_migration().backfill_status_dates_and_activity(connection)
        kinds = connection.execute(
            text(
                'SELECT kind FROM connection_activity '
                'WHERE form_connection_id = :id '
                'ORDER BY occurred_at DESC, position DESC, id'
            ),
            {'id': connection_id},
        ).scalars()
        assert list(kinds) == ['published', 'created']
    assert entries_of(connection_id) == [
        without_person('created', CREATED, 0),
        without_person('published', CREATED, 1),
    ]
    assert dates_of(connection_id) == (published_at, None, UPDATED)
