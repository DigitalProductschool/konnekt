from fastapi import APIRouter, Depends

from ..catalog import DOCUMENT_TYPES
from ..schemas import ApiResponse, DocumentField, DocumentType
from ..services.auth import get_current_user

router = APIRouter(
    prefix='/api/document-types',
    tags=['document-types'],
    dependencies=[Depends(get_current_user)],
)


@router.get('')
def list_document_types() -> ApiResponse[list[DocumentType]]:
    """List the catalog's document types and their fields, in catalog order (FR-002).

    Each field comes with its kind of value, the key of its value set, whether it
    is a date of birth, and its parts (spec 002, FR-003).
    """
    return ApiResponse(
        data=[
            DocumentType(
                key=document_type.key,
                label=document_type.label,
                fields=[
                    DocumentField.model_validate(field)
                    for field in document_type.fields
                ],
            )
            for document_type in DOCUMENT_TYPES
        ]
    )
