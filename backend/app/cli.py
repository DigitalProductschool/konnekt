"""Manage DO.IT sign-in accounts (research R14), and clear the form connections.

Run from backend/, for example `uv run python -m app.cli create-user alice`. The
management UI has no account management, so this is the only way to add, change or
remove an account. The confirmations are written for the operator's terminal, and a
password is never printed.

`clear-connections` deletes every form connection, with its revisions and requests,
and keeps the accounts. It empties only the database: the EUDIPLO configurations and
sessions of the deleted rows stay in EUDIPLO.
"""

import argparse
import getpass
import sys
from collections.abc import Callable

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from .db import Base, SessionLocal
from .models import (
    DocumentRequest,
    FormConnection,
    FormConnectionRevision,
    LoginSession,
    UserAccount,
)
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


# Children first, so that no foreign key blocks a deletion
CONNECTION_MODELS: tuple[type[Base], ...] = (
    DocumentRequest,
    FormConnectionRevision,
    FormConnection,
)


def clear_connections(db: Session, confirmed: bool) -> str:
    """Delete every form connection with its revisions and requests.

    The accounts and their sign-in sessions stay. Without `confirmed`, the operator
    sees the row counts and has to type "yes".
    """
    counts = {
        model.__tablename__: db.scalar(select(func.count()).select_from(model)) or 0
        for model in CONNECTION_MODELS
    }
    if not any(counts.values()):
        return 'There are no form connections to delete.'
    if not confirmed:
        for table, count in counts.items():
            print(f'  {table}: {count}')
        answer = input('Delete these rows? Type "yes" to confirm: ')
        if answer.strip().lower() != 'yes':
            raise CliError('Nothing deleted.')
    for model in CONNECTION_MODELS:
        db.execute(delete(model))
    db.commit()
    return (
        f'Deleted {counts[FormConnection.__tablename__]} form connection(s); '
        'the accounts are unchanged.'
    )


USER_COMMANDS: dict[str, Callable[[Session, str], str]] = {
    'create-user': create_user,
    'set-password': set_password,
    'delete-user': delete_user,
}


def main(argv: list[str] | None = None) -> int:
    """Run one command and return the exit status."""
    parser = argparse.ArgumentParser(
        prog='python -m app.cli',
        description='Manage DO.IT sign-in accounts and clear the form connections.',
    )
    commands = parser.add_subparsers(dest='command', required=True)
    for name, command in USER_COMMANDS.items():
        subparser = commands.add_parser(name, help=command.__doc__)
        subparser.add_argument('username')
    clear_parser = commands.add_parser(
        'clear-connections',
        help='Delete every form connection; the accounts stay.',
    )
    clear_parser.add_argument(
        '--yes', action='store_true', help='delete without asking first'
    )
    args = parser.parse_args(argv)

    try:
        with SessionLocal() as db:
            if args.command == 'clear-connections':
                print(clear_connections(db, confirmed=args.yes))
            else:
                command = USER_COMMANDS[args.command]
                print(command(db, normalize_username(args.username)))
    except CliError as error:
        print(error, file=sys.stderr)
        return 1
    except (KeyboardInterrupt, EOFError):
        print('\nCancelled.', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
