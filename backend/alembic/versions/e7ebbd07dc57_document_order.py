"""document order

The documents' stored order (specs/010-revamp-backend-gaps/data-model.md, sections 4
and 9, revision 3; research R6). The upgrade adds form_connections.document_order, the
document type keys in the team's order, not null with the server default '[]' kept:
an empty list means catalog order, which is what every existing connection shows
(FR-052), so nothing is backfilled. The downgrade drops the column; the revisions and
the drafts' content never held the order, so nothing else is lost.

Revision ID: e7ebbd07dc57
Revises: 9e7546ab2057
Create Date: 2026-11-11 20:22:04.059010

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e7ebbd07dc57'
down_revision: Union[str, None] = '9e7546ab2057'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the documents' order, empty (catalog order) for every existing row."""
    op.add_column(
        'form_connections',
        sa.Column(
            'document_order',
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    """Drop the documents' order."""
    op.drop_column('form_connections', 'document_order')
