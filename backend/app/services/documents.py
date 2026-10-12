"""Shared documents, reduced to exactly the configured fields (research R9).

EUDIPLO returns a session's documents as `credentials`:
`[{"id": <document type key>, "values": [{…claims…}]}]`, with `cnf` and `status`
removed. Only the fields of the request's revision are copied, under their catalog
keys and labels and in configuration order. Everything else, such as `iss`, `vct` or
`iat`, is dropped (FR-013, SC-005). The middleware holds the documents in memory only
while it delivers them, so nothing here stores or logs a value (research R8).
"""

import base64
import logging
from collections.abc import Mapping, Sequence
from datetime import date, datetime

from pydantic import JsonValue

from ..catalog import MDOC_FORMAT, CatalogDocumentType, CatalogField, get_document_type
from ..schemas import DeliveredDocument, DeliveredField, RequestedDocument, to_iso_utc
from .eudiplo import PresentedCredential

logger = logging.getLogger(__name__)

# How JSON shows a Node.js Buffer: {"type": "Buffer", "data": [<byte>, …]}
_BUFFER_KEYS = frozenset({'type', 'data'})


class _Missing:
    """There is no value at a field's claim path."""


_MISSING = _Missing()


def extract_documents(
    credentials: Sequence[PresentedCredential],
    documents: Sequence[RequestedDocument],
    *,
    request_id: str,
) -> list[DeliveredDocument]:
    """Copy the configured fields of each requested document out of `credentials`.

    `documents` are the requested documents of the request's revision. A field
    without a value is delivered as null and logged by its key, with the request's
    internal id. EUDIPLO rejects a presentation that lacks a requested claim, so this
    shouldn't happen.
    """
    presented: dict[str, PresentedCredential] = {}
    for entry in credentials:
        presented.setdefault(entry.id, entry)

    delivered: list[DeliveredDocument] = []
    for document in documents:
        document_type = _document_type(document.document_type)
        credential = presented.get(document_type.key)
        # No credential query asks for `multiple`, so there is one presentation
        claims: Mapping[str, object] = (
            credential.values[0] if credential and credential.values else {}
        )
        fields: list[DeliveredField] = []
        for key in document.fields:
            field = document_type.field(key)
            if field is None:
                raise ValueError(f'Unknown field {key!r} for {document_type.key!r}')
            value = _claim_value(document_type, field, claims)
            if isinstance(value, _Missing):
                logger.warning(
                    'Document request %s: the shared %s has no value for %s',
                    request_id,
                    document_type.key,
                    key,
                )
                value = None
            fields.append(
                DeliveredField(key=key, label=field.label, value=json_value(value))
            )
        delivered.append(
            DeliveredDocument(
                document_type=document_type.key,
                label=document_type.label,
                fields=fields,
            )
        )
    return delivered


def json_value(value: object) -> JsonValue:
    """Turn a claim value into JSON: bytes as base64, dates as ISO 8601 strings.

    Values keep their JSON type otherwise. EUDIPLO answers in JSON, where an mdoc's
    binary values arrive as objects: Node.js writes a Buffer as
    `{"type": "Buffer", "data": […]}`, and a Uint8Array as `{"0": …, "1": …}`. Both
    become base64 strings too.
    """
    if isinstance(value, bytes | bytearray):
        return base64.b64encode(value).decode('ascii')
    if isinstance(value, datetime):
        return to_iso_utc(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Mapping):
        binary = _binary(value)
        if binary is not None:
            return base64.b64encode(binary).decode('ascii')
        return {str(key): json_value(item) for key, item in value.items()}
    if isinstance(value, list | tuple):
        return [json_value(item) for item in value]
    if value is None or isinstance(value, str | int | float | bool):
        return value
    return str(value)


def _document_type(key: str) -> CatalogDocumentType:
    document_type = get_document_type(key)
    if document_type is None:
        # Revisions are checked against the catalog when they are saved
        raise ValueError(f'Unknown document type {key!r}')
    return document_type


def _claim_value(
    document_type: CatalogDocumentType,
    field: CatalogField,
    claims: Mapping[str, object],
) -> object:
    """The value at a field's claim path, or _MISSING."""
    if document_type.format == MDOC_FORMAT:
        # EUDIPLO merges the claims of all namespaces into one flat object
        namespace, element = field.claim_path
        if element in claims:
            return claims[element]
        # In case a later EUDIPLO version keeps them apart by namespace
        by_namespace = claims.get(namespace)
        if isinstance(by_namespace, Mapping) and element in by_namespace:
            return by_namespace[element]
        return _MISSING

    # SD-JWT VC: claims keep their nesting, such as address → locality
    value: object = claims
    for segment in field.claim_path:
        if not isinstance(value, Mapping) or segment not in value:
            return _MISSING
        value = value[segment]
    return value


def _binary(value: Mapping[object, object]) -> bytes | None:
    """The bytes of a Buffer or a typed array as JSON shows them, or None."""
    if set(value) == _BUFFER_KEYS and value['type'] == 'Buffer':
        return _bytes_of(value['data'])
    indexes = [str(index) for index in range(len(value))]
    if value and set(value) == set(indexes):
        return _bytes_of([value[index] for index in indexes])
    return None


def _bytes_of(items: object) -> bytes | None:
    if not isinstance(items, list):
        return None
    if not all(
        isinstance(item, int) and not isinstance(item, bool) and 0 <= item <= 255
        for item in items
    ):
        return None
    return bytes(items)
