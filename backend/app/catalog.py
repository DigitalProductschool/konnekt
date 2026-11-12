"""Document type catalog (data-model.md "Document type catalog", research R4).

The document types DO.IT can request, with the fields each one offers. Field keys are
stable: they appear in the API, in the configurations sent to EUDIPLO and in the
documents delivered to serviceBW. Labels are UI copy: they use the Figma design's
wording where the design names a field (design-notes.md §8), and data-model.md's
elsewhere. Each label has its German beside it (`label_de`, spec 009, glossary §4):
the website's answers show the request's language through `label_of()`, while the
DCQL builder, the evaluator, the worker and serviceBW's delivery keep `label`. The
catalog order is the order of the API, of the claims in a request and of the
delivered fields.

A document with more than 10 fields sorts them into data groups for the documents
step's panel (spec 010, FR-077, FR-078, research R8): `FIELD_GROUPS` names them in
the panel's order, and each field of such a document names its group's key. The
groups don't change the catalog's order, keys or claims.

Each field also has a kind of value, which decides the conditions a rule can check on
it (spec 002, FR-003, research R6): an enum names its value set in `option_sets.py`,
and a field made of parts lists them.
"""

import dataclasses
from dataclasses import dataclass
from typing import Literal

from .language import current_language

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
    # The label in German (spec 009); keyword-only, so positional calls keep meaning
    label_de: str = dataclasses.field(kw_only=True)
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
    # The label in German (spec 009); keyword-only, so positional calls keep meaning
    label_de: str = dataclasses.field(kw_only=True)
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
    # The key of its data group in FIELD_GROUPS; None in a document without groups
    group: str | None = None


@dataclass(frozen=True)
class CatalogFieldGroup:
    """A data group of the documents step's panel, such as "Address" (FR-077)."""

    key: str
    label: str
    # The label in German (spec 009); keyword-only, as the other labels
    label_de: str = dataclasses.field(kw_only=True)


# The data groups, in the order the panel shows them (data-model §6, FR-077): the
# groups every document shares, then a document's own, and "Other details" last
FIELD_GROUPS: tuple[CatalogFieldGroup, ...] = (
    CatalogFieldGroup('name', 'Name', label_de='Name'),
    CatalogFieldGroup('birth', 'Birth', label_de='Geburt'),
    CatalogFieldGroup('address', 'Address', label_de='Adresse'),
    CatalogFieldGroup('document', 'Document', label_de='Dokument'),
    CatalogFieldGroup('licence', 'Licence', label_de='Fahrerlaubnis'),
    CatalogFieldGroup('appearance', 'Appearance', label_de='Aussehen'),
    CatalogFieldGroup('other', 'Other details', label_de='Weitere Angaben'),
)

# A document with more fields than this shows them in groups (FR-077)
MAX_FIELDS_WITHOUT_GROUPS = 10


@dataclass(frozen=True)
class CatalogDocumentType:
    """A kind of document an EUDI Wallet can hold, and the fields it offers."""

    key: str
    label: str
    # The label in German (spec 009)
    label_de: str = dataclasses.field(kw_only=True)
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

    def field_groups(self) -> tuple[CatalogFieldGroup, ...]:
        """Return the data groups its fields use, in the panel's order (FR-077).

        Empty for a document with 10 fields or fewer: its panel keeps one list.
        """
        if len(self.fields) <= MAX_FIELDS_WITHOUT_GROUPS:
            return ()
        used = {field.group for field in self.fields}
        return tuple(group for group in FIELD_GROUPS if group.key in used)


def _claim(
    key: str,
    label: str,
    kind: FieldKind,
    *claim_path: str,
    label_de: str,
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
        label_de=label_de,
    )


def _mdl_element(
    key: str,
    label: str,
    kind: FieldKind,
    *,
    label_de: str,
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
        label_de=label_de,
    )


def _grouped(
    fields: tuple[CatalogField, ...], groups: dict[str, tuple[str, ...]]
) -> tuple[CatalogField, ...]:
    """Give each field its data group, keeping the fields' order (data-model §6).

    `groups` maps a group's key to the keys of its fields. A field named twice, or a
    key or group the catalog doesn't have, is a mistake in the table.
    """
    group_of: dict[str, str] = {}
    for group, keys in groups.items():
        if group not in {each.key for each in FIELD_GROUPS}:
            raise ValueError(f'Unknown data group {group}')
        for key in keys:
            if key in group_of:
                raise ValueError(f'The field {key} is in two data groups')
            group_of[key] = group
    unknown = set(group_of) - {field.key for field in fields}
    if unknown:
        raise ValueError(f'Unknown fields in the data groups: {sorted(unknown)}')
    return tuple(
        dataclasses.replace(field, group=group_of.get(field.key)) for field in fields
    )


# PID rulebook v1.7, SD-JWT VC encoding
PID = CatalogDocumentType(
    key='pid',
    label='Personal ID',
    label_de='Personalausweis',
    format=SD_JWT_VC_FORMAT,
    vct_values=('urn:eudi:pid:1', 'urn:eudi:pid:de:1'),
    fields=_grouped(
        (
            _claim('family_name', 'Family name', 'text', label_de='Familienname'),
            _claim('given_name', 'Given name', 'text', label_de='Vorname'),
            _claim(
                'birthdate',
                'Date of birth',
                'date',
                label_de='Geburtsdatum',
                date_of_birth=True,
            ),
            # An object with locality, region and/or country
            _claim(
                'place_of_birth',
                'Place of birth',
                'parts',
                label_de='Geburtsort',
                parts=(
                    CatalogPart(
                        'country', 'Country', 'enum', COUNTRIES, label_de='Land'
                    ),
                    CatalogPart('region', 'Region', 'text', label_de='Region'),
                    CatalogPart('locality', 'City or town', 'text', label_de='Ort'),
                ),
            ),
            # A list: a person can have several nationalities
            _claim(
                'nationalities',
                'Nationality',
                'enum',
                label_de='Staatsangehörigkeit',
                option_set=COUNTRIES,
                multiple_values=True,
            ),
            _claim(
                'address_formatted',
                'Address (full)',
                'text',
                'address',
                'formatted',
                label_de='Adresse (vollständig)',
            ),
            _claim(
                'address_street_address',
                'Street (may include the house number)',
                'text',
                'address',
                'street_address',
                label_de='Straße (kann die Hausnummer enthalten)',
            ),
            _claim(
                'address_house_number',
                'House number',
                'text',
                'address',
                'house_number',
                label_de='Hausnummer',
            ),
            _claim(
                'address_postal_code',
                'Postal code',
                'text',
                'address',
                'postal_code',
                label_de='Postleitzahl',
            ),
            _claim(
                'address_locality',
                'City or town',
                'text',
                'address',
                'locality',
                label_de='Ort',
            ),
            _claim(
                'address_region',
                'State or region',
                'text',
                'address',
                'region',
                label_de='Bundesland oder Region',
            ),
            _claim(
                'address_country',
                'Country of residence',
                'enum',
                'address',
                'country',
                label_de='Wohnsitzland',
                option_set=COUNTRIES,
            ),
            _claim(
                'personal_administrative_number',
                'Personal administrative number',
                'text',
                label_de='Persönliche Verwaltungsnummer',
            ),
            _claim('picture', 'Photo', 'image', label_de='Foto'),
            _claim(
                'birth_family_name',
                'Family name at birth',
                'text',
                label_de='Geburtsname',
            ),
            _claim(
                'birth_given_name',
                'Given name at birth',
                'text',
                label_de='Geburtsvorname',
            ),
            _claim('sex', 'Sex', 'enum', label_de='Geschlecht', option_set=SEX),
            _claim('email', 'Email address', 'text', label_de='E-Mail-Adresse'),
            _claim(
                'phone_number', 'Mobile phone number', 'text', label_de='Mobilnummer'
            ),
            _claim(
                'document_number',
                'Document number',
                'text',
                label_de='Dokumentennummer',
            ),
            _claim(
                'date_of_issuance', 'Issue date', 'date', label_de='Ausstellungsdatum'
            ),
            _claim('date_of_expiry', 'Expiry date', 'date', label_de='Ablaufdatum'),
            _claim(
                'issuing_authority',
                'Issuing authority',
                'text',
                label_de='Ausstellende Behörde',
            ),
            _claim(
                'issuing_country',
                'Issuing country',
                'enum',
                label_de='Ausstellungsland',
                option_set=COUNTRIES,
            ),
            _claim(
                'issuing_jurisdiction',
                'Issuing jurisdiction',
                'text',
                label_de='Ausstellende Gebietskörperschaft',
            ),
        ),
        {
            'name': (
                'family_name',
                'given_name',
                'birth_family_name',
                'birth_given_name',
            ),
            'birth': ('birthdate', 'place_of_birth', 'nationalities', 'sex'),
            'address': (
                'address_formatted',
                'address_street_address',
                'address_house_number',
                'address_postal_code',
                'address_locality',
                'address_region',
                'address_country',
            ),
            'document': (
                'document_number',
                'date_of_issuance',
                'date_of_expiry',
                'issuing_authority',
                'issuing_country',
                'issuing_jurisdiction',
            ),
            'other': (
                'personal_administrative_number',
                'picture',
                'email',
                'phone_number',
            ),
        },
    ),
)

# ISO/IEC 18013-5 data elements, in the standard's order. Elements whose names vary
# by issuer (age_over_NN, biometric_template_xx) are left out: rules check an age
# through the date of birth (F20), and "Age in years" and "Year of birth" are numbers.
MDL = CatalogDocumentType(
    key='mdl',
    label='Driving licence',
    label_de='Führerschein',
    format=MDOC_FORMAT,
    doctype_value='org.iso.18013.5.1.mDL',
    fields=_grouped(
        (
            _mdl_element('family_name', 'Family name', 'text', label_de='Familienname'),
            _mdl_element('given_name', 'Given name', 'text', label_de='Vorname'),
            _mdl_element(
                'birth_date',
                'Date of birth',
                'date',
                label_de='Geburtsdatum',
                date_of_birth=True,
            ),
            _mdl_element(
                'issue_date', 'Issue date', 'date', label_de='Ausstellungsdatum'
            ),
            _mdl_element('expiry_date', 'Expiry date', 'date', label_de='Ablaufdatum'),
            _mdl_element(
                'issuing_country',
                'Issuing country',
                'enum',
                label_de='Ausstellungsland',
                option_set=COUNTRIES,
            ),
            _mdl_element(
                'issuing_authority',
                'Issuing authority',
                'text',
                label_de='Ausstellende Behörde',
            ),
            _mdl_element(
                'document_number',
                'Licence number',
                'text',
                label_de='Führerscheinnummer',
            ),
            _mdl_element('portrait', 'Portrait', 'image', label_de='Lichtbild'),
            _mdl_element(
                'driving_privileges',
                'Licence classes',
                'parts',
                label_de='Führerscheinklassen',
                parts=(
                    CatalogPart(
                        'classes',
                        'Licence classes',
                        'enum',
                        LICENCE_CLASSES,
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
                ),
            ),
            _mdl_element(
                'un_distinguishing_sign',
                'UN distinguishing sign',
                'text',
                label_de='Unterscheidungszeichen (UN)',
            ),
            _mdl_element(
                'administrative_number',
                'Administrative number',
                'text',
                label_de='Verwaltungsnummer',
            ),
            _mdl_element('sex', 'Sex', 'enum', label_de='Geschlecht', option_set=SEX),
            _mdl_element(
                'height', 'Height (cm)', 'number', label_de='Körpergröße (cm)'
            ),
            _mdl_element('weight', 'Weight (kg)', 'number', label_de='Gewicht (kg)'),
            _mdl_element(
                'eye_colour',
                'Eye colour',
                'enum',
                label_de='Augenfarbe',
                option_set=EYE_COLOURS,
            ),
            _mdl_element(
                'hair_colour',
                'Hair colour',
                'enum',
                label_de='Haarfarbe',
                option_set=HAIR_COLOURS,
            ),
            _mdl_element(
                'birth_place', 'Place of birth', 'text', label_de='Geburtsort'
            ),
            _mdl_element(
                'resident_address', 'Resident address', 'text', label_de='Wohnanschrift'
            ),
            _mdl_element(
                'portrait_capture_date',
                'Portrait capture date',
                'date',
                label_de='Aufnahmedatum des Lichtbilds',
            ),
            _mdl_element(
                'age_in_years', 'Age in years', 'number', label_de='Alter in Jahren'
            ),
            _mdl_element(
                'age_birth_year', 'Year of birth', 'number', label_de='Geburtsjahr'
            ),
            _mdl_element(
                'issuing_jurisdiction',
                'Issuing jurisdiction',
                'text',
                label_de='Ausstellende Gebietskörperschaft',
            ),
            _mdl_element(
                'nationality',
                'Nationality',
                'enum',
                label_de='Staatsangehörigkeit',
                option_set=COUNTRIES,
            ),
            _mdl_element('resident_city', 'Resident city', 'text', label_de='Wohnort'),
            _mdl_element(
                'resident_state',
                'Resident state',
                'text',
                label_de='Bundesland des Wohnorts',
            ),
            _mdl_element(
                'resident_postal_code',
                'Resident postal code',
                'text',
                label_de='Postleitzahl des Wohnorts',
            ),
            _mdl_element(
                'resident_country',
                'Resident country',
                'enum',
                label_de='Land des Wohnorts',
                option_set=COUNTRIES,
            ),
            _mdl_element(
                'family_name_national_character',
                'Family name (national characters)',
                'text',
                label_de='Familienname (nationale Schriftzeichen)',
            ),
            _mdl_element(
                'given_name_national_character',
                'Given name (national characters)',
                'text',
                label_de='Vorname (nationale Schriftzeichen)',
            ),
            _mdl_element(
                'signature_usual_mark',
                'Signature or usual mark',
                'image',
                label_de='Unterschrift oder übliches Zeichen',
            ),
        ),
        {
            'name': (
                'family_name',
                'given_name',
                'family_name_national_character',
                'given_name_national_character',
            ),
            'birth': (
                'birth_date',
                'sex',
                'birth_place',
                'age_in_years',
                'age_birth_year',
                'nationality',
            ),
            'address': (
                'resident_address',
                'resident_city',
                'resident_state',
                'resident_postal_code',
                'resident_country',
            ),
            'document': (
                'issue_date',
                'expiry_date',
                'issuing_country',
                'issuing_authority',
                'document_number',
                'issuing_jurisdiction',
            ),
            'licence': (
                'driving_privileges',
                'un_distinguishing_sign',
                'administrative_number',
            ),
            'appearance': (
                'portrait',
                'height',
                'weight',
                'eye_colour',
                'hair_colour',
                'portrait_capture_date',
            ),
            'other': ('signature_usual_mark',),
        },
    ),
)

DOCUMENT_TYPES: tuple[CatalogDocumentType, ...] = (PID, MDL)


def get_document_type(key: str) -> CatalogDocumentType | None:
    """Return the document type with this key, or None."""
    return next((type_ for type_ in DOCUMENT_TYPES if type_.key == key), None)


def label_of(
    item: CatalogDocumentType | CatalogField | CatalogPart | CatalogFieldGroup,
) -> str:
    """Return the label in the current request's language (spec 009, R6).

    For the website's answers only: the DCQL builder, the evaluator, the worker and
    serviceBW's delivery read `label`, which stays English.
    """
    return item.label_de if current_language() == 'de' else item.label
