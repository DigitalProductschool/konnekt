"""SQLAlchemy models (specs/001-servicebw-eudi-middleware/data-model.md)."""

import uuid
from datetime import datetime
from typing import Annotated, Any

from sqlalchemy import (
    Boolean,
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
    """A serviceBW form and the documents it requests (FR-001, FR-004 to FR-006)."""

    __tablename__ = 'form_connections'

    id: Mapped[UuidPk]
    name: Mapped[str] = mapped_column(String(200))
    servicebw_form: Mapped[str] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=true()
    )
    # The revision that new requests use
    current_revision: Mapped[int] = mapped_column(Integer)
    # Set on deletion; the row stays so its URLs keep answering "unavailable"
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


class DocumentRequest(Base):
    """One request for a citizen's documents (FR-008 to FR-013, FR-018 to FR-021).

    The documents themselves stay in the EUDIPLO session until they are delivered
    or deleted.
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
