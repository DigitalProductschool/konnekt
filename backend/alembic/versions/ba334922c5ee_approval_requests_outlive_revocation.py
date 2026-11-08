"""approval requests outlive revocation

An approval request outlives the agent authorization that made it, and the draft it
was made for (specs/007-agent-mcp-server/data-model.md, sections 5, 5.2 and 6.1;
research R7 and R12). The upgrade gives approval_requests.authorization_id the rule
ON DELETE SET NULL in place of the cascade and makes it nullable, so that revoking
an agent keeps its cancelled requests for the approval page; it adds requested_by,
the agent's name when it asked, NOT NULL with a server default of '' that only
fills the rows already there and is dropped again; and it drops the foreign key of
form_connection_id, since deleting a draft removes its row (spec 005) while its
requests stay to read as draft_deleted. The downgrade deletes the requests whose
authorization or form connection is gone, then restores the cascade, NOT NULL and
the foreign key of form_connection_id, and drops requested_by.

Revision ID: ba334922c5ee
Revises: 60d71d73af6d
Create Date: 2026-11-06 14:30:28.864803

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ba334922c5ee'
down_revision: Union[str, None] = '60d71d73af6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# PostgreSQL's names, since the models declare no naming convention
AUTHORIZATION_FK = 'approval_requests_authorization_id_fkey'
FORM_CONNECTION_FK = 'approval_requests_form_connection_id_fkey'


def upgrade() -> None:
    """Keep the requests when their authorization or draft goes; add requested_by."""
    op.drop_constraint(AUTHORIZATION_FK, 'approval_requests', type_='foreignkey')
    op.create_foreign_key(
        AUTHORIZATION_FK,
        'approval_requests',
        'agent_authorizations',
        ['authorization_id'],
        ['id'],
        ondelete='SET NULL',
    )
    op.alter_column(
        'approval_requests',
        'authorization_id',
        existing_type=sa.String(length=36),
        nullable=True,
    )
    # The default fills the rows already there, then goes: a new row names its agent
    op.add_column(
        'approval_requests',
        sa.Column(
            'requested_by',
            sa.String(length=200),
            server_default='',
            nullable=False,
        ),
    )
    op.alter_column(
        'approval_requests',
        'requested_by',
        existing_type=sa.String(length=200),
        server_default=None,
    )
    op.drop_constraint(FORM_CONNECTION_FK, 'approval_requests', type_='foreignkey')


def downgrade() -> None:
    """Delete the requests that outlived their authorization or form connection,
    then restore the cascade, NOT NULL and both foreign keys; drop requested_by."""
    op.execute(
        sa.text(
            'DELETE FROM approval_requests WHERE authorization_id IS NULL '
            'OR form_connection_id NOT IN (SELECT id FROM form_connections)'
        )
    )
    op.create_foreign_key(
        FORM_CONNECTION_FK,
        'approval_requests',
        'form_connections',
        ['form_connection_id'],
        ['id'],
    )
    op.drop_constraint(AUTHORIZATION_FK, 'approval_requests', type_='foreignkey')
    op.create_foreign_key(
        AUTHORIZATION_FK,
        'approval_requests',
        'agent_authorizations',
        ['authorization_id'],
        ['id'],
        ondelete='CASCADE',
    )
    op.alter_column(
        'approval_requests',
        'authorization_id',
        existing_type=sa.String(length=36),
        nullable=False,
    )
    op.drop_column('approval_requests', 'requested_by')
