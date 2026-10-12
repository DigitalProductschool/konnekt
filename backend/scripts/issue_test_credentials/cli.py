"""Issue a test PID and a test mobile driving licence to a test wallet.

Run from backend/: `uv run python -m scripts.issue_test_credentials`. The script

1. checks that the tenant can sign credentials and, with EUDIPLO_TRUST_LIST_ID set,
   that the middleware's trust list trusts them;
2. creates or updates the credential configurations `test-pid` and `test-mdl`, which
   offer every field of the catalog (app/catalog.py), so that the wallet can answer any
   request the middleware builds;
3. makes up a person and creates a pre-authorized-code offer with their data, shown as
   a QR code and as a link for the wallet;
4. waits until the wallet has fetched the documents.

The person is fake, so the script prints their data; the middleware never logs claims.
"""

import argparse
import json
import secrets
import sys
import time
from collections.abc import Sequence
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import httpx2
import segno
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.catalog import DOCUMENT_TYPES, CatalogDocumentType
from app.services.qr import ERROR_CORRECTION, QUIET_ZONE

from .credentials import (
    CONFIG_IDS,
    abbreviated,
    credential_claims,
    credential_config,
    offer_body,
)
from .eudiplo import EudiploIssuer, IssuanceError
from .person import Person, random_person
from .tenant import choose_signer, save_configs

# The document types the script issues: all of the catalog's
DOCUMENT_KEYS = [
    document_type.key
    for document_type in DOCUMENT_TYPES
    if document_type.key in CONFIG_IDS
]
POLL_SECONDS = 2.0
# Pixels per module of the PNG file
PNG_SCALE = 8
# Session statuses after which the wallet has its documents
FETCHED_STATUSES = ('fetched', 'completed')


class ScriptSettings(BaseSettings):
    """The script's settings, read from the environment and backend/.env.

    The issuer client is the script's own: the middleware has no issuance role, so
    `app/config.py` doesn't know these variables.
    """

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    eudiplo_url: str = ''
    eudiplo_issuer_client_id: str = ''
    eudiplo_issuer_client_secret: str = ''
    # The middleware's trust list, to check that it trusts the issued documents
    eudiplo_trust_list_id: str = ''

    def missing(self) -> list[str]:
        """The names of the required variables that are empty."""
        required = (
            'eudiplo_url',
            'eudiplo_issuer_client_id',
            'eudiplo_issuer_client_secret',
        )
        return [name.upper() for name in required if not getattr(self, name)]


def main(
    argv: Sequence[str] | None = None,
    transport: httpx2.BaseTransport | None = None,
) -> int:
    """Run the script and return its exit status. Tests pass a fake `transport`."""
    args = _parse_arguments(argv)
    settings = ScriptSettings()
    missing = settings.missing()
    if missing:
        print(
            f'Set {", ".join(missing)} in backend/.env or in the environment '
            '(README.md, "Test credentials for a test wallet").',
            file=sys.stderr,
        )
        return 1

    document_types = [
        document_type
        for document_type in DOCUMENT_TYPES
        if document_type.key in (args.document or DOCUMENT_KEYS)
    ]
    seed = args.seed if args.seed is not None else secrets.randbelow(1_000_000)
    today = date.today()
    person = random_person(seed, today)

    try:
        with EudiploIssuer(
            settings.eudiplo_url,
            settings.eudiplo_issuer_client_id,
            settings.eudiplo_issuer_client_secret,
            transport,
        ) as eudiplo:
            signer = choose_signer(eudiplo, settings.eudiplo_trust_list_id)
            outcomes, warnings = save_configs(
                eudiplo,
                [
                    credential_config(document_type, signer.key_chain_id)
                    for document_type in document_types
                ],
            )
            for warning in (*signer.warnings, *warnings):
                print(f'Warning: {warning}\n', file=sys.stderr)
            body = offer_body(document_types, person, today)
            offer = eudiplo.create_offer(body)
            expires_at = datetime.now(tz=timezone.utc) + timedelta(
                seconds=body['offerLifetimeSeconds']
            )
            _print_person(person, seed, document_types)
            print('Credential configurations: ' + ', '.join(outcomes) + '\n')
            if args.show_claims:
                _print_claims(document_types, person, today)
            _print_offer(offer['uri'], expires_at, args.qr_png)
            if not args.no_wait:
                _wait_for_wallet(eudiplo, str(offer['session']), expires_at)
    except IssuanceError as error:
        print(error, file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('\nCancelled.', file=sys.stderr)
        return 1
    return 0


def _parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog='python -m scripts.issue_test_credentials',
        description=(
            'Issue a test PID and a test mobile driving licence with the data of a '
            'random person to a test wallet, through EUDIPLO.'
        ),
    )
    parser.add_argument(
        '--document',
        action='append',
        choices=DOCUMENT_KEYS,
        help='offer only this document (repeatable; default: all)',
    )
    parser.add_argument(
        '--seed',
        type=int,
        help='make up the same person as a run with this seed on the same day',
    )
    parser.add_argument(
        '--show-claims', action='store_true', help='print every claim of the offer'
    )
    parser.add_argument(
        '--qr-png', type=Path, metavar='FILE', help='also save the QR code as PNG'
    )
    parser.add_argument(
        '--no-wait',
        action='store_true',
        help="don't wait for the wallet to fetch the documents",
    )
    return parser.parse_args(argv)


def _print_person(
    person: Person, seed: int, document_types: Sequence[CatalogDocumentType]
) -> None:
    print(
        f'Test person (seed {seed}): {person.given_name} {person.family_name}, '
        f'born {person.birth_date.isoformat()} in {person.birth_place.city}'
    )
    print(
        f'Address: {person.street} {person.house_number}, '
        f'{person.home.postal_code} {person.home.city}'
    )
    if any(document_type.key == 'mdl' for document_type in document_types):
        categories = ', '.join(
            privilege.category for privilege in person.licence.privileges
        )
        print(f'Driving licence categories: {categories}')
    print()


def _print_claims(
    document_types: Sequence[CatalogDocumentType], person: Person, today: date
) -> None:
    for document_type in document_types:
        claims = abbreviated(credential_claims(document_type, person, today))
        print(f'{document_type.label} ({document_type.key}):')
        print(json.dumps(claims, indent=2, ensure_ascii=False) + '\n')


def _print_offer(uri: str, expires_at: datetime, png_file: Path | None) -> None:
    qr_code = segno.make_qr(uri, error=ERROR_CORRECTION, boost_error=False)
    local_expiry = expires_at.astimezone().strftime('%H:%M')
    print(
        'Scan the QR code with the wallet, or open the link on the phone. The offer '
        f'works once, until {local_expiry}.'
    )
    qr_code.terminal(out=sys.stdout, border=QUIET_ZONE, compact=True)
    print(f'\n{uri}\n')
    if png_file is not None:
        qr_code.save(str(png_file), kind='png', scale=PNG_SCALE, border=QUIET_ZONE)
        print(f'Saved the QR code to {png_file}\n')


def _wait_for_wallet(
    eudiplo: EudiploIssuer, session_id: str, expires_at: datetime
) -> None:
    print('Waiting for the wallet (Ctrl+C to stop waiting) ...')
    try:
        _poll_session(eudiplo, session_id, expires_at)
    except KeyboardInterrupt:
        local_expiry = expires_at.astimezone().strftime('%H:%M')
        print(f'\nStopped waiting. The offer still works until {local_expiry}.')


def _poll_session(
    eudiplo: EudiploIssuer, session_id: str, expires_at: datetime
) -> None:
    opened = False
    while True:
        session = eudiplo.get_session(session_id)
        status = session.get('status')
        if status in FETCHED_STATUSES:
            print('The wallet has fetched the documents.')
            return
        if status == 'failed':
            reason = session.get('errorReason') or session.get('failureCode')
            raise IssuanceError(f'Issuing failed: {reason or "EUDIPLO gave no reason"}')
        if status == 'expired' or datetime.now(tz=timezone.utc) > expires_at:
            raise IssuanceError(
                'The offer expired before the wallet fetched the documents. '
                'Run the script again for a new one.'
            )
        if session.get('consumed') and not opened:
            print('The wallet has opened the offer ...')
            opened = True
        time.sleep(POLL_SECONDS)
