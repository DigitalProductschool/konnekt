# Contract: the API's language

**Requirements**: FR-005, FR-007, FR-014, FR-016, FR-017, FR-018. **Decisions**: research R6, R8,
R10. **Principle I**: no request or response shape changes; this contract changes which string a
field holds, never a field.

## The request header

| Client | Header | Effect |
|---|---|---|
| The browser (`apiFetch`, `src/api/client.ts`) | `Accept-Language: de` or `Accept-Language: en`, the current language, on every call | the texts of the answer are in that language |
| The MCP server (`mcp/src/backend.ts`) | none | English (`DEFAULT_LANGUAGE`) |
| serviceBW (`/api/connect/*`) | any | ignored: English (FR-017) |
| Anything else (the CLI, curl, tests) | none or junk | English |

`language_of(header: str | None) -> Language` (`backend/app/language.py`): the first tag of the
header (the browser sends one; a full list such as `de-AT,de;q=0.9,en;q=0.8` is read by its first
tag), lower-cased, primary subtag `de` → `'de'`; anything else, an empty or missing header →
`'en'`. The `q` weights are not evaluated (the browser sends one tag; a list's first tag is its
most preferred).

**The middleware** (pure ASGI, `main.py`): for every HTTP request sets the `ContextVar`
`request_language` to `language_of(header)`, or to `'en'` when the path starts with
`/api/connect/`; resets it after the response. Handlers and services read `current_language()`.
The header is never logged (FR-018).

## What follows the language

| Field | Where | English | German |
|---|---|---|---|
| `message` of every `{error, message}` envelope | all management endpoints, `errors.py`'s three handlers, `http_error_for()` | spec 008's text, word for word | the glossary's; the `error` code and `error_id` unchanged |
| the generic `400` (`Invalid request payload`) and `5xx` (`Something went wrong on our side. …`) | `errors.py` | unchanged | "Etwas ist auf unserer Seite schiefgelaufen. …" with the same `error_id` line |
| `label` of `DocumentType`, `DocumentField`, `FieldPart` | `GET /api/document-types` | unchanged | glossary §4; `key`, `kind`, `option_set`, flags, `parts` and the order unchanged |
| `label`, `description` of `Option` | `GET /api/option-sets` | unchanged | glossary §4; `value` and the order unchanged |
| `label` of `RequestedDocumentView` (the documents inside a connection or draft) | `GET /api/form-connections*`, approval request views | unchanged | the catalog's German; a dropped type's key stays its label |
| `name`, `allows` of `AccessLevelInfo` | `GET /api/agent-access`, `GET /api/oauth/clients/{id}` (the consent page) | unchanged | glossary ("Nur lesen", …) |
| the approval request's outcome texts (`approval_*` details) | `GET /api/approval-requests/{id}`, approve, decline | unchanged | glossary |
| the `insufficient_access` message | `412` | unchanged | glossary, with the German level name |

## What stays English whatever the header says

| What | Why |
|---|---|
| `/api/connect/*` in full: messages, `Document request started`, the delivered documents' `label`s | FR-017: the integration answers to serviceBW; the middleware pins the path |
| everything sent to EUDIPLO (keys, claim paths, the connection's name) | FR-017; the DCQL builder reads `label` never |
| `ApiResponse.message` (success messages) | the frontend discards it; the MCP shows none |
| the OAuth RFC bodies (`error`, `error_description`) of `/api/oauth/register` and `/api/oauth/token` | RFC bodies for clients, not the UI (constitution I's exception) |
| the `error` codes, `error_id`s, keys, URLs, references | identifiers (FR-007) |
| stored data: "Standard", the default names "Rule NN" / "Group NN" / "Sub-group NN", saved rule messages, connection names | content and identifiers (FR-007); `RESERVED_NAME_PATTERN` stays English on both sides |
| the account CLI, the logs, the worker | out of scope; FR-018 |
| the MCP server's calls | it sends no header; its tests and fake backend stay as they are |

## `Text` in the services

```python
# backend/app/language.py (imports nothing from the app)
@dataclass(frozen=True)
class Text:
    en: str
    de: str

    def resolve(self, language: Language) -> str: ...


request_language: ContextVar[Language] = ContextVar("request_language", default="en")


def current_language() -> Language: ...
def language_of(header: str | None) -> Language: ...
```

A service raises as today, with a `Text` as the message:

```python
raise HTTPException(
    status_code=400,
    detail={
        "error": "Validation error",
        "message": Text(
            en="Enter a name for the connection.",
            de="Geben Sie einen Namen für die Anbindung ein.",
        ),
    },
)
```

`errors.py`'s `HTTPException` handler resolves a `Text` message with `current_language()` before
answering, and passes a plain string through as today (so a third-party `HTTPException` still
works). Templates format both columns at raise time. A place that catches an `HTTPException` to
reuse its detail (`approvals.approve`) resolves the `Text` there (V3). A `Text` never reaches a
log line (`describe_error()` never logs messages), a stored column or an `ApiResponse`.

## The mirrored validation messages (the parity fixture)

`uv run python -m scripts.export_check_fixtures` writes, beside the evaluator's fixtures,
`rules/src/fixtures/server-messages.json`:

```json
{
  "generator": "backend/scripts/export_check_fixtures.py",
  "cases": [
    { "key": "chooseData", "params": { "name": "Rule 01", "branch": "Standard" },
      "en": "Rule 01 in Standard: choose the data to check.",
      "de": "Rule 01 in Standard: Wählen Sie die zu prüfenden Daten aus." },
    …
  ]
}
```

One case per message of `RULES_MESSAGES`, `CONDITION_PROBLEM_MESSAGES` and
`EDIT_MESSAGES.unknownVariant` that mirrors `services/rules.py`, rendered with fixed sample
parameters. `rules/src/validation.test.ts` renders the same cases from the TS tables and asserts
equality in both languages; `backend/tests/unit/test_check_fixtures.py` fails when the file is
stale (`--check`). The file is generated and never edited by hand (CLAUDE.md "Never").

## Tests (pytest)

- `language_of`: `'de'`, `'de-AT,de;q=0.9,en;q=0.8'`, `'DE-CH'`, `'en-US'`, `'fr'`, `''`, `None`.
- An API test per path with `headers={'Accept-Language': 'de'}`: a validation error's German
  message with the English `error`; `/api/document-types` and `/api/option-sets` German with the
  same keys and order as English; a connection's `documents[].label` German; a `5xx` German with
  `error_id`; `/api/connect/trigger` English despite the header; a call without the header English.
- Every `Text` in the app (collected by walking the modules' constants and the raise sites'
  tests) has two non-empty, different columns.
- The existing English assertions are unchanged (no header → English).
