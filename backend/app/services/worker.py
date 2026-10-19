"""Background worker (research R7).

A daemon thread runs the registered steps every two seconds. Each step is a plain
function that opens its own database sessions and keeps its transactions short, so
tests call the steps directly. Outbound calls go to a small thread pool through
`dispatch()`, and the loop never waits for them.
"""

import logging
import threading
import time
from collections.abc import Callable, Iterator, Sequence
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from functools import partial

from sqlalchemy import delete, func, or_, select

from ..config import settings
from ..db import SessionLocal
from ..errors import describe_error
from ..models import (
    DocumentRequest,
    FormConnection,
    FormConnectionRevision,
    LoginSession,
)
from . import document_requests, form_connections
from .document_requests import (
    OPEN_REQUEST,
    PENDING,
    UNAVAILABLE,
    apply_status,
    status_for_session,
)
from .eudiplo import (
    EudiploClient,
    EudiploNotConfigured,
    SessionSummary,
    get_eudiplo_client,
)

logger = logging.getLogger(__name__)

CYCLE_SECONDS = 2.0
POOL_SIZE = 8
STOP_TIMEOUT_SECONDS = 10.0
# The sync reads again from this long before the latest update it has seen, so an
# update that EUDIPLO stored a moment late isn't missed (research R6)
SYNC_OVERLAP = timedelta(seconds=5)
# At most this many pages of sessions per cycle; the next cycle reads on
SYNC_MAX_PAGES = 50

Step = Callable[[], None]

_pool: ThreadPoolExecutor | None = None
_in_flight: set[str] = set()
_in_flight_lock = threading.Lock()
# The latest EUDIPLO updatedAt the sync has seen. After a restart the sync starts at
# the oldest pending request instead
_sync_cursor: datetime | None = None
# The re-sync after a start: the form connections it has checked, and whether it is
# done (research R2)
_resynced: set[str] = set()
_resynced_lock = threading.Lock()
_resync_done = False


def dispatch(key: str, call: Callable[[], None]) -> bool:
    """Run an outbound call in the pool, unless a call with this key is running.

    Keys name the work and an internal id, never a request reference. Without a
    running worker (in tests) the call runs at once, in the calling thread. Returns
    False when the same key was still in flight.
    """
    with _in_flight_lock:
        if key in _in_flight:
            return False
        _in_flight.add(key)
    pool = _pool
    if pool is None:
        _run_call(key, call)
    else:
        pool.submit(_run_call, key, call)
    return True


def _run_call(key: str, call: Callable[[], None]) -> None:
    try:
        call()
    except Exception as error:
        logger.error('Worker call %s failed: %s', key, describe_error(error))
    finally:
        with _in_flight_lock:
            _in_flight.discard(key)


def sync_sessions() -> None:
    """Apply the citizens' answers from EUDIPLO to pending requests (R7, step 1).

    Lists the presentation sessions updated since the cursor, the latest update seen
    less SYNC_OVERLAP, and applies the outcome of each one that belongs to a pending
    request (research R5, R6). Sessions the middleware doesn't know, such as those
    of other environments in the shared tenant, are ignored. Without a pending
    request, EUDIPLO isn't called.
    """
    global _sync_cursor
    with SessionLocal() as db:
        oldest = db.scalar(
            select(func.min(DocumentRequest.created_at)).where(
                DocumentRequest.status == PENDING
            )
        )
    if oldest is None:
        return
    # Older updates can't concern a pending request
    start = oldest if _sync_cursor is None else max(oldest, _sync_cursor)
    for sessions in _updated_sessions(get_eudiplo_client(), start - SYNC_OVERLAP):
        _apply_outcomes(sessions)
        latest = max(session.updated_at for session in sessions)
        if _sync_cursor is None or latest > _sync_cursor:
            _sync_cursor = latest


def _updated_sessions(
    client: EudiploClient, updated_from: datetime
) -> Iterator[list[SessionSummary]]:
    """The presentation sessions updated since `updated_from`, a page at a time.

    Each page starts at the last update of the one before. A session that changes
    while the pages are read therefore moves to a later page, rather than pushing an
    unread session onto a page that was already read. The page number only moves on
    when a whole page shares one updatedAt.
    """
    page_number = 1
    for _ in range(SYNC_MAX_PAGES):
        page = client.list_sessions(updated_from, page=page_number)
        if not page.items:
            return
        yield page.items
        if page.page >= page.total_pages:
            return
        last = max(session.updated_at for session in page.items)
        if last > updated_from:
            updated_from, page_number = last, 1
        else:
            page_number += 1


def _apply_outcomes(sessions: Sequence[SessionSummary]) -> None:
    """Apply the listed sessions that have an outcome to their pending requests."""
    outcomes = {
        session.id: session
        for session in sessions
        if status_for_session(session.status, session.failure_code) != PENDING
    }
    if not outcomes:
        return
    to_check: list[str] = []
    with SessionLocal() as db:
        requests = db.scalars(
            select(DocumentRequest).where(
                DocumentRequest.eudiplo_session_id.in_(outcomes),
                DocumentRequest.status == PENDING,
            )
        ).all()
        for request in requests:
            session = outcomes[request.eudiplo_session_id]
            if (session.status == 'completed' and session.consumed_at is None) or (
                session.status == 'failed' and session.failure_code is None
            ):
                # Read the session itself rather than guess what the list left out
                to_check.append(request.id)
                continue
            apply_status(
                db,
                request,
                status_for_session(session.status, session.failure_code),
                failure_code=(
                    session.failure_code if session.status == 'failed' else None
                ),
                completed_at=session.consumed_at,
            )
            db.commit()
    for request_id in to_check:
        dispatch(f'check-session:{request_id}', partial(_check_request, request_id))


def _check_request(request_id: str) -> None:
    """Read a pending request's EUDIPLO session and apply its outcome.

    The worker only needs the status: the session, with any documents in it, is
    dropped right away (research R8).
    """
    with SessionLocal() as db:
        request = db.get(DocumentRequest, request_id)
        if request is not None and request.status == PENDING:
            document_requests.check_session(db, request)


def expire_requests() -> None:
    """Make the last check of pending requests past their expiry (R7, step 2).

    The checks run in the pool. An answer the citizen gave in time still counts,
    and a session that still waits for the wallet makes the request expired.
    """
    with SessionLocal() as db:
        request_ids = db.scalars(
            select(DocumentRequest.id)
            .where(
                DocumentRequest.status == PENDING,
                DocumentRequest.expires_at <= datetime.now(tz=timezone.utc),
            )
            .order_by(DocumentRequest.expires_at)
        ).all()
    for request_id in request_ids:
        dispatch(f'check-session:{request_id}', partial(_check_request, request_id))


def cancel_requests() -> None:
    """Cancel the open requests of deactivated or deleted connections (R7, step 3).

    Deactivating and deleting cancel them already. This catches a request that a
    trigger inserted afterwards: the trigger checks the form connection, ends its
    transaction while EUDIPLO answers, and inserts without checking again. The next
    step then deletes the request's EUDIPLO session.
    """
    with SessionLocal() as db:
        requests = db.scalars(
            select(DocumentRequest)
            .join(
                FormConnection,
                FormConnection.id == DocumentRequest.form_connection_id,
            )
            .where(
                or_(
                    FormConnection.is_active.is_(False),
                    FormConnection.deleted_at.is_not(None),
                ),
                OPEN_REQUEST,
            )
        ).all()
        for request in requests:
            apply_status(db, request, UNAVAILABLE)
            db.commit()


def delete_eudiplo_sessions() -> None:
    """Delete the EUDIPLO sessions that are due, with any documents (R7, step 5).

    `document_requests.session_deletion_due` says when (research R8). The deletions
    run in the pool; one that fails is tried again in the next cycle.
    """
    now = datetime.now(tz=timezone.utc)
    with SessionLocal() as db:
        candidates = db.scalars(
            select(DocumentRequest).where(
                DocumentRequest.eudiplo_session_deleted_at.is_(None),
                DocumentRequest.status != PENDING,
            )
        ).all()
        request_ids = [
            request.id
            for request in candidates
            if document_requests.session_deletion_due(request, now)
        ]
    for request_id in request_ids:
        dispatch(f'delete-session:{request_id}', partial(_delete_session, request_id))


def _delete_session(request_id: str) -> None:
    with SessionLocal() as db:
        request = db.get(DocumentRequest, request_id)
        if request is not None:
            document_requests.delete_eudiplo_session(db, request)


def resync_configs() -> None:
    """Renew the configurations whose settings changed (R7, step 6).

    After each start, every form connection that isn't deleted is checked once
    (`form_connections.resync_config`, research R2): a changed trust list, request
    lifetime or catalog gives its documents a new revision. The checks run in the
    pool; a failed one is tried again in the next cycle, and the step stops once all
    have succeeded.
    """
    global _resync_done
    if _resync_done:
        return
    with SessionLocal() as db:
        form_connection_ids = db.scalars(
            select(FormConnection.id).where(FormConnection.deleted_at.is_(None))
        ).all()
    with _resynced_lock:
        unchecked = [id_ for id_ in form_connection_ids if id_ not in _resynced]
    if not unchecked:
        _resync_done = True
        return
    for form_connection_id in unchecked:
        dispatch(f'resync:{form_connection_id}', partial(_resync, form_connection_id))


def _resync(form_connection_id: str) -> None:
    try:
        with SessionLocal() as db:
            form_connections.resync_config(db, form_connection_id)
    except EudiploNotConfigured as error:
        # Settings only change with a restart, so trying again can't help
        logger.warning(
            'Configuration of form connection %s not renewed: %s',
            form_connection_id,
            describe_error(error),
        )
    with _resynced_lock:
        _resynced.add(form_connection_id)


def delete_unused_configs() -> None:
    """Delete the EUDIPLO configurations no request needs any more (R7, step 7).

    A revision's configuration goes once a later revision is current, or its form
    connection was deleted, and no request on it still has an EUDIPLO session. A
    revision that is being created has a number above the current one, so it stays.
    The deletions run in the pool; a failed one is tried again in the next cycle.
    """
    in_use = (
        select(DocumentRequest.id)
        .where(
            DocumentRequest.revision_id == FormConnectionRevision.id,
            DocumentRequest.eudiplo_session_deleted_at.is_(None),
        )
        .exists()
    )
    with SessionLocal() as db:
        revision_ids = db.scalars(
            select(FormConnectionRevision.id)
            .join(
                FormConnection,
                FormConnection.id == FormConnectionRevision.form_connection_id,
            )
            .where(
                FormConnectionRevision.eudiplo_config_deleted_at.is_(None),
                or_(
                    FormConnectionRevision.revision < FormConnection.current_revision,
                    FormConnection.deleted_at.is_not(None),
                ),
                ~in_use,
            )
        ).all()
    for revision_id in revision_ids:
        dispatch(f'delete-config:{revision_id}', partial(_delete_config, revision_id))


def _delete_config(revision_id: str) -> None:
    with SessionLocal() as db:
        form_connections.delete_unused_config(db, revision_id)


def delete_expired_login_sessions() -> None:
    """Delete sign-in sessions whose time is up (research R7, step 8)."""
    with SessionLocal() as db:
        db.execute(
            delete(LoginSession).where(
                LoginSession.expires_at <= datetime.now(tz=timezone.utc)
            )
        )
        db.commit()


def delete_old_request_records() -> None:
    """Delete the records of requests that ended long enough ago (R7, step 9).

    A record goes REQUEST_RECORD_RETENTION_SECONDS after its request ended (FR-021).
    A pull with its reference then answers 404, like one with an unknown reference.
    """
    cutoff = datetime.now(tz=timezone.utc) - timedelta(
        seconds=settings.request_record_retention_seconds
    )
    with SessionLocal() as db:
        db.execute(delete(DocumentRequest).where(DocumentRequest.ended_at <= cutoff))
        db.commit()


# The steps of one cycle, in the order of research R7 (step 4 was removed with
# webhook mode)
STEPS: tuple[Step, ...] = (
    sync_sessions,
    expire_requests,
    cancel_requests,
    delete_eudiplo_sessions,
    resync_configs,
    delete_unused_configs,
    delete_expired_login_sessions,
    delete_old_request_records,
)


def run_steps(steps: Sequence[Step] = STEPS) -> None:
    """Run each step once. A failing step is logged and the next one still runs."""
    for step in steps:
        try:
            step()
        except Exception as error:
            logger.error(
                'Worker step %s failed: %s', step.__name__, describe_error(error)
            )


class Worker:
    """Runs the steps every CYCLE_SECONDS on a daemon thread."""

    def __init__(self, steps: Sequence[Step] = STEPS) -> None:
        self._steps = tuple(steps)
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        """Start the thread and the pool for outbound calls."""
        global _pool
        _pool = ThreadPoolExecutor(
            max_workers=POOL_SIZE, thread_name_prefix='worker-call'
        )
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, name='worker', daemon=True)
        self._thread.start()
        logger.info('Worker started')

    def stop(self) -> None:
        """Finish the current cycle, then stop; queued calls are dropped."""
        global _pool
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=STOP_TIMEOUT_SECONDS)
        if _pool is not None:
            _pool.shutdown(wait=False, cancel_futures=True)
            _pool = None
        logger.info('Worker stopped')

    def _run(self) -> None:
        while not self._stop.is_set():
            started = time.monotonic()
            run_steps(self._steps)
            elapsed = time.monotonic() - started
            self._stop.wait(max(0.0, CYCLE_SECONDS - elapsed))
