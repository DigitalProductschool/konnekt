---
description: Audit the active speckit spec against a Figma page/section and report discrepancies in both directions.
argument-hint: <figma-url-with-node-id> | kit <figma-file-link> | resume | remap [all] | reconcile | <UNIT-IDs...>
---

# /figma-audit — orchestrator

Arguments: $ARGUMENTS

You orchestrate; subagents do the work. Context rules (strict):
- Never call Figma MCP tools in this context.
- Never read `spec.md`, `requirements.md`, `tree/*` or `units/*.md` here. You may read `units.md`, `changes.md`
  and only the `## Summary` section of `report.md`.
- Subagents write all results to disk and return one status line. Never ask them to return details.
  The one exception is `figma-audit-reconciler`: Claude Code refuses report files written by
  subagents, so it returns the report as text and step 4 saves it.
- Subagents cannot spawn subagents, so all fan-out happens here. Run them in the foreground (MCP tools are not available to background subagents).

## 0. Setup
1. Read `.specify/feature.json` → active feature directory = FEATURE_DIR. If unresolvable, stop and ask.
2. AUDIT_DIR = `FEATURE_DIR/figma-audit`. Create `AUDIT_DIR/tree/` and `AUDIT_DIR/units/` if missing.
3. Mode from the arguments:
   - Figma URL with a node-id → fresh run: steps 1–4. If `units.md` already exists, ask: overwrite or resume?
   - `kit` and a file link without node-id → step 2k only (the design kit's pages). A file link without
     `kit` is not a run: ask whether it is the kit.
   - `resume` → step 1 (if stale), step 3 for PENDING / FAILED / RATE_LIMIT rows, step 4.
   - `remap` → step 1. If it rebuilt the index, step 3 in `remap` mode for the DONE rows under
     `## Units to remap` in `changes.md`, each with its changed IDs (every DONE row with `all` if it says
     `Baseline: none`). If the index was already current, remap nothing. Then step 4. Zero Figma calls.
   - `remap all` → step 1, step 3 in `remap` mode for all DONE rows with CHANGED IDs `all`, step 4.
     Only needed when the mappings themselves look wrong; it costs as much as the first audit's mapping.
   - `reconcile` → step 4 only. If `requirements.md` is older than `spec.md`, say that new requirements
     won't be mapped, and that `/figma-audit remap` does that.
   - UNIT-IDs → step 3 (`full`) for those rows only, then step 4.

## 1. Requirements index
If `AUDIT_DIR/requirements.md` is missing or older than `FEATURE_DIR/spec.md` (compare mtimes with Bash),
delegate to `spec-requirements-indexer` with FEATURE_DIR, AUDIT_DIR and spec.md's mtime.
Use `changes.md` only when the indexer rebuilt it in this run; an older one is stale.

## 2. Tree map (fresh run only)
Delegate to `figma-tree-mapper` with the Figma URL and AUDIT_DIR.
Then read `units.md` and show me: units (id, name, kind, scope), every UNCERTAIN and OUT unit,
and the estimated Figma calls for step 3.
STOP and wait for my decisions. Write them into the `scope` column of `units.md` before continuing.

## 2k. Design kit (`kit` mode)
A design kit's file link, for the components' anatomy, variants and tokens. KIT_DIR = `AUDIT_DIR/kit`;
create `KIT_DIR/tree/` if missing. Steps 1, 3 and 4 don't run: the kit has no requirements of its own, and
its pages are mapped, not audited.
1. If `KIT_DIR/units.md` is missing, delegate to `figma-tree-mapper` with the file link, KIT_DIR and the run
   `pages`. If it returns `NEED_PAGE_LINKS`, ask me for a "copy link to selection" per page, then delegate
   the usual tree run once per link with KIT_DIR, and skip to 4.
   Then read `KIT_DIR/units.md` and show me the pages (id, name, scope, first node). STOP and wait for my
   decisions. Write them into the `scope` column.
2. Delegate to `figma-tree-mapper` with the file link, KIT_DIR and the run `pages scoped`: it maps every
   IN page that is still PENDING, so running `/figma-audit kit <link>` again continues after a
   `RATE_LIMIT`.
3. On `RATE_LIMIT`, report the progress and tell me to run the same command again later.
4. Show me the rows of `KIT_DIR/units.md` and the section headings of `KIT_DIR/variables.md`. The plan's
   design-notes take the token map from `variables.md` and each component's variants from
   `KIT_DIR/tree/<UNIT-ID>.xml`.

## 3. Unit audits
For every row with scope `IN` selected by the mode:
- Delegate to `figma-unit-auditor` with: fileKey (from the `units.md` header), UNIT-ID, AUDIT_DIR, mode (`full` | `remap`),
  and in `remap` mode the CHANGED IDs (the list from `changes.md`, or `all`).
- In `remap` mode, pass `effort: "medium"` to the Agent call: it matches text, with no Figma calls.
- Max 3 auditors in parallel in `full` mode (Figma per-minute limits; tune if needed), 6 in `remap` mode.
- Write each returned status line into the row's `status` and `counts` columns.
- On `RATE_LIMIT`: launch nothing more, let running auditors finish, report progress,
  and tell me to continue later with `/figma-audit resume`.

## 4. Reconcile
Delegate to `figma-audit-reconciler` with AUDIT_DIR. It returns a status line, then the report between
`=====BEGIN report.md=====` and `=====END report.md=====`.
1. Save it without retyping it: run
   `python3 -I .claude/scripts/figma-audit-save-report.py <output_file> <AUDIT_DIR>`, where `<output_file>`
   is the transcript path in the reconciler's Agent result. If the script fails, write the text between the
   markers to `AUDIT_DIR/report.md` with Write (Read the old file first, if one exists).
2. Don't repeat or discuss the returned report. Read only `## Summary` of `AUDIT_DIR/report.md` and show it,
   with the report path.

## 5. Next steps (print, don't run)
- `/speckit.clarify Resolve the items in <AUDIT_DIR>/report.md, section "Clarify questions". Ask every one of them, and record each answer with the surfaces and exact wording the question lists.`
- After clarify has updated spec.md: `/figma-audit remap` (remaps only the units whose requirements changed, no Figma calls).
