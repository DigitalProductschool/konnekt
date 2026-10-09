"""Manage DO.IT sign-in accounts (research R14).

Run from backend/, for example `uv run python -m app.cli create-user alice`. The
management UI has no account management, so this is the only way to add, change or
remove an account. The confirmations are written for the operator's terminal, and a
password is never printed.
"""

import argparse
import getpass
import sys
from collections.abc import Callable

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .db import SessionLocal
from .models import LoginSession, UserAccount
from .services.auth import (
    MIN_PASSWORD_LENGTH,
    hash_password,
    is_valid_username,
    normalize_username,
)


class CliError(Exception):
    """A problem to report to the operator; the command exits with status 1."""


def _prompt_password() -> str:
    password = getpass.getpass('Password: ')
    if len(password) < MIN_PASSWORD_LENGTH:
        raise CliError(f'The password needs at least {MIN_PASSWORD_LENGTH} characters.')
    if getpass.getpass('Repeat the password: ') != password:
        raise CliError("The passwords don't match.")
    return password


def _find_user(db: Session, username: str) -> UserAccount:
    user = db.scalars(
        select(UserAccount).where(UserAccount.username == username)
    ).first()
    if user is None:
        raise CliError(f"There is no user '{username}'.")
    return user


def create_user(db: Session, username: str) -> str:
    """Add an account, prompting for its password twice."""
    if not is_valid_username(username):
        raise CliError(
            "A username has 3 to 100 characters from a-z, 0-9, '.', '_' and '-'."
        )
    if db.scalars(select(UserAccount).where(UserAccount.username == username)).first():
        raise CliError(f"The user '{username}' already exists.")
    password_hash = hash_password(_prompt_password())
    db.add(UserAccount(username=username, password_hash=password_hash))
    db.commit()
    return f"Created user '{username}'."


def set_password(db: Session, username: str) -> str:
    """Change a password and end the account's sign-in sessions."""
    user = _find_user(db, username)
    user.password_hash = hash_password(_prompt_password())
    db.execute(delete(LoginSession).where(LoginSession.user_account_id == user.id))
    db.commit()
    return f"Changed the password of '{username}' and ended its sign-in sessions."


def delete_user(db: Session, username: str) -> str:
    """Remove an account; the database deletes its sign-in sessions with it."""
    db.delete(_find_user(db, username))
    db.commit()
    return f"Deleted user '{username}'."


COMMANDS: dict[str, Callable[[Session, str], str]] = {
    'create-user': create_user,
    'set-password': set_password,
    'delete-user': delete_user,
}


def main(argv: list[str] | None = None) -> int:
    """Run one command and return the exit status."""
    parser = argparse.ArgumentParser(
        prog='python -m app.cli', description='Manage DO.IT sign-in accounts.'
    )
    commands = parser.add_subparsers(dest='command', required=True)
    for name, command in COMMANDS.items():
        subparser = commands.add_parser(name, help=command.__doc__)
        subparser.add_argument('username')
    args = parser.parse_args(argv)

    try:
        with SessionLocal() as db:
            print(COMMANDS[args.command](db, normalize_username(args.username)))
    except CliError as error:
        print(error, file=sys.stderr)
        return 1
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
