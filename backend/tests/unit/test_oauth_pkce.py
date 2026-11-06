"""PKCE, the secrets' shapes and redirect URI matching (spec 007, research R4).

contracts/oauth.md: S256 only; tokens are a prefix and 43 URL-safe random
characters, a registered client's id `cp_client_` and 32; redirect URIs match
exactly, except the port of `http://localhost` and `http://127.0.0.1` (RFC 8252).
"""

import re

import pytest

from app.models import OauthClient
from app.services.oauth import (
    ACCESS_TOKEN_PREFIX,
    REFRESH_TOKEN_PREFIX,
    new_dcr_client_id,
    new_secret,
    pkce_matches,
    redirect_uri_allowed,
    redirect_uri_matches,
    s256_challenge,
    token_hash,
)

# RFC 7636, appendix B
RFC_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
RFC_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM'
URL_SAFE = re.compile(r'[A-Za-z0-9_-]+')


def _client(*redirect_uris: str) -> OauthClient:
    return OauthClient(
        client_id='cp_client_test',
        kind='dcr',
        client_name='Test agent',
        redirect_uris=list(redirect_uris),
    )


# S256


def test_s256_challenge_is_the_rfc_example() -> None:
    assert s256_challenge(RFC_VERIFIER) == RFC_CHALLENGE


def test_matching_verifier_passes() -> None:
    assert pkce_matches(RFC_VERIFIER, RFC_CHALLENGE)


def test_other_verifier_fails() -> None:
    other = RFC_VERIFIER[:-1] + ('A' if RFC_VERIFIER[-1] != 'A' else 'B')
    assert not pkce_matches(other, RFC_CHALLENGE)


def test_plain_method_challenge_fails() -> None:
    # The `plain` method sends the verifier itself as the challenge
    assert not pkce_matches(RFC_VERIFIER, RFC_VERIFIER)


@pytest.mark.parametrize(
    'verifier',
    [
        '',
        'a' * 42,  # too short
        'a' * 129,  # too long
        'a' * 42 + ' ',  # not an unreserved character
        'ä' * 43,
    ],
)
def test_malformed_verifier_fails(verifier: str) -> None:
    assert not pkce_matches(verifier, s256_challenge('a' * 43))


def test_longest_verifier_passes() -> None:
    verifier = 'a-b.c_d~' * 16
    assert len(verifier) == 128
    assert pkce_matches(verifier, s256_challenge(verifier))


# Token prefixes and lengths


@pytest.mark.parametrize('prefix', [ACCESS_TOKEN_PREFIX, REFRESH_TOKEN_PREFIX])
def test_tokens_are_prefix_and_43_characters(prefix: str) -> None:
    token = new_secret(prefix)
    assert token.startswith(prefix)
    rest = token.removeprefix(prefix)
    assert len(rest) == 43
    assert URL_SAFE.fullmatch(rest)


def test_prefixes() -> None:
    assert ACCESS_TOKEN_PREFIX == 'cp_at_'
    assert REFRESH_TOKEN_PREFIX == 'cp_rt_'


def test_codes_are_43_characters() -> None:
    code = new_secret()
    assert len(code) == 43
    assert URL_SAFE.fullmatch(code)


def test_secrets_differ() -> None:
    assert len({new_secret(ACCESS_TOKEN_PREFIX) for _ in range(100)}) == 100


def test_dcr_client_id_is_prefix_and_32_characters() -> None:
    client_id = new_dcr_client_id()
    assert client_id.startswith('cp_client_')
    rest = client_id.removeprefix('cp_client_')
    assert len(rest) == 32
    assert URL_SAFE.fullmatch(rest)


def test_token_hash_is_sha256_hex() -> None:
    assert token_hash('cp_at_x') == token_hash('cp_at_x')
    assert re.fullmatch(r'[0-9a-f]{64}', token_hash('cp_at_x'))
    assert token_hash('cp_at_x') != token_hash('cp_at_y')


# Redirect URIs


@pytest.mark.parametrize(
    ('registered', 'uri'),
    [
        ('https://agent.example/callback', 'https://agent.example/callback'),
        ('http://127.0.0.1/callback', 'http://127.0.0.1:53682/callback'),
        ('http://127.0.0.1:1234/callback', 'http://127.0.0.1:53682/callback'),
        ('http://localhost:1234/callback', 'http://localhost/callback'),
        ('http://localhost:1234/cb?x=1', 'http://localhost:9999/cb?x=1'),
        (
            'cursor://anysphere.cursor-retrieval/oauth',
            'cursor://anysphere.cursor-retrieval/oauth',
        ),
    ],
)
def test_redirect_uri_matches(registered: str, uri: str) -> None:
    assert redirect_uri_matches(_client(registered), uri)


@pytest.mark.parametrize(
    ('registered', 'uri'),
    [
        # https matches exactly: no other port, path or host
        ('https://agent.example/callback', 'https://agent.example:8443/callback'),
        ('https://agent.example/callback', 'https://agent.example/callback/'),
        ('https://agent.example/callback', 'https://evil.example/callback'),
        ('https://agent.example/callback', 'https://agent.example/callback?x=1'),
        # Loopback: any port, but the same host, path and query
        ('http://127.0.0.1/callback', 'http://localhost:53682/callback'),
        ('http://127.0.0.1/callback', 'http://127.0.0.1:53682/other'),
        ('http://127.0.0.1/callback', 'http://127.0.0.1:53682/callback?x=1'),
        ('http://localhost/callback', 'https://localhost/callback'),
        # Only localhost and 127.0.0.1 are loopback here
        ('http://[::1]/callback', 'http://[::1]:53682/callback'),
        # Never a fragment or credentials
        ('http://localhost/callback', 'http://localhost:1/callback#x'),
        ('http://localhost/callback', 'http://user@localhost:1/callback'),
    ],
)
def test_redirect_uri_does_not_match(registered: str, uri: str) -> None:
    assert not redirect_uri_matches(_client(registered), uri)


def test_non_loopback_http_never_matches() -> None:
    # Even if a metadata document lists it
    uri = 'http://agent.example/callback'
    assert not redirect_uri_matches(_client(uri), uri)


@pytest.mark.parametrize(
    'uri',
    [
        'https://agent.example/callback',
        'http://localhost/callback',
        'http://127.0.0.1:8080/callback',
        'cursor://anysphere.cursor-retrieval/oauth/callback',
        'com.example.app:/oauth2redirect',
    ],
)
def test_redirect_uri_allowed(uri: str) -> None:
    assert redirect_uri_allowed(uri)


@pytest.mark.parametrize(
    'uri',
    [
        '',
        '/callback',
        'http://agent.example/callback',
        'http://192.168.1.1/callback',
        'https:///callback',
        'https://agent.example/callback#fragment',
        'javascript:alert(1)',
        'JavaScript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox',
        'file:///etc/passwd',
        ' https://agent.example/callback',
        'https://agent.example/call back',
        'https://agent.example/\ncallback',
        'https://agent.example/' + 'a' * 2000,
    ],
)
def test_redirect_uri_refused(uri: str) -> None:
    assert not redirect_uri_allowed(uri)
