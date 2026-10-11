"""EUDIPLO presentation configurations of revisions (research R3).

contracts/eudiplo-usage.md, "Presentation configuration (call 2)", shows the body.
There are no `credential_sets` and no `claim_sets`, so the wallet must present every
document and every field. Each credential query trusts only the issuers on the
configured trust list.
"""

import hashlib
import json
from collections.abc import Sequence
from typing import Any

from ..catalog import MDOC_FORMAT, CatalogDocumentType, get_document_type
from ..schemas import RequestedDocument

STATUS_CHECK_MODE = 'strict'
# Left out of the hash, so that renaming a form connection creates no revision
UNHASHED_KEYS = frozenset({'id', 'description'})


def config_id(form_connection_id: str, revision: int) -> str:
    """The id of a revision's configuration in EUDIPLO."""
    return f'fc-{form_connection_id}-r{revision}'


def _format_meta(document_type: CatalogDocumentType) -> dict[str, Any]:
    if document_type.format == MDOC_FORMAT:
        return {'doctype_value': document_type.doctype_value}
    return {'vct_values': list(document_type.vct_values)}


def _credential_query(
    document: RequestedDocument, trust_list_id: str
) -> dict[str, Any]:
    document_type = get_document_type(document.document_type)
    if document_type is None:
        raise ValueError(f'Unknown document type {document.document_type!r}')
    unknown = set(document.fields) - {field.key for field in document_type.fields}
    if unknown:
        raise ValueError(f'Unknown fields {sorted(unknown)} for {document_type.key!r}')
    return {
        'id': document_type.key,
        'format': document_type.format,
        'meta': _format_meta(document_type),
        'trusted_authorities': [
            {'type': 'etsi_tl', 'values': [{'trustListId': trust_list_id}]}
        ],
        # Catalog order, whatever the order of the selection
        'claims': [
            {'path': list(field.claim_path)}
            for field in document_type.fields
            if field.key in document.fields
        ],
    }


def build_config(
    *,
    form_connection_id: str,
    revision: int,
    name: str,
    documents: Sequence[RequestedDocument],
    lifetime_seconds: int,
    trust_list_id: str,
) -> dict[str, Any]:
    """Build the presentation configuration body of a revision.

    `documents` must be valid for the catalog; an unknown document type or field
    raises ValueError.
    """
    return {
        'id': config_id(form_connection_id, revision),
        'description': name,
        'lifeTime': lifetime_seconds,
        'statusCheckMode': STATUS_CHECK_MODE,
        'dcql_query': {
            'credentials': [
                _credential_query(document, trust_list_id) for document in documents
            ]
        },
    }


def config_hash(body: dict[str, Any]) -> str:
    """SHA-256 hex of the canonical JSON of a body, without its id and description.

    It changes with the documents, the catalog, the trust list and the lifetime, which
    is how the worker's re-sync finds configurations to renew (research R2).
    """
    content = {key: value for key, value in body.items() if key not in UNHASHED_KEYS}
    canonical = json.dumps(content, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical.encode()).hexdigest()
