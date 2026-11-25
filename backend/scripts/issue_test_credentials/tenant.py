"""What the script checks and changes in the EUDIPLO tenant.

- The signing key: credentials are signed with a key chain whose usage is
  `attestation`. Without a `keyChainId`, EUDIPLO takes any of them, so the script names
  one, preferably one the middleware's trust list trusts.
- The credential configurations: EUDIPLO 9 stores a configuration without checking it,
  and builds the tenant's issuer metadata from all of them, so a single broken one stops
  issuing for the whole tenant. After saving, the script checks the metadata and deletes
  its configurations again if they broke it.
"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from .eudiplo import EudiploIssuer, IssuanceError, error_message

ATTESTATION = 'attestation'
# The role of a trust list entity that issues credentials (the other: wallet-provider)
ATTESTATION_PROVIDER = 'attestation-provider'
NO_ATTESTATION_KEY_CHAIN = (
    "The tenant has no key chain with the usage 'attestation', so EUDIPLO can't sign "
    'credentials. Create one in the EUDIPLO console (Key chains), or ask the '
    "tenant's operators to."
)
NO_TRUST_LIST = (
    "EUDIPLO_TRUST_LIST_ID is not set, so the script can't check that the middleware "
    'trusts the issued documents.'
)


@dataclass(frozen=True)
class Signer:
    """The key chain that signs the test documents, and what to warn about."""

    key_chain_id: str
    warnings: tuple[str, ...] = ()


def choose_signer(eudiplo: EudiploIssuer, trust_list_id: str) -> Signer:
    """Pick the attestation key chain, preferring one on the middleware's trust list.

    Raises IssuanceError when the tenant has none. The warnings say when the trust
    list doesn't trust the documents: the wallet then accepts them, but the
    middleware's requests fail with `no_trust_chain_to_root`.
    """
    key_chains = [
        key_chain
        for key_chain in eudiplo.list_key_chains()
        if key_chain.get('usageType') == ATTESTATION
        and isinstance(key_chain.get('id'), str)
    ]
    if not key_chains:
        raise IssuanceError(NO_ATTESTATION_KEY_CHAIN)
    first = str(key_chains[0]['id'])
    if not trust_list_id:
        return Signer(first, (NO_TRUST_LIST,))

    trust_list = eudiplo.get_trust_list(trust_list_id)
    if trust_list is None:
        return Signer(
            first,
            (
                f'The tenant has no trust list {trust_list_id} '
                "(EUDIPLO_TRUST_LIST_ID), so the script can't check that the "
                'middleware trusts the issued documents.',
            ),
        )
    for key_chain in key_chains:
        if _trusts(trust_list, key_chain):
            return Signer(str(key_chain['id']))
    return Signer(
        first,
        (
            f'The trust list {trust_list_id} (EUDIPLO_TRUST_LIST_ID) has no entity '
            f"for this tenant's issuer, the key chain {first}. The wallet will "
            "accept the documents, but the middleware's requests will fail with "
            'no_trust_chain_to_root. Add an entity for the key chain to the trust '
            'list (docs/TEST-CREDENTIALS.md).',
        ),
    )


def save_configs(
    eudiplo: EudiploIssuer, bodies: Sequence[Mapping[str, Any]]
) -> tuple[list[str], list[str]]:
    """Create or update credential configurations.

    Returns what happened to each, such as `test-pid (created)`, and warnings.
    Raises IssuanceError, after deleting the configurations it saved, when saving them
    broke the tenant's issuer metadata.
    """
    tenant_id = eudiplo.get_tenant_id()
    warnings: list[str] = []
    broken_before = _metadata_problem(eudiplo, tenant_id, ())
    if broken_before:
        warnings.append(
            "EUDIPLO's issuer metadata of the tenant was broken before the script "
            f'changed anything ({broken_before}), so offers may fail.'
        )

    outcomes: list[str] = []
    saved: list[str] = []
    for body in bodies:
        stored = eudiplo.get_credential_config(body['id'])
        if stored is not None and all(
            stored.get(key) == value for key, value in body.items()
        ):
            outcomes.append(f'{body["id"]} (unchanged)')
            continue
        eudiplo.save_credential_config(body)
        saved.append(body['id'])
        outcomes.append(f'{body["id"]} ({"created" if stored is None else "updated"})')

    if saved and not broken_before:
        problem = _metadata_problem(eudiplo, tenant_id, [body['id'] for body in bodies])
        if problem:
            for config_id in saved:
                eudiplo.delete_credential_config(config_id)
            raise IssuanceError(
                f'After saving {", ".join(saved)}, EUDIPLO could no longer build the '
                f"tenant's issuer metadata ({problem}). The script deleted "
                f'{", ".join(saved)} again, so that issuing works for the rest of the '
                'tenant. Does the instance run EUDIPLO 9?'
            )
    return outcomes, warnings


def _metadata_problem(
    eudiplo: EudiploIssuer, tenant_id: str, config_ids: Sequence[str]
) -> str:
    """What is wrong with the issuer metadata, or '' when it lists `config_ids`."""
    response = eudiplo.get_issuer_metadata(tenant_id)
    if not response.is_success:
        detail = error_message(response)
        return f'it answers {response.status_code}' + (f': {detail}' if detail else '')
    try:
        supported = response.json().get('credential_configurations_supported')
    except (AttributeError, ValueError):
        return 'it answers something other than a JSON object'
    missing = [
        config_id
        for config_id in config_ids
        if not isinstance(supported, Mapping) or config_id not in supported
    ]
    return f'{", ".join(missing)} missing from it' if missing else ''


def _trusts(trust_list: Mapping[str, Any], key_chain: Mapping[str, Any]) -> bool:
    """Whether a trust list names a key chain as an issuer.

    An internal entity names the key chain. An external one has to carry the
    certificate that verifiers anchor on: the root of an internal chain, or the
    self-signed certificate of a standalone one. A leaf alone isn't trusted.
    """
    anchor = _anchor(key_chain)
    for entity in trust_list.get('entityConfig') or []:
        if not isinstance(entity, Mapping):
            continue
        if entity.get('providerType', ATTESTATION_PROVIDER) != ATTESTATION_PROVIDER:
            continue
        if entity.get('issuerKeyChainId') == key_chain['id']:
            return True
        if anchor and anchor in _pem_blocks(entity.get('issuerCertPem')):
            return True
    return False


def _anchor(key_chain: Mapping[str, Any]) -> str:
    """The certificate a verifier anchors the key chain's credentials on, or ''."""
    for name in ('rootCertificate', 'activeCertificate'):
        certificate = key_chain.get(name)
        # The API answers a certificate as {pem, subject, issuer, ...}; the active
        # one of an internal chain holds the leaf and then the root
        pem = certificate.get('pem') if isinstance(certificate, Mapping) else None
        blocks = _pem_blocks(pem)
        if blocks:
            return blocks[-1]
    return ''


def _pem_blocks(pem: object) -> list[str]:
    """The base64 bodies of the certificates in a PEM text, to compare them."""
    if not isinstance(pem, str):
        return []
    blocks: list[str] = []
    body: list[str] = []
    for line in pem.splitlines():
        line = line.strip()
        if line.startswith('-----BEGIN'):
            body = []
        elif line.startswith('-----END'):
            blocks.append(''.join(body))
        elif line:
            body.append(line)
    return blocks
