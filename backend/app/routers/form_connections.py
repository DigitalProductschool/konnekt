from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import (
    ApiResponse,
    FormConnection,
    FormConnectionCreate,
    FormConnectionSummary,
    FormConnectionUpdate,
)
from ..services import form_connections
from ..services.auth import get_current_user, require_json
from ..services.eudiplo import EudiploError, http_error_for

# The answer when EUDIPLO can't store a revision's request configuration
CONFIG_FAILED = (
    'The wallet service could not create the request configuration, so nothing was '
    'saved. Try again in a moment.'
)

router = APIRouter(
    prefix='/api/form-connections',
    tags=['form-connections'],
    dependencies=[Depends(get_current_user)],
)


@router.get('')
def list_form_connections(
    db: Session = Depends(get_db),
) -> ApiResponse[list[FormConnectionSummary]]:
    """List the form connections that aren't deleted, most recently updated first."""
    return ApiResponse(data=form_connections.list_form_connections(db))


@router.post(
    '', status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_json)]
)
def create_form_connection(
    data: FormConnectionCreate, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Create a form connection, its first revision and its EUDIPLO configuration."""
    try:
        form_connection = form_connections.create_form_connection(db, data)
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection created')


@router.get('/{form_connection_id}')
def get_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Get a form connection with its documents and connection URLs."""
    return ApiResponse(
        data=form_connections.get_form_connection(db, form_connection_id)
    )


@router.put('/{form_connection_id}', dependencies=[Depends(require_json)])
def update_form_connection(
    form_connection_id: str,
    data: FormConnectionUpdate,
    db: Session = Depends(get_db),
) -> ApiResponse[FormConnection]:
    """Change a form connection's name, serviceBW form or documents.

    Changed documents become a new revision with its own EUDIPLO configuration;
    requests in progress keep theirs. The connection URLs never change.
    """
    try:
        form_connection = form_connections.update_form_connection(
            db, form_connection_id, data
        )
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection updated')


@router.post('/{form_connection_id}/deactivate', dependencies=[Depends(require_json)])
def deactivate_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Deactivate a form connection and cancel its open requests.

    Its URLs answer 409 "unavailable" until it is activated again.
    """
    return ApiResponse(
        data=form_connections.deactivate_form_connection(db, form_connection_id),
        message='Form connection deactivated',
    )


@router.post('/{form_connection_id}/activate', dependencies=[Depends(require_json)])
def activate_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Activate a form connection again; its URLs work again unchanged."""
    return ApiResponse(
        data=form_connections.activate_form_connection(db, form_connection_id),
        message='Form connection activated',
    )


@router.delete('/{form_connection_id}', dependencies=[Depends(require_json)])
def delete_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[None]:
    """Delete a form connection and cancel its open requests.

    Its URLs answer 409 "unavailable" for good.
    """
    form_connections.delete_form_connection(db, form_connection_id)
    return ApiResponse(data=None, message='Form connection deleted')
