import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

import pytest

from app.schemas import RequestedDocument
from app.services.documents import extract_documents, json_value
from app.services.eudiplo import PresentedCredential

REQUEST_ID = '0b5c8a52-6d0c-4f3e-9a51-2f6a1f0c7e11'

PID_CLAIMS: dict[str, Any] = {
    # Technical claims that must never pass through
    'iss': 'https://pid-issuer.test',
    'vct': 'urn:eudi:pid:de:1',
    'iat': 1791500000,
    'exp': 1823036000,
    'family_name': 'Mustermann',
    'given_name': 'Erika',
    'birthdate': '1984-01-26',
    'nationalities': ['DE'],
    'address': {'locality': 'Stuttgart', 'postal_code': '70173'},
}
# EUDIPLO merges the mdoc namespaces into one flat object
MDL_CLAIMS: dict[str, Any] = {
    'family_name': 'Mustermann',
    'document_number': 'B072RRE2I55',
    'expiry_date': '2034-03-01',
    'driving_privileges': [{'vehicle_category_code': 'B', 'issue_date': '2019-03-01'}],
    'un_distinguishing_sign': 'D',
}


def _credentials(*entries: tuple[str, dict[str, Any]]) -> list[PresentedCredential]:
    return [
        PresentedCredential(id=key, values=[claims] if claims else [])
        for key, claims in entries
    ]


def _extract(
    credentials: list[PresentedCredential], *documents: tuple[str, list[str]]
) -> list[dict[str, Any]]:
    requested = [
        RequestedDocument(document_type=key, fields=fields) for key, fields in documents
    ]
    delivered = extract_documents(credentials, requested, request_id=REQUEST_ID)
    return [document.model_dump() for document in delivered]


def _values(document: dict[str, Any]) -> dict[str, Any]:
    return {field['key']: field['value'] for field in document['fields']}


def test_sd_jwt_values_are_found_along_their_claim_path() -> None:
    (pid,) = _extract(
        _credentials(('pid', PID_CLAIMS)),
        ('pid', ['address_locality', 'address_postal_code']),
    )

    assert _values(pid) == {
        'address_locality': 'Stuttgart',
        'address_postal_code': '70173',
    }


def test_mdoc_values_are_found_by_element_name() -> None:
    (mdl,) = _extract(
        _credentials(('mdl', MDL_CLAIMS)),
        ('mdl', ['document_number', 'driving_privileges']),
    )

    assert _values(mdl) == {
        'document_number': 'B072RRE2I55',
        'driving_privileges': [
            {'vehicle_category_code': 'B', 'issue_date': '2019-03-01'}
        ],
    }


def test_driving_privileges_are_delivered_with_their_full_entries() -> None:
    # The ISO/IEC 18013-5 shape, as a fixed EUDIPLO hands it out
    privileges = [
        {'vehicle_category_code': 'AM', 'issue_date': '2003-05-12'},
        {
            'vehicle_category_code': 'B',
            'issue_date': '2003-05-12',
            'expiry_date': '2033-05-11',
            'codes': [{'code': '96', 'sign': '<=', 'value': '4250'}],
        },
        {'vehicle_category_code': 'L', 'issue_date': '2003-05-12'},
    ]

    (mdl,) = _extract(
        _credentials(('mdl', {'driving_privileges': privileges})),
        ('mdl', ['driving_privileges']),
    )

    assert _values(mdl) == {
        'driving_privileges': [
            {'vehicle_category_code': 'AM', 'issue_date': '2003-05-12'},
            {
                'vehicle_category_code': 'B',
                'issue_date': '2003-05-12',
                'expiry_date': '2033-05-11',
                'codes': [{'code': '96', 'sign': '<=', 'value': '4250'}],
            },
            {'vehicle_category_code': 'L', 'issue_date': '2003-05-12'},
        ]
    }


def test_driving_privileges_emptied_by_eudiplo_are_logged_by_key_only(
    caplog: pytest.LogCaptureFixture,
) -> None:
    # EUDIPLO up to 9.1.0 writes each nested mdoc map as {}
    claims = {'document_number': 'B072RRE2I55', 'driving_privileges': [{}, {}, {}]}

    with caplog.at_level(logging.WARNING):
        (mdl,) = _extract(
            _credentials(('mdl', claims)),
            ('mdl', ['document_number', 'driving_privileges']),
        )

    assert _values(mdl) == {
        'document_number': 'B072RRE2I55',
        'driving_privileges': [{}, {}, {}],
    }
    (line,) = [record.getMessage() for record in caplog.records]
    assert REQUEST_ID in line
    assert 'mdl' in line
    assert 'driving_privileges' in line
    assert '{}' not in line
    assert 'B072RRE2I55' not in line


@pytest.mark.parametrize(
    'value',
    [[], [{'vehicle_category_code': 'B'}, {}], ['B'], {}],
)
def test_other_mdoc_values_log_no_warning(
    value: object, caplog: pytest.LogCaptureFixture
) -> None:
    with caplog.at_level(logging.WARNING):
        _extract(
            _credentials(('mdl', {'driving_privileges': value})),
            ('mdl', ['driving_privileges']),
        )

    assert caplog.records == []


def test_mdoc_values_kept_apart_by_namespace_are_found_too() -> None:
    claims = {'org.iso.18013.5.1': {'document_number': 'B072RRE2I55'}}

    (mdl,) = _extract(_credentials(('mdl', claims)), ('mdl', ['document_number']))

    assert _values(mdl) == {'document_number': 'B072RRE2I55'}


def test_only_the_configured_fields_are_delivered_in_configuration_order() -> None:
    delivered = _extract(
        # The wallet's order differs from the configuration's
        _credentials(('mdl', MDL_CLAIMS), ('pid', PID_CLAIMS)),
        ('pid', ['family_name', 'given_name', 'birthdate', 'address_locality']),
        ('mdl', ['expiry_date', 'document_number']),
    )

    assert delivered == [
        {
            'document_type': 'pid',
            'label': 'Personal ID',
            'fields': [
                {'key': 'family_name', 'label': 'Family name', 'value': 'Mustermann'},
                {'key': 'given_name', 'label': 'Given name', 'value': 'Erika'},
                {'key': 'birthdate', 'label': 'Date of birth', 'value': '1984-01-26'},
                {
                    'key': 'address_locality',
                    'label': 'City or town',
                    'value': 'Stuttgart',
                },
            ],
        },
        {
            'document_type': 'mdl',
            'label': 'Driving licence',
            'fields': [
                {'key': 'expiry_date', 'label': 'Expiry date', 'value': '2034-03-01'},
                {
                    'key': 'document_number',
                    'label': 'Licence number',
                    'value': 'B072RRE2I55',
                },
            ],
        },
    ]


def test_technical_and_unrequested_claims_are_dropped() -> None:
    (pid,) = _extract(_credentials(('pid', PID_CLAIMS)), ('pid', ['family_name']))

    text = str(pid)
    for value in ('pid-issuer.test', 'urn:eudi:pid', '1791500000', 'DE', '70173'):
        assert value not in text


def test_the_first_presentation_of_a_document_counts() -> None:
    credentials = [
        PresentedCredential(
            id='pid', values=[{'family_name': 'First'}, {'family_name': 'Second'}]
        ),
        PresentedCredential(id='pid', values=[{'family_name': 'Third'}]),
    ]

    (pid,) = _extract(credentials, ('pid', ['family_name']))

    assert _values(pid) == {'family_name': 'First'}


def test_a_missing_value_is_null_and_logged_by_its_key_only(
    caplog: pytest.LogCaptureFixture,
) -> None:
    claims = {key: value for key, value in PID_CLAIMS.items() if key != 'birthdate'}

    with caplog.at_level(logging.WARNING):
        (pid,) = _extract(
            _credentials(('pid', claims)), ('pid', ['family_name', 'birthdate'])
        )

    assert _values(pid) == {'family_name': 'Mustermann', 'birthdate': None}
    (line,) = [record.getMessage() for record in caplog.records]
    assert REQUEST_ID in line
    assert 'birthdate' in line
    assert 'Mustermann' not in line


def test_a_document_missing_from_the_credentials_gives_null_values() -> None:
    (mdl,) = _extract(
        _credentials(('pid', PID_CLAIMS)), ('mdl', ['document_number', 'expiry_date'])
    )

    assert _values(mdl) == {'document_number': None, 'expiry_date': None}


def test_a_value_inside_a_claim_that_isnt_an_object_is_missing() -> None:
    (pid,) = _extract(
        _credentials(('pid', {'address': 'Heidestraße 17, Stuttgart'})),
        ('pid', ['address_locality']),
    )

    assert _values(pid) == {'address_locality': None}


def test_values_keep_their_json_type() -> None:
    claims = {'age_in_years': 41, 'height': 172.5, 'nationality': None}

    (mdl,) = _extract(
        _credentials(('mdl', claims)),
        ('mdl', ['height', 'age_in_years', 'nationality']),
    )

    assert _values(mdl) == {'height': 172.5, 'age_in_years': 41, 'nationality': None}


@pytest.mark.parametrize(
    ('value', 'expected'),
    [
        # Bytes as base64
        (b'\xff\xd8\xff\xe0', '/9j/4A=='),
        # A Node.js Buffer, as JSON shows it
        ({'type': 'Buffer', 'data': [255, 216, 255, 224]}, '/9j/4A=='),
        # A Uint8Array, as JSON shows it
        ({'0': 255, '1': 216, '2': 255, '3': 224}, '/9j/4A=='),
        # Dates as ISO 8601
        (date(2019, 3, 1), '2019-03-01'),
        (datetime(2026, 10, 7, 10, 10, tzinfo=timezone.utc), '2026-10-07T10:10:00Z'),
        (
            datetime(2026, 10, 7, 12, 10, tzinfo=timezone(timedelta(hours=2))),
            '2026-10-07T10:10:00Z',
        ),
        # Nested inside lists and objects
        (
            [{'vehicle_category_code': 'B', 'issue_date': date(2019, 3, 1)}],
            [{'vehicle_category_code': 'B', 'issue_date': '2019-03-01'}],
        ),
        ({'signature': b'\x01\x02'}, {'signature': 'AQI='}),
    ],
)
def test_binary_values_become_base64_and_dates_iso_8601(
    value: object, expected: object
) -> None:
    assert json_value(value) == expected


@pytest.mark.parametrize(
    'value',
    [
        'Stuttgart',
        41,
        172.5,
        True,
        None,
        [1, 2, 300],
        {'locality': 'Stuttgart', 'country': 'DE'},
        # Not bytes: an index is missing, or a value isn't a byte
        {'0': 255, '2': 216},
        {'0': 'B'},
        {'0': 256},
        {'type': 'Buffer', 'data': [1, 256]},
        {'type': 'Buffer', 'data': 'AQI='},
        {},
    ],
)
def test_other_values_keep_their_shape(value: object) -> None:
    assert json_value(value) == value
