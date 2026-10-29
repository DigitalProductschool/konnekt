"""Document type catalog (data-model.md "Document type catalog", research R4).

The document types DO.IT can request, with the fields each one offers. Field keys are
stable: they appear in the API, in the configurations sent to EUDIPLO and in the
documents delivered to serviceBW. Labels are UI copy: they use the Figma design's
wording where the design names a field (design-notes.md §8), and data-model.md's
elsewhere. The catalog order is the order of the API, of the claims in a request and of
the delivered fields.

Each field also has a kind of value, which decides the conditions a rule can check on
it (spec 002, FR-003, research R6): an enum names its value set in `option_sets.py`,
and a field made of parts lists them.
"""

from dataclasses import dataclass
from typing import Literal

SD_JWT_VC_FORMAT = 'dc+sd-jwt'
MDOC_FORMAT = 'mso_mdoc'
MDL_NAMESPACE = 'org.iso.18013.5.1'

# Rules can't check images: the UI offers them as "Can't be checked" (FR-002)
FieldKind = Literal['text', 'number', 'date', 'enum', 'image', 'parts']
PartKind = Literal['text', 'enum', 'date']

# The value sets of option_sets.py that the catalog uses
COUNTRIES = 'countries'
SEX = 'sex'
LICENCE_CLASSES = 'licence_classes'
EYE_COLOURS = 'eye_colours'
HAIR_COLOURS = 'hair_colours'


@dataclass(frozen=True)
class CatalogPart:
    """A part of a field that rules check on its own, such as a licence class."""

    key: str
    label: str
    kind: PartKind
    # Enum parts: the key of their value set
    option_set: str | None = None
    # One part per licence class, such as "Licence class B – Issue date"
    per_licence_class: bool = False
    # Whether a document can give several values for it, such as the classes held
    multiple_values: bool = False


@dataclass(frozen=True)
class CatalogField:
    """A field of a document type, where its value sits, and its kind of value."""

    key: str
    label: str
    # SD-JWT VC: the claim path; mdoc: (namespace, element)
    claim_path: tuple[str, ...]
    kind: FieldKind
    # Enum fields: the key of their value set
    option_set: str | None = None
    # A date worded as an age: "is at least 21 years old" (FR-003)
    date_of_birth: bool = False
    # Fields of kind 'parts' only
    parts: tuple[CatalogPart, ...] | None = None
    # Whether a document can give several values for it, such as the nationalities.
    # Images and fields made of parts don't: a field made of parts declares it on them
    multiple_values: bool = False


@dataclass(frozen=True)
class CatalogDocumentType:
    """A kind of document an EUDI Wallet can hold, and the fields it offers."""

    key: str
    label: str
    # SD_JWT_VC_FORMAT or MDOC_FORMAT
    format: str
    fields: tuple[CatalogField, ...]
    # SD-JWT VC only: the accepted credential types
    vct_values: tuple[str, ...] = ()
    # mdoc only: the document type
    doctype_value: str | None = None

    def field(self, key: str) -> CatalogField | None:
        """Return the field with this key, or None."""
        return next((field for field in self.fields if field.key == key), None)


def _claim(
    key: str,
    label: str,
    kind: FieldKind,
    *claim_path: str,
    option_set: str | None = None,
    date_of_birth: bool = False,
    parts: tuple[CatalogPart, ...] | None = None,
    multiple_values: bool = False,
) -> CatalogField:
    # An SD-JWT VC claim; most sit at the top level under their own key
    return CatalogField(
        key,
        label,
        claim_path or (key,),
        kind,
        option_set,
        date_of_birth,
        parts,
        multiple_values,
    )


def _mdl_element(
    key: str,
    label: str,
    kind: FieldKind,
    *,
    option_set: str | None = None,
    date_of_birth: bool = False,
    parts: tuple[CatalogPart, ...] | None = None,
    multiple_values: bool = False,
) -> CatalogField:
    return CatalogField(
        key,
        label,
        (MDL_NAMESPACE, key),
        kind,
        option_set,
        date_of_birth,
        parts,
        multiple_values,
    )


# PID rulebook v1.7, SD-JWT VC encoding
PID = CatalogDocumentType(
    key='pid',
    label='Personal ID',
    format=SD_JWT_VC_FORMAT,
    vct_values=('urn:eudi:pid:1', 'urn:eudi:pid:de:1'),
    fields=(
        _claim('family_name', 'Family name', 'text'),
        _claim('given_name', 'Given name', 'text'),
        _claim('birthdate', 'Date of birth', 'date', date_of_birth=True),
        # An object with locality, region and/or country
        _claim(
            'place_of_birth',
            'Place of birth',
            'parts',
            parts=(
                CatalogPart('country', 'Country', 'enum', COUNTRIES),
                CatalogPart('region', 'Region', 'text'),
                CatalogPart('locality', 'City or town', 'text'),
            ),
        ),
        # A list: a person can have several nationalities
        _claim(
            'nationalities',
            'Nationality',
            'enum',
            option_set=COUNTRIES,
            multiple_values=True,
        ),
        _claim('address_formatted', 'Address (full)', 'text', 'address', 'formatted'),
        _claim(
            'address_street_address',
            'Street (may include the house number)',
            'text',
            'address',
            'street_address',
        ),
        _claim(
            'address_house_number', 'House number', 'text', 'address', 'house_number'
        ),
        _claim('address_postal_code', 'Postal code', 'text', 'address', 'postal_code'),
        _claim('address_locality', 'City or town', 'text', 'address', 'locality'),
        _claim('address_region', 'State or region', 'text', 'address', 'region'),
        _claim(
            'address_country',
            'Country of residence',
            'enum',
            'address',
            'country',
            option_set=COUNTRIES,
        ),
        _claim(
            'personal_administrative_number', 'Personal administrative number', 'text'
        ),
        _claim('picture', 'Photo', 'image'),
        _claim('birth_family_name', 'Family name at birth', 'text'),
        _claim('birth_given_name', 'Given name at birth', 'text'),
        _claim('sex', 'Sex', 'enum', option_set=SEX),
        _claim('email', 'Email address', 'text'),
        _claim('phone_number', 'Mobile phone number', 'text'),
        _claim('document_number', 'Document number', 'text'),
        _claim('date_of_issuance', 'Issue date', 'date'),
        _claim('date_of_expiry', 'Expiry date', 'date'),
        _claim('issuing_authority', 'Issuing authority', 'text'),
        _claim('issuing_country', 'Issuing country', 'enum', option_set=COUNTRIES),
        _claim('issuing_jurisdiction', 'Issuing jurisdiction', 'text'),
    ),
)

# ISO/IEC 18013-5 data elements, in the standard's order. Elements whose names vary
# by issuer (age_over_NN, biometric_template_xx) are left out: rules check an age
# through the date of birth (F20), and "Age in years" and "Year of birth" are numbers.
MDL = CatalogDocumentType(
    key='mdl',
    label='Driving licence',
    format=MDOC_FORMAT,
    doctype_value='org.iso.18013.5.1.mDL',
    fields=(
        _mdl_element('family_name', 'Family name', 'text'),
        _mdl_element('given_name', 'Given name', 'text'),
        _mdl_element('birth_date', 'Date of birth', 'date', date_of_birth=True),
        _mdl_element('issue_date', 'Issue date', 'date'),
        _mdl_element('expiry_date', 'Expiry date', 'date'),
        _mdl_element(
            'issuing_country', 'Issuing country', 'enum', option_set=COUNTRIES
        ),
        _mdl_element('issuing_authority', 'Issuing authority', 'text'),
        _mdl_element('document_number', 'Licence number', 'text'),
        _mdl_element('portrait', 'Portrait', 'image'),
        _mdl_element(
            'driving_privileges',
            'Licence classes',
            'parts',
            parts=(
                CatalogPart(
                    'classes',
                    'Licence classes',
                    'enum',
                    LICENCE_CLASSES,
                    multiple_values=True,
                ),
                CatalogPart('issue_date', 'Issue date', 'date', per_licence_class=True),
                CatalogPart(
                    'expiry_date', 'Expiry date', 'date', per_licence_class=True
                ),
            ),
        ),
        _mdl_element('un_distinguishing_sign', 'UN distinguishing sign', 'text'),
        _mdl_element('administrative_number', 'Administrative number', 'text'),
        _mdl_element('sex', 'Sex', 'enum', option_set=SEX),
        _mdl_element('height', 'Height (cm)', 'number'),
        _mdl_element('weight', 'Weight (kg)', 'number'),
        _mdl_element('eye_colour', 'Eye colour', 'enum', option_set=EYE_COLOURS),
        _mdl_element('hair_colour', 'Hair colour', 'enum', option_set=HAIR_COLOURS),
        _mdl_element('birth_place', 'Place of birth', 'text'),
        _mdl_element('resident_address', 'Resident address', 'text'),
        _mdl_element('portrait_capture_date', 'Portrait capture date', 'date'),
        _mdl_element('age_in_years', 'Age in years', 'number'),
        _mdl_element('age_birth_year', 'Year of birth', 'number'),
        _mdl_element('issuing_jurisdiction', 'Issuing jurisdiction', 'text'),
        _mdl_element('nationality', 'Nationality', 'enum', option_set=COUNTRIES),
        _mdl_element('resident_city', 'Resident city', 'text'),
        _mdl_element('resident_state', 'Resident state', 'text'),
        _mdl_element('resident_postal_code', 'Resident postal code', 'text'),
        _mdl_element(
            'resident_country', 'Resident country', 'enum', option_set=COUNTRIES
        ),
        _mdl_element(
            'family_name_national_character',
            'Family name (national characters)',
            'text',
        ),
        _mdl_element(
            'given_name_national_character',
            'Given name (national characters)',
            'text',
        ),
        _mdl_element('signature_usual_mark', 'Signature or usual mark', 'image'),
    ),
)

DOCUMENT_TYPES: tuple[CatalogDocumentType, ...] = (PID, MDL)


def get_document_type(key: str) -> CatalogDocumentType | None:
    """Return the document type with this key, or None."""
    return next((type_ for type_ in DOCUMENT_TYPES if type_.key == key), None)
