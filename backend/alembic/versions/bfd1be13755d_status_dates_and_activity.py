"""status dates and activity

The status dates and the activity of a form connection
(specs/010-revamp-backend-gaps/data-model.md, sections 1.1, 2.1 and 9, revision 1;
research R3 and R4). The upgrade adds form_connections.start_date, activated_at and
deactivated_at, the CHECK ck_form_connections_start_date (a start date only while
published and not active) and the partial index ix_form_connections_start_date for
the worker's scan; it creates the table connection_activity, which cascades with its
connection and has no foreign key to the accounts (FR-028). Then it backfills, in raw
SQL so that no row's updated_at moves (FR-021, FR-032): activated_at is published_at
for published rows, deactivated_at is updated_at for published rows that are not
active, and every row that is not deleted gets entries without a person: created at
created_at, published at published_at (at created_at when that is later: a connection
created published took its published_at just before created_at), deactivated at
updated_at. The downgrade drops
what the upgrade added; it activates nothing, so a scheduled connection reads as
deactivated afterwards.

Revision ID: bfd1be13755d
Revises: ba334922c5ee
Create Date: 2026-11-11 02:37:53.892730

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'bfd1be13755d'
down_revision: Union[str, None] = 'ba334922c5ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

START_DATE_CHECK = 'ck_form_connections_start_date'
START_DATE_INDEX = 'ix_form_connections_start_date'

# The backfill (data-model.md section 9). A raw UPDATE bypasses the model's onupdate,
# and form_connections has no trigger, so updated_at stays. The entries have no
# person; their position follows the kinds' order (data-model.md section 2.2), so
# that a connection created published lists "published" above "created"
BACKFILL = (
    'UPDATE form_connections SET activated_at = published_at '
    'WHERE published_at IS NOT NULL',
    'UPDATE form_connections SET deactivated_at = updated_at '
    'WHERE published_at IS NOT NULL AND NOT is_active',
    'INSERT INTO connection_activity '
    '(id, form_connection_id, kind, occurred_at, position) '
    "SELECT gen_random_uuid()::text, id, 'created', created_at, 0 "
    'FROM form_connections WHERE deleted_at IS NULL',
    'INSERT INTO connection_activity '
    '(id, form_connection_id, kind, occurred_at, position) '
    # Never before 'created': a connection created published got its published_at
    # from Python just before the database's now() set created_at
    "SELECT gen_random_uuid()::text, id, 'published', "
    'GREATEST(published_at, created_at), 1 '
    'FROM form_connections '
    'WHERE deleted_at IS NULL AND published_at IS NOT NULL',
    'INSERT INTO connection_activity '
    '(id, form_connection_id, kind, occurred_at, position) '
    "SELECT gen_random_uuid()::text, id, 'deactivated', updated_at, 2 "
    'FROM form_connections '
    'WHERE deleted_at IS NULL AND published_at IS NOT NULL AND NOT is_active',
)


def backfill_status_dates_and_activity(connection: sa.Connection) -> None:
    """Fill the status dates and the first entries of the rows already there."""
    for statement in BACKFILL:
        connection.execute(sa.text(statement))


def upgrade() -> None:
    """Add the status dates and the activity's table, then backfill them."""
    op.create_table(
        'connection_activity',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('form_connection_id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('occurred_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            'position', sa.SmallInteger(), server_default=sa.text('0'), nullable=False
        ),
        sa.Column('variant_id', sa.String(length=36), nullable=True),
        sa.Column('variant_name', sa.String(length=200), nullable=True),
        sa.Column('start_date', sa.Date(), nullable=True),
        sa.Column('actor_name', sa.String(length=100), nullable=True),
        sa.Column('agent_name', sa.String(length=200), nullable=True),
        sa.Column(
            'approved', sa.Boolean(), server_default=sa.text('false'), nullable=False
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.Column(
            'updated_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ['form_connection_id'], ['form_connections.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_connection_activity_connection_time',
        'connection_activity',
        ['form_connection_id', 'occurred_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_connection_activity_form_connection_id'),
        'connection_activity',
        ['form_connection_id'],
        unique=False,
    )
    op.add_column('form_connections', sa.Column('start_date', sa.Date(), nullable=True))
    op.add_column(
        'form_connections',
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'form_connections',
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        START_DATE_INDEX,
        'form_connections',
        ['start_date'],
        unique=False,
        postgresql_where=sa.text('start_date IS NOT NULL'),
    )
    op.create_check_constraint(
        START_DATE_CHECK,
        'form_connections',
        'start_date IS NULL OR (published_at IS NOT NULL AND NOT is_active)',
    )
    backfill_status_dates_and_activity(op.get_bind())


def downgrade() -> None:
    """Drop the CHECK, the index, the three columns and the activity's table."""
    op.drop_constraint(START_DATE_CHECK, 'form_connections', type_='check')
    op.drop_index(
        START_DATE_INDEX,
        table_name='form_connections',
        postgresql_where=sa.text('start_date IS NOT NULL'),
    )
    op.drop_column('form_connections', 'deactivated_at')
    op.drop_column('form_connections', 'activated_at')
    op.drop_column('form_connections', 'start_date')
    op.drop_index(
        op.f('ix_connection_activity_form_connection_id'),
        table_name='connection_activity',
    )
    op.drop_index(
        'ix_connection_activity_connection_time', table_name='connection_activity'
    )
    op.drop_table('connection_activity')
