"""Connection drafts: saving, reading, publishing and deleting them (spec 005).

A draft is a form connection that isn't published yet: its row has no
`published_at`, no revision, no rule set, no branch rows and no EUDIPLO
configuration, and its content (documents, branches and the editor's step) lives in
`form_connections.draft`, with a version that every save raises (research R1, R6).
A row is in one of two states, draft or published, and a published connection never
becomes a draft again. Its URLs answer as unavailable while it is a draft.

Saving a draft checks its structure only (`complete=False`, research R3) and numbers
new rules and groups from the row's counters (R4). Publishing runs the checks of
creating a connection and then `form_connections.create_revision()` with a
`DraftGuard`, so there is no second save path (R5). Nothing here calls EUDIPLO
except through publishing.
"""

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from ..models import FormConnection, FormConnectionRevision
from ..schemas import (
    DRAFT_CONTENT,
    DraftContent,
    DraftCreate,
    DraftPublish,
    DraftUpdate,
    FormConnectionDraft,
    RequestedDocument,
    RulesInput,
    to_iso_utc,
)
from ..schemas import FormConnection as FormConnectionView
from . import form_connections, rules
from .form_connections import (
    DRAFT_CHANGED_DETAIL,
    DRAFT_PUBLISHED_DETAIL,
    DraftGuard,
)

logger = logging.getLogger(__name__)


def _draft_published() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=DRAFT_PUBLISHED_DETAIL
    )


def _draft_changed() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT, detail=DRAFT_CHANGED_DETAIL
    )


def draft_view(form_connection: FormConnection) -> FormConnectionDraft:
    """A draft as the API returns it: its content and version, without URLs.

    Answers 409 `draft_published` for a published row.
    """
    if form_connection.draft is None or form_connection.draft_version is None:
        raise _draft_published()
    content = DRAFT_CONTENT.validate_python(form_connection.draft)
    return FormConnectionDraft(
        id=form_connection.id,
        name=form_connection.name,
        servicebw_form=form_connection.servicebw_form,
        documents=form_connections.documents_view(content.documents),
        branches=content.branches,
        next_rule_number=form_connection.next_rule_number,
        next_group_number=form_connection.next_group_number,
        step=content.step,
        version=form_connection.draft_version,
        created_at=to_iso_utc(form_connection.created_at),
        updated_at=to_iso_utc(form_connection.updated_at),
    )


def get_form_connection_or_draft(
    db: Session, form_connection_id: str
) -> FormConnectionView | FormConnectionDraft:
    """A draft's content, or a published connection with its URLs.

    Answers 404 for an unknown or deleted form connection.
    """
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    if form_connection.published_at is None:
        return draft_view(form_connection)
    return form_connections.get_form_connection(db, form_connection_id)


def _check_state(
    form_connection: FormConnection, version: int | None, replace: bool
) -> None:
    """Refuse a row that is no longer the draft the editor loaded (research R6).

    409 `draft_published` if it is published, first and also with `replace`
    (FR-023), then 409 `draft_changed` if `version` isn't the stored version and
    `replace` is false (FR-022). Without a `version` (deleting a draft), only the
    state is checked. `DraftGuard.check()` makes the same comparison when
    publishing.
    """
    if form_connection.published_at is not None:
        raise _draft_published()
    if version is not None and not replace and version != form_connection.draft_version:
        raise _draft_changed()


def _lock_draft(
    db: Session,
    form_connection_id: str,
    version: int | None = None,
    replace: bool = False,
) -> FormConnection:
    """Lock a draft's row and check it with `_check_state`, or answer 404 or 409.

    A refusal releases the lock.
    """
    form_connection = form_connections._lock_form_connection(db, form_connection_id)
    try:
        _check_state(form_connection, version, replace)
    except HTTPException:
        db.rollback()
        raise
    return form_connection


def _clean_draft(
    data: DraftCreate,
) -> tuple[str, str, list[RequestedDocument], rules.RulesSave]:
    """The structural checks of a draft (FR-003, research R3), or a 400.

    Returns the name, the serviceBW form, the documents and the checked rules.
    """
    name = form_connections.clean_name(data.name)
    servicebw_form = form_connections.clean_servicebw_form(
        data.servicebw_form, complete=False
    )
    documents = form_connections.clean_documents(data.documents, complete=False)
    save = rules.clean_rules(
        RulesInput(
            branches=data.rules.branches,
            numbering_base=data.rules.numbering_base,
        ),
        documents,
        main_branch_id=None,
        complete=False,
    )
    return name, servicebw_form, documents, save


def _content(
    documents: list[RequestedDocument],
    numbering: rules.DraftNumbering,
    data: DraftCreate,
) -> dict[str, Any]:
    """The JSON that `form_connections.draft` stores."""
    return DRAFT_CONTENT.dump_python(
        DraftContent(documents=documents, branches=numbering.branches, step=data.step),
        mode='json',
    )


def create_draft(db: Session, data: DraftCreate) -> FormConnectionDraft:
    """Store a new draft, version 1, after the structural checks (FR-001, FR-003).

    Its rules and groups are numbered from (1, 1). No EUDIPLO call, and no
    revision, rule set or branch row (FR-005). Answers 400 when the structure is
    broken.
    """
    name, servicebw_form, documents, save = _clean_draft(data)
    numbering = rules.number_draft(save, (1, 1))
    form_connection = FormConnection(
        id=str(uuid.uuid4()),
        name=name,
        servicebw_form=servicebw_form,
        is_active=True,
        published_at=None,
        current_revision=None,
        current_rule_set=None,
        draft=_content(documents, numbering, data),
        draft_version=1,
        next_rule_number=numbering.next_rule_number,
        next_group_number=numbering.next_group_number,
    )
    db.add(form_connection)
    db.commit()
    logger.info('Draft %s saved', form_connection.id)
    return draft_view(form_connection)


def save_draft(
    db: Session, form_connection_id: str, data: DraftUpdate
) -> FormConnectionDraft:
    """Replace a draft's content, name and serviceBW form, and raise its version.

    1. Read the row: 404 if it's missing, 409 `draft_published` if it's
       published (also with `data.replace`), and 409 `draft_changed` if
       `data.version` is outdated and `data.replace` is false, before the content
       is checked, so that a stale editor meets the conflict (research R6).
    2. Check the structure (FR-003): 400 before anything is written.
    3. Lock the row and repeat step 1, number new identifiers from the row's
       counters (research R4), write the content, raise the counters (never lower
       them) and add 1 to the version, in one commit (FR-002, FR-022).

    A refusal stores nothing. No EUDIPLO call.
    """
    _check_state(
        form_connections.find_form_connection(db, form_connection_id),
        data.version,
        data.replace,
    )
    name, servicebw_form, documents, save = _clean_draft(data)

    form_connection = _lock_draft(db, form_connection_id, data.version, data.replace)
    numbering = rules.number_draft(
        save, (form_connection.next_rule_number, form_connection.next_group_number)
    )
    form_connection.name = name
    form_connection.servicebw_form = servicebw_form
    form_connection.draft = _content(documents, numbering, data)
    form_connection.next_rule_number = max(
        form_connection.next_rule_number, numbering.next_rule_number
    )
    form_connection.next_group_number = max(
        form_connection.next_group_number, numbering.next_group_number
    )
    form_connection.draft_version = (form_connection.draft_version or 0) + 1
    db.commit()
    logger.info('Draft %s saved', form_connection_id)
    return draft_view(form_connection)


def publish_draft(
    db: Session, form_connection_id: str, data: DraftPublish
) -> FormConnectionView:
    """Publish a draft: the first revision, rule set 1 and the URLs (FR-009).

    1. Read the row: 404 if it's missing, 409 `draft_published` if it's
       published (also with `data.replace`), and 409 `draft_changed` if
       `data.version` is outdated and `data.replace` is false, before the content
       is checked (research R6).
    2. The checks of creating a form connection, unchanged and in its order, and
       the rules' identifiers against the draft's counters: 400 before anything is
       written.
    3. `form_connections.create_revision()` with a `DraftGuard`, which repeats
       step 1 under both of its row locks, reserves the revision, creates the
       EUDIPLO configuration with no transaction held, and publishes the row in
       one commit (research R5).

    An `EudiploError` reaches the caller, and the draft stays a draft. A draft
    deleted meanwhile answers 404, one published meanwhile 409 `draft_published`,
    and one saved meanwhile 409 `draft_changed` unless `data.replace`; the
    configuration is then deleted again and the draft keeps its stored content.
    """
    form_connection = form_connections.find_form_connection(db, form_connection_id)
    _check_state(form_connection, data.version, data.replace)
    name = form_connections.clean_name(data.name)
    servicebw_form = form_connections.clean_servicebw_form(data.servicebw_form)
    documents = form_connections.clean_documents(data.documents)
    save: rules.RulesSave | None = None
    if data.rules is not None:
        save = rules.clean_rules(data.rules, documents, main_branch_id=None)
        rules.check_first_save(
            save,
            counters=(
                form_connection.next_rule_number,
                form_connection.next_group_number,
            ),
        )

    # End the read transaction: the revision path locks the row itself
    db.rollback()
    form_connections.create_revision(
        db,
        form_connection_id,
        documents,
        changes={'name': name, 'servicebw_form': servicebw_form},
        save=save,
        guard=DraftGuard(version=data.version, replace=data.replace),
    )
    logger.info('Draft %s published', form_connection_id)
    return form_connections.get_form_connection(db, form_connection_id)


def delete_draft(db: Session, form_connection_id: str) -> None:
    """Remove a draft for good (FR-010, research R7).

    Answers 404 if it's missing and 409 `draft_published` if it's published; it
    compares no version. Otherwise deletes any revision that a publish in flight
    reserved, then the row, in one commit; that publish then finds no row, answers
    404 and deletes its own configuration. No EUDIPLO call.
    """
    form_connection = _lock_draft(db, form_connection_id)
    db.execute(
        delete(FormConnectionRevision).where(
            FormConnectionRevision.form_connection_id == form_connection_id
        )
    )
    db.delete(form_connection)
    db.commit()
    logger.info('Draft %s deleted', form_connection_id)
