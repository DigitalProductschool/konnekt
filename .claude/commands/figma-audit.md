---
description: Audit the active speckit spec against a Figma page/section and report discrepancies in both directions.
argument-hint: <figma-url-with-node-id> | resume | remap | <UNIT-IDs...>
---

# /figma-audit — orchestrator

Arguments: $ARGUMENTS

You orchestrate; subagents do the work. Context rules (strict):
- Never call Figma MCP tools in this context.
- Never read `spec.md`, `requirements.md`, `tree/*` or `units/*.md` here. You may read `units.md` and only the `## Summary` section of `report.md`.
- Subagents write all results to disk and return one status line. Never ask them to return details.
  The one exception is `figma-audit-reconciler`: Claude Code refuses report files written by
  subagents, so it returns the report as text and step 4 saves it.
- Subagents cannot spawn subagents, so all fan-out happens here. Run them in the foreground (MCP tools are not available to background subagents).

## 0. Setup
1. Read `.specify/feature.json` → active feature directory = FEATURE_DIR. If unresolvable, stop and ask.
2. AUDIT_DIR = `FEATURE_DIR/figma-audit`. Create `AUDIT_DIR/tree/` and `AUDIT_DIR/units/` if missing.
3. Mode from the arguments:
   - Figma URL → fresh run: steps 1–4. If `units.md` already exists, ask: overwrite or resume?
   - `resume` → step 1 (if stale), step 3 for PENDING / FAILED / RATE_LIMIT rows, step 4.
   - `remap` → step 1, step 3 in `remap` mode for all DONE rows, step 4. Zero Figma calls.
   - UNIT-IDs → step 3 (`full`) for those rows only, then step 4.

## 1. Requirements index
If `AUDIT_DIR/requirements.md` is missing or older than `FEATURE_DIR/spec.md` (compare mtimes with Bash),
delegate to `spec-requirements-indexer` with FEATURE_DIR and AUDIT_DIR.

## 2. Tree map (fresh run only)
Delegate to `figma-tree-mapper` with the Figma URL and AUDIT_DIR.
Then read `units.md` and show me: units (id, name, kind, scope), every UNCERTAIN and OUT unit,
and the estimated Figma calls for step 3.
STOP and wait for my decisions. Write them into the `scope` column of `units.md` before continuing.

## 3. Unit audits
For every row with scope `IN` selected by the mode:
- Delegate to `figma-unit-auditor` with: fileKey (from the `units.md` header), UNIT-ID, AUDIT_DIR, mode (`full` | `remap`).
- Max 3 auditors in parallel (Figma per-minute limits; tune if needed).
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
- `/speckit.clarify Resolve the items in <AUDIT_DIR>/report.md, section "Clarify questions".`
- After clarify has updated spec.md: `/figma-audit remap` (re-maps the cached inventories, no Figma calls).
