"""Delete every form connection, with its revisions, requests and webhook updates.

Run from backend/: `uv run python -m scripts.clear_connections`. The sign-in
accounts and their sessions stay. The script asks before deleting, unless `--yes`.

Only the database is emptied: the EUDIPLO configurations and sessions of the deleted
rows stay in EUDIPLO, and the worker no longer knows about them.
"""

import argparse
import sys
from collections.abc import Sequence

from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

# Children first. Listed by name: app.models imports app.config, which checks the
# middleware's settings at import
TABLES = (
    'webhook_deliveries',
    'document_requests',
    'form_connection_revisions',
    'form_connections',
)


class ScriptSettings(BaseSettings):
    """The script's settings, read from the environment and backend/.env."""

    model_config = SettingsConfigDict(env_file='.env', extra='ignore')

    database_url: str = (
        'postgresql+psycopg://postgres:postgres@localhost:5432/template_db'
    )


def _parse_arguments(argv: Sequence[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog='python -m scripts.clear_connections',
        description='Delete every form connection; the sign-in accounts stay.',
    )
    parser.add_argument(
        '--yes', action='store_true', help='delete without asking first'
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    """Run the script and return its exit status."""
    args = _parse_arguments(argv)
    url = make_url(ScriptSettings().database_url)
    engine = create_engine(url, hide_parameters=True)
    try:
        with engine.begin() as connection:
            counts = {
                table: connection.execute(
                    text(f'SELECT count(*) FROM {table}')
                ).scalar_one()
                for table in TABLES
            }
            print(f'Database {url.database} on {url.host}:{url.port}')
            for table, count in counts.items():
                print(f'  {table}: {count}')
            if not any(counts.values()):
                print('Nothing to delete.')
                return 0
            if not args.yes:
                answer = input('Delete these rows? Type "yes" to confirm: ')
                if answer.strip().lower() != 'yes':
                    print('Nothing deleted.')
                    return 1
            # No CASCADE: a table that isn't listed is never emptied
            connection.execute(text(f'TRUNCATE {", ".join(TABLES)}'))
    finally:
        engine.dispose()
    print('Form connections deleted; the sign-in accounts are unchanged.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
