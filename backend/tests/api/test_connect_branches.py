"""The pull URLs of the branches other than the main branch (spec 002).

contracts/integration-api.md, "Order of the checks", and research R3: every branch
that existed when a request was triggered answers with the request's status and
documents, each with its own evaluation. Quickstart V4 and V5, with a fake EUDIPLO
in place of the wallet.
"""

import copy
import logging
import uuid
from datetime import date, timedelta
from typing import Any

import pytest
from fastapi.testclient import TestClient
from httpx2 import Response

from app.config import settings
from app.db import SessionLocal
from app.main import RedactReferencesFilter
from app.models import FormConnectionBranch
from app.routers.connect import PULL_FAILED
from app.services import worker
from app.services.evaluation import day_of_sharing
from tests.fake_eudiplo import FakeEudiplo
from tests.helpers import (
    AGE_RULE,
    CLASS_RULE,
    FORM_CONNECTION,
    HELD_RULE,
    SHARED_CREDENTIALS,
    branch_pull_url,
    main_branch,
    now,
    pull_url,
    rules_input,
    share,
    stored_request,
    trigger,
    update_request,
    variant,
)

REQUEST_NOT_FOUND = {'error': 'Not found', 'message': 'Request not found'}
UNAVAILABLE = {
    'error': 'unavailable',
    'message': 'This form connection is deactivated or deleted',
}
BRANCH_DELETED = {'error': 'unavailable', 'message': 'This variant was deleted'}
BRANCH_ADDED_LATER = {
    'error': 'branch_added_later',
    'message': "This variant didn't exist when the request was triggered",
}

# Standard asks for 21 years, Ambulance for 19; both follow Standard's class rules
US1_ITEMS = [AGE_RULE, CLASS_RULE, HELD_RULE]
AGE_19_IN_AMBULANCE = AGE_RULE | {
    'mark': 'changed',
    'condition': {'operator': 'at_least_years_ago', 'years': 19},
    'message': 'You must be at least 19 years old.',
}
AMBULANCE = variant([AGE_19_IN_AMBULANCE, CLASS_RULE, HELD_RULE])
TAXI = variant([], name='Taxi', origin='empty')


def _create(client: TestClient, *variants: dict[str, Any]) -> dict[str, Any]:
    """A form connection with US1's rules in Standard, and these variants."""
    rules = rules_input([main_branch(US1_ITEMS), *variants])
    response = client.post(
        '/api/form-connections', json=FORM_CONNECTION | {'rules': rules}
    )
    assert response.status_code == 201, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _branch(form_connection: dict[str, Any], name: str) -> dict[str, Any]:
    branch: dict[str, Any] = next(
        branch for branch in form_connection['branches'] if branch['name'] == name
    )
    return branch


def _as_sent(branch: dict[str, Any], **changes: Any) -> dict[str, Any]:
    """A saved branch as the rules step sends it back."""
    sent = {
        key: value
        for key, value in branch.items()
        if key not in ('is_main', 'pull_url')
    }
    return copy.deepcopy(sent) | changes


def _save(
    client: TestClient, form_connection: dict[str, Any], branches: list[dict[str, Any]]
) -> dict[str, Any]:
    """Save these branches over the form connection's, as the rules step does."""
    rules = rules_input(
        branches,
        rule_base=form_connection['next_rule_number'],
        group_base=form_connection['next_group_number'],
        base_version=form_connection['rule_set_version'],
    )
    response = client.put(
        f'/api/form-connections/{form_connection["id"]}', json={'rules': rules}
    )
    assert response.status_code == 200, response.json()
    data: dict[str, Any] = response.json()['data']
    return data


def _path(branch: dict[str, Any], reference: str) -> str:
    """The branch's pull URL, as the management API shows it, for `reference`."""
    url: str = branch['pull_url']
    return url.removeprefix(settings.connection_base_url or '').replace(
        '{reference}', reference
    )


def _get(client: TestClient, branch: dict[str, Any], reference: str) -> Response:
    return client.get(_path(branch, reference))


def _pull(client: TestClient, branch: dict[str, Any], reference: str) -> Any:
    response = _get(client, branch, reference)
    assert response.status_code == 200, response.json()
    return response.json()['data']


def _years_before(day: date, years: int) -> date:
    # On or before the day's anniversary, whatever the month's length
    return date(day.year - years, day.month, min(day.day, 28))


def _person(age: int, held_b_for: int) -> list[dict[str, Any]]:
    """What the wallet shares for someone who turned `age` and got class B
    `held_b_for` years ago, as of today in Germany."""
    today = day_of_sharing(now())
    credentials = copy.deepcopy(SHARED_CREDENTIALS)
    credentials[0]['values'][0]['birthdate'] = _years_before(today, age).isoformat()
    credentials[1]['values'][0]['driving_privileges'] = [
        {
            'vehicle_category_code': 'B',
            'issue_date': _years_before(today, held_b_for).isoformat(),
        }
    ]
    return credentials


def _shared(fake: FakeEudiplo, *references: str) -> None:
    """A 20-year-old who has held class B for 5 years shares, and the worker sees it.

    Standard's 21-year rule isn't met; Ambulance's 19-year rule is.
    """
    for reference in references:
        share(fake, reference, credentials=_person(20, 5))
    worker.sync_sessions()


def _messages(evaluation: dict[str, Any]) -> list[str]:
    return [message['id'] for message in evaluation['messages']]


# Order of the checks (contracts/integration-api.md)


def test_an_unknown_form_connection_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    started = trigger(signed_in_client, created['id'])
    ambulance_id = _branch(created, 'Ambulance')['id']

    response = signed_in_client.get(
        branch_pull_url(str(uuid.uuid4()), ambulance_id, started['reference'])
    )

    assert response.status_code == 404
    assert response.json() == REQUEST_NOT_FOUND


@pytest.mark.parametrize('end', ['deactivate', 'delete'])
def test_a_deactivated_or_deleted_form_connection_answers_unavailable(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo, end: str
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    started = trigger(signed_in_client, created['id'])
    if end == 'deactivate':
        response = signed_in_client.post(
            f'/api/form-connections/{created["id"]}/deactivate', json={}
        )
    else:
        response = signed_in_client.request(
            'DELETE', f'/api/form-connections/{created["id"]}', json={}
        )
    assert response.status_code == 200

    # The form connection is checked first: before the branch and the reference
    paths = [
        pull_url(created['id'], started['reference']),
        _path(_branch(created, 'Ambulance'), started['reference']),
        _path(_branch(created, 'Ambulance'), 'made-up-reference'),
        branch_pull_url(created['id'], str(uuid.uuid4()), started['reference']),
    ]
    for path in paths:
        response = signed_in_client.get(path)
        assert response.status_code == 409, path
        assert response.json() == UNAVAILABLE


def test_a_drafts_branch_pull_url_answers_unavailable_for_any_branch(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    # A draft with a variant: its branches have no rows, so no ids (spec 005)
    published = _create(signed_in_client, AMBULANCE)
    rules = {
        'branches': [main_branch(US1_ITEMS), AMBULANCE],
        'numbering_base': {'rule': 1, 'group': 1},
    }
    response = signed_in_client.post(
        '/api/form-connections/drafts',
        json=FORM_CONNECTION | {'rules': rules, 'step': 'rules'},
    )
    assert response.status_code == 201, response.json()
    draft_id = response.json()['data']['id']
    calls = len(fake_eudiplo.calls)

    # The form connection is checked first (step 2), before the branch is looked at
    for branch_id in (
        str(uuid.uuid4()),
        'not-a-uuid',
        # A published connection's variant
        _branch(published, 'Ambulance')['id'],
    ):
        response = signed_in_client.get(
            branch_pull_url(draft_id, branch_id, 'made-up-reference')
        )
        assert response.status_code == 409, branch_id
        assert response.json() == UNAVAILABLE
    assert len(fake_eudiplo.calls) == calls


def test_an_unknown_branch_or_the_main_branch_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    other = _create(signed_in_client, AMBULANCE)
    started = trigger(signed_in_client, created['id'])
    reference = started['reference']

    for branch_id in (
        str(uuid.uuid4()),
        'not-a-uuid',
        # Another form connection's variant
        _branch(other, 'Ambulance')['id'],
        # Standard's pull URL is spec 001's: each branch has one pull URL
        _branch(created, 'Standard')['id'],
    ):
        response = signed_in_client.get(
            branch_pull_url(created['id'], branch_id, reference)
        )
        assert response.status_code == 404, branch_id
        assert response.json() == REQUEST_NOT_FOUND


def test_an_unknown_reference_or_another_connections_is_not_found(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    other = _create(signed_in_client, AMBULANCE)
    elsewhere = trigger(signed_in_client, other['id'])

    for reference in ('made-up-reference', elsewhere['reference']):
        response = _get(signed_in_client, _branch(created, 'Ambulance'), reference)
        assert response.status_code == 404
        assert response.json() == REQUEST_NOT_FOUND


def test_a_branch_added_after_the_trigger_answers_branch_added_later(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    earlier = trigger(signed_in_client, created['id'])
    saved = _save(
        signed_in_client,
        created,
        [_as_sent(branch) for branch in created['branches']] + [TAXI],
    )
    taxi = _branch(saved, 'Taxi')
    later = trigger(signed_in_client, created['id'])
    _shared(fake_eudiplo, earlier['reference'], later['reference'])

    response = _get(signed_in_client, taxi, earlier['reference'])

    # Without status or documents (FR-025)
    assert response.status_code == 409
    assert response.json() == BRANCH_ADDED_LATER
    # The branches that existed answer as before, and Taxi answers for later requests
    assert _pull(signed_in_client, _branch(saved, 'Ambulance'), earlier['reference'])[
        'documents'
    ]
    later_data = _pull(signed_in_client, taxi, later['reference'])
    assert later_data['evaluation']['branch'] == {'id': taxi['id'], 'name': 'Taxi'}
    assert later_data['evaluation']['met'] is True


def test_a_request_from_before_branches_knows_only_the_main_branch(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    started = trigger(signed_in_client, created['id'])
    # Triggered before the migration: no rule set
    update_request(started['reference'], rule_set_id=None)
    _shared(fake_eudiplo, started['reference'])

    response = _get(
        signed_in_client, _branch(created, 'Ambulance'), started['reference']
    )

    assert response.status_code == 409
    assert response.json() == BRANCH_ADDED_LATER
    standard = _pull(
        signed_in_client, _branch(created, 'Standard'), started['reference']
    )
    assert standard['evaluation']['met'] is True


# The same request through every branch (FR-025)


def test_every_branch_answers_with_the_same_status_and_documents(
    signed_in_client: TestClient,
    fake_eudiplo: FakeEudiplo,
    caplog: pytest.LogCaptureFixture,
) -> None:
    caplog.set_level(logging.DEBUG)
    created = _create(signed_in_client, AMBULANCE)
    standard, ambulance = _branch(created, 'Standard'), _branch(created, 'Ambulance')
    started = trigger(signed_in_client, created['id'])
    reference = started['reference']

    pending = [
        _pull(signed_in_client, branch, reference) for branch in (standard, ambulance)
    ]
    _shared(fake_eudiplo, reference)
    through_standard = _pull(signed_in_client, standard, reference)
    through_ambulance = _pull(signed_in_client, ambulance, reference)

    assert pending[0] == pending[1]
    assert (
        pending[0]['status'],
        pending[0]['documents'],
        pending[0]['evaluation'],
    ) == (
        'pending',
        None,
        None,
    )
    without_evaluation = [
        {key: value for key, value in data.items() if key != 'evaluation'}
        for data in (through_standard, through_ambulance)
    ]
    assert without_evaluation[0] == without_evaluation[1]
    assert through_ambulance['status'] == 'completed'
    assert through_ambulance['documents'] is not None
    # Only the evaluation differs (US3-AS8)
    assert through_standard['evaluation']['branch'] == {
        'id': standard['id'],
        'name': 'Standard',
    }
    assert through_standard['evaluation']['met'] is False
    assert _messages(through_standard['evaluation']) == ['rule-1']
    assert through_ambulance['evaluation'] == {
        'branch': {'id': ambulance['id'], 'name': 'Ambulance'},
        'met': True,
        'results': [
            {
                'id': f'rule-{number}',
                'type': 'rule',
                'name': f'Rule 0{number}',
                'group': None,
                'outcome': 'met',
            }
            for number in (1, 2, 3)
        ],
        'messages': [],
    }
    # The test client's own request lines, as serviceBW's, don't count
    text = '\n'.join(
        message
        for message in (record.getMessage() for record in caplog.records)
        if 'http://testserver/' not in message
    )
    assert 'Document request' in text
    assert reference not in text


def test_a_rule_that_a_variant_follows_changes_with_standard(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    before = trigger(signed_in_client, created['id'])
    # Standard asks for class B for 6 years; Ambulance follows, and keeps its age
    held_6_years = HELD_RULE | {
        'condition': {'operator': 'at_least_years_ago', 'years': 6},
        'message': 'You must have held class B for at least 6 years.',
    }
    standard, ambulance = _branch(created, 'Standard'), _branch(created, 'Ambulance')
    _save(
        signed_in_client,
        created,
        [
            _as_sent(standard, items=[AGE_RULE, CLASS_RULE, held_6_years]),
            _as_sent(ambulance, items=[AGE_19_IN_AMBULANCE, CLASS_RULE, held_6_years]),
        ],
    )
    after = trigger(signed_in_client, created['id'])
    _shared(fake_eudiplo, before['reference'], after['reference'])

    earlier = _pull(signed_in_client, ambulance, before['reference'])['evaluation']
    later = _pull(signed_in_client, ambulance, after['reference'])['evaluation']
    later_in_standard = _pull(signed_in_client, standard, after['reference'])

    # The request triggered before the save keeps the rules of its trigger (FR-028)
    assert earlier['met'] is True
    # Standard's new version reaches Ambulance, whose own age rule stays (SC-006)
    assert [(result['id'], result['outcome']) for result in later['results']] == [
        ('rule-1', 'met'),
        ('rule-2', 'met'),
        ('rule-3', 'not_met'),
    ]
    assert later['messages'] == [
        {'id': 'rule-3', 'message': 'You must have held class B for at least 6 years.'}
    ]
    assert _messages(later_in_standard['evaluation']) == ['rule-1', 'rule-3']


def test_the_repeat_window_is_shared_by_every_branch(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    standard, ambulance = _branch(created, 'Standard'), _branch(created, 'Ambulance')
    started = trigger(signed_in_client, created['id'])
    reference = started['reference']
    _shared(fake_eudiplo, reference)

    first = _pull(signed_in_client, ambulance, reference)
    delivered_at = stored_request(reference).documents_delivered_at
    again = _pull(signed_in_client, standard, reference)

    # The first delivery, through Ambulance, started the window for Standard too
    assert delivered_at is not None
    assert again['documents'] == first['documents']
    assert again['evaluation']['branch']['name'] == 'Standard'
    assert stored_request(reference).documents_delivered_at == delivered_at
    # After the window, no branch hands out the documents
    update_request(reference, documents_delivered_at=now() - timedelta(seconds=61))
    for branch in (standard, ambulance):
        data = _pull(signed_in_client, branch, reference)
        assert (data['status'], data['documents'], data['evaluation']) == (
            'completed',
            None,
            None,
        )


def test_a_renamed_branch_keeps_its_pull_url(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    ambulance = _branch(created, 'Ambulance')
    before = trigger(signed_in_client, created['id'])
    saved = _save(
        signed_in_client,
        created,
        [
            _as_sent(_branch(created, 'Standard')),
            _as_sent(ambulance, name='Ambulance service'),
        ],
    )
    renamed = _branch(saved, 'Ambulance service')
    after = trigger(signed_in_client, created['id'])
    _shared(fake_eudiplo, before['reference'], after['reference'])

    assert (renamed['id'], renamed['pull_url']) == (
        ambulance['id'],
        ambulance['pull_url'],
    )
    # The evaluation names the branch as it was when the request was triggered
    for started, name in ((before, 'Ambulance'), (after, 'Ambulance service')):
        evaluation = _pull(signed_in_client, ambulance, started['reference'])[
            'evaluation'
        ]
        assert evaluation['branch'] == {'id': ambulance['id'], 'name': name}


# Deleted branches, and deactivated form connections (FR-027)


def test_a_deleted_branch_answers_unavailable_while_the_others_keep_working(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE, TAXI)
    standard, ambulance, taxi = (
        _branch(created, name) for name in ('Standard', 'Ambulance', 'Taxi')
    )
    in_progress = trigger(signed_in_client, created['id'])
    _shared(fake_eudiplo, in_progress['reference'])

    saved = _save(signed_in_client, created, [_as_sent(standard), _as_sent(taxi)])
    later = trigger(signed_in_client, created['id'])

    assert [branch['name'] for branch in saved['branches']] == ['Standard', 'Taxi']
    with SessionLocal() as db:
        assert db.get_one(FormConnectionBranch, ambulance['id']).deleted_at is not None
    # For every request, also one in progress, and before the reference is checked
    for reference in (in_progress['reference'], later['reference'], 'made-up'):
        response = _get(signed_in_client, ambulance, reference)
        assert response.status_code == 409
        assert response.json() == BRANCH_DELETED
    # The request in progress carries on through the other branches (US3-AS9)
    for branch in (taxi, standard):
        assert _pull(signed_in_client, branch, in_progress['reference'])['documents']
    assert _pull(signed_in_client, taxi, later['reference'])['status'] == 'pending'


def test_deactivating_stops_every_branch_and_activating_restores_them(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    standard, ambulance = _branch(created, 'Standard'), _branch(created, 'Ambulance')
    before = trigger(signed_in_client, created['id'])
    form_connection_url = f'/api/form-connections/{created["id"]}'

    signed_in_client.post(f'{form_connection_url}/deactivate', json={})
    for branch in (standard, ambulance):
        response = _get(signed_in_client, branch, before['reference'])
        assert response.status_code == 409
        assert response.json() == UNAVAILABLE

    signed_in_client.post(f'{form_connection_url}/activate', json={})
    after = trigger(signed_in_client, created['id'])

    # Deactivating cancelled the open request; the URLs answer again, unchanged
    assert _pull(signed_in_client, ambulance, before['reference'])['status'] == (
        'unavailable'
    )
    assert _pull(signed_in_client, ambulance, after['reference'])['status'] == 'pending'
    assert (
        _branch(signed_in_client.get(form_connection_url).json()['data'], 'Ambulance')[
            'pull_url'
        ]
        == ambulance['pull_url']
    )


# EUDIPLO failures and the logs


def test_a_eudiplo_failure_through_a_branch_answers_502_and_consumes_nothing(
    signed_in_client: TestClient, fake_eudiplo: FakeEudiplo
) -> None:
    created = _create(signed_in_client, AMBULANCE)
    ambulance = _branch(created, 'Ambulance')
    started = trigger(signed_in_client, created['id'])
    _shared(fake_eudiplo, started['reference'])
    fake_eudiplo.fail('get_session', 500)

    response = _get(signed_in_client, ambulance, started['reference'])

    assert response.status_code == 502
    assert response.json() == {
        'error': 'Upstream error',
        'message': PULL_FAILED,
        'error_id': response.json()['error_id'],
    }
    assert stored_request(started['reference']).documents_delivered_at is None
    assert _pull(signed_in_client, ambulance, started['reference'])['documents']


def test_the_access_log_shows_no_reference_of_a_branchs_pull_url() -> None:
    path = '/api/connect/fc-1/branches/b-1/requests/q3Vh1x0d6vTt0m2T5kQx0b9cWl7l8sZp'
    # How uvicorn logs a request
    record = logging.LogRecord(
        'uvicorn.access',
        logging.INFO,
        'h11_impl.py',
        1,
        '%s - "%s %s HTTP/%s" %d',
        ('10.0.0.5:51234', 'GET', f'{path}?probe=1', '1.1', 200),
        None,
    )

    assert RedactReferencesFilter().filter(record) is True

    assert record.getMessage() == (
        '10.0.0.5:51234 - "GET /api/connect/fc-1/branches/b-1/requests/<reference>'
        '?probe=1 HTTP/1.1" 200'
    )
