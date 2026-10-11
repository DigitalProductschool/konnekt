"""Document type catalog (data-model.md "Document type catalog", research R4).

The document types DO.IT can request, with the fields each one offers. Field keys are
stable: they appear in the API, in the configurations sent to EUDIPLO and in the
documents delivered to serviceBW. Labels are UI copy: they use the Figma design's
wording where the design names a field (design-notes.md §8), and data-model.md's
elsewhere. The catalog order is the order of the API, of the claims in a request and of
the delivered fields.
"""

from dataclasses import dataclass

SD_JWT_VC_FORMAT = 'dc+sd-jwt'
MDOC_FORMAT = 'mso_mdoc'
MDL_NAMESPACE = 'org.iso.18013.5.1'


@dataclass(frozen=True)
class CatalogField:
    """A field of a document type, and where its value sits in the credential."""

    key: str
    label: str
    # SD-JWT VC: the claim path; mdoc: (namespace, element)
    claim_path: tuple[str, ...]


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


def _claim(key: str, label: str, *claim_path: str) -> CatalogField:
    # An SD-JWT VC claim; most sit at the top level under their own key
    return CatalogField(key, label, claim_path or (key,))


def _mdl_element(key: str, label: str) -> CatalogField:
    return CatalogField(key, label, (MDL_NAMESPACE, key))


# PID rulebook v1.7, SD-JWT VC encoding
PID = CatalogDocumentType(
    key='pid',
    label='Personal ID',
    format=SD_JWT_VC_FORMAT,
    vct_values=('urn:eudi:pid:1', 'urn:eudi:pid:de:1'),
    fields=(
        _claim('family_name', 'Family name'),
        _claim('given_name', 'Given name'),
        _claim('birthdate', 'Date of birth'),
        # An object with locality, region and/or country
        _claim('place_of_birth', 'Place of birth'),
        _claim('nationalities', 'Nationality'),
        _claim('address_formatted', 'Address (full)', 'address', 'formatted'),
        _claim(
            'address_street_address',
            'Street (may include the house number)',
            'address',
            'street_address',
        ),
        _claim('address_house_number', 'House number', 'address', 'house_number'),
        _claim('address_postal_code', 'Postal code', 'address', 'postal_code'),
        _claim('address_locality', 'City or town', 'address', 'locality'),
        _claim('address_region', 'State or region', 'address', 'region'),
        _claim('address_country', 'Country of residence', 'address', 'country'),
        _claim('personal_administrative_number', 'Personal administrative number'),
        _claim('picture', 'Photo'),
        _claim('birth_family_name', 'Family name at birth'),
        _claim('birth_given_name', 'Given name at birth'),
        _claim('sex', 'Sex'),
        _claim('email', 'Email address'),
        _claim('phone_number', 'Mobile phone number'),
        _claim('document_number', 'Document number'),
        _claim('date_of_issuance', 'Issue date'),
        _claim('date_of_expiry', 'Expiry date'),
        _claim('issuing_authority', 'Issuing authority'),
        _claim('issuing_country', 'Issuing country'),
        _claim('issuing_jurisdiction', 'Issuing jurisdiction'),
    ),
)

# ISO/IEC 18013-5 data elements, in the standard's order. Elements whose names vary
# by issuer (age_over_NN, biometric_template_xx) are left out.
MDL = CatalogDocumentType(
    key='mdl',
    label='Driving licence',
    format=MDOC_FORMAT,
    doctype_value='org.iso.18013.5.1.mDL',
    fields=(
        _mdl_element('family_name', 'Family name'),
        _mdl_element('given_name', 'Given name'),
        _mdl_element('birth_date', 'Date of birth'),
        _mdl_element('issue_date', 'Issue date'),
        _mdl_element('expiry_date', 'Expiry date'),
        _mdl_element('issuing_country', 'Issuing country'),
        _mdl_element('issuing_authority', 'Issuing authority'),
        _mdl_element('document_number', 'Licence number'),
        _mdl_element('portrait', 'Portrait'),
        _mdl_element('driving_privileges', 'Licence classes'),
        _mdl_element('un_distinguishing_sign', 'UN distinguishing sign'),
        _mdl_element('administrative_number', 'Administrative number'),
        _mdl_element('sex', 'Sex'),
        _mdl_element('height', 'Height (cm)'),
        _mdl_element('weight', 'Weight (kg)'),
        _mdl_element('eye_colour', 'Eye colour'),
        _mdl_element('hair_colour', 'Hair colour'),
        _mdl_element('birth_place', 'Place of birth'),
        _mdl_element('resident_address', 'Resident address'),
        _mdl_element('portrait_capture_date', 'Portrait capture date'),
        _mdl_element('age_in_years', 'Age in years'),
        _mdl_element('age_birth_year', 'Year of birth'),
        _mdl_element('issuing_jurisdiction', 'Issuing jurisdiction'),
        _mdl_element('nationality', 'Nationality'),
        _mdl_element('resident_city', 'Resident city'),
        _mdl_element('resident_state', 'Resident state'),
        _mdl_element('resident_postal_code', 'Resident postal code'),
        _mdl_element('resident_country', 'Resident country'),
        _mdl_element(
            'family_name_national_character', 'Family name (national characters)'
        ),
        _mdl_element(
            'given_name_national_character', 'Given name (national characters)'
        ),
        _mdl_element('signature_usual_mark', 'Signature or usual mark'),
    ),
)

DOCUMENT_TYPES: tuple[CatalogDocumentType, ...] = (PID, MDL)


def get_document_type(key: str) -> CatalogDocumentType | None:
    """Return the document type with this key, or None."""
    return next((type_ for type_ in DOCUMENT_TYPES if type_.key == key), None)
