from fastapi import APIRouter, Depends

from ..catalog import DOCUMENT_TYPES, CatalogDocumentType, label_of
from ..schemas import ApiResponse, DocumentType, FieldGroup
from ..services.auth import get_current_principal
from ..services.form_connections import document_field_view

router = APIRouter(
    prefix='/api/document-types',
    tags=['document-types'],
    dependencies=[Depends(get_current_principal)],
)


def _document_type_view(document_type: CatalogDocumentType) -> DocumentType:
    """Show a catalog entry with its data groups, labels in the request's language.

    A document with groups names them in the panel's order and gives each field its
    group's key; one with 10 fields or fewer has neither (FR-077, FR-078).
    """
    groups = document_type.field_groups()
    return DocumentType(
        key=document_type.key,
        label=label_of(document_type),
        fields=[
            document_field_view(field).model_copy(
                update={'group': field.group if groups else None}
            )
            for field in document_type.fields
        ],
        field_groups=[
            FieldGroup(key=group.key, label=label_of(group)) for group in groups
        ],
    )


@router.get('')
def list_document_types() -> ApiResponse[list[DocumentType]]:
    """List the catalog's document types and their fields, in catalog order (FR-002).

    Each field comes with its kind of value, the key of its value set, whether it
    is a date of birth, its parts (spec 002, FR-003) and its data group; each
    document with its data groups in the panel's order (spec 010, FR-077, FR-078).
    The labels are in the request's language; everything else is the same in both
    (spec 009, R6).
    """
    return ApiResponse(
        data=[_document_type_view(document_type) for document_type in DOCUMENT_TYPES]
    )
