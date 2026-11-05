"""connection description

The serviceBW form ID of a form connection becomes its optional description
(specs/006-connection-description/data-model.md, section 1; research R1). The
upgrade renames the column servicebw_form to description, and the downgrade renames
it back. Type, NOT NULL and '' for "none" stay as they are, so every value carries
over byte for byte in both directions, with no backfill.

Revision ID: f17f604c6cbb
Revises: d2b97ba4a2c7
Create Date: 2026-11-05 12:41:44.861705

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f17f604c6cbb'
down_revision: Union[str, None] = 'd2b97ba4a2c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename form_connections.servicebw_form to description."""
    op.alter_column('form_connections', 'servicebw_form', new_column_name='description')


def downgrade() -> None:
    """Rename form_connections.description back to servicebw_form."""
    op.alter_column('form_connections', 'description', new_column_name='servicebw_form')
