"""The test documents: EUDIPLO credential configurations and the claims of an offer.

Both are built from the catalog (app/catalog.py): every field of a document type is
issued at the field's claim path, so that the wallet can answer any request the
middleware builds from the same catalog (app/services/dcql.py). The values describe
the person of person.py.

EUDIPLO 9 issues an mdoc's claims with their JSON types: dates become text strings,
not the CBOR dates of ISO/IEC 18013-5, and images become base64 text, not bytes.
"""

import base64
from collections.abc import Callable, Mapping, Sequence
from datetime import date, timezone
from functools import cache
from pathlib import Path
from typing import Any

from app.catalog import (
    MDL,
    MDOC_FORMAT,
    PID,
    SD_JWT_VC_FORMAT,
    CatalogDocumentType,
    CatalogField,
)

from .person import COUNTRY, COUNTRY_NAME, Person

# The ids of the credential configurations in EUDIPLO
CONFIG_IDS = {PID.key: 'test-pid', MDL.key: 'test-mdl'}
DESCRIPTION = (
    'Test document for the serviceBW middleware (scripts/issue_test_credentials)'
)
# How long the wallet holds an issued credential, in seconds
CREDENTIAL_LIFETIME_SECONDS = 365 * 24 * 60 * 60
# How long the offer can be redeemed, in seconds
OFFER_LIFETIME_SECONDS = 15 * 60
# Lets the operators find the offers in EUDIPLO's session list; no personal data
OFFER_REFERENCE = 'issue_test_credentials'
LOCALE = 'en-US'
# The names the wallet shows
DOCUMENT_NAMES = {PID.key: 'Test PID', MDL.key: 'Test driving licence'}
# The names of objects whose parts are separate catalog fields
OBJECT_NAMES = {'address': 'Address'}
# Claim types of the fields that aren't strings, by document type and field key
CLAIM_TYPES: dict[str, dict[str, str]] = {
    PID.key: {
        'place_of_birth': 'object',
        'nationalities': 'array',
        'sex': 'integer',
    },
    MDL.key: {
        'driving_privileges': 'array',
        'sex': 'integer',
        'height': 'integer',
        'weight': 'integer',
        'age_in_years': 'integer',
        'age_birth_year': 'integer',
    },
}
# The other properties of a credential configuration in EUDIPLO 9, which the test
# documents don't use
UNUSED_PROPERTIES: dict[str, Any] = {
    'attributeProviderId': None,
    'webhookEndpointId': None,
    'activeCredentials': None,
    'iaeActions': None,
    'schemaMeta': None,
    'embeddedDisclosurePolicy': None,
    'sdJwtTrustFormat': 'x5c',
}
UN_DISTINGUISHING_SIGN_GERMANY = 'D'
# Fields the offer leaves out. They stay in the configuration, as optional fields.
# ISO/IEC 18013-5 requires an mDL's issuing_jurisdiction to match the
# stateOrProvinceName of the issuer certificate, which EUDIPLO's certificates lack:
# wallets such as Paradym reject an mDL that has one
LEFT_OUT: dict[str, frozenset[str]] = {
    PID.key: frozenset(),
    MDL.key: frozenset({'issuing_jurisdiction'}),
}
ASSETS = Path(__file__).parent


@cache
def _jpeg_base64(name: str) -> str:
    return base64.b64encode((ASSETS / name).read_bytes()).decode('ascii')


def pid_values(person: Person, today: date) -> dict[str, object]:
    """The PID's claims by catalog field key, following the PID rulebook."""
    home = person.home
    return {
        'family_name': person.family_name,
        'given_name': person.given_name,
        'birthdate': person.birth_date.isoformat(),
        'place_of_birth': {
            'locality': person.birth_place.city,
            'region': person.birth_place.state,
            'country': COUNTRY,
        },
        'nationalities': [COUNTRY],
        'address_formatted': (
            f'{person.street} {person.house_number}, '
            f'{person.postal_code} {home.city}, {COUNTRY_NAME}'
        ),
        'address_street_address': person.street,
        'address_house_number': person.house_number,
        'address_postal_code': person.postal_code,
        'address_locality': home.city,
        'address_region': home.state,
        'address_country': COUNTRY,
        'personal_administrative_number': person.personal_administrative_number,
        'picture': 'data:image/jpeg;base64,' + _jpeg_base64('portrait.jpg'),
        'birth_family_name': person.birth_family_name,
        'birth_given_name': person.given_name,
        'sex': person.sex,
        'email': person.email,
        'phone_number': person.phone_number,
        'document_number': person.id_card.number,
        'date_of_issuance': person.id_card.issue_date.isoformat(),
        'date_of_expiry': person.id_card.expiry_date.isoformat(),
        'issuing_authority': home.id_card_authority,
        'issuing_country': COUNTRY,
        'issuing_jurisdiction': home.state_code,
    }


def mdl_values(person: Person, today: date) -> dict[str, object]:
    """The driving licence's data elements by catalog field key (ISO/IEC 18013-5)."""
    home = person.home
    licence = person.licence
    return {
        'family_name': person.family_name,
        'given_name': person.given_name,
        'birth_date': person.birth_date.isoformat(),
        'issue_date': licence.issue_date.isoformat(),
        'expiry_date': licence.expiry_date.isoformat(),
        'issuing_country': COUNTRY,
        'issuing_authority': home.licence_authority,
        'document_number': licence.number,
        'portrait': _jpeg_base64('portrait.jpg'),
        'driving_privileges': [
            {
                'vehicle_category_code': privilege.category,
                'issue_date': privilege.issue_date.isoformat(),
            }
            for privilege in licence.privileges
        ],
        'un_distinguishing_sign': UN_DISTINGUISHING_SIGN_GERMANY,
        'administrative_number': licence.administrative_number,
        'sex': person.sex,
        'height': person.height_cm,
        'weight': person.weight_kg,
        'eye_colour': person.eye_colour,
        'hair_colour': person.hair_colour,
        'birth_place': person.birth_place.city,
        'resident_address': f'{person.street} {person.house_number}',
        'portrait_capture_date': licence.portrait_capture_date.astimezone(timezone.utc)
        .isoformat()
        .replace('+00:00', 'Z'),
        'age_in_years': person.age_on(today),
        'age_birth_year': person.birth_date.year,
        'nationality': COUNTRY,
        'resident_city': home.city,
        'resident_state': home.state,
        'resident_postal_code': person.postal_code,
        'resident_country': COUNTRY,
        'family_name_national_character': person.family_name,
        'given_name_national_character': person.given_name,
        'signature_usual_mark': _jpeg_base64('signature.jpg'),
    }


VALUES: dict[str, Callable[[Person, date], dict[str, object]]] = {
    PID.key: pid_values,
    MDL.key: mdl_values,
}


def credential_claims(
    document_type: CatalogDocumentType, person: Person, today: date
) -> dict[str, Any]:
    """The inline claims of an offer: every field's value at its claim path.

    An mdoc's claims are flat, element by element: the configuration's fields name
    their namespace.
    """
    values = VALUES[document_type.key](person, today)
    claims: dict[str, Any] = {}
    for field in document_type.fields:
        if field.key in LEFT_OUT[document_type.key]:
            continue
        if document_type.format == MDOC_FORMAT:
            claims[field.claim_path[-1]] = values[field.key]
            continue
        *parents, name = field.claim_path
        target = claims
        for parent in parents:
            target = target.setdefault(parent, {})
        target[name] = values[field.key]
    return claims


def credential_config(
    document_type: CatalogDocumentType, key_chain_id: str
) -> dict[str, Any]:
    """The EUDIPLO credential configuration of a document type.

    It names every property, because saving keeps the stored value of one the body
    leaves out. `key_chain_id` is the attestation key chain that signs.
    """
    display = _display(DOCUMENT_NAMES[document_type.key])
    if document_type.format == MDOC_FORMAT:
        config = {
            'format': MDOC_FORMAT,
            'docType': document_type.doctype_value,
            'display': display,
        }
        vct = None
        fields = [_mdoc_field(document_type, field) for field in document_type.fields]
    else:
        config = {'format': SD_JWT_VC_FORMAT, 'display': display}
        # The EU PID type, the first one the middleware's requests accept
        vct = document_type.vct_values[0]
        fields = _sd_jwt_fields(document_type)
    return {
        'id': CONFIG_IDS[document_type.key],
        'description': DESCRIPTION,
        'config': config,
        'vct': vct,
        'fields': fields,
        'keyBinding': True,
        'keyChainId': key_chain_id,
        # No status list: with one, EUDIPLO 9.0 fails every strict check of an mDL
        # ("Atleast one certificate is required to check the status of the mdoc"),
        # and a PID's list must be signed by the trust list entity's revocation key.
        # Without one, the middleware's strict checks have no status to check
        'statusManagement': False,
        'lifeTime': CREDENTIAL_LIFETIME_SECONDS,
        **UNUSED_PROPERTIES,
    }


def offer_body(
    document_types: Sequence[CatalogDocumentType], person: Person, today: date
) -> dict[str, Any]:
    """A pre-authorized-code offer of the documents, with the person's data inline."""
    return {
        'response_type': 'uri',
        'flow': 'pre_authorized_code',
        'credentialConfigurationIds': [
            CONFIG_IDS[document_type.key] for document_type in document_types
        ],
        'credentialClaims': {
            CONFIG_IDS[document_type.key]: {
                'type': 'inline',
                'claims': credential_claims(document_type, person, today),
            }
            for document_type in document_types
        },
        'offerLifetimeSeconds': OFFER_LIFETIME_SECONDS,
        'reference': OFFER_REFERENCE,
    }


def abbreviated(value: object, limit: int = 60) -> object:
    """A copy of claims for printing, with long strings such as images shortened."""
    if isinstance(value, str) and len(value) > limit:
        return f'{value[: limit - 20]}... ({len(value)} characters)'
    if isinstance(value, Mapping):
        return {key: abbreviated(item, limit) for key, item in value.items()}
    if isinstance(value, list):
        return [abbreviated(item, limit) for item in value]
    return value


def _claim_type(document_type: CatalogDocumentType, field: CatalogField) -> str:
    return CLAIM_TYPES[document_type.key].get(field.key, 'string')


def _display(name: str) -> list[dict[str, str]]:
    return [{'locale': LOCALE, 'name': name}]


def _mdoc_field(
    document_type: CatalogDocumentType, field: CatalogField
) -> dict[str, Any]:
    namespace, element = field.claim_path
    return {
        'namespace': namespace,
        'path': [element],
        'type': _claim_type(document_type, field),
        'mandatory': field.key not in LEFT_OUT[document_type.key],
        'display': _display(field.label),
    }


def _sd_jwt_fields(document_type: CatalogDocumentType) -> list[dict[str, Any]]:
    """Fields in catalog order; nested claims become children of their object.

    Every claim is selectively disclosable on its own, so that the wallet discloses
    only what a request asks for.
    """
    fields: list[dict[str, Any]] = []
    objects: dict[str, dict[str, Any]] = {}
    for field in document_type.fields:
        *parents, name = field.claim_path
        entry = {
            'path': [name],
            'type': _claim_type(document_type, field),
            'mandatory': True,
            'disclosable': True,
            'display': _display(field.label),
        }
        if not parents:
            fields.append(entry)
            continue
        (parent,) = parents
        if parent not in objects:
            objects[parent] = {
                'path': [parent],
                'type': 'object',
                'disclosable': True,
                'display': _display(OBJECT_NAMES[parent]),
                'children': [],
            }
            fields.append(objects[parent])
        objects[parent]['children'].append(entry)
    return fields
