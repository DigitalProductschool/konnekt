import re

import pytest

from app.catalog import (
    DOCUMENT_TYPES,
    MDL,
    MDL_NAMESPACE,
    MDOC_FORMAT,
    PID,
    SD_JWT_VC_FORMAT,
    CatalogDocumentType,
    get_document_type,
)

# data-model.md, "Document type catalog": keys and claim paths, in catalog order
PID_CLAIM_PATHS = [
    ('family_name', ['family_name']),
    ('given_name', ['given_name']),
    ('birthdate', ['birthdate']),
    ('place_of_birth', ['place_of_birth']),
    ('nationalities', ['nationalities']),
    ('address_formatted', ['address', 'formatted']),
    ('address_street_address', ['address', 'street_address']),
    ('address_house_number', ['address', 'house_number']),
    ('address_postal_code', ['address', 'postal_code']),
    ('address_locality', ['address', 'locality']),
    ('address_region', ['address', 'region']),
    ('address_country', ['address', 'country']),
    ('personal_administrative_number', ['personal_administrative_number']),
    ('picture', ['picture']),
    ('birth_family_name', ['birth_family_name']),
    ('birth_given_name', ['birth_given_name']),
    ('sex', ['sex']),
    ('email', ['email']),
    ('phone_number', ['phone_number']),
    ('document_number', ['document_number']),
    ('date_of_issuance', ['date_of_issuance']),
    ('date_of_expiry', ['date_of_expiry']),
    ('issuing_authority', ['issuing_authority']),
    ('issuing_country', ['issuing_country']),
    ('issuing_jurisdiction', ['issuing_jurisdiction']),
]

# ISO/IEC 18013-5 data elements, in the standard's order
MDL_ELEMENTS = [
    'family_name',
    'given_name',
    'birth_date',
    'issue_date',
    'expiry_date',
    'issuing_country',
    'issuing_authority',
    'document_number',
    'portrait',
    'driving_privileges',
    'un_distinguishing_sign',
    'administrative_number',
    'sex',
    'height',
    'weight',
    'eye_colour',
    'hair_colour',
    'birth_place',
    'resident_address',
    'portrait_capture_date',
    'age_in_years',
    'age_birth_year',
    'issuing_jurisdiction',
    'nationality',
    'resident_city',
    'resident_state',
    'resident_postal_code',
    'resident_country',
    'family_name_national_character',
    'given_name_national_character',
    'signature_usual_mark',
]

# EUDIPLO's pattern for DCQL credential query ids (research R19, item 4)
QUERY_ID = re.compile(r'[A-Za-z0-9_-]+')


def test_the_catalog_offers_the_pid_and_the_mobile_driving_licence() -> None:
    assert [document_type.key for document_type in DOCUMENT_TYPES] == ['pid', 'mdl']
    assert get_document_type('pid') is PID
    assert get_document_type('mdl') is MDL
    assert get_document_type('passport') is None


def test_document_type_keys_are_valid_dcql_query_ids() -> None:
    assert all(QUERY_ID.fullmatch(type_.key) for type_ in DOCUMENT_TYPES)


@pytest.mark.parametrize('document_type', DOCUMENT_TYPES, ids=lambda t: t.key)
def test_field_keys_are_unique_and_every_field_has_a_label(
    document_type: CatalogDocumentType,
) -> None:
    keys = [field.key for field in document_type.fields]
    assert len(keys) == len(set(keys))
    assert all(field.label.strip() for field in document_type.fields)
    assert document_type.label.strip()


def test_pid_is_an_sd_jwt_vc_with_the_rulebook_claims() -> None:
    assert PID.format == SD_JWT_VC_FORMAT == 'dc+sd-jwt'
    assert PID.vct_values == ('urn:eudi:pid:1', 'urn:eudi:pid:de:1')
    assert PID.doctype_value is None
    assert len(PID.fields) == 25
    assert [(field.key, list(field.claim_path)) for field in PID.fields] == (
        PID_CLAIM_PATHS
    )


def test_mdl_is_an_mdoc_with_the_iso_data_elements() -> None:
    assert MDL.format == MDOC_FORMAT == 'mso_mdoc'
    assert MDL.doctype_value == 'org.iso.18013.5.1.mDL'
    assert MDL.vct_values == ()
    assert len(MDL.fields) == 31
    assert [field.key for field in MDL.fields] == MDL_ELEMENTS
    assert all(field.claim_path == (MDL_NAMESPACE, field.key) for field in MDL.fields)
    assert MDL_NAMESPACE == 'org.iso.18013.5.1'


def test_fields_are_found_by_key() -> None:
    family_name = PID.field('family_name')

    assert family_name is not None
    assert family_name.label == 'Family name'
    assert PID.field('address_locality') is not None
    assert PID.field('birth_date') is None
    assert MDL.field('birth_date') is not None
