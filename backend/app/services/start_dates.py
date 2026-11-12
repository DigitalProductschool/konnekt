"""A scheduled connection's start: a calendar day in Germany (spec 010, research R2).

`start_date` is the day in `Europe/Berlin` from which a scheduled connection is
active; the instant it becomes active is derived, midnight of that day in Germany.
Midnight exists on every day there (the clock changes at 02:00 and 03:00), so the
instant is never ambiguous (research R15 V3).

This module is a leaf: it imports nothing that reads `app.config`.
"""

from datetime import date, datetime, time

from fastapi import HTTPException

from ..language import Text
from .evaluation import GERMANY

INVALID_START_DATE_DETAIL = {
    'error': 'invalid_start_date',
    'message': Text(
        en='Enter a date after today.',
        de='Geben Sie ein Datum nach dem heutigen Tag ein.',
    ),
}


def today_in_germany() -> date:
    """Return today's date in Germany."""
    return datetime.now(GERMANY).date()


def start_instant(day: date) -> datetime:
    """Return the instant a connection scheduled for `day` becomes active.

    That is midnight at the start of `day` in Germany.
    """
    return datetime.combine(day, time.min, tzinfo=GERMANY)


def clean_start_date(day: date) -> date:
    """Return `day` if it is after today in Germany (FR-003).

    Raises `400 invalid_start_date` for today or an earlier day.
    """
    if day <= today_in_germany():
        raise HTTPException(status_code=400, detail=INVALID_START_DATE_DETAIL)
    return day
