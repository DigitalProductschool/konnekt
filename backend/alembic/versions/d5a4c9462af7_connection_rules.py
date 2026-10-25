"""connection rules

Rules for form connections, with branches (specs/002-connection-rules/data-model.md,
"Migration"; research R11). The upgrade adds the branch identities and the rule
sets, and gives every form connection, deleted ones included, a main branch
"Standard" without rules as rule set 1. Requests already in progress keep an empty
rule_set_id, which meets every rule. The downgrade drops them in reverse.

Revision ID: d5a4c9462af7
Revises: 9a22d4b976f8
Create Date: 2026-10-25 11:33:18.218578

"""

import uuid
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd5a4c9462af7'
down_revision: Union[str, None] = '9a22d4b976f8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RULE_SET_FOREIGN_KEY = 'document_requests_rule_set_id_fkey'


def _give_every_form_connection_a_main_branch() -> None:
    """Insert a main branch and rule set 1 for every form connection.

    The snapshot is written out here rather than taken from the app, whose code
    changes after this migration.
    """
    form_connections = sa.table(
        'form_connections',
        sa.column('id', sa.String),
        sa.column('current_rule_set', sa.Integer),
    )
    branches = sa.table(
        'form_connection_branches',
        sa.column('id', sa.String),
        sa.column('form_connection_id', sa.String),
        sa.column('is_main', sa.Boolean),
    )
    rule_sets = sa.table(
        'form_connection_rule_sets',
        sa.column('id', sa.String),
        sa.column('form_connection_id', sa.String),
        sa.column('version', sa.Integer),
        sa.column('branches', postgresql.JSONB),
    )
    connection = op.get_bind()
    form_connection_ids = connection.scalars(sa.select(form_connections.c.id)).all()
    for form_connection_id in form_connection_ids:
        branch_id = str(uuid.uuid4())
        connection.execute(
            branches.insert().values(
                id=branch_id, form_connection_id=form_connection_id, is_main=True
            )
        )
        connection.execute(
            rule_sets.insert().values(
                id=str(uuid.uuid4()),
                form_connection_id=form_connection_id,
                version=1,
                branches=[
                    {
                        'id': branch_id,
                        'name': 'Standard',
                        'description': None,
                        'origin': 'main',
                        'operator': 'and',
                        'operator_mark': None,
                        'items': [],
                    }
                ],
            )
        )
    connection.execute(form_connections.update().values(current_rule_set=1))


def upgrade() -> None:
    # 1. The branch identities and the rule sets
    op.create_table(
        'form_connection_branches',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('form_connection_id', sa.String(length=36), nullable=False),
        sa.Column('is_main', sa.Boolean(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
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
            ['form_connection_id'],
            ['form_connections.id'],
        ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        op.f('ix_form_connection_branches_form_connection_id'),
        'form_connection_branches',
        ['form_connection_id'],
        unique=False,
    )
    # Exactly one main branch per form connection
    op.create_index(
        'ix_form_connection_branches_main',
        'form_connection_branches',
        ['form_connection_id'],
        unique=True,
        postgresql_where=sa.text('is_main'),
    )
    op.create_table(
        'form_connection_rule_sets',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('form_connection_id', sa.String(length=36), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('branches', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
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
            ['form_connection_id'],
            ['form_connections.id'],
        ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('form_connection_id', 'version'),
    )
    op.create_index(
        op.f('ix_form_connection_rule_sets_form_connection_id'),
        'form_connection_rule_sets',
        ['form_connection_id'],
        unique=False,
    )

    # 2. The identifier counters, and the current rule set, empty until step 3
    op.add_column(
        'form_connections',
        sa.Column(
            'next_rule_number',
            sa.Integer(),
            server_default=sa.text('1'),
            nullable=False,
        ),
    )
    op.add_column(
        'form_connections',
        sa.Column(
            'next_group_number',
            sa.Integer(),
            server_default=sa.text('1'),
            nullable=False,
        ),
    )
    op.add_column(
        'form_connections',
        sa.Column('current_rule_set', sa.Integer(), nullable=True),
    )

    # 3. A main branch "Standard" without rules, as rule set 1
    _give_every_form_connection_a_main_branch()

    # 4. Every form connection has a current rule set from now on
    op.alter_column('form_connections', 'current_rule_set', nullable=False)

    # 5. The rule set a request started with
    op.add_column(
        'document_requests',
        sa.Column('rule_set_id', sa.String(length=36), nullable=True),
    )
    op.create_index(
        op.f('ix_document_requests_rule_set_id'),
        'document_requests',
        ['rule_set_id'],
        unique=False,
    )
    op.create_foreign_key(
        RULE_SET_FOREIGN_KEY,
        'document_requests',
        'form_connection_rule_sets',
        ['rule_set_id'],
        ['id'],
    )


def downgrade() -> None:
    op.drop_constraint(RULE_SET_FOREIGN_KEY, 'document_requests', type_='foreignkey')
    op.drop_index(
        op.f('ix_document_requests_rule_set_id'), table_name='document_requests'
    )
    op.drop_column('document_requests', 'rule_set_id')
    op.drop_column('form_connections', 'current_rule_set')
    op.drop_column('form_connections', 'next_group_number')
    op.drop_column('form_connections', 'next_rule_number')
    op.drop_index(
        op.f('ix_form_connection_rule_sets_form_connection_id'),
        table_name='form_connection_rule_sets',
    )
    op.drop_table('form_connection_rule_sets')
    op.drop_index(
        'ix_form_connection_branches_main',
        table_name='form_connection_branches',
        postgresql_where=sa.text('is_main'),
    )
    op.drop_index(
        op.f('ix_form_connection_branches_form_connection_id'),
        table_name='form_connection_branches',
    )
    op.drop_table('form_connection_branches')
