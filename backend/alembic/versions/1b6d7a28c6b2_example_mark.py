"""example mark

The example's mark (specs/010-revamp-backend-gaps/data-model.md, sections 5 and 9,
revision 4; research R7). The upgrade adds form_connections.example, null for every
existing row (no connection is the example yet, so nothing is backfilled), and the
CHECK constraint ck_form_connections_example: only a draft can carry the mark, and
publishing clears it (FR-059). The downgrade drops both; the example's draft stays a
plain draft.

Revision ID: 1b6d7a28c6b2
Revises: e7ebbd07dc57
Create Date: 2026-11-11 22:55:32.935355

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '1b6d7a28c6b2'
down_revision: Union[str, None] = 'e7ebbd07dc57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the example's mark, null for every existing row, and its constraint."""
    op.add_column(
        'form_connections',
        sa.Column('example', sa.String(length=16), nullable=True),
    )
    op.create_check_constraint(
        'ck_form_connections_example',
        'form_connections',
        'example IS NULL OR published_at IS NULL',
    )


def downgrade() -> None:
    """Drop the constraint, then the mark."""
    op.drop_constraint('ck_form_connections_example', 'form_connections', type_='check')
    op.drop_column('form_connections', 'example')
