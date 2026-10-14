"""scripts/issue_test_credentials: test documents that answer any middleware request."""

import json
from collections.abc import Callable, Iterator, Mapping
from datetime import date
from typing import Any

import httpx2
import pytest

from app.catalog import DOCUMENT_TYPES, MDL, MDOC_FORMAT, PID, CatalogDocumentType
from app.schemas import RequestedDocument
from app.services.dcql import build_config
from scripts.issue_test_credentials import cli
from scripts.issue_test_credentials.credentials import (
    CLAIM_TYPES,
    CONFIG_IDS,
    LEFT_OUT,
    abbreviated,
    credential_claims,
    credential_config,
    offer_body,
)
from scripts.issue_test_credentials.person import (
    PLACES,
    STUTTGART,
    STUTTGART_STREETS,
    random_person,
    years_after,
)

TODAY = date(2026, 10, 12)
# The properties of CredentialConfigCreate in EUDIPLO 9.0's OpenAPI
CONFIG_PROPERTIES = {
    'id',
    'description',
    'config',
    'fields',
    'vct',
    'keyBinding',
    'keyChainId',
    'statusManagement',
    'lifeTime',
    'attributeProviderId',
    'webhookEndpointId',
    'activeCredentials',
    'iaeActions',
    'schemaMeta',
    'embeddedDisclosurePolicy',
    'sdJwtTrustFormat',
}
SEEDS = range(200)
PYTHON_TYPES: dict[str, type | tuple[type, ...]] = {
    'string': str,
    'integer': int,
    'array': list,
    'object': dict,
}


def _config_paths(config: Mapping[str, Any]) -> Iterator[tuple[str, ...]]:
    """The claim paths a credential configuration issues, as the DCQL names them."""

    def walk(fields: list[dict[str, Any]], parent: tuple[str, ...]) -> Iterator[Any]:
        for field in fields:
            path = parent + tuple(field['path'])
            if 'namespace' in field:
                path = (field['namespace'], *path)
            yield path
            yield from walk(field.get('children', []), path)

    yield from walk(config['fields'], ())


def _value_at(
    document_type: CatalogDocumentType, claims: Mapping[str, Any], path: list[str]
) -> object:
    if document_type.format == MDOC_FORMAT:
        # Inline mdoc claims are flat; the configuration names the namespace
        return claims[path[-1]]
    value: Any = claims
    for segment in path:
        value = value[segment]
    return value


def _middleware_request(document_type: CatalogDocumentType) -> dict[str, Any]:
    """The middleware's credential query that asks for every field of a type."""
    config = build_config(
        form_connection_id='test',
        revision=1,
        name='Every field',
        documents=[
            RequestedDocument(
                document_type=document_type.key,
                fields=[field.key for field in document_type.fields],
            )
        ],
        lifetime_seconds=600,
        trust_list_id='trust-list',
    )
    (query,) = config['dcql_query']['credentials']
    return query


@pytest.mark.parametrize('document_type', DOCUMENT_TYPES, ids=lambda type_: type_.key)
def test_the_configuration_issues_what_the_middleware_requests(
    document_type: CatalogDocumentType,
) -> None:
    config = credential_config(document_type, 'issuer-key')
    query = _middleware_request(document_type)

    assert config['id'] == CONFIG_IDS[document_type.key]
    assert config['config']['format'] == query['format'] == document_type.format
    if document_type.format == MDOC_FORMAT:
        assert config['config']['docType'] == query['meta']['doctype_value']
        assert config['vct'] is None
    else:
        assert config['vct'] in query['meta']['vct_values']
    issued = set(_config_paths(config))
    requested = {tuple(claim['path']) for claim in query['claims']}
    # An SD-JWT VC also has the objects that hold nested claims, such as address
    objects = (
        set()
        if document_type.format == MDOC_FORMAT
        else {path[:-1] for path in requested if len(path) > 1}
    )
    assert issued == requested | objects
    assert config['keyBinding'] is True
    assert config['keyChainId'] == 'issuer-key'
    # With a status list, EUDIPLO 9.0's strict checks of an mDL always fail
    assert config['statusManagement'] is False


@pytest.mark.parametrize('document_type', DOCUMENT_TYPES, ids=lambda type_: type_.key)
def test_the_configuration_names_every_property(
    document_type: CatalogDocumentType,
) -> None:
    # Saving keeps the stored value of a property the body leaves out
    config = credential_config(document_type, 'issuer-key')

    assert set(config) == CONFIG_PROPERTIES


def test_every_nested_claim_is_disclosable_on_its_own() -> None:
    config = credential_config(PID, 'issuer-key')

    address = next(field for field in config['fields'] if field['path'] == ['address'])
    assert address['disclosable'] is True
    assert {child['path'][0] for child in address['children']} == {
        field.claim_path[1] for field in PID.fields if field.claim_path[0] == 'address'
    }
    assert all(child['disclosable'] for child in address['children'])


@pytest.mark.parametrize('document_type', DOCUMENT_TYPES, ids=lambda type_: type_.key)
@pytest.mark.parametrize('seed', [1, 2, 3, 4711])
def test_every_field_has_a_value_of_its_type(
    document_type: CatalogDocumentType, seed: int
) -> None:
    claims = credential_claims(document_type, random_person(seed, TODAY), TODAY)

    for field in document_type.fields:
        if field.key in LEFT_OUT[document_type.key]:
            continue
        value = _value_at(document_type, claims, list(field.claim_path))
        claim_type = CLAIM_TYPES[document_type.key].get(field.key, 'string')
        assert isinstance(value, PYTHON_TYPES[claim_type]), field.key
        assert not isinstance(value, bool), field.key
        assert value not in ('', [], {}), field.key


def test_the_mdl_has_no_issuing_jurisdiction() -> None:
    # Wallets check it against the issuer certificate's stateOrProvinceName, which
    # EUDIPLO's certificates don't have
    claims = credential_claims(MDL, random_person(1, TODAY), TODAY)
    config = credential_config(MDL, 'issuer-key')

    assert 'issuing_jurisdiction' not in claims
    (field,) = [f for f in config['fields'] if f['path'] == ['issuing_jurisdiction']]
    assert field['mandatory'] is False
    assert LEFT_OUT[PID.key] == frozenset()


def test_every_document_type_of_the_catalog_is_issued() -> None:
    # A new document type in the catalog needs a configuration id and its values
    assert set(CONFIG_IDS) == {document_type.key for document_type in DOCUMENT_TYPES}
    assert set(CLAIM_TYPES) == set(CONFIG_IDS)


def test_the_claim_types_name_only_catalog_fields() -> None:
    for document_type in DOCUMENT_TYPES:
        keys = {field.key for field in document_type.fields}
        assert set(CLAIM_TYPES[document_type.key]) <= keys


def test_a_seed_makes_the_same_person() -> None:
    assert random_person(7, TODAY) == random_person(7, TODAY)
    assert random_person(7, TODAY) != random_person(8, TODAY)


def test_both_documents_describe_the_same_person() -> None:
    person = random_person(4711, TODAY)
    pid = credential_claims(PID, person, TODAY)
    mdl = credential_claims(MDL, person, TODAY)

    assert (pid['family_name'], pid['given_name']) == (
        mdl['family_name'],
        mdl['given_name'],
    )
    assert pid['birthdate'] == mdl['birth_date']
    assert pid['sex'] == mdl['sex']
    assert pid['address']['locality'] == mdl['resident_city']
    assert pid['address']['postal_code'] == mdl['resident_postal_code']
    assert pid['place_of_birth']['locality'] == mdl['birth_place']


@pytest.mark.parametrize('seed', SEEDS)
def test_the_person_lives_at_a_real_stuttgart_street(seed: int) -> None:
    # Forms of the City of Stuttgart need a Stuttgart address that fits together
    person = random_person(seed, TODAY)
    pid = credential_claims(PID, person, TODAY)
    mdl = credential_claims(MDL, person, TODAY)

    street = next(s for s in STUTTGART_STREETS if s.name == person.street)
    assert person.postal_code == street.postal_code
    assert 1 <= int(person.house_number) <= street.last_house_number
    assert pid['address'] == {
        'formatted': f'{street.name} {person.house_number}, '
        f'{street.postal_code} Stuttgart, Deutschland',
        'street_address': street.name,
        'house_number': person.house_number,
        'postal_code': street.postal_code,
        'locality': 'Stuttgart',
        'region': 'Baden-Württemberg',
        'country': 'DE',
    }
    assert pid['issuing_authority'] == 'Landeshauptstadt Stuttgart'
    assert (mdl['resident_city'], mdl['resident_postal_code']) == (
        'Stuttgart',
        street.postal_code,
    )
    assert mdl['resident_address'] == f'{street.name} {person.house_number}'
    assert mdl['issuing_authority'] == 'Landeshauptstadt Stuttgart'


def test_every_stuttgart_street_has_a_stuttgart_postcode() -> None:
    assert len({street.name for street in STUTTGART_STREETS}) == len(STUTTGART_STREETS)
    for street in STUTTGART_STREETS:
        assert street.postal_code.startswith('70'), street.name
        assert len(street.postal_code) == 5, street.name
        assert street.last_house_number >= 1, street.name


def test_without_stuttgart_the_person_lives_in_any_town() -> None:
    people = [random_person(seed, TODAY, stuttgart=False) for seed in SEEDS]

    assert {person.home for person in people} == set(PLACES)
    for person in people:
        if person.home != STUTTGART:
            assert person.postal_code == person.home.postal_code


@pytest.mark.parametrize('seed', SEEDS)
def test_the_documents_are_valid_today(seed: int) -> None:
    person = random_person(seed, TODAY)
    pid = credential_claims(PID, person, TODAY)
    mdl = credential_claims(MDL, person, TODAY)

    assert pid['date_of_issuance'] < TODAY.isoformat() < pid['date_of_expiry']
    assert mdl['issue_date'] < TODAY.isoformat() < mdl['expiry_date']
    assert years_after(person.birth_date, 18) <= TODAY
    assert mdl['age_in_years'] == person.age_on(TODAY) >= 18
    assert all(
        years_after(person.birth_date, 18).isoformat()
        <= privilege['issue_date']
        < TODAY.isoformat()
        for privilege in mdl['driving_privileges']
    )
    assert mdl['portrait_capture_date'] < mdl['issue_date']


def test_the_offer_carries_each_documents_claims() -> None:
    person = random_person(4711, TODAY)

    body = offer_body(DOCUMENT_TYPES, person, TODAY)

    assert body['response_type'] == 'uri'
    assert body['flow'] == 'pre_authorized_code'
    assert body['credentialConfigurationIds'] == ['test-pid', 'test-mdl']
    assert body['credentialClaims'] == {
        'test-pid': {
            'type': 'inline',
            'claims': credential_claims(PID, person, TODAY),
        },
        'test-mdl': {
            'type': 'inline',
            'claims': credential_claims(MDL, person, TODAY),
        },
    }
    assert body['offerLifetimeSeconds'] > 0


def test_images_are_jpeg() -> None:
    person = random_person(1, TODAY)
    pid = credential_claims(PID, person, TODAY)
    mdl = credential_claims(MDL, person, TODAY)

    assert pid['picture'].startswith('data:image/jpeg;base64,/9j/')
    assert mdl['portrait'].startswith('/9j/')
    assert mdl['signature_usual_mark'].startswith('/9j/')


def test_long_values_are_shortened_for_printing() -> None:
    claims = {'picture': 'x' * 500, 'address': {'locality': 'Stuttgart'}, 'n': [1]}

    shown = abbreviated(claims)

    assert shown == {
        'picture': 'x' * 40 + '... (500 characters)',
        'address': {'locality': 'Stuttgart'},
        'n': [1],
    }


# The command line, against a fake of EUDIPLO's issuance calls

ISSUER_URL = 'https://eudiplo.test'
TENANT = 'dps'
METADATA_PATH = f'/.well-known/openid-credential-issuer/issuers/{TENANT}'
OFFER_URI = 'openid-credential-offer://?credential_offer_uri=https%3A%2F%2Feudiplo.test'
TRUST_LIST_ID = 'middleware-trust-list'


def _pem(name: str) -> str:
    return f'-----BEGIN CERTIFICATE-----\nMIIB{name}\nAQAB\n-----END CERTIFICATE-----\n'


def _key_chain(key_chain_id: str, usage: str = 'attestation') -> dict[str, Any]:
    """A key chain of type internalChain, as GET /api/key-chain lists it."""
    leaf, root = _pem(f'{key_chain_id}leaf'), _pem(f'{key_chain_id}root')
    return {
        'id': key_chain_id,
        'usageType': usage,
        'type': 'internalChain',
        'activeCertificate': {'pem': leaf + root, 'subject': 'CN=EUDIPLO'},
        'rootCertificate': {'pem': root, 'subject': 'CN=EUDIPLO Root CA'},
    }


class FakeIssuance:
    """EUDIPLO's issuance API, as far as the script uses it."""

    def __init__(self) -> None:
        self.configs: dict[str, dict[str, Any]] = {}
        self.key_chains = [_key_chain('issuer-key')]
        self.trust_lists: dict[str, dict[str, Any]] = {}
        self.offers: list[dict[str, Any]] = []
        # The statuses the offer session reports, one per read
        self.session_statuses = ['active', 'fetched']
        # Builds the metadata like EUDIPLO: one broken configuration breaks it
        self.metadata_breaks: Callable[[dict[str, Any]], bool] = lambda config: False
        self.calls: list[str] = []
        self.failures: dict[str, int] = {}
        self.transport = httpx2.MockTransport(self._handle)

    def _handle(self, request: httpx2.Request) -> httpx2.Response:
        method, path = request.method, request.url.path
        call = f'{method} {path}'
        self.calls.append(call)
        if call in self.failures:
            code = self.failures[call]
            return httpx2.Response(code, json={'statusCode': code, 'message': 'No'})
        if call == 'POST /api/oauth2/token':
            return httpx2.Response(200, json={'access_token': 't', 'expires_in': 60})
        if call == f'GET {METADATA_PATH}':
            return self._metadata()
        if request.headers.get('authorization') != 'Bearer t':
            return httpx2.Response(401, json={'message': 'Unauthorized'})
        if call == 'GET /api/issuer/config':
            return httpx2.Response(200, json={'tenantId': TENANT, 'batchSize': 1})
        if call == 'GET /api/key-chain':
            return httpx2.Response(200, json=self.key_chains)
        if path.startswith('/api/trust-list/'):
            trust_list = self.trust_lists.get(path.rsplit('/', 1)[-1])
            if trust_list is None:
                return httpx2.Response(404, json={'message': 'Trust list not found'})
            return httpx2.Response(200, json=trust_list)
        if path.startswith('/api/issuer/credentials'):
            return self._credentials(request)
        if call == 'POST /api/issuer/offer':
            self.offers.append(json.loads(request.content))
            return httpx2.Response(201, json={'session': 's-1', 'uri': OFFER_URI})
        if call == 'GET /api/session/s-1':
            status = self.session_statuses.pop(0)
            return httpx2.Response(
                200,
                json={'id': 's-1', 'status': status, 'errorReason': 'Wallet error'},
            )
        return httpx2.Response(404, json={'message': 'Cannot route'})

    def _credentials(self, request: httpx2.Request) -> httpx2.Response:
        config_id = request.url.path.removeprefix('/api/issuer/credentials').strip('/')
        if request.method == 'GET':
            config = self.configs.get(config_id)
            if config is None:
                return httpx2.Response(404, json={'message': 'Internal Server Error'})
            return httpx2.Response(200, json={**config, 'tenantId': TENANT})
        if request.method == 'DELETE':
            if self.configs.pop(config_id, None) is None:
                return httpx2.Response(404, json={'message': 'Internal Server Error'})
            return httpx2.Response(204)
        # POST keeps the stored value of a property the body leaves out
        body = json.loads(request.content)
        self.configs[body['id']] = {**self.configs.get(body['id'], {}), **body}
        return httpx2.Response(201, json=body)

    def _metadata(self) -> httpx2.Response:
        if any(self.metadata_breaks(config) for config in self.configs.values()):
            return httpx2.Response(
                500,
                json={
                    'error': 'well_known_error',
                    'error_description': 'Failed to retrieve issuer metadata',
                },
            )
        supported: dict[str, Any] = {config_id: {} for config_id in self.configs}
        return httpx2.Response(
            200, json={'credential_configurations_supported': supported}
        )


@pytest.fixture
def issuance(monkeypatch: pytest.MonkeyPatch) -> FakeIssuance:
    """A fake EUDIPLO, and the script's settings pointing at it."""
    monkeypatch.setenv('EUDIPLO_URL', ISSUER_URL)
    monkeypatch.setenv('EUDIPLO_ISSUER_CLIENT_ID', 'issuer')
    monkeypatch.setenv('EUDIPLO_ISSUER_CLIENT_SECRET', 'issuer-secret')
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', '')
    monkeypatch.setattr(cli.time, 'sleep', lambda seconds: None)
    return FakeIssuance()


def _trust_list(*entities: dict[str, Any]) -> dict[str, Any]:
    return {'id': TRUST_LIST_ID, 'entityConfig': list(entities)}


def test_the_script_configures_both_documents_and_offers_them(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    status = cli.main(['--seed', '4711', '--no-wait'], transport=issuance.transport)

    assert status == 0
    assert issuance.configs == {
        'test-pid': credential_config(PID, 'issuer-key'),
        'test-mdl': credential_config(MDL, 'issuer-key'),
    }
    (offer,) = issuance.offers
    assert offer['credentialConfigurationIds'] == ['test-pid', 'test-mdl']
    output = capsys.readouterr()
    assert 'test-pid (created), test-mdl (created)' in output.out
    assert OFFER_URI in output.out
    assert 'Test person (seed 4711)' in output.out
    assert 'EUDIPLO_TRUST_LIST_ID is not set' in output.err
    assert 'issuer-secret' not in output.out + output.err


def test_unchanged_configurations_arent_written_again(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.configs['test-pid'] = credential_config(PID, 'issuer-key')
    issuance.configs['test-mdl'] = {
        **credential_config(MDL, 'issuer-key'),
        'lifeTime': 60,
        'webhookEndpointId': 'someone-elses',
    }

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert issuance.calls.count('POST /api/issuer/credentials') == 1
    assert issuance.configs['test-mdl'] == credential_config(MDL, 'issuer-key')
    assert 'test-pid (unchanged), test-mdl (updated)' in capsys.readouterr().out


def test_the_person_lives_in_stuttgart_unless_any_town_is_given(
    issuance: FakeIssuance,
) -> None:
    def resident_cities(argv: list[str]) -> set[str]:
        issuance.offers.clear()
        for seed in range(20):
            argv_seed = [*argv, '--seed', str(seed), '--no-wait']
            assert cli.main(argv_seed, transport=issuance.transport) == 0
        return {
            offer['credentialClaims']['test-mdl']['claims']['resident_city']
            for offer in issuance.offers
        }

    assert resident_cities([]) == {'Stuttgart'}
    assert len(resident_cities(['--any-town'])) > 1


def test_one_document_can_be_offered_alone(issuance: FakeIssuance) -> None:
    assert (
        cli.main(['--document', 'mdl', '--no-wait'], transport=issuance.transport) == 0
    )

    assert set(issuance.configs) == {'test-mdl'}
    (offer,) = issuance.offers
    assert offer['credentialConfigurationIds'] == ['test-mdl']
    assert set(offer['credentialClaims']) == {'test-mdl'}


def test_the_script_names_missing_settings(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv('EUDIPLO_ISSUER_CLIENT_ID', '')
    monkeypatch.setenv('EUDIPLO_ISSUER_CLIENT_SECRET', '')

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    assert issuance.calls == []
    assert (
        'Set EUDIPLO_ISSUER_CLIENT_ID, EUDIPLO_ISSUER_CLIENT_SECRET'
        in capsys.readouterr().err
    )


def test_the_script_stops_without_a_key_to_sign_with(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.key_chains = [_key_chain('access-key', usage='access')]

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    assert issuance.configs == {}
    assert issuance.offers == []
    assert "no key chain with the usage 'attestation'" in capsys.readouterr().err


def test_the_key_chain_the_trust_list_trusts_signs(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', TRUST_LIST_ID)
    issuance.key_chains = [_key_chain('old-key'), _key_chain('trusted-key')]
    issuance.trust_lists[TRUST_LIST_ID] = _trust_list(
        {'type': 'internal', 'issuerKeyChainId': 'other-tenant-key'},
        {'type': 'internal', 'issuerKeyChainId': 'trusted-key'},
    )

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert issuance.configs['test-pid']['keyChainId'] == 'trusted-key'
    assert issuance.configs['test-mdl']['keyChainId'] == 'trusted-key'
    assert 'Warning' not in capsys.readouterr().err


def test_an_external_entity_with_the_root_certificate_trusts_the_key_chain(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', TRUST_LIST_ID)
    issuance.key_chains = [_key_chain('old-key'), _key_chain('trusted-key')]
    root = _pem('trusted-keyroot')
    issuance.trust_lists[TRUST_LIST_ID] = _trust_list(
        {'type': 'external', 'issuerCertPem': root.replace('\n', '\r\n')}
    )

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert issuance.configs['test-pid']['keyChainId'] == 'trusted-key'
    assert 'Warning' not in capsys.readouterr().err


def test_an_external_entity_with_only_the_leaf_doesnt_trust_the_key_chain(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    # Verifiers anchor on the root: a list with the leaf alone rejects the issuer
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', TRUST_LIST_ID)
    issuance.trust_lists[TRUST_LIST_ID] = _trust_list(
        {'type': 'external', 'issuerCertPem': _pem('issuer-keyleaf')}
    )

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert 'has no entity' in capsys.readouterr().err


def test_an_issuer_the_trust_list_doesnt_trust_is_a_warning(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', TRUST_LIST_ID)
    issuance.trust_lists[TRUST_LIST_ID] = _trust_list(
        {'type': 'internal', 'issuerKeyChainId': 'other-tenant-key'},
        {
            'type': 'internal',
            'providerType': 'wallet-provider',
            'issuerKeyChainId': 'issuer-key',
        },
    )

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    error = capsys.readouterr().err
    assert (
        f'The trust list {TRUST_LIST_ID} (EUDIPLO_TRUST_LIST_ID) has no entity' in error
    )
    assert 'no_trust_chain_to_root' in error
    assert issuance.offers


def test_a_missing_trust_list_is_a_warning(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setenv('EUDIPLO_TRUST_LIST_ID', 'typo')

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert 'The tenant has no trust list typo' in capsys.readouterr().err


def test_configurations_that_break_the_metadata_are_deleted_again(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.configs['test-pid'] = {**credential_config(PID, 'issuer-key'), 'x': 1}
    issuance.metadata_breaks = lambda config: config.get('vct') == 'urn:eudi:pid:1'
    # The stored configuration was fine; the new one isn't
    issuance.configs['test-pid']['vct'] = 'urn:old'

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    assert issuance.configs == {}
    assert issuance.offers == []
    error = capsys.readouterr().err
    assert "EUDIPLO could no longer build the tenant's issuer metadata" in error
    assert 'it answers 500: Failed to retrieve issuer metadata' in error
    assert 'deleted test-pid, test-mdl again' in error


def test_metadata_broken_by_someone_else_is_only_a_warning(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.configs['someone-elses'] = {'id': 'someone-elses', 'broken': True}
    issuance.metadata_breaks = lambda config: bool(config.get('broken'))

    assert cli.main(['--no-wait'], transport=issuance.transport) == 0

    assert {'test-pid', 'test-mdl'} <= set(issuance.configs)
    assert 'was broken before the script changed anything' in capsys.readouterr().err


def test_a_missing_role_is_explained(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.failures['POST /api/issuer/offer'] = 403

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    error = capsys.readouterr().err
    assert 'EUDIPLO refused creating the offer (403)' in error
    assert 'issuance:manage and issuance:offer' in error


def test_eudiplos_explanation_of_an_error_is_shown(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.failures['POST /api/issuer/credentials'] = 409

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    assert (
        'EUDIPLO answered 409 to saving the credential configuration test-pid: No'
        in capsys.readouterr().err
    )


def test_wrong_client_credentials_are_named(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.failures['POST /api/oauth2/token'] = 401

    assert cli.main(['--no-wait'], transport=issuance.transport) == 1

    assert 'check EUDIPLO_ISSUER_CLIENT_ID' in capsys.readouterr().err


def test_the_script_waits_until_the_wallet_has_the_documents(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.session_statuses = ['active', 'active', 'fetched']

    assert cli.main([], transport=issuance.transport) == 0

    assert issuance.calls.count('GET /api/session/s-1') == 3
    assert 'The wallet has fetched the documents.' in capsys.readouterr().out


def test_a_failed_issuance_is_reported(
    issuance: FakeIssuance, capsys: pytest.CaptureFixture[str]
) -> None:
    issuance.session_statuses = ['active', 'failed']

    assert cli.main([], transport=issuance.transport) == 1

    assert 'Issuing failed: Wallet error' in capsys.readouterr().err


def test_stopping_the_wait_leaves_a_working_offer(
    issuance: FakeIssuance,
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def interrupt(seconds: float) -> None:
        raise KeyboardInterrupt

    monkeypatch.setattr(cli.time, 'sleep', interrupt)
    issuance.session_statuses = ['active']

    assert cli.main([], transport=issuance.transport) == 0

    assert 'Stopped waiting. The offer still works until' in capsys.readouterr().out
