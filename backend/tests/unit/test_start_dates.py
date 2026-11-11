"""Start dates: the day in Germany, its instant and the refusal (spec 010, R2)."""

from datetime import date, datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app.language import Text
from app.services import start_dates
from app.services.evaluation import GERMANY
from app.services.start_dates import clean_start_date, start_instant

TODAY = date(2026, 11, 11)


@pytest.fixture
def fixed_today(monkeypatch: pytest.MonkeyPatch) -> date:
    """Pin `today_in_germany()` to `TODAY`."""
    monkeypatch.setattr(start_dates, 'today_in_germany', lambda: TODAY)
    return TODAY


def test_today_in_germany_is_the_date_in_berlin() -> None:
    """`today_in_germany()` is today's date in Europe/Berlin."""
    before = datetime.now(GERMANY).date()
    today = start_dates.today_in_germany()
    after = datetime.now(GERMANY).date()
    assert today in {before, after}


def test_tomorrow_is_accepted(fixed_today: date) -> None:
    """A day after today in Germany is a valid start date."""
    tomorrow = fixed_today + timedelta(days=1)
    assert clean_start_date(tomorrow) == tomorrow


@pytest.mark.parametrize('days_back', [0, 1], ids=['today', 'yesterday'])
def test_today_and_earlier_are_refused(fixed_today: date, days_back: int) -> None:
    """Today and yesterday are refused with `400 invalid_start_date`."""
    with pytest.raises(HTTPException) as caught:
        clean_start_date(fixed_today - timedelta(days=days_back))
    assert caught.value.status_code == 400
    assert isinstance(caught.value.detail, dict)
    assert caught.value.detail['error'] == 'invalid_start_date'


def test_the_refusal_says_it_in_both_languages(fixed_today: date) -> None:
    """The refusal's message is copy.md §8's, in English and German."""
    with pytest.raises(HTTPException) as caught:
        clean_start_date(fixed_today)
    assert isinstance(caught.value.detail, dict)
    message = caught.value.detail['message']
    assert isinstance(message, Text)
    assert message.resolve('en') == 'Enter a date after today.'
    assert message.resolve('de') == 'Geben Sie ein Datum nach dem heutigen Tag ein.'


@pytest.mark.parametrize(
    ('day', 'offset', 'utc'),
    [
        # The clock goes forward at 02:00: midnight is still winter time
        (date(2026, 3, 29), timedelta(hours=1), datetime(2026, 3, 28, 23, 0)),
        # The clock goes back at 03:00: midnight is still summer time
        (date(2026, 10, 25), timedelta(hours=2), datetime(2026, 10, 24, 22, 0)),
    ],
    ids=['spring-forward', 'fall-back'],
)
def test_start_instant_on_the_days_the_clock_changes(
    day: date, offset: timedelta, utc: datetime
) -> None:
    """Midnight in Germany has one offset on the days the clock changes (R15 V3)."""
    instant = start_instant(day)
    assert instant.date() == day
    assert instant.time() == datetime.min.time()
    assert instant.utcoffset() == offset
    assert instant.fold == 0
    # The instant is not ambiguous: the other fold gives the same offset
    assert instant.replace(fold=1).utcoffset() == offset
    assert instant.astimezone(timezone.utc) == utc.replace(tzinfo=timezone.utc)
