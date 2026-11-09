import re
from contextvars import copy_context

import pytest

from app.catalog import (
    DOCUMENT_TYPES,
    MDL,
    MDL_NAMESPACE,
    MDOC_FORMAT,
    PID,
    SD_JWT_VC_FORMAT,
    CatalogDocumentType,
    CatalogField,
    CatalogPart,
    get_document_type,
    label_of,
)
from app.language import Language, request_language
from app.option_sets import OPTION_SETS
from app.schemas import DocumentField
from app.services.form_connections import document_field_view

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


# Kinds of value (spec 002, research R6)

PID_KINDS = {
    'family_name': 'text',
    'given_name': 'text',
    'birthdate': 'date',
    'place_of_birth': 'parts',
    'nationalities': 'enum',
    'address_formatted': 'text',
    'address_street_address': 'text',
    'address_house_number': 'text',
    'address_postal_code': 'text',
    'address_locality': 'text',
    'address_region': 'text',
    'address_country': 'enum',
    'personal_administrative_number': 'text',
    'picture': 'image',
    'birth_family_name': 'text',
    'birth_given_name': 'text',
    'sex': 'enum',
    'email': 'text',
    'phone_number': 'text',
    'document_number': 'text',
    'date_of_issuance': 'date',
    'date_of_expiry': 'date',
    'issuing_authority': 'text',
    'issuing_country': 'enum',
    'issuing_jurisdiction': 'text',
}

MDL_KINDS = {
    'family_name': 'text',
    'given_name': 'text',
    'birth_date': 'date',
    'issue_date': 'date',
    'expiry_date': 'date',
    'issuing_country': 'enum',
    'issuing_authority': 'text',
    'document_number': 'text',
    'portrait': 'image',
    'driving_privileges': 'parts',
    'un_distinguishing_sign': 'text',
    'administrative_number': 'text',
    'sex': 'enum',
    'height': 'number',
    'weight': 'number',
    'eye_colour': 'enum',
    'hair_colour': 'enum',
    'birth_place': 'text',
    'resident_address': 'text',
    'portrait_capture_date': 'date',
    'age_in_years': 'number',
    'age_birth_year': 'number',
    'issuing_jurisdiction': 'text',
    'nationality': 'enum',
    'resident_city': 'text',
    'resident_state': 'text',
    'resident_postal_code': 'text',
    'resident_country': 'enum',
    'family_name_national_character': 'text',
    'given_name_national_character': 'text',
    'signature_usual_mark': 'image',
}

# The value set of every enum field
ENUM_OPTION_SETS = {
    ('pid', 'nationalities'): 'countries',
    ('pid', 'address_country'): 'countries',
    ('pid', 'sex'): 'sex',
    ('pid', 'issuing_country'): 'countries',
    ('mdl', 'issuing_country'): 'countries',
    ('mdl', 'sex'): 'sex',
    ('mdl', 'eye_colour'): 'eye_colours',
    ('mdl', 'hair_colour'): 'hair_colours',
    ('mdl', 'nationality'): 'countries',
    ('mdl', 'resident_country'): 'countries',
}

LICENCE_CLASSES = [
    'AM',
    'A1',
    'A2',
    'A',
    'B1',
    'B',
    'BE',
    'C1',
    'C1E',
    'C',
    'CE',
    'D1',
    'D1E',
    'D',
    'DE',
    'L',
    'T',
]


def _parts() -> list[CatalogPart]:
    return [
        part
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        for part in field.parts or ()
    ]


def test_every_field_has_the_kind_of_research_r6() -> None:
    assert {field.key: field.kind for field in PID.fields} == PID_KINDS
    assert {field.key: field.kind for field in MDL.fields} == MDL_KINDS


def test_enum_fields_and_only_they_name_their_value_set() -> None:
    option_sets = {
        (document_type.key, field.key): field.option_set
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.option_set is not None or field.kind == 'enum'
    }

    assert option_sets == ENUM_OPTION_SETS


def test_the_place_of_birth_and_the_licence_classes_have_parts() -> None:
    place_of_birth = PID.field('place_of_birth')
    driving_privileges = MDL.field('driving_privileges')

    assert place_of_birth is not None and driving_privileges is not None
    assert place_of_birth.parts == (
        CatalogPart('country', 'Country', 'enum', 'countries', label_de='Land'),
        CatalogPart('region', 'Region', 'text', label_de='Region'),
        CatalogPart('locality', 'City or town', 'text', label_de='Ort'),
    )
    assert driving_privileges.parts == (
        CatalogPart(
            'classes',
            'Licence classes',
            'enum',
            'licence_classes',
            label_de='Führerscheinklassen',
            multiple_values=True,
        ),
        CatalogPart(
            'issue_date',
            'Issue date',
            'date',
            label_de='Ausstellungsdatum',
            per_licence_class=True,
        ),
        CatalogPart(
            'expiry_date',
            'Expiry date',
            'date',
            label_de='Ablaufdatum',
            per_licence_class=True,
        ),
    )
    # Parts belong to fields made of parts, and only enum parts have a value set
    for document_type in DOCUMENT_TYPES:
        for field in document_type.fields:
            assert (field.parts is not None) == (field.kind == 'parts'), field.key
    for part in _parts():
        assert (part.option_set is not None) == (part.kind == 'enum'), part.key


def test_every_value_set_the_catalog_names_exists() -> None:
    named = {
        field.option_set
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.option_set is not None
    } | {part.option_set for part in _parts() if part.option_set is not None}

    assert named == set(OPTION_SETS)


def test_only_the_dates_of_birth_are_worded_as_an_age() -> None:
    dates_of_birth = [
        (document_type.key, field.key)
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.date_of_birth
    ]

    assert dates_of_birth == [('pid', 'birthdate'), ('mdl', 'birth_date')]
    assert all(
        field.kind == 'date'
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.date_of_birth
    )


def test_only_the_nationalities_and_the_licence_classes_hold_several_values() -> None:
    # data-model.md, "Catalog: multiple_values" (research R9)
    fields = [
        (document_type.key, field.key)
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.multiple_values
    ]
    parts = [
        (document_type.key, field.key, part.key)
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        for part in field.parts or ()
        if part.multiple_values
    ]

    assert fields == [('pid', 'nationalities')]
    assert parts == [('mdl', 'driving_privileges', 'classes')]
    # A field made of parts declares it on its parts, and an image holds one picture
    assert not [
        field.key
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.multiple_values and field.kind in ('image', 'parts')
    ]


def test_no_age_over_element_is_in_the_catalog() -> None:
    # Age is checked through the date of birth (F20)
    assert not [
        field.key
        for document_type in DOCUMENT_TYPES
        for field in document_type.fields
        if field.key.startswith('age_over')
    ]


@pytest.mark.parametrize('key', list(OPTION_SETS))
def test_every_value_set_has_options_with_unique_values_and_labels(key: str) -> None:
    options = OPTION_SETS[key]
    values = [option.value for option in options]
    labels = [option.label for option in options]

    assert options
    assert len(values) == len(set(values))
    assert len(labels) == len(set(labels))
    assert all(label.strip() for label in labels)


def test_the_countries_are_the_iso_3166_alpha_2_codes() -> None:
    countries = OPTION_SETS['countries']

    assert len(countries) == 249
    assert all(re.fullmatch('[A-Z]{2}', str(option.value)) for option in countries)
    assert ('DE', 'Germany') in [(option.value, option.label) for option in countries]


def test_the_sex_codes_follow_the_pid_rulebook() -> None:
    assert [option.value for option in OPTION_SETS['sex']] == [0, 1, 2, 3, 4, 5, 6, 9]


def test_the_17_licence_classes_have_descriptions() -> None:
    classes = OPTION_SETS['licence_classes']

    assert [option.value for option in classes] == LICENCE_CLASSES
    # Statements show the code alone, the class menu its description too
    assert all(option.label == option.value for option in classes)
    assert all(option.description for option in classes)
    assert next(option for option in classes if option.value == 'B').description == (
        'Cars up to 3.5 t'
    )


# German labels (spec 009, R6, glossary §4)

# Labels that are the same word in both languages (glossary §1, "Identifiers", and
# the completeness tests' allowlist): nothing else may equal its English
EQUAL_IN_BOTH_LANGUAGES = {'Region'}


def _labelled() -> list[CatalogDocumentType | CatalogField | CatalogPart]:
    items: list[CatalogDocumentType | CatalogField | CatalogPart] = []
    for document_type in DOCUMENT_TYPES:
        items.append(document_type)
        for field in document_type.fields:
            items.append(field)
            items.extend(field.parts or ())
    return items


Labelled = CatalogDocumentType | CatalogField | CatalogPart


def _in(language: Language, item: Labelled) -> str:
    def run() -> str:
        request_language.set(language)
        return label_of(item)

    return copy_context().run(run)


def test_every_label_has_its_german() -> None:
    items = _labelled()

    # Two document types, 56 fields and 6 parts
    assert len(items) == 2 + 56 + 6
    for item in items:
        assert item.label_de.strip(), item.label
        assert item.label_de != item.label or item.label in EQUAL_IN_BOTH_LANGUAGES, (
            item.label
        )


def test_the_glossary_labels_are_used() -> None:
    place_of_birth = PID.field('place_of_birth')
    driving_privileges = MDL.field('driving_privileges')
    birthdate = PID.field('birthdate')

    assert place_of_birth is not None and place_of_birth.parts is not None
    assert driving_privileges is not None and driving_privileges.parts is not None
    assert birthdate is not None
    assert PID.label_de == 'Personalausweis'
    assert MDL.label_de == 'Führerschein'
    assert birthdate.label_de == 'Geburtsdatum'
    assert place_of_birth.label_de == 'Geburtsort'
    assert [part.label_de for part in place_of_birth.parts] == ['Land', 'Region', 'Ort']
    assert driving_privileges.label_de == 'Führerscheinklassen'
    assert [part.label_de for part in driving_privileges.parts] == [
        'Führerscheinklassen',
        'Ausstellungsdatum',
        'Ablaufdatum',
    ]


def test_label_of_follows_the_request_language() -> None:
    family_name = PID.field('family_name')
    assert family_name is not None

    # Outside a request: English
    assert label_of(PID) == 'Personal ID'
    assert _in('en', family_name) == 'Family name'
    assert _in('de', family_name) == 'Familienname'
    assert _in('de', MDL) == 'Führerschein'


def _without_labels(view: DocumentField) -> dict[str, object]:
    # A field view's values apart from its labels and its parts' labels
    values = view.model_dump(exclude={'label', 'parts'})
    values['parts'] = view.parts and [
        part.model_dump(exclude={'label'}) for part in view.parts
    ]
    return values


@pytest.mark.parametrize('language', ['en', 'de'])
def test_a_field_view_changes_only_its_labels(language: Language) -> None:
    fields = [field for type_ in DOCUMENT_TYPES for field in type_.fields]

    def run() -> list[DocumentField]:
        request_language.set(language)
        return [document_field_view(field) for field in fields]

    for field, view in zip(fields, copy_context().run(run), strict=True):
        validated = DocumentField.model_validate(field)
        assert _without_labels(view) == _without_labels(validated)
        german = language == 'de'
        assert view.label == (field.label_de if german else field.label)
        assert [part.label for part in view.parts or ()] == [
            part.label_de if german else part.label for part in field.parts or ()
        ]
