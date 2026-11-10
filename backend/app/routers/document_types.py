from fastapi import APIRouter, Depends

from ..catalog import DOCUMENT_TYPES, label_of
from ..schemas import ApiResponse, DocumentType
from ..services.auth import get_current_principal
from ..services.form_connections import document_field_view

router = APIRouter(
    prefix='/api/document-types',
    tags=['document-types'],
    dependencies=[Depends(get_current_principal)],
)


@router.get('')
def list_document_types() -> ApiResponse[list[DocumentType]]:
    """List the catalog's document types and their fields, in catalog order (FR-002).

    Each field comes with its kind of value, the key of its value set, whether it
    is a date of birth, and its parts (spec 002, FR-003). The labels are in the
    request's language; everything else is the same in both (spec 009, R6).
    """
    return ApiResponse(
        data=[
            DocumentType(
                key=document_type.key,
                label=label_of(document_type),
                fields=[document_field_view(field) for field in document_type.fields],
            )
            for document_type in DOCUMENT_TYPES
        ]
    )
