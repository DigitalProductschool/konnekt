import pytest

from app.services.document_requests import WALLET_ERROR_CODES, status_for_session

# research R5: the wallet answered with an error, and shared nothing
WALLET_ERRORS = [
    'access_denied',
    'invalid_request',
    'invalid_client',
    'invalid_scope',
    'unauthorized_client',
    'unsupported_response_type',
    'server_error',
    'temporarily_unavailable',
    'vp_formats_not_supported',
    'invalid_request_uri_method',
    'invalid_transaction_data',
    'wallet_unavailable',
]
# research R5: EUDIPLO didn't accept a document
VERIFICATION_ERRORS = [
    'signature_invalid',
    'no_trust_chain_to_root',
    'trust_chain_not_trusted',
    'trust_list_unavailable',
    'certificate_expired',
    'x5c_missing',
    'verification_error',
    'claim_value_mismatch',
]


@pytest.mark.parametrize('code', WALLET_ERRORS)
def test_wallet_errors_are_declined(code: str) -> None:
    assert status_for_session('failed', code) == 'declined'


def test_the_wallet_errors_are_exactly_those_of_research_r5() -> None:
    assert WALLET_ERROR_CODES == set(WALLET_ERRORS)


@pytest.mark.parametrize('code', VERIFICATION_ERRORS)
def test_verification_errors_fail_verification(code: str) -> None:
    assert status_for_session('failed', code) == 'verification_failed'


@pytest.mark.parametrize(
    'code',
    [
        # A code a later EUDIPLO version might add
        'status_list_unreachable',
        # Codes are case-sensitive
        'ACCESS_DENIED',
        '',
    ],
)
def test_unknown_codes_fail_verification_rather_than_read_as_a_decline(
    code: str,
) -> None:
    assert status_for_session('failed', code) == 'verification_failed'


def test_a_failure_without_a_code_fails_verification() -> None:
    # For example "Missing required claims"
    assert status_for_session('failed', None) == 'verification_failed'


@pytest.mark.parametrize(
    ('session_status', 'request_status'),
    [
        ('active', 'pending'),
        ('fetched', 'pending'),
        ('completed', 'completed'),
        ('expired', 'expired'),
        # A state this version doesn't know still waits: the last check expires it
        ('paused', 'pending'),
    ],
)
def test_session_states(session_status: str, request_status: str) -> None:
    assert status_for_session(session_status, None) == request_status


def test_a_failure_code_counts_only_for_failed_sessions() -> None:
    assert status_for_session('completed', 'access_denied') == 'completed'
    assert status_for_session('active', 'signature_invalid') == 'pending'
