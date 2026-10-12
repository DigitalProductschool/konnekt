from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, JsonValue

T = TypeVar('T')

# Pull mode without a webhook address, webhook mode with one (FR-014)
FormConnectionMode = Literal['pull', 'webhook']

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


class DocumentField(BaseModel):
    """A field a document type offers."""

    key: str
    label: str


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


class FormConnectionSummary(BaseModel):
    """A form connection as the overview lists it."""

    id: str
    name: str
    servicebw_form: str
    is_active: bool
    mode: FormConnectionMode
    updated_at: str


class FormConnection(BaseModel):
    """A form connection with its current documents and its connection URLs.

    `pull_url` contains the placeholder `{reference}` literally.
    """

    id: str
    name: str
    servicebw_form: str
    is_active: bool
    mode: FormConnectionMode
    webhook_url: str | None
    documents: list[RequestedDocumentView]
    trigger_url: str
    pull_url: str
    created_at: str
    updated_at: str


class FormConnectionCreate(BaseModel):
    """A new form connection. Without a webhook address it uses pull mode."""

    name: str
    servicebw_form: str
    documents: list[RequestedDocument]
    webhook_url: str | None = None


class FormConnectionUpdate(BaseModel):
    """Changes to a form connection.

    An absent field stays unchanged, and `webhook_url: null` removes the address:
    `model_fields_set` tells the two apart.
    """

    name: str | None = None
    servicebw_form: str | None = None
    documents: list[RequestedDocument] | None = None
    webhook_url: str | None = None


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


class PullResponse(BaseModel):
    """A request's status and, while they can be handed out, its documents.

    `documents` is null until the documents are delivered in pull mode, after the
    repeat window, and in webhook mode.
    """

    reference: str
    status: RequestStatus
    expires_at: str
    documents: list[DeliveredDocument] | None
