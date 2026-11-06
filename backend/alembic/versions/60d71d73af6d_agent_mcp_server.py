"""agent mcp server

Agent access through an MCP server (specs/007-agent-mcp-server/data-model.md,
sections 1 to 5 and 6.1; research R4, R6, R10, R12 and R17). The upgrade creates the
five tables oauth_clients, oauth_codes, agent_authorizations, agent_tokens and
approval_requests, with the partial unique index that allows one agent connection
per account and client, and gives every branch of a stored draft an identifier
(FR-029): each branch in form_connections.draft whose id is null gets a new UUID.
The downgrade drops the five tables; the identifiers in drafts stay, since the
earlier schema accepts them.

Revision ID: 60d71d73af6d
Revises: f17f604c6cbb
Create Date: 2026-11-05 23:46:34.963522

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '60d71d73af6d'
down_revision: Union[str, None] = 'f17f604c6cbb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OAUTH_CLIENT_INDEX = 'uq_agent_authorizations_oauth_client'


def backfill_branch_ids(connection: sa.Connection) -> None:
    """Give every branch of every stored draft an id where it has none.

    Data-model section 6.1: a Python loop over the drafts, since autogenerate emits
    no data migration. Only the null ids change: the rest of the draft, its
    draft_version and its updated_at stay as they are.
    """
    rows = connection.execute(
        sa.text('SELECT id, draft FROM form_connections WHERE draft IS NOT NULL')
    ).all()
    update = sa.text(
        'UPDATE form_connections SET draft = :draft WHERE id = :id'
    ).bindparams(sa.bindparam('draft', type_=postgresql.JSONB))
    for form_connection_id, draft in rows:
        branches = draft.get('branches') if isinstance(draft, dict) else None
        if not isinstance(branches, list):
            continue
        changed = False
        for branch in branches:
            if isinstance(branch, dict) and branch.get('id') is None:
                branch['id'] = str(uuid.uuid4())
                changed = True
        if changed:
            connection.execute(update, {'id': form_connection_id, 'draft': draft})


def upgrade() -> None:
    """Create the five tables, then give the drafts' branches their ids."""
    op.create_table(
        'oauth_clients',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('client_id', sa.String(length=500), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('client_name', sa.String(length=200), nullable=False),
        sa.Column(
            'redirect_uris', postgresql.JSONB(astext_type=sa.Text()), nullable=False
        ),
        sa.Column('metadata_fetched_at', sa.DateTime(timezone=True), nullable=True),
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
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_oauth_clients_client_id'), 'oauth_clients', ['client_id'], unique=True
    )
    op.create_table(
        'agent_authorizations',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('user_account_id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('access_level', sa.String(length=16), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            'drafts_window_started_at', sa.DateTime(timezone=True), nullable=True
        ),
        sa.Column(
            'drafts_in_window',
            sa.Integer(),
            server_default=sa.text('0'),
            nullable=False,
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
        sa.ForeignKeyConstraint(['client_id'], ['oauth_clients.id']),
        sa.ForeignKeyConstraint(
            ['user_account_id'], ['user_accounts.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_agent_authorizations_client_id'),
        'agent_authorizations',
        ['client_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_agent_authorizations_expires_at'),
        'agent_authorizations',
        ['expires_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_agent_authorizations_user_account_id'),
        'agent_authorizations',
        ['user_account_id'],
        unique=False,
    )
    # One agent connection per account and client; personal access tokens are free
    op.create_index(
        OAUTH_CLIENT_INDEX,
        'agent_authorizations',
        ['user_account_id', 'client_id'],
        unique=True,
        postgresql_where=sa.text("kind = 'oauth'"),
    )
    op.create_table(
        'oauth_codes',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('code_hash', sa.String(length=64), nullable=False),
        sa.Column('client_id', sa.String(length=36), nullable=False),
        sa.Column('user_account_id', sa.String(length=36), nullable=False),
        sa.Column('redirect_uri', sa.String(length=2000), nullable=False),
        sa.Column('code_challenge', sa.String(length=128), nullable=False),
        sa.Column('access_level', sa.String(length=16), nullable=False),
        sa.Column('resource', sa.String(length=2000), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
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
        sa.ForeignKeyConstraint(['client_id'], ['oauth_clients.id']),
        sa.ForeignKeyConstraint(
            ['user_account_id'], ['user_accounts.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_oauth_codes_client_id'), 'oauth_codes', ['client_id'], unique=False
    )
    op.create_index(
        op.f('ix_oauth_codes_code_hash'), 'oauth_codes', ['code_hash'], unique=True
    )
    op.create_index(
        op.f('ix_oauth_codes_expires_at'), 'oauth_codes', ['expires_at'], unique=False
    )
    op.create_index(
        op.f('ix_oauth_codes_user_account_id'),
        'oauth_codes',
        ['user_account_id'],
        unique=False,
    )
    op.create_table(
        'agent_tokens',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('authorization_id', sa.String(length=36), nullable=False),
        sa.Column('kind', sa.String(length=16), nullable=False),
        sa.Column('token_hash', sa.String(length=64), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('replaced_by_id', sa.String(length=36), nullable=True),
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
            ['authorization_id'], ['agent_authorizations.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_agent_tokens_authorization_id'),
        'agent_tokens',
        ['authorization_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_agent_tokens_expires_at'), 'agent_tokens', ['expires_at'], unique=False
    )
    op.create_index(
        op.f('ix_agent_tokens_token_hash'), 'agent_tokens', ['token_hash'], unique=True
    )
    op.create_table(
        'approval_requests',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('form_connection_id', sa.String(length=36), nullable=False),
        sa.Column('action', sa.String(length=16), nullable=False),
        sa.Column('authorization_id', sa.String(length=36), nullable=False),
        sa.Column('user_account_id', sa.String(length=36), nullable=False),
        sa.Column('draft_version', sa.Integer(), nullable=True),
        sa.Column('was_active', sa.Boolean(), nullable=True),
        sa.Column('status', sa.String(length=16), nullable=False),
        sa.Column('cancel_reason', sa.String(length=32), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_id', sa.String(length=36), nullable=True),
        sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
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
            ['authorization_id'], ['agent_authorizations.id'], ondelete='CASCADE'
        ),
        # Plain: a connection's deletion is a soft delete
        sa.ForeignKeyConstraint(['form_connection_id'], ['form_connections.id']),
        sa.ForeignKeyConstraint(
            ['user_account_id'], ['user_accounts.id'], ondelete='CASCADE'
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_approval_requests_authorization_id'),
        'approval_requests',
        ['authorization_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_approval_requests_expires_at'),
        'approval_requests',
        ['expires_at'],
        unique=False,
    )
    op.create_index(
        op.f('ix_approval_requests_form_connection_id'),
        'approval_requests',
        ['form_connection_id'],
        unique=False,
    )
    op.create_index(
        op.f('ix_approval_requests_status'),
        'approval_requests',
        ['status'],
        unique=False,
    )
    op.create_index(
        op.f('ix_approval_requests_user_account_id'),
        'approval_requests',
        ['user_account_id'],
        unique=False,
    )
    # Every stored draft's branches get ids (FR-029)
    backfill_branch_ids(op.get_bind())


def downgrade() -> None:
    """Drop the five tables in reverse; the ids in drafts stay."""
    op.drop_index(
        op.f('ix_approval_requests_user_account_id'), table_name='approval_requests'
    )
    op.drop_index(op.f('ix_approval_requests_status'), table_name='approval_requests')
    op.drop_index(
        op.f('ix_approval_requests_form_connection_id'), table_name='approval_requests'
    )
    op.drop_index(
        op.f('ix_approval_requests_expires_at'), table_name='approval_requests'
    )
    op.drop_index(
        op.f('ix_approval_requests_authorization_id'), table_name='approval_requests'
    )
    op.drop_table('approval_requests')
    op.drop_index(op.f('ix_agent_tokens_token_hash'), table_name='agent_tokens')
    op.drop_index(op.f('ix_agent_tokens_expires_at'), table_name='agent_tokens')
    op.drop_index(op.f('ix_agent_tokens_authorization_id'), table_name='agent_tokens')
    op.drop_table('agent_tokens')
    op.drop_index(op.f('ix_oauth_codes_user_account_id'), table_name='oauth_codes')
    op.drop_index(op.f('ix_oauth_codes_expires_at'), table_name='oauth_codes')
    op.drop_index(op.f('ix_oauth_codes_code_hash'), table_name='oauth_codes')
    op.drop_index(op.f('ix_oauth_codes_client_id'), table_name='oauth_codes')
    op.drop_table('oauth_codes')
    op.drop_index(OAUTH_CLIENT_INDEX, table_name='agent_authorizations')
    op.drop_index(
        op.f('ix_agent_authorizations_user_account_id'),
        table_name='agent_authorizations',
    )
    op.drop_index(
        op.f('ix_agent_authorizations_expires_at'), table_name='agent_authorizations'
    )
    op.drop_index(
        op.f('ix_agent_authorizations_client_id'), table_name='agent_authorizations'
    )
    op.drop_table('agent_authorizations')
    op.drop_index(op.f('ix_oauth_clients_client_id'), table_name='oauth_clients')
    op.drop_table('oauth_clients')
