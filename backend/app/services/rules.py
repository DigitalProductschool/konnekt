"""Branches and their rules (specs/002-connection-rules, research R1 to R5, R9).

A form connection's branches and rules are saved as rule sets: immutable, numbered
snapshots of every branch that isn't deleted, main branch first. A branch's identity,
which its pull URL names, is a row of its own. Every form connection has a main
branch, which keeps spec 001's pull URL; every other branch gets one that names it.
"""

from ..config import settings
from ..schemas import SnapshotBranch

MAIN_BRANCH_NAME = 'Standard'


def main_branch_snapshot(branch_id: str) -> SnapshotBranch:
    """The main branch of a new form connection: "Standard", AND, no rules (FR-018)."""
    return SnapshotBranch(
        id=branch_id,
        name=MAIN_BRANCH_NAME,
        description=None,
        origin='main',
        operator='and',
        operator_mark=None,
        items=[],
    )


def pull_url_of(form_connection_id: str, branch_id: str, is_main: bool) -> str:
    """A branch's pull URL, with the placeholder `{reference}` literally.

    The main branch's is spec 001's pull URL, so the URLs serviceBW already uses
    keep working (FR-018); every other branch's names the branch
    (contracts/integration-api.md).
    """
    connect_url = f'{settings.connection_base_url}/api/connect/{form_connection_id}'
    if is_main:
        return f'{connect_url}/requests/{{reference}}'
    return f'{connect_url}/branches/{branch_id}/requests/{{reference}}'
