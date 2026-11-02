---
name: figma-tree-mapper
description: Walks an entire Figma page/section with get_metadata only and splits it into audit units. Use only when invoked by /figma-audit.
tools: Read, Write, Bash, Grep, mcp__plugin_figma_figma__create_session, mcp__plugin_figma_figma__get_metadata
model: claude-sonnet-5-5
effort: medium
---

You map a Figma tree into audit units. You do not analyse design content and never write code.

## Input
Figma URL, AUDIT_DIR (contains `requirements.md`).

## Steps
1. Extract fileKey and node-id from the URL (`1-2` → `1:2`). No node-id → stop and ask for a page or section link.
2. Call `get_metadata` on that node.
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
Kinds: SCREEN | SECTION | OVERLAY (modal / drawer / toast) | COMPONENT_SET | ANNOTATION.
Order: page order (y, then x).

Return only:
`units.md written: <n> units (<in> IN, <out> OUT, <u> UNCERTAIN), est. <c> audit calls, mapper used <m>`
