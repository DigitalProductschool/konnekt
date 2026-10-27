"""Date rules: the calendar arithmetic of FR-012 and its edge cases (SC-003)."""

from datetime import date, datetime, timedelta, timezone
from typing import Any

import pytest

from app.schemas import DeliveredDocument, DeliveredField, SnapshotBranch
from app.services.evaluation import (
    day_of_sharing,
    evaluate_branch,
    months_after,
    years_after,
)


def _outcome(
    field: str, condition: dict[str, Any], value: object, shared_on: date
) -> str:
    """The outcome of one rule on a PID's date field."""
    branch = SnapshotBranch.model_validate(
        {
            'id': 'main',
            'name': 'Standard',
            'origin': 'main',
            'operator': 'and',
            'items': [
                {
                    'type': 'rule',
                    'id': 'rule-1',
                    'name': 'Rule 01',
                    'target': {'document_type': 'pid', 'field': field},
                    'condition': condition,
                    'message': 'Not met.',
                }
            ],
        }
    )
    documents = [
        DeliveredDocument(
            document_type='pid',
            label='Personal ID',
            fields=[
                DeliveredField.model_validate(
                    {'key': field, 'label': field, 'value': value}
                )
            ],
        )
    ]
    return evaluate_branch(branch, documents, shared_on).results[0].outcome


def _age(operator: str, years: int, born: str, shared_on: date) -> str:
    return _outcome(
        'birthdate',
        {'operator': f'{operator}_years_ago', 'years': years},
        born,
        shared_on,
    )


def _from_now(operator: str, amount: int, unit: str, day: str, shared_on: date) -> str:
    return _outcome(
        'date_of_expiry',
        {'operator': f'{operator}_from_now', 'amount': amount, 'unit': unit},
        day,
        shared_on,
    )


# The calendar


def test_an_anniversary_is_the_same_day_years_later() -> None:
    assert years_after(date(2005, 10, 23), 21) == date(2026, 10, 23)


def test_29_february_has_its_anniversary_on_1_march_in_other_years() -> None:
    assert years_after(date(2004, 2, 29), 21) == date(2025, 3, 1)
    assert years_after(date(2004, 2, 29), 24) == date(2028, 2, 29)


def test_months_later_keep_the_day_of_the_month() -> None:
    assert months_after(date(2026, 10, 23), 6) == date(2027, 4, 23)
    assert months_after(date(2026, 11, 30), 14) == date(2028, 1, 30)


def test_months_later_move_to_the_1st_of_the_next_month_without_that_day() -> None:
    assert months_after(date(2026, 1, 31), 1) == date(2026, 3, 1)
    # Also in a leap year: February has no 31st either
    assert months_after(date(2028, 1, 31), 1) == date(2028, 3, 1)
    assert months_after(date(2026, 3, 31), 1) == date(2026, 5, 1)
    assert months_after(date(2026, 10, 31), 1) == date(2026, 12, 1)
    # Across the end of a year
    assert months_after(date(2026, 11, 30), 3) == date(2027, 3, 1)


def test_dates_beyond_the_calendar_end_at_its_last_day() -> None:
    assert years_after(date(9990, 1, 1), 21) == date.max


# Birthdays and the day of sharing (EC "Birthday on the day of sharing")


def test_a_21st_birthday_on_the_day_of_sharing_is_at_least_21() -> None:
    shared_on = date(2026, 10, 23)

    assert _age('at_least', 21, '2005-10-23', shared_on) == 'met'
    assert _age('exactly', 21, '2005-10-23', shared_on) == 'met'
    assert _age('less_than', 21, '2005-10-23', shared_on) == 'not_met'


def test_the_day_before_the_21st_birthday_is_less_than_21() -> None:
    shared_on = date(2026, 10, 22)

    assert _age('at_least', 21, '2005-10-23', shared_on) == 'not_met'
    assert _age('exactly', 21, '2005-10-23', shared_on) == 'not_met'
    assert _age('less_than', 21, '2005-10-23', shared_on) == 'met'


def test_exactly_n_years_lasts_until_the_day_before_the_next_anniversary() -> None:
    assert _age('exactly', 21, '2005-10-23', date(2027, 10, 22)) == 'met'
    assert _age('exactly', 21, '2005-10-23', date(2027, 10, 23)) == 'not_met'
    assert _age('at_least', 21, '2005-10-23', date(2027, 10, 23)) == 'met'


def test_a_29_february_birthday_turns_21_on_1_march() -> None:
    assert _age('at_least', 21, '2004-02-29', date(2025, 2, 28)) == 'not_met'
    assert _age('less_than', 21, '2004-02-29', date(2025, 2, 28)) == 'met'
    assert _age('at_least', 21, '2004-02-29', date(2025, 3, 1)) == 'met'
    # In a leap year, the birthday itself
    assert _age('at_least', 24, '2004-02-29', date(2028, 2, 29)) == 'met'
    assert _age('at_least', 24, '2004-02-29', date(2028, 2, 28)) == 'not_met'


def test_years_ago_count_the_same_way_on_dates_other_than_a_birth_date() -> None:
    shared_on = date(2026, 10, 23)
    condition = {'operator': 'at_least_years_ago', 'years': 2}

    assert _outcome('date_of_issuance', condition, '2024-10-23', shared_on) == 'met'
    assert _outcome('date_of_issuance', condition, '2024-10-24', shared_on) == 'not_met'


# Months and years from now (EC "Months from now at the end of a month")


def test_one_month_from_31_january_is_1_march() -> None:
    shared_on = date(2026, 1, 31)

    assert _from_now('at_least', 1, 'months', '2026-02-28', shared_on) == 'not_met'
    assert _from_now('less_than', 1, 'months', '2026-02-28', shared_on) == 'met'
    assert _from_now('at_least', 1, 'months', '2026-03-01', shared_on) == 'met'
    assert _from_now('less_than', 1, 'months', '2026-03-01', shared_on) == 'not_met'


def test_years_from_now_count_forward_from_the_day_of_sharing() -> None:
    shared_on = date(2026, 10, 23)

    assert _from_now('at_least', 2, 'years', '2028-10-23', shared_on) == 'met'
    assert _from_now('at_least', 2, 'years', '2028-10-22', shared_on) == 'not_met'
    assert _from_now('less_than', 2, 'years', '2028-10-22', shared_on) == 'met'


def test_a_past_date_is_less_than_any_amount_from_now() -> None:
    shared_on = date(2026, 10, 23)

    assert _from_now('less_than', 6, 'months', '2020-01-01', shared_on) == 'met'
    assert _from_now('less_than', 1, 'years', '2026-10-22', shared_on) == 'met'
    assert _from_now('at_least', 1, 'months', '2020-01-01', shared_on) == 'not_met'


# Fixed dates: before and after are strict


def test_before_and_after_exclude_the_given_date() -> None:
    shared_on = date(2026, 10, 23)

    def fixed(operator: str, value: str) -> str:
        return _outcome(
            'date_of_issuance',
            {'operator': operator, 'date': '2020-01-01'},
            value,
            shared_on,
        )

    assert fixed('before', '2020-01-01') == 'not_met'
    assert fixed('after', '2020-01-01') == 'not_met'
    assert fixed('on', '2020-01-01') == 'met'
    assert fixed('before', '2019-12-31') == 'met'
    assert fixed('after', '2020-01-02') == 'met'
    assert fixed('on', '2020-01-02') == 'not_met'


# The day of sharing (EC "Sharing around midnight")


@pytest.mark.parametrize(
    ('completed_at', 'expected'),
    [
        # Summer time: UTC+2
        (datetime(2026, 10, 22, 21, 59, tzinfo=timezone.utc), date(2026, 10, 22)),
        (datetime(2026, 10, 22, 23, 30, tzinfo=timezone.utc), date(2026, 10, 23)),
        # Winter time: UTC+1
        (datetime(2026, 12, 31, 22, 30, tzinfo=timezone.utc), date(2026, 12, 31)),
        (datetime(2026, 12, 31, 23, 30, tzinfo=timezone.utc), date(2027, 1, 1)),
        # Another zone gives the same moment
        (
            datetime(2026, 10, 22, 19, 30, tzinfo=timezone(timedelta(hours=-4))),
            date(2026, 10, 23),
        ),
        # Without a zone, the moment is UTC
        (datetime(2026, 10, 22, 23, 30), date(2026, 10, 23)),
    ],
)
def test_the_day_of_sharing_is_the_calendar_date_in_germany(
    completed_at: datetime, expected: date
) -> None:
    assert day_of_sharing(completed_at) == expected


def test_sharing_at_2330_utc_counts_the_next_day_in_germany() -> None:
    # 23:30 UTC on the eve of the 21st birthday is already the birthday in Germany
    shared_on = day_of_sharing(datetime(2026, 10, 22, 23, 30, tzinfo=timezone.utc))

    assert _age('at_least', 21, '2005-10-23', shared_on) == 'met'
