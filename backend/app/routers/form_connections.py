import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..language import Text
from ..schemas import (
    ActivateRequest,
    ActivityPage,
    ApiResponse,
    Deletion,
    DeletionCreate,
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
    RestoredConnections,
    StartDateUpdate,
)
from ..services import activity, agent_access, deletions, drafts, form_connections
from ..services.activity import actor_of
from ..services.auth import (
    Principal,
    get_current_principal,
    require_browser_session,
    require_json,
    require_level,
)
from ..services.eudiplo import EudiploError, http_error_for

# The answer when EUDIPLO can't store a revision's request configuration. The
# `ApiResponse.message` values below stay English (spec 009, R6)
CONFIG_FAILED = Text(
    en=(
        'The wallet service could not create the request configuration, so nothing '
        'was saved. Try again in a moment.'
    ),
    de=(
        'Der Wallet-Dienst konnte die Anfragekonfiguration nicht erstellen, daher '
        'wurde nichts gespeichert. Versuchen Sie es in einem Moment erneut.'
    ),
)

# A team member's browser session or an agent's bearer token; every GET is open to
# every access level. Agents change drafts from the level 'drafts' on, and nothing
# else here: publishing, deleting a draft, a published connection's content and its
# status are done in Konnekt (spec 007, contracts/management-api.md
# "Who may call what"). Every endpoint that changes a connection passes the service
# who acts, built from the caller's principal (`actor_of()`, spec 010, research R4)
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
    `scheduled`, `live` or `deactivated`, the `state` the entries answer (spec
    010, FR-062). At most `limit` (1 to 25) entries, most recently updated first;
    pass `next_cursor` as `cursor` for the next page. An unknown `status`, a bad
    `cursor` or `limit` answers 400. Declared before `/{form_connection_id}`,
    which would otherwise take the path.
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
    data: FormConnectionCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Create a form connection with its first revision, configuration and rules.

    The configuration is EUDIPLO's. Without `rules`, the form connection gets a
    main branch "Standard" without rules. Everything is saved together or not at
    all (FR-028). With `start_date`, a day in Germany after today, it is created
    scheduled: its URLs exist at once and answer as a deactivated connection's
    until that day (spec 010, FR-001 to FR-004); a day that isn't after today
    answers 400 `invalid_start_date`, also when it ends while EUDIPLO answers.
    """
    actor = actor_of(db, principal)
    try:
        form_connection = form_connections.create_form_connection(db, data, actor=actor)
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection created')


@router.post(
    '/drafts',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_level('drafts')), Depends(require_json)],
)
def create_draft(
    data: DraftCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnectionDraft]:
    """Store a new draft, version 1, without calling EUDIPLO (spec 005).

    Refuses a broken structure with 400; an incomplete draft is accepted. An
    agent's new draft counts towards its draft limit, 429 beyond it (spec 007,
    FR-020); a browser session isn't limited.
    """
    actor = actor_of(db, principal)
    if principal.authorization is not None:
        agent_access.count_draft_creation(db, principal.authorization.id)
    return ApiResponse(
        data=drafts.create_draft(db, data, actor=actor), message='Draft saved'
    )


@router.post(
    '/deletions',
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def delete_connections(
    data: DeletionCreate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[Deletion]:
    """Delete several connections, drafts and published ones, as one deletion.

    The overview's bulk deletion (spec 010, research R10, FR-041 to FR-044): each
    item names a connection and the state the dialog showed. All are deleted in
    one transaction, without calling EUDIPLO, or none: a connection that no
    longer exists, is deleted or is in another state answers 409
    `selection_changed` with the ids of all such items in `changed_ids`, and
    nothing changes. 1 to 500 items with distinct ids, else 400. Answers the
    deletion, which the deleting team member can restore whole until
    `restorable_until`. Agents can't delete several connections (FR-068): 403
    `browser_only`. Declared before `/{form_connection_id}`, so that no route of
    a connection takes the path (R15 V4).
    """
    deletion = deletions.delete_connections(
        db,
        data.items,
        account_id=principal.user.id,
        actor=actor_of(db, principal),
    )
    return ApiResponse(data=deletion, message='Form connections deleted')


@router.post(
    '/deletions/{deletion_id}/restore',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def restore_deletion(
    deletion_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[RestoredConnections]:
    """Take back a deletion: every connection it deleted comes back as it was.

    "Undo" of the toast after a deletion (spec 010, research R5, FR-034 to
    FR-036): all the deletion's connections or none, for the team member who
    deleted, until the deletion's `restorable_until`. An unknown deletion, one
    restored already, one past its restore time or another account's answers 409
    `not_restorable`, and nothing changes. Agents can't restore (FR-068): 403
    `browser_only`. Declared before `/{form_connection_id}`, so that no route of
    a connection takes the path (R15 V4).
    """
    restored = deletions.restore_deletion(
        db,
        deletion_id,
        account_id=principal.user.id,
        actor=actor_of(db, principal),
    )
    return ApiResponse(
        data=RestoredConnections(items=restored), message='Deletion restored'
    )


@router.get('/{form_connection_id}')
def get_form_connection(
    form_connection_id: str, db: Session = Depends(get_db)
) -> ApiResponse[FormConnectionOrDraft]:
    """Get a form connection with its documents and connection URLs.

    A draft answers its content and version, without URLs (`status: 'draft'`).
    Unknown and deleted form connections answer 404.
    """
    return ApiResponse(data=drafts.get_form_connection_or_draft(db, form_connection_id))


@router.get('/{form_connection_id}/activity')
def list_activity(
    form_connection_id: str,
    cursor: str | None = None,
    db: Session = Depends(get_db),
) -> ApiResponse[ActivityPage]:
    """List a connection's activity, newest first, 50 entries at a time (FR-023).

    Open to every principal, as every team member reads every connection's
    activity (FR-031); nothing writes, changes or removes an entry. Pass
    `next_cursor` as `cursor` for the next page; a bad `cursor` answers 400, and
    an unknown or deleted connection, draft or published, 404.
    """
    return ApiResponse(data=activity.list_activity(db, form_connection_id, cursor))


@router.put(
    '/{form_connection_id}/draft',
    dependencies=[Depends(require_level('drafts')), Depends(require_json)],
)
def save_draft(
    form_connection_id: str,
    data: DraftUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnectionDraft]:
    """Replace a draft's content and add 1 to its version, without calling EUDIPLO.

    Refuses a broken structure with 400, an unknown or deleted draft with 404, a
    published connection with 409 `draft_published` (also with `replace`), and an
    outdated `version` with 409 `draft_changed` unless `replace`.
    """
    actor = actor_of(db, principal)
    return ApiResponse(
        data=drafts.save_draft(db, form_connection_id, data, actor=actor),
        message='Draft saved',
    )


@router.post(
    '/{form_connection_id}/publish',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def publish_draft(
    form_connection_id: str,
    data: DraftPublish,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Publish a draft with its first revision, configuration, rules and URLs.

    Refuses with the 400 of creating a form connection, 404 for an unknown or
    deleted draft, 409 `draft_published` for a published connection (also with
    `replace`), and 409 `draft_changed` for an outdated `version` unless
    `replace`. If EUDIPLO can't create the configuration, it answers 502 or 503
    and the draft stays a draft. With `start_date` it is published scheduled, as
    `POST /api/form-connections` creates one; 400 `invalid_start_date` leaves the
    draft a draft (spec 010, FR-001 to FR-004).
    """
    actor = actor_of(db, principal)
    try:
        form_connection = drafts.publish_draft(
            db, form_connection_id, data, actor=actor
        )
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection published')


@router.delete(
    '/{form_connection_id}/draft',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def delete_draft(
    form_connection_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[Deletion]:
    """Delete a draft, without calling EUDIPLO; its URLs answer 404.

    It is gone at once for every read, and its waiting approval requests are
    cancelled. Answers the deletion, a fresh id that the deleting team member
    can restore until `restorable_until` (spec 010, research R5). Refuses an
    unknown or deleted draft with 404 and a published connection with 409
    `draft_published`.
    """
    deleted_by_id = principal.user.id
    deletion = drafts.delete_draft(
        db,
        form_connection_id,
        actor=actor_of(db, principal),
        deletion_id=str(uuid.uuid4()),
        deleted_by_id=deleted_by_id,
    )
    return ApiResponse(data=deletion, message='Draft deleted')


@router.put(
    '/{form_connection_id}',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def update_form_connection(
    form_connection_id: str,
    data: FormConnectionUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Change a form connection's name, description, documents or rules.

    Changed documents become a new revision with its own EUDIPLO configuration, and
    changed rules a new rule set, saved together or not at all; requests in progress
    keep theirs. The connection URLs never change. Rules saved over the newer rules
    of another team member answer 409 `rules_changed`, unless they replace them.
    """
    actor = actor_of(db, principal)
    try:
        form_connection = form_connections.update_form_connection(
            db, form_connection_id, data, actor=actor
        )
    except EudiploError as error:
        raise http_error_for(error, CONFIG_FAILED) from None
    return ApiResponse(data=form_connection, message='Form connection updated')


@router.post(
    '/{form_connection_id}/deactivate',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def deactivate_form_connection(
    form_connection_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Deactivate a form connection and cancel its open requests.

    Its URLs answer 409 "unavailable" until it is activated again.
    """
    return ApiResponse(
        data=form_connections.deactivate_form_connection(
            db, form_connection_id, actor=actor_of(db, principal)
        ),
        message='Form connection deactivated',
    )


@router.post(
    '/{form_connection_id}/activate',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def activate_form_connection(
    form_connection_id: str,
    data: ActivateRequest | None = None,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Activate a deactivated form connection again, now or on a date.

    An empty object, or no body, activates it at once: its URLs work again
    unchanged. With `start_date`, a day in Germany after today, it is scheduled
    for that day instead, and its URLs keep answering 409 "unavailable" until
    then (spec 010, FR-011); a day that isn't after today answers 400
    `invalid_start_date`. A
    live connection stays as it is, and a scheduled one answers 409
    `status_changed`: its start date is changed instead.
    """
    return ApiResponse(
        data=form_connections.activate_form_connection(
            db,
            form_connection_id,
            actor=actor_of(db, principal),
            start_date=None if data is None else data.start_date,
        ),
        message='Form connection activated',
    )


@router.put(
    '/{form_connection_id}/start-date',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def set_start_date(
    form_connection_id: str,
    data: StartDateUpdate,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[FormConnection]:
    """Change when a scheduled or live connection is active (spec 010, FR-008).

    A scheduled connection's start moves to `start_date`, or with null it becomes
    active now. A live connection is scheduled for `start_date`, and its open
    requests are cancelled (FR-009); null changes nothing. A day that isn't
    after today in Germany answers 400 `invalid_start_date`, a deactivated
    connection 409 `status_changed`, and a draft 409 `not_published`. Agents ask
    for it through an approval request.
    """
    return ApiResponse(
        data=form_connections.set_start_date(
            db, form_connection_id, data.start_date, actor=actor_of(db, principal)
        ),
        message='Start date saved',
    )


@router.delete(
    '/{form_connection_id}',
    dependencies=[Depends(require_browser_session), Depends(require_json)],
)
def delete_form_connection(
    form_connection_id: str,
    db: Session = Depends(get_db),
    principal: Principal = Depends(get_current_principal),
) -> ApiResponse[Deletion]:
    """Delete a form connection and cancel its open requests.

    Its URLs answer 409 "unavailable" from now on, for good once the restore
    time has passed, and its waiting approval requests are cancelled. Answers the
    deletion, a fresh id that the deleting team member can restore until
    `restorable_until` (spec 010, research R5). A draft answers 409
    `not_published`, an unknown or deleted connection 404.
    """
    deleted_by_id = principal.user.id
    deletion = form_connections.delete_form_connection(
        db,
        form_connection_id,
        actor=actor_of(db, principal),
        deletion_id=str(uuid.uuid4()),
        deleted_by_id=deleted_by_id,
    )
    return ApiResponse(data=deletion, message='Form connection deleted')
