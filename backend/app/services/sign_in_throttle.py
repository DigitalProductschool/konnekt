"""The sign-in throttle (spec 012, research R6, finding 4).

Every sign-in attempt counts against the username it names, whether or not an
account has it, before its password is checked. After SIGN_IN_FAILURES_BEFORE_WAIT
attempts without a correct one, every further attempt must wait: first
SIGN_IN_FIRST_WAIT_SECONDS, doubling with each attempt that fails, up to
SIGN_IN_MAX_WAIT_SECONDS. An attempt during the wait answers 429 with
`Retry-After`, checks no password (so it costs no hash) and doesn't count, so the
wait never grows while no password can be tried; a correct sign-in after the wait
works and forgets the attempts. They are forgotten too SIGN_IN_MAX_WAIT_SECONDS
after the wait ended (or after the last attempt, if it started none), and the
worker then deletes the row.

The attempts live in the table `sign_in_throttles`, read and written under the
row's lock: every worker process and replica shares them, and parallel attempts
all count. An attempt counts before its hash runs, so that parallel attempts can't
pass the limit together. A row is keyed by the SHA-256 of the normalized username,
so the table holds no username in clear, nor a password typed into the username
field. Nothing here logs a username, its hash or a password.
"""

import hashlib
import logging
import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from ..config import settings
from ..language import Text
from ..models import SignInThrottle
from .auth import normalize_username

logger = logging.getLogger(__name__)

# The wait doubles at most this often, which keeps the number small; any useful
# SIGN_IN_MAX_WAIT_SECONDS is reached long before
MAX_DOUBLINGS = 32


def _now() -> datetime:
    """The throttle's clock; the tests move it."""
    return datetime.now(tz=timezone.utc)


def _username_hash(username: str) -> str:
    """The key of a username's row: the SHA-256 hex of its stored form."""
    return hashlib.sha256(normalize_username(username).encode()).hexdigest()


def _wait_after(attempts: int) -> timedelta:
    """The wait after `attempts` attempts in a row without a correct one.

    None below SIGN_IN_FAILURES_BEFORE_WAIT; from there the first wait, doubled
    with each further attempt, at most SIGN_IN_MAX_WAIT_SECONDS.
    """
    doublings = attempts - settings.sign_in_failures_before_wait
    if doublings < 0:
        return timedelta(0)
    seconds = settings.sign_in_first_wait_seconds * 2 ** min(doublings, MAX_DOUBLINGS)
    return timedelta(seconds=max(0, min(seconds, settings.sign_in_max_wait_seconds)))


def _duration(seconds: int) -> Text:
    """A wait in words: seconds under a minute, else whole minutes rounded up."""
    if seconds == 1:
        return Text(en='1 second', de='1 Sekunde')
    if seconds < 60:
        return Text(en=f'{seconds} seconds', de=f'{seconds} Sekunden')
    minutes = math.ceil(seconds / 60)
    if minutes == 1:
        return Text(en='1 minute', de='1 Minute')
    return Text(en=f'{minutes} minutes', de=f'{minutes} Minuten')


def _refusal(remaining: timedelta) -> HTTPException:
    """The 429 of an attempt during a wait, with the wait's rest in whole seconds."""
    seconds = max(1, math.ceil(remaining.total_seconds()))
    duration = _duration(seconds)
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            'error': 'rate_limited',
            'message': Text(
                en=(
                    'Too many failed attempts for this username. '
                    f'Try again in {duration.en}.'
                ),
                de=(
                    'Zu viele fehlgeschlagene Anmeldeversuche für diesen '
                    f'Benutzernamen. Versuchen Sie es in {duration.de} erneut.'
                ),
            ),
        },
        headers={'Retry-After': str(seconds)},
    )


def count_attempt(db: Session, username: str) -> None:
    """Count a sign-in attempt for `username`, or answer 429 during a wait.

    Called before the password is checked. Under the row's lock: attempts that
    were forgotten (`expires_at` passed) start again from none; during a wait the
    attempt answers 429 `rate_limited` with `Retry-After` and isn't counted;
    otherwise it counts, the wait it starts for the next attempt (if any) is
    stored, and the count is committed, which releases the lock before the hash
    runs. A correct sign-in then calls `forget_attempts`.
    """
    key = _username_hash(username)
    now = _now()
    # Inserts the row, or takes the lock of the existing one with an update that
    # changes nothing: parallel attempts for one username wait for each other here,
    # and a row the worker deletes meanwhile is inserted again
    db.execute(
        pg_insert(SignInThrottle)
        .values(id=str(uuid.uuid4()), username_hash=key, failures=0, expires_at=now)
        .on_conflict_do_update(
            index_elements=['username_hash'], set_={'username_hash': key}
        )
    )
    throttle = db.scalars(
        select(SignInThrottle)
        .where(SignInThrottle.username_hash == key)
        .with_for_update()
        .execution_options(populate_existing=True)
    ).one()
    if throttle.expires_at <= now:
        throttle.failures = 0
        throttle.refused_until = None
    refused_until = throttle.refused_until
    if refused_until is not None and refused_until > now:
        db.rollback()
        logger.info('Refused a sign-in attempt: its username has to wait')
        raise _refusal(refused_until - now)
    throttle.failures += 1
    wait = _wait_after(throttle.failures)
    throttle.refused_until = now + wait if wait else None
    throttle.expires_at = (throttle.refused_until or now) + timedelta(
        seconds=settings.sign_in_max_wait_seconds
    )
    db.commit()


def forget_attempts(db: Session, username: str) -> None:
    """Forget the attempts of `username` after a correct sign-in.

    Deletes its row in the caller's transaction, which the new sign-in session's
    commit ends.
    """
    db.execute(
        delete(SignInThrottle).where(
            SignInThrottle.username_hash == _username_hash(username)
        )
    )


def delete_expired(db: Session) -> None:
    """Delete the rows whose attempts are forgotten, for the worker."""
    db.execute(delete(SignInThrottle).where(SignInThrottle.expires_at <= _now()))
    db.commit()
