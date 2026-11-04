"""connection drafts

Drafts of form connections (specs/005-connection-drafts/data-model.md, section 1;
research R15). A draft is a row whose published_at is null: its content lives in
draft, its saves are counted by draft_version, and it has no current revision or
rule set. The upgrade publishes every existing row as of its creation and adds the
CHECK constraint that keeps each row exactly a draft or a published connection. The
downgrade deletes the drafts and drops it all in reverse.

Revision ID: d2b97ba4a2c7
Revises: d5a4c9462af7
Create Date: 2026-11-04 20:00:18.989759

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd2b97ba4a2c7'
down_revision: Union[str, None] = 'd5a4c9462af7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CHECK_NAME = 'ck_form_connections_draft_or_published'
CHECK_CONDITION = (
    '(published_at IS NULL AND current_revision IS NULL'
    ' AND current_rule_set IS NULL AND draft IS NOT NULL'
    ' AND draft_version IS NOT NULL)'
    ' OR (published_at IS NOT NULL AND current_revision IS NOT NULL'
    ' AND current_rule_set IS NOT NULL AND draft IS NULL'
    ' AND draft_version IS NULL)'
)


def upgrade() -> None:
    """Add the draft columns, publish every existing row, add the constraint."""
    op.add_column(
        'form_connections',
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'form_connections',
        sa.Column('draft', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        'form_connections', sa.Column('draft_version', sa.Integer(), nullable=True)
    )
    op.alter_column(
        'form_connections',
        'current_revision',
        existing_type=sa.INTEGER(),
        nullable=True,
    )
    op.alter_column(
        'form_connections',
        'current_rule_set',
        existing_type=sa.INTEGER(),
        nullable=True,
    )
    op.create_index(
        op.f('ix_form_connections_published_at'),
        'form_connections',
        ['published_at'],
        unique=False,
    )
    # Every existing row is published (FR-026)
    op.execute('UPDATE form_connections SET published_at = created_at')
    op.create_check_constraint(CHECK_NAME, 'form_connections', CHECK_CONDITION)


def downgrade() -> None:
    """Delete the drafts, then drop the constraint and the draft columns."""
    op.execute(
        'DELETE FROM form_connection_revisions WHERE form_connection_id IN '
        '(SELECT id FROM form_connections WHERE published_at IS NULL)'
    )
    op.execute('DELETE FROM form_connections WHERE published_at IS NULL')
    op.drop_constraint(CHECK_NAME, 'form_connections', type_='check')
    op.drop_index(
        op.f('ix_form_connections_published_at'), table_name='form_connections'
    )
    op.drop_column('form_connections', 'draft_version')
    op.drop_column('form_connections', 'draft')
    op.drop_column('form_connections', 'published_at')
    op.alter_column(
        'form_connections',
        'current_rule_set',
        existing_type=sa.INTEGER(),
        nullable=False,
    )
    op.alter_column(
        'form_connections',
        'current_revision',
        existing_type=sa.INTEGER(),
        nullable=False,
    )
