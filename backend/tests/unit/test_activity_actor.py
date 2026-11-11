"""Who acts in a call to the management API (spec 010, research R4, data-model 2.1).

`actor_of()` on the principal that `get_current_principal` resolves: a team
member's browser session, and an agent's bearer token of an agent connection or of
a personal access token.
"""

import dataclasses

import pytest

from app.db import SessionLocal
from app.models import UserAccount
from app.services.activity import SYSTEM, Actor, actor_of
from app.services.auth import create_login_session, get_current_principal
from tests.conftest import TEST_USERNAME, create_user
from tests.helpers import create_agent_authorization


def test_a_browser_session_acts_as_its_team_member() -> None:
    user_id = create_user()
    with SessionLocal() as db:
        user = db.get(UserAccount, user_id)
        assert user is not None
        session_token = create_login_session(db, user)
        principal = get_current_principal(
            authorization=None, session_token=session_token, db=db
        )

        actor = actor_of(db, principal)

    assert actor == Actor(name=TEST_USERNAME, agent=None, approved=False)


def test_an_agent_connection_acts_for_its_team_member_by_its_clients_name() -> None:
    user_id = create_user()
    _, token = create_agent_authorization(
        user_id, 'drafts', kind='oauth', client_name='Claude Code'
    )
    with SessionLocal() as db:
        principal = get_current_principal(
            authorization=f'Bearer {token}', session_token=None, db=db
        )

        actor = actor_of(db, principal)

    assert actor == Actor(name=TEST_USERNAME, agent='Claude Code', approved=False)


def test_a_personal_access_token_acts_for_its_team_member_by_its_name() -> None:
    user_id = create_user()
    _, token = create_agent_authorization(
        user_id, 'manage', kind='token', name='Nightly checks'
    )
    with SessionLocal() as db:
        principal = get_current_principal(
            authorization=f'Bearer {token}', session_token=None, db=db
        )

        actor = actor_of(db, principal)

    assert actor == Actor(name=TEST_USERNAME, agent='Nightly checks', approved=False)


def test_the_middleware_acts_as_nobody() -> None:
    assert (SYSTEM.name, SYSTEM.agent, SYSTEM.approved) == (None, None, False)


def test_an_actor_cant_be_changed() -> None:
    actor = Actor(name=TEST_USERNAME)

    with pytest.raises(dataclasses.FrozenInstanceError):
        actor.name = 'someone else'  # type: ignore[misc]
