# Data model: the connection PDF

**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

No table, column or migration. The feature adds one computed field to two response schemas
(the version) and a set of in-memory shapes in the browser that live only while one file is
being made (FR-042). The shapes below are TypeScript in `frontend/src/utils/connectionPdf/`
(pure) and Python in `backend/app/services/versions.py`.

## 1. The version (backend)

**What it is**: the connection's content fingerprint (FR-028 to FR-031; research R6). Computed
on every response, never stored, so it can never be stale and needs no migration.

**Field**: `version_fingerprint: str` on `FormConnection` and `FormConnectionDraft`
(`backend/app/schemas.py`) and their mirrors in `api-types/src/form-connections.ts`. Through
them it also reaches `ApprovalPreview.draft` and `ApprovalPreview.connection`, which nothing
shows. Not on `FormConnectionSummary` (the overview).

**Format**: `XXXX-XXXX-XXXX`, the first 12 hexadecimal digits of the SHA-256, upper case, in
three groups of four (`62D0-715F-01D1`). Regex `^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$`.

**Content hashed** (one canonical JSON document, keys sorted, separators `,` and `:`, no
whitespace, `ensure_ascii=False`, encoded as UTF-8):

| Key | Value | Notes |
|---|---|---|
| `id` | the connection's id | the same row before and after publishing |
| `name` | the name as stored (trimmed) | |
| `description` | the description as stored (`''` when none) | |
| `documents` | `[{document_type, fields: [key, …]}]`, the documents in the team's order as the answer's `documents` lists them (spec 010: `ordered_documents()` with the row's `document_order`), each document's fields in catalog order | keys only, never labels (FR-029: not the wording of labels); the order is content (spec, Clarifications 2026-11-12): a save that only reorders changes the version although it creates no revision |
| `branches` | `[{id, name, description, origin, operator, operator_mark, items}]` in the stored order | not `is_main`, not `pull_url` |
| `items` (inside) | each rule `{type, id, name, mark, target, condition, message}`, each group `{type, id, name, mark, operator, message, items}` | `target` with its four keys, `None` kept as `null` |
| `condition` (inside) | the **publishable form** (below) | |

**Left out** (FR-029): `status`, `is_active`, `state`, `start_date`, the status dates
(`published_at`, `activated_at`, `deactivated_at`), `last_activity`, `example`, `trigger_url`,
every `pull_url`,
`rule_set_version`, `next_rule_number`, `next_group_number`, `step`, the draft's `version` (its
save number), `created_at`, `updated_at`, labels, language.

**The publishable form of a condition**: publishing rebuilds every condition with only the keys
its operator uses (`_clean_condition`, `backend/app/services/rules.py`), while a draft keeps its
conditions as sent (spec 005, FR-004). The fingerprint applies the same key selection, without
the checks, so that a complete draft and the connection it publishes hash equally:

| Operator | Kept keys |
|---|---|
| `contains`, `not_contains`; `equal_to`, `not_equal_to` with a string `value` | `operator`, `value`, `match_case` as a boolean (`false` when absent) |
| `greater_than`, `less_than`; `equal_to`, `not_equal_to` with a number `value` | `operator`, `value` |
| `includes_one_of`, `includes_none_of` | `operator`, `values` (order kept) |
| `before`, `after`, `on` | `operator`, `date` |
| `at_least_years_ago`, `less_than_years_ago`, `exactly_years_ago` | `operator`, `years` (a whole float as an int) |
| `at_least_from_now`, `less_than_from_now` | `operator`, `amount` (a whole float as an int), `unit` |
| anything else, or no condition | as stored (an incomplete draft rule; such a draft can't be published unchanged) |

The key selection lives once, in `rules.py` beside `_clean_condition` (`publishable_condition()`),
and `_clean_condition` returns its result after its checks, so the two can't drift.

**Invariants** (pytest, research R6):
- A complete stored draft and the connection `publish_stored_draft()` makes of it have the same
  `version_fingerprint`, including a draft whose conditions carry extra keys, no `match_case`, or
  `years: 5.0`.
- Changing any one element of the table above changes it, the documents' order included;
  deactivating, activating, scheduling, changing the start date, saving a draft unchanged,
  `Accept-Language` and the catalog's labels don't.
- A draft whose documents aren't in catalog order keeps its `version_fingerprint` when it is
  published: both builders hash the documents in the order their answer lists them, never the
  revision's catalog order.

## 2. The content model (frontend, pure)

`ConnectionPdfModel`: everything the PDF says, already in the chosen language, built once on the
main thread at activation (research R9) and posted to the worker. Plain data, so it survives
`postMessage`'s structured clone. Holds no finding, persona or citizen data (FR-041), and no URL
for a draft (FR-013).

```ts
interface ConnectionPdfModel {
  language: Language;                  // spec 009's 'en' | 'de'; the PDF's /Lang and its texts
  kind: 'published' | 'draft';
  status: 'scheduled' | 'active' | 'deactivated' | 'draft';   // a published one's `state` (spec 010; `live` reads 'active')
  startDate: string | null;            // "01.12.2026", a scheduled connection's start date (FR-035); else null
  id: string;                          // the connection ID
  name: string;                        // as entered (FR-034)
  description: string | null;          // null when empty (the line is left out)
  version: string;                     // version_fingerprint, as the API sends it
  generatedAt: string;                 // "09.11.2026, 16:45", Germany's time (FR-035)
  lastSaved: { at: string; saveNumber: number } | null;   // a draft's updated_at and version
  counts: { documents: number; dataItems: number; variants: number; rules: number };
  gaps: PdfGap[];                      // a draft's; [] for a published connection
  links: PdfLinks | null;              // a published connection's; null for a draft
  linksToCreate: string[] | null;      // a draft's: the variants' names in order; null otherwise
  documents: PdfDocument[];            // the Summary's order
  variants: PdfVariant[];              // the details' order, Standard first
}

interface PdfLinks {
  request: string;                                  // trigger_url
  results: { variant: string; url: string }[];      // each branch's pull_url
}

interface PdfDocument {
  name: string;                        // the catalog's label in the language, or its key
  dataItems: string[];                 // the fields' labels, or their keys; [] → placeholder
}

interface PdfVariant {
  name: string;
  origin: 'main' | 'based' | 'empty';
  description: string | null;
  operator: 'and' | 'or';
  operatorChanged: boolean;            // a based variant switched its top-level AND/OR
  items: PdfItem[];                    // [] → "No rules. Anyone who shares …"
}

type PdfItem = PdfRule | PdfGroup;

interface PdfRule {
  type: 'rule';
  id: string;                          // "rule-7"
  name: string;
  mark: 'changed' | 'added' | 'removed' | null;   // only in a based variant
  faded: boolean;                      // removed, or inside a removed or dissolved group
  statement: PdfStatement | null;      // null when the target can't be resolved
  message: string;                     // trimmed; '' → no "Message for citizens" line
  missing: string | null;              // a draft's "Choose a check." (after "Not complete: ")
}

interface PdfStatement {
  subject: string;                     // "Personal ID · Date of birth (Age)"
  words: string | null;                // "is at least"; null while the condition is incomplete
  values: string[];                    // the chips' texts, kept apart so a long list can split
  tail: string | null;                 // "ignoring letter case"
}

interface PdfGroup {
  type: 'group';
  id: string;                          // "group-2"
  name: string;
  mark: 'changed' | 'added' | 'removed' | null;
  faded: boolean;                      // removed or dissolved, or inside one
  operator: 'and' | 'or';
  message: string | null;              // the group's own message
  items: PdfItem[];
}

interface PdfGap {
  text: string;                        // the create flow's words, naming rule and variant
}
```

**Built from** (research R3, R9): `FormConnection | FormConnectionDraft` fetched at activation,
the option sets and the catalog in the chosen language, the language and the moment of
activation:

| Model field | Source |
|---|---|
| `statement` | `statementPartsOf(rule, context)` (`rules/src/statements.ts`) with `context.language`; joined it reads exactly as `statementOf(rule, context).text` when the condition is complete (pinned by a test) |
| value labels | `optionLabel()` through the option sets of the chosen language (`useOptionSets`) |
| `documents`, labels | the response's `documents` (labelled by the server in the request's language, spec 009 R6); a draft's rule context from `draftRuleDocumentsOf()` with the catalog |
| `mark`, `faded`, dissolved groups | `shownItems(items, based)` (`rules/src/tree.ts`), as `SummaryBranch` and `SummaryItem` show them; inside a removed or dissolved group `based` is false and every member is `faded` |
| `counts` | the Summary's counting (`summaryNumbersOf()`, moved out of the page's `summaryCountsOf()`), so page 1 and the Summary never disagree (FR-008) |
| `gaps`, `missing` | research R10: `publishProblems()` (new, `rules/src/validation.ts`) and the connection's own checks |
| `generatedAt`, `lastSaved.at` | `Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hourCycle: 'h23', … })` in both languages |

**Validation**: the builder never throws on incomplete content (a draft is expected to be
incomplete). A tree deeper than the server allows is shown as it is.

## 3. The gaps (frontend, pure)

What publishing the draft would refuse (FR-010; research R10), in this order, one entry per
problem and one problem per item:

1. The connection: no name ("Enter a name for the connection."), a name or description too
   long, no documents ("Add at least one document."), each document without data items
   ("<document>: Choose at least one data item, or remove this document.").
2. Then `publishProblems(branches, context)`: every problem `firstProblem()` would find, in its
   order, collecting instead of stopping: the number of variants and the main variant, then per
   variant its name, description, size and identifiers, then its items in display order, each
   item's first problem (name before content, a group before its members). Each is a
   `RulesProblem` with spec 009's `code`, in the server's words in the chosen language.

`missing` on a rule is the short form of that rule's problem: the code mapped to the create
flow's instruction with a capital letter ("Choose a check.", "Choose the data to check.",
"Write the message for citizens.", …); a rule whose only problem is its name gets none, since the
gap list names it.

## 4. Blocks and pages (frontend, pure)

A **block** is the unit the paginator places; it is never split, except a rule taller than a
page (FR-027), which the builder splits beforehand (research R11).

```ts
interface Measure {
  /** Height of text wrapped at `width`, as PDFKit's heightOfString gives it */
  height(text: string, style: TextStyle, width: number): number;
  /** Width of one line of text, as PDFKit's widthOfString gives it */
  width(text: string, style: TextStyle): number;
}

interface Block {
  height: number;
  gapBefore: number;                   // dropped at the top of a page
  keepWithNext: boolean;               // headings, a group's header, AND/OR, a group's last member
  startsUnits: string[];               // units this block opens (a variant, a group, the result links)
  unitOf: string[];                    // units this block belongs to
  place: PagePlace;                    // where the block is, for the bottom of its page
  bookmark: { title: string; level: 1 | 2 } | null;   // the outline entry it opens (FR-038)
  content: BlockContent;               // what to draw; plain data
}

interface PagePlace {
  section: 1 | 2 | 3 | null;           // null on page 1's title block and the gaps
  variant: string | null;              // in section 3
  opens: 'section' | 'variant' | null; // this block starts it, so no "(continued)"
}

type Page = { index: number; y: number }[];        // paginate()'s result, as in the prototype
```

**Pagination rules** (`paginate.ts`, ported from `prototype/paginate.mjs`; research R4):
- A block is placed whole. A chain is a run of blocks linked by `keepWithNext`; the page breaks
  only before a chain's first block, or inside a chain only on a real overflow.
- At a chain's first block, every unit that a block of the chain opens is checked: if the unit,
  with the chain that leads into it, fits on a fresh page but not in what is left of this one,
  the chain starts on the next page.
- A unit taller than a page flows and splits between its blocks.
- The page count is known before anything is drawn, so "Page n of N" needs no second pass.

**The page's place** (FR-021): the bottom of page n names the `place` of its first block:
`section` alone, `section › Variant <name>` in section 3, plus "(continued)" unless `opens`
says the block starts it. Page 1 has none.

## 5. The worker's messages

```ts
type PdfRequest = { type: 'render'; runId: number; model: ConnectionPdfModel };
type PdfAnswer =
  | { type: 'rendered'; runId: number; bytes: ArrayBuffer }   // transferred, not copied
  | { type: 'failed'; runId: number };                         // no reason: nothing is logged
```

## 6. The download's state (the hook)

`useConnectionPdf` keeps one reducer (`CLAUDE.md`: several state variables → `useReducer`):

| State | Means | Button | Next |
|---|---|---|---|
| `idle` | nothing running | "Download PDF" | `start` → `fetching` |
| `fetching` | the fresh GET runs (FR-005) | busy | `fetched` → `rendering`; `gone` → page's not-found; `failed` → `failed` |
| `rendering` | the worker makes the file | busy | `rendered` → save, `idle`; `failed` → `failed` |
| `failed` | a notice with its error id, "Try again" | "Download PDF" | `start` → `fetching` |

A `start` while `fetching` or `rendering` does nothing (FR-003). Unmounting stops the worker and
ignores every later answer (edge case: leaving the page).

## 7. The file name

`<name>_<version>.pdf`, a draft's `<name>_draft_<version>.pdf` (FR-044):
- In the name, each of `/ \ : * ? " < > |`, every control character and a leading or trailing dot
  or space is replaced with `-`.
- The name part keeps at most 100 code points, cut at a code point boundary and trimmed of a
  trailing space, dot or `-`; `_draft_`, the version and `.pdf` are never cut.
- An empty result (a name of only replaced characters) reads `connection`.
