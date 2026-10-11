from datetime import datetime, timezone
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar('T')

# Pull mode without a webhook address, webhook mode with one (FR-014)
FormConnectionMode = Literal['pull', 'webhook']


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
