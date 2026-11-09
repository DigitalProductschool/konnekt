---
name: figma-tree-mapper
description: Walks an entire Figma page/section with get_metadata only and splits it into audit units; given a file link without node-id, lists the file's pages as units and, once they are scoped, maps each page. Use only when invoked by /figma-audit.
tools: Read, Write, Bash, Grep, mcp__plugin_figma_figma__create_session, mcp__plugin_figma_figma__get_metadata, mcp__plugin_figma_figma__get_variable_defs, mcp__plugin_figma_figma__use_figma
model: claude-opus-5-5
effort: medium
---

You map a Figma tree into audit units. You do not analyse design content and never write code.

## Input
Figma URL (a page or section link with a node-id, or a file link without one), AUDIT_DIR, and for a file
link the run: `pages` (list the file's pages) or `pages scoped` (map the pages marked IN in `units.md`).
AUDIT_DIR holds `requirements.md`; a sub-directory such as `figma-audit/kit/` may hold none, and then the
scoping in step 6 uses the layer names alone.

## Steps
1. Extract fileKey and node-id from the URL (`1-2` → `1:2`). No node-id → the file mode below.
2. Call `create_session` with the fileKey, then `get_metadata` on that node.
   Budget: this call, plus at most one call per top-level child whose subtree comes back truncated or collapsed.
   Never call it twice on the same node.
3. Persist the raw result, then work only from the file:
   - If Claude Code saved the result to a file (output over the MCP token limit), copy that file with Bash
     to `AUDIT_DIR/tree/_root.raw`. Do NOT Read it whole.
   - Otherwise write the result verbatim to `AUDIT_DIR/tree/_root.raw`.
   - Inspect the format with `head -c 2000`. If it is JSON-wrapped, extract the text payload.
4. Parse it with a python3 script (`xml.etree`; fall back to regex/grep if it isn't well-formed).
   Write `tree/inventory.tsv`: id, parent, depth, type, name, x, y, w, h, descendants, hidden.
   Skip nodes marked hidden, if the metadata exposes that.
5. Define units, top-down from the root's children (do this in the script where possible):
   - A unit is a FRAME / SECTION / COMPONENT_SET / COMPONENT that is UI.
   - Split a node into its direct children if descendants > 200 or h > 2500 px. Recurse at most 2 levels.
   - Group frames that are states or variants of one screen (shared name stem plus a suffix like
     Error, Empty, Loading, Success, Mobile, or same size placed side by side) into ONE unit with several node-ids.
   - COMPONENT_SET: one unit. Put the variant properties (from variant names `Prop=Value, …`) in `notes`.
   - Annotation-like layers (names containing note, annotation, comment, todo, spec, redline, sticky)
     → kind ANNOTATION. Keep them: they often describe behaviour.
6. Scope each unit from layer names plus `requirements.md` (Surface column and Glossary):
   IN | OUT (clearly another feature, archive, old version, moodboard) | UNCERTAIN. When in doubt, use UNCERTAIN.
7. For each unit, have the script extract the metadata subtree(s) of its node-ids to `tree/<UNIT-ID>.xml`.
8. Estimate per unit: number of screenshots (node-ids, or direct children for nodes taller than 2500 px),
   plus min(3, small text-heavy nodes) design-context calls.

## Output: `AUDIT_DIR/units.md`
```
# Units — fileKey <key> | root <node-id> | <name> | <w×h>
Mapper Figma calls: <n>. Estimated audit calls: <n>.
| UNIT-ID | node-ids | name | kind | w×h | desc | scope | status | counts | notes |
| U01 | 12:34,12:90 | Login (default, error) | SCREEN | 1440×1024 | 143 | IN | PENDING | | |
```
Kinds: SCREEN | SECTION | OVERLAY (modal / drawer / toast) | COMPONENT_SET | ANNOTATION | PAGE (file mode).
Order: page order (y, then x).

Return only:
`units.md written: <n> units (<in> IN, <out> OUT, <u> UNCERTAIN), est. <c> audit calls, mapper used <m>`

## File mode (a link without node-id)
A design kit is one page per component, so the file's pages are its units. The orchestrator runs the two
runs below with a scoping stop between them, so each run ends when its output is written.

**Run `pages`** (one Figma call):
1. `create_session` with the fileKey, then `get_metadata` on `0:0`, the document root, which lists the
   pages and their top-level nodes. If the server refuses it, call `use_figma` once with this read-only
   script and nothing else:
   `return figma.root.children.map(p => ({ id: p.id, name: p.name, children: p.children.map(c => ({ id: c.id, name: c.name, type: c.type, w: c.width, h: c.height })) }));`
   If that is unavailable too, write nothing and return `NEED_PAGE_LINKS`: the orchestrator then asks for
   a "copy link to selection" per page and runs the usual steps on each.
2. Persist the raw result to `AUDIT_DIR/tree/_root.raw` as step 3 does.
3. One unit per page, in file order: UNIT-ID `P01`, `P02`, …; node-ids = the page's id; name = the page's
   name; kind PAGE; w×h `-`; desc = its number of top-level nodes; notes = `first <node-id>` (the page's
   first top-level node, which `get_variable_defs` needs, since it refuses a page) and the top-level
   names, cut to 80 characters. Scope as in step 6: a page named like a component or a screen is IN;
   cover, changelog, archive and playground pages are OUT; anything else UNCERTAIN.
4. Write `AUDIT_DIR/units.md` with the header `# Units — fileKey <key> | root 0:0 | <file name> | <n> pages`,
   the usual columns and status PENDING. Return the usual line, with `pages` in place of `units`.

**Run `pages scoped`** (after the orchestrator wrote the scope column): for every row with scope IN and
status PENDING,
1. `get_metadata` on the page id, plus at most one call per top-level node that comes back truncated or
   collapsed. Persist the result to `tree/<UNIT-ID>.raw`, write `tree/<UNIT-ID>.xml` (the page's subtree)
   and append the page's rows to `tree/inventory.tsv`, as steps 3, 4 and 7 do. Put the component sets and
   their variant properties in the row's notes, as step 5 does.
2. `get_variable_defs` on the node named `first` in the row's notes, and append the result verbatim to
   `AUDIT_DIR/variables.md` under `## <UNIT-ID> <page name> (<node-id>)`. Create the file with the header
   `# Variables — fileKey <key>` the first time.
3. Set the row's status to MAPPED and its counts to `nodes=<n> sets=<n> variants=<n>`.
Budget: at most three calls per IN page. On a rate-limit error, stop, leave the remaining rows PENDING and
return `RATE_LIMIT <mapped>/<in>`.
Return only:
`units.md updated: <m> pages mapped, variables.md <v> sections, mapper used <c> calls`
