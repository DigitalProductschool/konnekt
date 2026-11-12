"""restorable deletion

A deletion that can be taken back (specs/010-revamp-backend-gaps/data-model.md,
sections 3 and 9, revision 2; research R5). The upgrade adds
form_connections.deletion_id, the id of a deletion shared by the rows deleted together
(indexed, since a restore looks the rows up by it), and deleted_by_id, the team member
who deleted, with a named foreign key to user_accounts that sets it to null when the
account goes. The downgrade first deletes the rows of drafts that are marked deleted
(with any revision a publish in flight reserved for them; their activity cascades),
since the old code knows no deleted draft and removed a draft's row on deletion, then
drops what the upgrade added.

Revision ID: 9e7546ab2057
Revises: bfd1be13755d
Create Date: 2026-11-11 15:41:19.724229

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9e7546ab2057'
down_revision: Union[str, None] = 'bfd1be13755d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL's name, since the models declare no naming convention
DELETED_BY_FK = 'form_connections_deleted_by_id_fkey'
DELETION_INDEX = 'ix_form_connections_deletion_id'

# A draft is a row without published_at (spec 005, the CHECK
# ck_form_connections_draft_or_published)
DELETED_DRAFTS = (
    'SELECT id FROM form_connections '
    'WHERE published_at IS NULL AND deleted_at IS NOT NULL'
)


def upgrade() -> None:
    """Add the deletion's id and the account that deleted."""
    op.add_column(
        'form_connections',
        sa.Column('deletion_id', sa.String(length=36), nullable=True),
    )
    op.add_column(
        'form_connections',
        sa.Column('deleted_by_id', sa.String(length=36), nullable=True),
    )
    op.create_index(DELETION_INDEX, 'form_connections', ['deletion_id'], unique=False)
    op.create_foreign_key(
        DELETED_BY_FK,
        'form_connections',
        'user_accounts',
        ['deleted_by_id'],
        ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    """Delete the drafts marked deleted, then drop the two columns."""
    # As delete_draft() did: a revision reserved by a publish in flight first, then
    # the row; connection_activity cascades
    op.execute(
        sa.text(
            'DELETE FROM form_connection_revisions '
            f'WHERE form_connection_id IN ({DELETED_DRAFTS})'
        )
    )
    op.execute(
        sa.text(
            'DELETE FROM form_connections '
            'WHERE published_at IS NULL AND deleted_at IS NOT NULL'
        )
    )
    op.drop_constraint(DELETED_BY_FK, 'form_connections', type_='foreignkey')
    op.drop_index(DELETION_INDEX, table_name='form_connections')
    op.drop_column('form_connections', 'deleted_by_id')
    op.drop_column('form_connections', 'deletion_id')
