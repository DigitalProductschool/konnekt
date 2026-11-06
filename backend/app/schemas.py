from datetime import datetime, timezone
from typing import Annotated, Any, Generic, Literal, TypeVar

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    TypeAdapter,
)

from .catalog import FieldKind, PartKind

T = TypeVar('T')

# The statuses of a document request (FR-011, research R5)
RequestStatus = Literal[
    'pending',
    'completed',
    'declined',
    'verification_failed',
    'expired',
    'unavailable',
]


class ApiResponse(BaseModel, Generic[T]):
    data: T
    message: str | None = None


class ApiErrorResponse(BaseModel):
    error: str
    message: str
    # Only on 5xx answers: the id under which the backend logged what went wrong
    error_id: str | None = None


def to_iso_utc(value: datetime) -> str:
    """Convert datetime to ISO 8601 format with UTC timezone."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


class UserView(BaseModel):
    """The signed-in DO.IT team member."""

    username: str

    model_config = ConfigDict(from_attributes=True)


class LoginRequest(BaseModel):
    """Credentials for signing in."""

    username: str
    password: str


# Document types and form connections (contracts/management-api.md). The request
# schemas accept empty lists and texts: the service layer checks them, so that its
# messages can name the problem (data-model.md, "Validation (FR-003)").


class FieldPart(BaseModel):
    """A part of a field that rules check on its own (spec 002, research R6)."""

    key: str
    label: str
    kind: PartKind
    # Enum parts: the key of their value set
    option_set: str | None
    # One part per licence class, such as "Licence class B – Issue date"
    per_licence_class: bool
    # Whether a document can give several values for it, such as the classes held
    multiple_values: bool

    model_config = ConfigDict(from_attributes=True)


class DocumentField(BaseModel):
    """A field a document type offers, with its kind of value (spec 002, FR-003)."""

    key: str
    label: str
    kind: FieldKind
    # Enum fields: the key of their value set
    option_set: str | None
    # A date worded as an age: "is at least 21 years old"
    date_of_birth: bool
    # Fields of kind 'parts' only
    parts: list[FieldPart] | None
    # Whether a document can give several values for it, such as the nationalities
    multiple_values: bool

    model_config = ConfigDict(from_attributes=True)


class DocumentType(BaseModel):
    """A catalog entry: a kind of document and its fields, in catalog order."""

    key: str
    label: str
    fields: list[DocumentField]


class RequestedDocument(BaseModel):
    """A document to request, with the keys of its selected fields (input)."""

    document_type: str
    fields: list[str]


class RequestedDocumentView(BaseModel):
    """A requested document with its labels (output)."""

    document_type: str
    label: str
    fields: list[DocumentField]


class Option(BaseModel):
    """A value of an enum field or part: a country code, a sex code, a class..."""

    value: str | int
    label: str
    description: str | None

    model_config = ConfigDict(from_attributes=True)


class OptionSet(BaseModel):
    """The values an enum field or part can have (GET /api/option-sets)."""

    key: str
    options: list[Option]


# Rules and branches (specs/002-connection-rules/contracts/management-api.md; the
# keys and their rules are in data-model.md, "The snapshot"). The request schemas
# accept incomplete rules, such as an empty message or no condition yet: the service
# layer checks them, so that its message can name the problem, the rule and its
# branch. They keep each value's JSON type, though: a string where a number belongs,
# or a boolean, is refused as an invalid payload, since the editor never sends one.

# How a based branch's item differs from the main branch's; null: it follows it
Mark = Literal['changed', 'removed', 'added']
# How a level's rules and groups combine
Combinator = Literal['and', 'or']


class RuleTarget(BaseModel):
    """The field a rule checks, or one part of it (FR-002, FR-003)."""

    document_type: str
    field: str
    # Fields made of parts: the part, such as 'issue_date'
    part: str | None = None
    # The class code for a licence class's issue and expiry dates
    licence_class: str | None = None


def _is_none(value: object) -> bool:
    return value is None


def _omitted_if_none() -> Any:
    """An optional key that the output leaves out while it has no value."""
    return Field(default=None, exclude_if=_is_none)


class Condition(BaseModel):
    """What a rule checks: an operator of the field's kind and its values (FR-003).

    Which keys an operator uses is in data-model.md, "Conditions". Keys without a
    value are left out of the output.
    """

    operator: str
    # Number and text conditions
    value: StrictFloat | StrictStr | None = _omitted_if_none()
    # Text conditions: whether letter case counts; it doesn't by default (FR-013)
    match_case: StrictBool | None = _omitted_if_none()
    # Enum conditions
    values: list[StrictStr | StrictInt] | None = _omitted_if_none()
    # Date conditions: YYYY-MM-DD
    date: str | None = _omitted_if_none()
    # A whole number of at least 1, which the service checks so that its message
    # can name the rule
    years: StrictInt | StrictFloat | None = _omitted_if_none()
    amount: StrictInt | StrictFloat | None = _omitted_if_none()
    unit: Literal['years', 'months'] | None = _omitted_if_none()


class RuleItem(BaseModel):
    """A rule: one condition on one field, and the citizen's error message."""

    type: Literal['rule']
    # rule-{n} (research R5)
    id: str
    name: str
    mark: Mark | None = None
    target: RuleTarget | None = None
    condition: Condition | None = None
    message: str


class GroupItem(BaseModel):
    """A group at the top level, or a sub-group inside a group (FR-007, FR-008)."""

    type: Literal['group']
    # group-{n}, shared by groups and sub-groups (research R5)
    id: str
    name: str
    mark: Mark | None = None
    operator: Combinator
    # The group's own error message, if any (FR-011)
    message: str | None = None
    items: list['RuleTreeItem']


RuleTreeItem = Annotated[RuleItem | GroupItem, Field(discriminator='type')]
GroupItem.model_rebuild()


class BranchInput(BaseModel):
    """A branch ("variant" in the UI) with its rules, as the editor sends it."""

    # Null or a client UUID for a branch added in this save; a stored draft's
    # branches always carry one (spec 007, research R10)
    id: str | None
    name: str
    # Shown in the UI only, never delivered to serviceBW (FR-020)
    description: str | None = None
    # main for the main branch only; fixed when the branch is added (FR-019)
    origin: Literal['main', 'based', 'empty']
    # The top level's combination
    operator: Combinator
    # A based branch's own top-level AND/OR, which no longer follows the main branch
    operator_mark: Literal['changed'] | None = None
    # The top level, in display order
    items: list[RuleTreeItem]


class NumberingBase(BaseModel):
    """The identifier counters the editor numbered new rules and groups from."""

    rule: int
    group: int


class RulesInput(BaseModel):
    """A form connection's branches and rules, saved together with it (FR-028)."""

    # Main branch first
    branches: list[BranchInput]
    numbering_base: NumberingBase
    # The rule set version the editor loaded; null on create
    base_version: int | None = None
    # Save over rules another team member saved meanwhile (research R9)
    replace: bool = False


class SnapshotBranch(BranchInput):
    """A saved branch, as a rule set stores it."""

    id: str


class Branch(SnapshotBranch):
    """A saved branch with its pull URL (output).

    `pull_url` contains the placeholder `{reference}` literally.
    """

    is_main: bool
    pull_url: str


# form_connection_rule_sets.branches: every branch that isn't deleted, main branch
# first (research R2)
RULE_SET_SNAPSHOT = TypeAdapter(list[SnapshotBranch])

# A form connection is a draft until it is published (spec 005, research R1)
ConnectionStatus = Literal['draft', 'published']
# The editor's steps; a draft remembers the one it was saved in (spec 005, FR-002)
EditorStep = Literal['connection', 'documents', 'rules', 'test']


class DraftContent(BaseModel):
    """A draft's content, as form_connections.draft stores it (spec 005)."""

    # Catalog order; may be empty, and a document may have no fields
    documents: list[RequestedDocument]
    # Main branch first; every branch carries an id, which its branch row gets when
    # the draft is published (spec 007, research R10). A request may send null (the
    # server assigns one) or a client UUID
    branches: list[BranchInput]
    # The step the draft was saved in, where "Continue" opens it
    step: EditorStep


# form_connections.draft (spec 005, data-model.md section 2). The name and the
# description live in their columns. Personas, findings, the open tab and the
# rule editor's position are never stored
DRAFT_CONTENT = TypeAdapter(DraftContent)


class FormConnectionSummary(BaseModel):
    """A form connection as the overview lists it, draft or published."""

    id: str
    name: str
    # '' possible for a draft
    description: str
    # true for a draft; means nothing until it is published
    is_active: bool
    # Whether it is a draft or a published connection (spec 005)
    status: ConnectionStatus
    # For a draft: its last save (FR-007)
    updated_at: str


class FormConnectionPage(BaseModel):
    """A page of the search's results (spec 007, research R9)."""

    items: list[FormConnectionSummary]
    # Null on the last page
    next_cursor: str | None


class FormConnection(BaseModel):
    """A form connection with its current documents, rules and connection URLs.

    `pull_url` contains the placeholder `{reference}` literally. It is the main
    branch's, as in spec 001.
    """

    # Always 'published': tells it apart from a FormConnectionDraft (spec 005)
    status: Literal['published'] = 'published'
    id: str
    name: str
    description: str
    is_active: bool
    documents: list[RequestedDocumentView]
    trigger_url: str
    pull_url: str
    # The current rule set's branches: main branch first, in tab order
    branches: list[Branch]
    # The current rule set, which a save of rules names as its base_version
    rule_set_version: int
    # The next free identifier numbers (research R5)
    next_rule_number: int
    next_group_number: int
    created_at: str
    updated_at: str


class FormConnectionCreate(BaseModel):
    """A new form connection. Without rules, it gets a main branch "Standard"."""

    name: str
    # Optional, '' when there is none (spec 006, research R3)
    description: str = ''
    documents: list[RequestedDocument]
    rules: RulesInput | None = None


class FormConnectionUpdate(BaseModel):
    """Changes to a form connection. An absent field stays unchanged.

    The description: absent leaves it unchanged; null or '' clears it.
    """

    name: str | None = None
    description: str | None = None
    documents: list[RequestedDocument] | None = None
    rules: RulesInput | None = None


class FormConnectionDraft(BaseModel):
    """A draft as the API returns it (spec 005).

    No URLs, no rule set version and no is_active: a draft isn't live (FR-006,
    FR-007).
    """

    # Always 'draft': tells it apart from a FormConnection
    status: Literal['draft'] = 'draft'
    id: str
    name: str
    # '' possible
    description: str
    # May be empty, and a document's fields may be empty. A type or field the
    # catalog dropped keeps its key as its label
    documents: list[RequestedDocumentView]
    # Main branch first; a stored draft's branches always carry an id (spec 007,
    # research R10)
    branches: list[BranchInput]
    # The next free identifier numbers, the draft's numbering (research R4)
    next_rule_number: int
    next_group_number: int
    # Where "Continue" opens it (FR-008)
    step: EditorStep
    # The draft version, sent back on save and publish (FR-022, research R6)
    version: int
    created_at: str
    # The last save (FR-007)
    updated_at: str


# What GET /api/form-connections/{id} answers (spec 005, research R2)
FormConnectionOrDraft = Annotated[
    FormConnection | FormConnectionDraft, Field(discriminator='status')
]


class DraftRules(BaseModel):
    """A draft's branches and rules, as the editor sends them (spec 005)."""

    # Main branch first; a branch's id may be null (the server assigns one) or a
    # client UUID. A stored draft's branches always carry an id (spec 007, R10)
    branches: list[BranchInput]
    # The counters the editor started numbering from (research R4)
    numbering_base: NumberingBase


class DraftCreate(BaseModel):
    """A new draft (spec 005). The service layer checks its structure (FR-003)."""

    name: str
    # Optional, '' when there is none (spec 006, research R3)
    description: str = ''
    documents: list[RequestedDocument]
    rules: DraftRules
    # The step the draft is saved in
    step: EditorStep


class DraftUpdate(DraftCreate):
    """A save of a draft: its whole content, replacing the stored one (spec 005)."""

    # The draft version the editor loaded (FR-022, research R6)
    version: int
    # Save over another team member's save
    replace: bool = False


class DraftPublish(FormConnectionCreate):
    """Publishing a draft: the body of POST /api/form-connections plus its version.

    `rules.base_version` and `rules.replace` are ignored: a draft has no rule set
    yet (spec 005, research R5).
    """

    # The draft version the editor loaded (FR-022, research R6)
    version: int
    # Publish over another team member's save
    replace: bool = False


# The trigger URL and the pull URL, which serviceBW calls
# (contracts/integration-api.md). No frontend code consumes them.


class TriggerResponse(BaseModel):
    """A started document request: how the citizen opens it, and its reference."""

    # Unguessable, and the key to the request's documents: never logged
    reference: str
    status: RequestStatus
    # Opens the wallet on the phone that holds it (same-device flow)
    wallet_link: str
    # The link for a wallet on another device, which the QR code encodes
    qr_code_link: str
    # qr_code_link as a PNG data URI
    qr_code: str
    expires_at: str


class DeliveredField(BaseModel):
    """A configured field of a shared document, with its value.

    The value keeps its JSON type; binary values are base64 strings, and dates ISO
    8601 strings.
    """

    key: str
    label: str
    value: JsonValue


class DeliveredDocument(BaseModel):
    """A shared document, reduced to the configured fields in configuration order."""

    document_type: str
    label: str
    fields: list[DeliveredField]


# The evaluation of a branch's rules, delivered with the documents (spec 002,
# contracts/integration-api.md "evaluation", research R8). It never holds a value
# of the documents (FR-017).

# not_checked: the value was missing or couldn't be read for the condition (FR-014)
Outcome = Literal['met', 'not_met', 'not_checked']


class EvaluationBranch(BaseModel):
    """The branch whose pull URL was called, named as at the trigger."""

    id: str
    name: str


class EvaluationResult(BaseModel):
    """The outcome of one rule or group that the branch evaluates (FR-010)."""

    # rule-{n} or group-{n}: never changes, never reused (research R5)
    id: str
    type: Literal['rule', 'group']
    name: str
    # The identifier of the containing group or sub-group; null at the top level
    group: str | None
    # Groups are met or not met, never not_checked
    outcome: Outcome


class EvaluationMessage(BaseModel):
    """An error message for the citizen, with the rule or group it belongs to."""

    id: str
    message: str


class Evaluation(BaseModel):
    """Whether a branch's rules are met, each result, and the messages (FR-009 to
    FR-011)."""

    branch: EvaluationBranch
    met: bool
    # Every evaluated rule and group in the rules step's order: the top level
    # first, each group's members after it
    results: list[EvaluationResult]
    # Empty when met
    messages: list[EvaluationMessage]


class PullResponse(BaseModel):
    """A request's status and, while they can be handed out, its documents.

    `documents` is null until the documents are delivered, and after the repeat
    window. `evaluation` is the evaluation of the called branch's rules on those
    documents: null whenever `documents` is null, present whenever they are
    (FR-017).
    """

    reference: str
    status: RequestStatus
    expires_at: str
    documents: list[DeliveredDocument] | None
    evaluation: Evaluation | None


# Agent access (specs/007-agent-mcp-server/contracts/management-api.md "Schemas",
# research R6, R7)

# What an agent connection or a personal access token may do (data-model.md 3.1)
AccessLevel = Literal['read', 'drafts', 'manage']
# An agent connection (OAuth) or a personal access token
AgentAccessKind = Literal['oauth', 'token']


class AccessLevelInfo(BaseModel):
    """An access level with its UI name and what it allows."""

    level: AccessLevel
    name: str
    allows: str


class AgentAccessItem(BaseModel):
    """An agent connection or personal access token on the user page."""

    id: str
    kind: AgentAccessKind
    # oauth only
    client_name: str | None
    # token only
    name: str | None
    access_level: AccessLevel
    created_at: str
    # token only
    expires_at: str | None
    last_used_at: str | None


class AgentAccessUpdate(BaseModel):
    """A new access level; applies from the agent's next call."""

    access_level: AccessLevel


class TokenCreate(BaseModel):
    """A new personal access token. The service layer checks the name and days."""

    name: str
    access_level: AccessLevel
    # 1 to AGENT_TOKEN_MAX_DAYS
    expires_in_days: int


class TokenCreated(BaseModel):
    """A created personal access token, with its secret, shown once."""

    item: AgentAccessItem
    token: str


class AgentMe(BaseModel):
    """The bearer principal: whose access it is and at which level."""

    username: str
    # oauth only
    client_name: str | None
    kind: AgentAccessKind
    access_level: AccessLevel
    levels: list[AccessLevelInfo]


# Approval requests (research R12, data-model.md section 5)

ApprovalAction = Literal[
    'publish', 'delete_draft', 'deactivate', 'reactivate', 'delete'
]
ApprovalStatus = Literal[
    'waiting', 'done', 'declined', 'expired', 'replaced', 'cancelled'
]
# The status, or failed while waiting after an approve attempt failed (FR-027)
ApprovalOutcome = ApprovalStatus | Literal['failed']


class ApprovalCreate(BaseModel):
    """An agent's request that a team member approve an action."""

    form_connection_id: str
    action: ApprovalAction


class ApprovalRequest(BaseModel):
    """An approval request, with its status as the row reads now (FR-024)."""

    id: str
    action: ApprovalAction
    form_connection_id: str
    connection_name: str
    status: ApprovalStatus
    outcome: ApprovalOutcome
    # revoked, access_changed, draft_changed, draft_published, draft_deleted,
    # connection_changed or connection_deleted
    cancel_reason: str | None
    # The approval page's link
    link: str
    expires_at: str
    created_at: str
    decided_at: str | None
    failed_at: str | None
    error_id: str | None
    # Whether the request is the signed-in account's
    mine: bool


class VariantUrl(BaseModel):
    """A variant's pull URL; contains the placeholder `{reference}` literally."""

    id: str
    name: str
    pull_url: str


class ConnectionUrls(BaseModel):
    """The URLs to copy into serviceBW."""

    trigger_url: str
    variants: list[VariantUrl]


class ApprovalPreview(BaseModel):
    """An approval request with what it acts on, for the approval page."""

    request: ApprovalRequest
    # publish and delete_draft, while the draft exists
    draft: FormConnectionDraft | None
    # The other actions, while the connection exists
    connection: FormConnection | None
    # After a done publish or reactivate, and for the status actions
    urls: ConnectionUrls | None


# OAuth (specs/007-agent-mcp-server/contracts/oauth.md, research R4). The register
# and token answers are RFC bodies, not the ApiResponse envelope


class OauthClientView(BaseModel):
    """An OAuth client, as the consent page shows it."""

    client_id: str
    client_name: str
    # cimd or dcr
    kind: Literal['cimd', 'dcr']
    # The signed-in account's existing agent connection's level for this client
    current_access_level: AccessLevel | None = None

    model_config = ConfigDict(from_attributes=True)


class AuthorizeRequest(BaseModel):
    """The consent page's decision. The service layer checks every parameter."""

    client_id: str
    redirect_uri: str
    code_challenge: str
    code_challenge_method: str
    state: str
    scope: str = ''
    resource: str
    decision: Literal['allow', 'deny']
    access_level: AccessLevel | None = None


class AuthorizeResponse(BaseModel):
    """Where the consent page sends the browser: the client's redirect URI."""

    redirect_to: str


class RegisterRequest(BaseModel):
    """A dynamic client registration (RFC 7591)."""

    client_name: str
    redirect_uris: list[str]
    token_endpoint_auth_method: str = 'none'
    grant_types: list[str] | None = None
    response_types: list[str] | None = None


class RegisterResponse(BaseModel):
    """A registered client (RFC 7591). No secret."""

    client_id: str
    client_name: str
    redirect_uris: list[str]
    token_endpoint_auth_method: Literal['none'] = 'none'
    grant_types: list[str] = ['authorization_code', 'refresh_token']
    response_types: list[str] = ['code']


class TokenResponse(BaseModel):
    """The token endpoint's answer (RFC 6749)."""

    access_token: str
    token_type: Literal['Bearer'] = 'Bearer'
    # Seconds
    expires_in: int
    refresh_token: str
    # The granted scopes, space-separated
    scope: str
