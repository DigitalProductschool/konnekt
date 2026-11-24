"""SQLAlchemy models.

specs/001-servicebw-eudi-middleware/data-model.md, extended by the rule sets and
branches of specs/002-connection-rules/data-model.md, the drafts of
specs/005-connection-drafts/data-model.md and the agent access and approval
requests of specs/007-agent-mcp-server/data-model.md, the status dates and the
activity of specs/010-revamp-backend-gaps/data-model.md, and the sign-in throttle
of specs/012-open-source-release/research.md (R6, finding 4).

No table holds a citizen, a finding, a test result, a token's secret or a
citizen's data.
"""

import uuid
from datetime import date, datetime
from typing import Annotated, Any

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    SmallInteger,
    String,
    UniqueConstraint,
    false,
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


class SignInThrottle(Base):
    """The failed sign-ins in a row for one username, and the wait they caused.

    Spec 012, research R6, finding 4; services/sign_in_throttle.py. One row per
    submitted username, whether or not an account has it, keyed by a hash so that
    the table holds no username in clear. A correct sign-in deletes the row, and
    the worker deletes it at `expires_at`.
    """

    __tablename__ = 'sign_in_throttles'

    id: Mapped[UuidPk]
    # SHA-256 hex of the username as normalize_username() stores it
    username_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # Failed attempts in a row. An attempt counts as one from before its password
    # is checked; a correct one deletes the row
    failures: Mapped[int] = mapped_column(Integer, default=0, server_default=text('0'))
    # Until then every attempt answers 429 without checking a password
    refused_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the attempts are forgotten: SIGN_IN_MAX_WAIT_SECONDS after the wait
    # ends, or after the last attempt if it started none
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
        # A start date only while scheduled: published and not active (spec 010,
        # data-model.md section 1.1)
        CheckConstraint(
            'start_date IS NULL OR (published_at IS NOT NULL AND NOT is_active)',
            name='ck_form_connections_start_date',
        ),
        # Only a draft can be the example: publishing clears the mark (spec 010,
        # data-model.md section 5, FR-059)
        CheckConstraint(
            'example IS NULL OR published_at IS NULL',
            name='ck_form_connections_example',
        ),
        # The worker's scan for the start dates that have come
        Index(
            'ix_form_connections_start_date',
            'start_date',
            postgresql_where=text('start_date IS NOT NULL'),
        ),
    )

    id: Mapped[UuidPk]
    # Required for drafts too
    name: Mapped[str] = mapped_column(String(200))
    # May be '' in a draft
    description: Mapped[str] = mapped_column(String(500))
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
    # Set on deletion, of a draft too (spec 010, research R5): every read treats
    # the row as gone. A published connection's row stays for good, so that its
    # URLs keep answering "unavailable"; a draft's stays until the restore time has
    # passed, and its URLs answer 404 as an unknown connection's
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    # Spec 010, data-model.md section 3 (research R5). The deletion's id, one UUID
    # for the rows deleted together; null for a deletion an approval request ran,
    # which nothing can restore
    deletion_id: Mapped[str | None] = mapped_column(String(36), index=True)
    # The team member who deleted; only that account can restore
    deleted_by_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('user_accounts.id', ondelete='SET NULL')
    )
    # Spec 010, data-model.md section 1.1. The day in Germany from which a
    # scheduled connection is active; set exactly while it is scheduled
    start_date: Mapped[date | None] = mapped_column(Date)
    # When the connection last became active. Null for a draft and for a
    # connection that was never active
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # When the connection was last deactivated. Kept after a reactivation; read
    # only while the connection is deactivated
    deactivated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Spec 010, data-model.md section 4 (research R6). The document type keys in
    # the team's order, of a draft and a published connection alike; every answer
    # lists the documents in it. Empty means catalog order (FR-052). Revisions,
    # the DCQL query and serviceBW's delivery stay in catalog order (FR-051)
    document_order: Mapped[list[str]] = mapped_column(
        JSONB, default=list, server_default=text("'[]'::jsonb")
    )
    # Spec 010, data-model.md section 5 (research R7). 'unchanged' while the draft
    # is the example as created, 'changed' after a save that changed it (never
    # back), null for every other row and once published
    example: Mapped[str | None] = mapped_column(String(16))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class ConnectionActivity(Base):
    """One entry of a connection's activity: who did what, and when.

    Spec 010, data-model.md section 2, research R4. Written by the services under
    the connection's row lock; entries of the same kind, person and variant merge
    into the connection's newest instant (FR-026). The person is kept as text, with
    no foreign key to the account, so that the entry survives it (FR-028). No entry
    holds a rule's content, a message, a value or a citizen (FR-029).
    """

    __tablename__ = 'connection_activity'
    __table_args__ = (
        # The list and the last entry
        Index(
            'ix_connection_activity_connection_time',
            'form_connection_id',
            'occurred_at',
        ),
    )

    id: Mapped[UuidPk]
    form_connection_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('form_connections.id', ondelete='CASCADE'), index=True
    )
    # One of the kinds of data-model.md section 2.2
    kind: Mapped[str] = mapped_column(String(32))
    # When it happened; moved to the latest time when entries merge
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    # The entry's place among the entries of one action, so the order is total
    position: Mapped[int] = mapped_column(
        SmallInteger, default=0, server_default=text('0')
    )
    # The kinds about a variant: its id, and its name when written or last merged
    variant_id: Mapped[str | None] = mapped_column(String(36))
    variant_name: Mapped[str | None] = mapped_column(String(200))
    # scheduled, and start_date_changed to a date
    start_date: Mapped[date | None] = mapped_column(Date)
    # The team member's username: who acted, whom an agent acts for, or who
    # approved. Null for what the middleware did by itself and backfilled entries
    actor_name: Mapped[str | None] = mapped_column(String(100))
    # The agent's name when an agent made the change or asked for the action
    agent_name: Mapped[str | None] = mapped_column(String(200))
    # True when actor_name approved the request that agent_name made
    approved: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default=false()
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


class OauthClient(Base):
    """How an agent identifies itself to the authorization server.

    Spec 007, data-model.md section 1, research R4: a Client ID Metadata Document
    (``cimd``) or a dynamically registered client (``dcr``). A ``dcr`` client without
    any authorization after one hour is deleted by the worker.
    """

    __tablename__ = 'oauth_clients'

    id: Mapped[UuidPk]
    # For a Client ID Metadata Document, its https:// URL; for a dynamically
    # registered client, cp_client_ and 32 random characters
    client_id: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    # cimd or dcr
    kind: Mapped[str] = mapped_column(String(16))
    # As the client gives it, trimmed, cut to 200 characters
    client_name: Mapped[str] = mapped_column(String(200))
    # List of strings, at least one
    redirect_uris: Mapped[list[str]] = mapped_column(JSONB)
    # CIMD only: when the document was last fetched
    metadata_fetched_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class OauthCode(Base):
    """An authorization code, used once (spec 007, data-model.md section 2, R4).

    Expired rows are deleted by the worker.
    """

    __tablename__ = 'oauth_codes'

    id: Mapped[UuidPk]
    # SHA-256 of the code sent to the client; the code is 43 random characters
    code_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    client_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('oauth_clients.id'), index=True
    )
    # The team member who consented
    user_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('user_accounts.id', ondelete='CASCADE'), index=True
    )
    # Must be sent again at the token endpoint
    redirect_uri: Mapped[str] = mapped_column(String(2000))
    # PKCE, S256 only
    code_challenge: Mapped[str] = mapped_column(String(128))
    # The level chosen on the consent page: read, drafts or manage
    access_level: Mapped[str] = mapped_column(String(16))
    # The resource indicator, must equal MCP_URL
    resource: Mapped[str] = mapped_column(String(2000))
    # 5 minutes after creation
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # A code is used once; a second use revokes the tokens it issued
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class AgentAuthorization(Base):
    """An agent connection (``oauth``) or a personal access token (``token``).

    Spec 007, data-model.md section 3, research R4, R6 and R17. Revoking deletes
    the row, and its tokens cascade. The access level is read at every call.
    """

    __tablename__ = 'agent_authorizations'
    __table_args__ = (
        # One agent connection per account and client
        Index(
            'uq_agent_authorizations_oauth_client',
            'user_account_id',
            'client_id',
            unique=True,
            postgresql_where=text("kind = 'oauth'"),
        ),
    )

    id: Mapped[UuidPk]
    # Only this account sees and changes the row
    user_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('user_accounts.id', ondelete='CASCADE'), index=True
    )
    # oauth or token
    kind: Mapped[str] = mapped_column(String(16))
    # oauth only
    client_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey('oauth_clients.id'), index=True
    )
    # token only: 1-100 characters after trimming; '' for oauth
    name: Mapped[str] = mapped_column(String(100))
    # read, drafts or manage
    access_level: Mapped[str] = mapped_column(String(16))
    # token only: at most AGENT_TOKEN_MAX_DAYS after creation
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), index=True
    )
    # Touched by a bearer call at most once a minute
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # The draft limit's fixed window (R17)
    drafts_window_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    drafts_in_window: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text('0')
    )
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class AgentToken(Base):
    """The hash of an access, refresh or personal access token.

    Spec 007, data-model.md section 4, research R4 and R6. The token itself
    (cp_at_, cp_rt_ or cp_pat_ and 43 random characters) is never stored or logged.
    """

    __tablename__ = 'agent_tokens'

    id: Mapped[UuidPk]
    authorization_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey('agent_authorizations.id', ondelete='CASCADE'),
        index=True,
    )
    # access, refresh or personal
    kind: Mapped[str] = mapped_column(String(16))
    # SHA-256 of the token
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # refresh only: the token issued when this one was used (rotation)
    replaced_by_id: Mapped[str | None] = mapped_column(String(36))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]


class ApprovalRequest(Base):
    """An agent's request that a team member approve an action on a connection.

    Spec 007, data-model.md section 5, research R7 and R12. Expiry and staleness
    are computed at every read; only the reasons revoked and access_changed, and
    those a deletion writes, are stored. A request outlives the authorization that
    made it: revoking stores `revoked` and deleting the authorization sets
    `authorization_id` to null, so the approval page can still say why; a waiting
    request whose authorization went any other way (the worker's sweep, a retired
    refresh token used again) reads as cancelled with the computed reason
    `access_ended`. Deleting its connection stores `cancelled` with
    `connection_deleted` or `draft_deleted`, so that a restore doesn't bring it
    back (spec 010, research R5); it outlives its draft's row too, which is
    removed once the restore time has passed. A request may carry the start date
    the agent asks for, and remembers the connection's start date beside its
    `is_active` (spec 010, research R9, data-model 7).
    """

    __tablename__ = 'approval_requests'

    id: Mapped[UuidPk]
    # No foreign key: a deleted draft's row is removed once the restore time has
    # passed (spec 010, research R5), and the request stays to read as
    # draft_deleted; a published connection's row stays
    form_connection_id: Mapped[str] = mapped_column(String(36), index=True)
    # publish, delete_draft, deactivate, reactivate, delete or set_start_date
    action: Mapped[str] = mapped_column(String(16))
    # The agent that asked; null once its access was revoked or has ended, which a
    # waiting request reads as cancelled, access_ended
    authorization_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey('agent_authorizations.id', ondelete='SET NULL'),
        index=True,
    )
    # The agent's name when it asked: the OAuth client's client_name, or the
    # personal access token's name. Kept after the authorization is gone
    requested_by: Mapped[str] = mapped_column(String(200))
    # The team member who may approve
    user_account_id: Mapped[str] = mapped_column(
        String(36), ForeignKey('user_accounts.id', ondelete='CASCADE'), index=True
    )
    # publish and delete_draft: the draft's version when the request was made
    draft_version: Mapped[int | None] = mapped_column(Integer)
    # deactivate, reactivate, delete, set_start_date: the connection's is_active
    # when made
    was_active: Mapped[bool | None] = mapped_column(Boolean)
    # What the agent asks for (spec 010, data-model 7), a day in Germany: for
    # publish and reactivate the start date, null for at once; for set_start_date
    # the new date, null for now; null for the other actions
    start_date: Mapped[date | None] = mapped_column(Date)
    # The connection's start_date when made, beside was_active: together the
    # status the request was made for (spec 010, FR-066)
    was_start_date: Mapped[date | None] = mapped_column(Date)
    # waiting, done, declined, expired, replaced or cancelled
    status: Mapped[str] = mapped_column(String(16), index=True)
    # revoked or access_changed, or connection_deleted or draft_deleted, which a
    # deletion stores (spec 010); the other reasons (access_ended, draft_changed,
    # draft_published, connection_changed, start_date_passed) are computed at every
    # read, and so are the deletion's two for a request it didn't store them on
    cancel_reason: Mapped[str | None] = mapped_column(String(32))
    # APPROVAL_REQUEST_MINUTES after creation
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # The last approve attempt that failed (EUDIPLO), while waiting
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Its error_id, shown on the page
    error_id: Mapped[str | None] = mapped_column(String(36))
    # When it left waiting
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[CreatedAt]
    updated_at: Mapped[UpdatedAt]
