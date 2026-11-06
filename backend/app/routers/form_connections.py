from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..schemas import (
    ApiResponse,
    DraftCreate,
    DraftPublish,
    DraftUpdate,
    FormConnection,
    FormConnectionCreate,
    FormConnectionDraft,
    FormConnectionOrDraft,
    FormConnectionPage,
    FormConnectionSummary,
    FormConnectionUpdate,
)
from ..services import drafts, form_connections
from ..services.auth import (
    get_current_principal,
    require_browser_session,
    require_json,
    require_level,
)
from ..services.eudiplo import EudiploError, http_error_for

# The answer when EUDIPLO can't store a revision's request configuration
CONFIG_FAILED = (
    'The wallet service could not create the request configuration, so nothing was '
    'saved. Try again in a moment.'
)

# A team member's browser session or an agent's bearer token; every GET is open to
# every access level. Agents change drafts from the level 'drafts' on, and nothing
# else here: publishing, deleting a draft, a published connection's content and its
# status are done in the Connection Portal (spec 007, contracts/management-api.md
# "Who may call what")
router = APIRouter(
    prefix='/api/form-connections',
    tags=['form-connections'],
    dependencies=[Depends(get_current_principal)],
)


@router.get('')
def list_form_connections(
    db: Session = Depends(get_db),
) -> ApiResponse[list[FormConnectionSummary]]:
    """List the form connections that aren't deleted, most recently updated first."""
    return ApiResponse(data=form_connections.list_form_connections(db))


@router.get('/search')
def search_form_connections(
    q: str | None = None,
    connection_status: form_connections.SearchStatus | None = Query(
        default=None, alias='status'
    ),
    cursor: str | None = None,
    limit: int = Query(
        default=form_connections.SEARCH_PAGE_SIZE,
        ge=1,
        le=form_connections.SEARCH_PAGE_SIZE,
    ),
    db: Session = Depends(get_db),
) -> ApiResponse[FormConnectionPage]:
    """Search the form connections that aren't deleted, a page at a time (FR-007).

    `q` matches the name or the description, ignoring case; `status` is `draft`,
    `live` or `deactivated`. At most `limit` (1 to 25) entries, most recently
    updated first; pass `next_cursor` as `cursor` for the next page. An unknown
    `status`, a bad `cursor` or `limit` answers 400. Declared before
    `/{form_connection_id}`, which would otherwise take the path.
    """
    return ApiResponse(
        data=form_connections.search_form_connections(
            db, q, connection_status, cursor, limit
        )
    )


@router.post(
    '',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def create_form_connection(
    data: FormConnectionCreate, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Create a form connection with its first revision, configuration and rules.

    The configuration is EUDIPLO's. Without `rules`, the form connection gets a
    main branch "Standard" without rules. Everything is saved together or not at
    all (FR-028).
    """
    try:
        form_connection = form_connections.create_form_connection(db, data)
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection created')


@router.post(
    '/drafts',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_level('drafts')), Depends(require_json)],
)
def create_draft(
    data: DraftCreate, db: Session = Depends(get_db)
) -> ApiResponse[FormConnectionDraft]:
    """Store a new draft, version 1, without calling EUDIPLO (spec 005).

    Refuses a broken structure with 400; an incomplete draft is accepted.
    """
    return ApiResponse(data=drafts.create_draft(db, data), message='Draft saved')


@router.get('/{form_connection_id}')
def get_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnectionOrDraft]:
    """Get a form connection with its documents and connection URLs.

    A draft answers its content and version, without URLs (`status: 'draft'`).
    Unknown and deleted form connections answer 404.
    """
    return ApiResponse(data=drafts.get_form_connection_or_draft(db, form_connection_id))


@router.put(
    '/{form_connection_id}/draft',
    dependencies=[Depends(require_level('drafts')), Depends(require_json)],
)
def save_draft(
    form_connection_id: str,
    data: DraftUpdate,
    db: Session = Depends(get_db),
) -> ApiResponse[FormConnectionDraft]:
    """Replace a draft's content and add 1 to its version, without calling EUDIPLO.

    Refuses a broken structure with 400, an unknown or deleted draft with 404, a
    published connection with 409 `draft_published` (also with `replace`), and an
    outdated `version` with 409 `draft_changed` unless `replace`.
    """
    return ApiResponse(
        data=drafts.save_draft(db, form_connection_id, data), message='Draft saved'
    )


@router.post(
    '/{form_connection_id}/publish',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def publish_draft(
    form_connection_id: str,
    data: DraftPublish,
    db: Session = Depends(get_db),
) -> ApiResponse[FormConnection]:
    """Publish a draft with its first revision, configuration, rules and URLs.

    Refuses with the 400 of creating a form connection, 404 for an unknown or
    deleted draft, 409 `draft_published` for a published connection (also with
    `replace`), and 409 `draft_changed` for an outdated `version` unless
    `replace`. If EUDIPLO can't create the configuration, it answers 502 or 503
    and the draft stays a draft.
    """
    try:
        form_connection = drafts.publish_draft(db, form_connection_id, data)
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection published')


@router.delete(
    '/{form_connection_id}/draft',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def delete_draft(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[None]:
    """Remove a draft for good, without calling EUDIPLO; its URLs answer 404.

    Refuses an unknown draft with 404 and a published connection with 409
    `draft_published`.
    """
    drafts.delete_draft(db, form_connection_id)
    return ApiResponse(data=None, message='Draft deleted')


@router.put(
    '/{form_connection_id}',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def update_form_connection(
    form_connection_id: str,
    data: FormConnectionUpdate,
    db: Session = Depends(get_db),
) -> ApiResponse[FormConnection]:
    """Change a form connection's name, description, documents or rules.

    Changed documents become a new revision with its own EUDIPLO configuration, and
    changed rules a new rule set, saved together or not at all; requests in progress
    keep theirs. The connection URLs never change. Rules saved over the newer rules
    of another team member answer 409 `rules_changed`, unless they replace them.
    """
    try:
        form_connection = form_connections.update_form_connection(
            db, form_connection_id, data
        )
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection updated')


@router.post(
    '/{form_connection_id}/deactivate',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
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


@router.post(
    '/{form_connection_id}/activate',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def activate_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnection]:
    """Activate a form connection again; its URLs work again unchanged."""
    return ApiResponse(
        data=form_connections.activate_form_connection(db, form_connection_id),
        message='Form connection activated',
    )


@router.delete(
    '/{form_connection_id}',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def delete_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[None]:
    """Delete a form connection and cancel its open requests.

    Its URLs answer 409 "unavailable" for good.
    """
    form_connections.delete_form_connection(db, form_connection_id)
    return ApiResponse(data=None, message='Form connection deleted')
