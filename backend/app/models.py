"""SQLAlchemy models.

specs/001-servicebw-eudi-middleware/data-model.md, extended by the rule sets and
branches of specs/002-connection-rules/data-model.md and the drafts of
specs/005-connection-drafts/data-model.md.
"""

import uuid
from datetime import datetime
from typing import Annotated, Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def _new_id() -> str:
    return str(uuid.uuid4())


# Columns every table has: a UUID4 key and timezone-aware timestamps
UuidPk = Annotated[str, mapped_column(String(36), primary_key=True, default=_new_id)]
CreatedAt = Annotated[
    datetime, mapped_column(DateTime(timezone=True), server_default=func.now())
]
UpdatedAt = Annotated[
    datetime,
    mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    ),
]


class UserAccount(Base):
    """A DO.IT team member who can sign in (FR-007). Managed with app.cli."""

    __tablename__ = 'user_accounts'

    id: Mapped[UuidPk]
    # Lowercase, 3-100 characters from a-z 0-9 . _ -
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    # Argon2id hash; the password itself is never stored
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class LoginSession(Base):
    """A signed-in browser. The cookie holds the token, this row its hash."""

    __tablename__ = 'login_sessions'

    id: Mapped[UuidPk]
    user_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('user_accounts.id', ondelete='CASCADE'), index=True
    )
    # SHA-256 hex of the cookie token
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class FormConnection(Base):
    """A serviceBW form, the documents it requests and the rules they must meet.

    Spec 001: FR-001, FR-004 to FR-006. Spec 002: the rule sets and the counters of
    the rules' and groups' identifiers (research R1, R5). Spec 005: a row is either
    a draft (``published_at`` is null; its content lives in ``draft``, and it has no
    revision, rule set, branch rows or EUDIPLO configuration) or a published
    connection, never both (research R1, the CHECK constraint below).
    """

    __tablename__ = 'form_connections'
    __table_args__ = (
        # Every row is exactly a draft or a published connection (spec 005, R1)
        CheckConstraint(
            '(published_at IS NULL AND current_revision IS NULL'
            ' AND current_rule_set IS NULL AND draft IS NOT NULL'
            ' AND draft_version IS NOT NULL)'
            ' OR (published_at IS NOT NULL AND current_revision IS NOT NULL'
            ' AND current_rule_set IS NOT NULL AND draft IS NULL'
            ' AND draft_version IS NULL)',
            name='ck_form_connections_draft_or_published',
        ),
    )

    id: Mapped[UuidPk]
    # Required for drafts too
    name: Mapped[str] = mapped_column(String(200))
    # May be '' in a draft
    servicebw_form: Mapped[str] = mapped_column(String(500))
    # Stays true on a draft and means nothing until it is published
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true()
    )
    # When the connection was published. Null exactly while it is a draft
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    # The revision that new requests use. Null exactly while a draft
    current_revision: Mapped[int | None] = mapped_column(Integer)
    # The rule set version that new requests use; changes together with
    # current_revision when a save changes both. Null exactly while a draft
    current_rule_set: Mapped[int | None] = mapped_column(Integer)
    # A draft's content: documents, branches and step (schemas.DRAFT_CONTENT,
    # spec 005 data-model.md section 2). Null once published
    draft: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    # 1 when created, +1 on every save (FR-022, R6). Null once published
    draft_version: Mapped[int | None] = mapped_column(Integer)
    # The next free number of rule-{n}, and of group-{n}, which groups and
    # sub-groups share. Never lowered, so no identifier is reused. Also the
    # draft's numbering, carried into publishing (spec 005, R4)
    next_rule_number: Mapped[int] = mapped_column(
        Integer, default=1, server_default=text('1')
    )
    next_group_number: Mapped[int] = mapped_column(
        Integer, default=1, server_default=text('1')
    )
    # Set on deletion of a published connection; the row stays so its URLs keep
    # answering "unavailable". A draft is deleted by removing its row (spec 005, R7)
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class FormConnectionRevision(Base):
    """An immutable set of requested documents, with its EUDIPLO configuration."""

    __tablename__ = 'form_connection_revisions'
    __table_args__ = (
        UniqueConstraint('form_connection_id', 'revision'),
        # The configuration cleanup scan
        Index(
            'ix_form_connection_revisions_config_not_deleted',
            'form_connection_id',
            postgresql_where=text('eudiplo_config_deleted_at IS NULL'),
        ),
    )

    id: Mapped[UuidPk]
    form_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connections.id'), index=True
    )
    revision: Mapped[int] = mapped_column(Integer)
    # [{"document_type": "pid", "fields": ["family_name", ...]}], in catalog order
    documents: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    lifetime_seconds: Mapped[int] = mapped_column(Integer)
    # SHA-256 of the configuration body without its id and description
    config_hash: Mapped[str] = mapped_column(String(64))
    # fc-{form_connection_id}-r{revision}
    eudiplo_config_id: Mapped[str] = mapped_column(String(255), unique=True)
    eudiplo_config_deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class FormConnectionBranch(Base):
    """A branch's identity: what its pull URL names (FR-018 to FR-020, FR-025).

    Its name, description and rules live in the rule sets, so renaming a branch
    never touches this row.
    """

    __tablename__ = 'form_connection_branches'
    __table_args__ = (
        # Exactly one main branch per form connection
        Index(
            'ix_form_connection_branches_main',
            'form_connection_id',
            unique=True,
            postgresql_where=text('is_main'),
        ),
    )

    # Part of the branch's pull URL, so it never changes and is never reused
    id: Mapped[UuidPk]
    form_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connections.id'), index=True
    )
    is_main: Mapped[bool] = mapped_column(Boolean)
    # Set when a save leaves the branch out; its pull URL then answers
    # "unavailable" for good (FR-027). The main branch is never deleted
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class FormConnectionRuleSet(Base):
    """An immutable version of a form connection's branches and rules (research R1).

    A save that changes the rules adds the next version; requests keep the version
    current when they were triggered.
    """

    __tablename__ = 'form_connection_rule_sets'
    __table_args__ = (UniqueConstraint('form_connection_id', 'version'),)

    id: Mapped[UuidPk]
    form_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connections.id'), index=True
    )
    # Starts at 1
    version: Mapped[int] = mapped_column(Integer)
    # Every branch that isn't deleted, main branch first, with its tree of rules and
    # groups (schemas.RULE_SET_SNAPSHOT, research R2). Never changed after insert
    branches: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class DocumentRequest(Base):
    """One request for a citizen's documents (FR-008 to FR-013, FR-018 to FR-021).

    The documents themselves stay in the EUDIPLO session until they are delivered
    or deleted. The request keeps the revision and the rule set it started with.
    """

    __tablename__ = 'document_requests'
    __table_args__ = (
        # The expiry scan for pending requests
        Index('ix_document_requests_status_expires_at', 'status', 'expires_at'),
        # Open requests, and the EUDIPLO session deletion scan
        Index(
            'ix_document_requests_status_session_not_deleted',
            'status',
            postgresql_where=text('eudiplo_session_deleted_at IS NULL'),
        ),
    )

    id: Mapped[UuidPk]
    # Returned to serviceBW; never logged
    reference: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    form_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connections.id'), index=True
    )
    revision_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connection_revisions.id'), index=True
    )
    # The rule set current at the trigger. Empty only for requests triggered before
    # rules existed, which meet every rule (spec 002, research R8, R11)
    rule_set_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('form_connection_rule_sets.id'), index=True
    )
    # pending, completed, declined, verification_failed, expired or unavailable
    status: Mapped[str] = mapped_column(String(32), index=True)
    failure_code: Mapped[str | None] = mapped_column(String(100))
    eudiplo_session_id: Mapped[str] = mapped_column(String(255), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status_changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # When the citizen shared (EUDIPLO's consumedAt)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    documents_delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    eudiplo_session_deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    # The row is deleted REQUEST_RECORD_RETENTION_SECONDS after this
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]
