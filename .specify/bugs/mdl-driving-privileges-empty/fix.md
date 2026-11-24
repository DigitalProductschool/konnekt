# Bug Fix: mDL `driving_privileges` arrives as `[{}, {}, {}]`

- **Slug**: mdl-driving-privileges-empty
- **Fixed**: 2026-10-13
- **Assessment**: ./assessment.md
- **Status**: partial

## Summary

The content is lost in EUDIPLO (≤ 9.1.0), not in the middleware, so the middleware part of the
remediation was applied. It adds regression tests that pin down full `driving_privileges` entries,
a warning (field key and request id only) when an mdoc field arrives as a list of empty objects,
and the finding in the docs. The actual fix, a recursive `Map` normaliser in EUDIPLO's
`MdocverifierService.verify`, is outside this repository and is still open. Until it is deployed,
the report's "Done when" can't be met.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/app/services/documents.py` | modified | `_emptied()` helper; `extract_documents` logs a warning when an mdoc field's value is a non-empty list of empty objects. The value is delivered unchanged |
| `backend/tests/unit/test_documents.py` | added tests | Full-entry pass-through, warning on `[{}, {}, {}]`, no warning for other shapes |
| `backend/tests/helpers.py` | modified (comment) | `SHARED_CREDENTIALS` shows a fixed EUDIPLO |
| `specs/001-servicebw-eudi-middleware/research.md` | modified | R9 value types note; R19 item 4 row "mdoc binary and date values" → partly settled |
| `docs/EUDIPLO.md` | modified | New row in §10 Known pitfalls |
| `specs/001-servicebw-eudi-middleware/contracts/eudiplo-usage.md` | modified | Note next to "mdoc claims of all namespaces are merged" |

## Diff Highlights

```python
elif document_type.format == MDOC_FORMAT and _emptied(value):
    logger.warning(
        'Document request %s: the %s entries of the shared %s arrived '
        'without content',
        request_id,
        key,
        document_type.key,
    )
```

```python
def _emptied(value: object) -> bool:
    return (
        isinstance(value, list)
        and bool(value)
        and all(isinstance(item, Mapping) and not item for item in value)
    )
```

## Tests Added or Updated

- `tests/unit/test_documents.py::test_driving_privileges_are_delivered_with_their_full_entries`:
  the AM/B/L entries from the assessment, B with `expiry_date` and nested `codes`, are delivered
  exactly, with dates as ISO strings.
- `tests/unit/test_documents.py::test_driving_privileges_emptied_by_eudiplo_are_logged_by_key_only`:
  `[{}, {}, {}]` (EUDIPLO 9.0.0's real output) is delivered unchanged and logs one warning that
  names the request id, `mdl` and `driving_privileges`, and contains no value.
- `tests/unit/test_documents.py::test_other_mdoc_values_log_no_warning` (4 cases): `[]`, a list
  with partly empty entries, a list of strings and `{}` log nothing.

## Local Verification

- `DATABASE_URL=…/konnekt_db_test uv run pytest` → 514 passed
- `uv run ruff check .` → all checks passed; `uv run ruff format --check .` → 52 files formatted
- `uv run mypy app/ scripts/ tests/` → no issues in 49 source files
- No live check: this needs a wallet and a fixed EUDIPLO.

## Deviations from Assessment

- None in substance. The delivered value for `[{}, …]` stays unchanged, the default in the
  assessment; the `null` alternative was not applied, as the assessment asks for consent first.
- `tests/helpers.py` got a comment rather than a second fixture; the warning test builds its
  claims inline in `test_documents.py`.

## Follow-ups

- **EUDIPLO (outside this repo)**: open the upstream issue and PR with the recursive `toPlain`
  normaliser from the assessment, maybe also suggesting a fix to `@owf/mdoc`'s `getPrettyClaims`,
  and get a fixed or patched build onto the hosted instance.
- **Consumer (sk-proto-1)**: correct the cause in `middleware-api.md` §4 item 3. "Class B since"
  stays manual until EUDIPLO is fixed.
- **Live check after the EUDIPLO fix**: T081 / quickstart V-runs, and sk-proto-1 quickstart 12.2.
- Open questions from the assessment still stand: which wallet app and version, whether the mDL
  came from `issue_test_credentials`, who operates the hosted EUDIPLO, and `[{}, …]` vs `null`.
