from typing import Any

import pytest

from app.schemas import RequestedDocument
from app.services.dcql import build_config, config_hash, config_id

FORM_CONNECTION_ID = '7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b'
TRUST_LIST_ID = '<EUDIPLO_TRUST_LIST_ID>'
TRUSTED_AUTHORITIES = [{'type': 'etsi_tl', 'values': [{'trustListId': TRUST_LIST_ID}]}]

# contracts/eudiplo-usage.md, "Presentation configuration (call 2)"
CONTRACT_EXAMPLE: dict[str, Any] = {
    'id': 'fc-7b1f0a9e-3c2d-4e5f-8a6b-9c0d1e2f3a4b-r2',
    'description': 'Driving licence application (Führerscheinantrag)',
    'lifeTime': 600,
    'statusCheckMode': 'strict',
    'dcql_query': {
        'credentials': [
            {
                'id': 'pid',
                'format': 'dc+sd-jwt',
                'meta': {'vct_values': ['urn:eudi:pid:1', 'urn:eudi:pid:de:1']},
                'trusted_authorities': TRUSTED_AUTHORITIES,
                'claims': [
                    {'path': ['family_name']},
                    {'path': ['given_name']},
                    {'path': ['birthdate']},
                    {'path': ['address', 'locality']},
                ],
            },
            {
                'id': 'mdl',
                'format': 'mso_mdoc',
                'meta': {'doctype_value': 'org.iso.18013.5.1.mDL'},
                'trusted_authorities': TRUSTED_AUTHORITIES,
                # Catalog order (ISO/IEC 18013-5): the expiry date comes first
                'claims': [
                    {'path': ['org.iso.18013.5.1', 'expiry_date']},
                    {'path': ['org.iso.18013.5.1', 'document_number']},
                    {'path': ['org.iso.18013.5.1', 'driving_privileges']},
                ],
            },
        ]
    },
}

DOCUMENTS = [
    RequestedDocument(
        document_type='pid',
        fields=['family_name', 'given_name', 'birthdate', 'address_locality'],
    ),
    RequestedDocument(
        document_type='mdl',
        fields=['document_number', 'driving_privileges', 'expiry_date'],
    ),
]


def _build(**overrides: Any) -> dict[str, Any]:
    arguments: dict[str, Any] = {
        'form_connection_id': FORM_CONNECTION_ID,
        'revision': 2,
        'name': 'Driving licence application (Führerscheinantrag)',
        'documents': DOCUMENTS,
        'lifetime_seconds': 600,
        'trust_list_id': TRUST_LIST_ID,
    }
    return build_config(**(arguments | overrides))


def test_the_body_for_the_pid_and_mdl_example_equals_the_contract() -> None:
    assert _build() == CONTRACT_EXAMPLE


def test_the_configuration_id_names_the_form_connection_and_revision() -> None:
    assert config_id(FORM_CONNECTION_ID, 1) == f'fc-{FORM_CONNECTION_ID}-r1'


def test_claims_follow_the_catalog_order_whatever_the_selection_order() -> None:
    body = _build(
        documents=[
            RequestedDocument(
                document_type='pid',
                fields=['address_locality', 'birthdate', 'family_name'],
            )
        ]
    )

    (credential,) = body['dcql_query']['credentials']
    assert credential['claims'] == [
        {'path': ['family_name']},
        {'path': ['birthdate']},
        {'path': ['address', 'locality']},
    ]


def test_every_query_trusts_the_same_trust_list() -> None:
    body = _build(trust_list_id='production-issuers')

    credentials = body['dcql_query']['credentials']
    assert len(credentials) == 2
    assert all(
        credential['trusted_authorities']
        == [{'type': 'etsi_tl', 'values': [{'trustListId': 'production-issuers'}]}]
        for credential in credentials
    )


def test_every_document_and_field_is_required() -> None:
    body = _build()

    # Without credential_sets and claim_sets, DCQL requires everything
    assert 'credential_sets' not in body['dcql_query']
    assert all('claim_sets' not in query for query in body['dcql_query']['credentials'])


@pytest.mark.parametrize(
    'document',
    [
        RequestedDocument(document_type='passport', fields=['family_name']),
        RequestedDocument(document_type='pid', fields=['birth_date']),
    ],
)
def test_unknown_document_types_and_fields_are_refused(
    document: RequestedDocument,
) -> None:
    with pytest.raises(ValueError):
        _build(documents=[document])


def test_the_hash_is_a_sha256_hex_digest() -> None:
    assert len(config_hash(_build())) == 64
    int(config_hash(_build()), 16)


def test_the_hash_ignores_the_id_and_the_description() -> None:
    renamed = _build(name='Another name', form_connection_id='other-id', revision=7)

    assert config_hash(renamed) == config_hash(_build())


def test_the_hash_ignores_the_order_of_keys() -> None:
    body = _build()
    reordered = dict(reversed(list(body.items())))

    assert config_hash(reordered) == config_hash(body)


@pytest.mark.parametrize(
    'change',
    [
        {'trust_list_id': 'another-trust-list'},
        {'lifetime_seconds': 300},
        {'documents': DOCUMENTS[:1]},
        {
            'documents': [
                RequestedDocument(document_type='pid', fields=['family_name']),
                DOCUMENTS[1],
            ]
        },
    ],
)
def test_the_hash_changes_with_the_trust_list_lifetime_and_documents(
    change: dict[str, Any],
) -> None:
    assert config_hash(_build(**change)) != config_hash(_build())
