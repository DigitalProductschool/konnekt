# Figma implementation workflow

How to build a UI task from a Figma design. `CLAUDE.md` sends you here whenever a task comes with a
Figma URL; follow the steps in order.

Where the design's decisions are recorded:

- `specs/001-servicebw-eudi-middleware/design-notes.md`: the copy, tokens and decisions of the
  form connections' screens.
- `specs/002-connection-rules/design-notes.md`: those of the rules and variants. Figma is out of step
  with spec 002, so its `contracts/ui-screens.md` lists the decided deviations (F#, W#).
- The active feature's `figma-audit/report.md`: sections "Figma must change (decided)" (F#),
  "Build without frames (decided)" (W#) and "Copy from outside the frontend (decided)" (C#).
- `specs/008-kern-revamp-redesign/`: the port of the redesign on the KERN Revamp. Its `brief.md` is the
  plan of record, its `spec.md` says what decides what (Figma: layout, styling and wording; specs
  001–007: behaviour), and its `design-notes.md` (from pass C on) holds the token overlay, the
  component decisions and the verification tables.
- SVG glyphs from the design go into `frontend/src/assets/icons/`, decorative SVGs into
  `frontend/src/assets/illustrations/`; KERN's own icons use the `kern-icon` classes.

## 1. Node discovery
Delegate to the `figma-node-finder` subagent. Pass it the Figma URL and the current speckit task.
Do not call get_metadata or explore the Figma tree in the main context.
If its output contains UNCERTAIN items, ask me before implementing.

## 2. Tokens (once)
Call `get_variable_defs` on the ROOT node. Map Figma variables to existing project tokens.
If a value has no matching token, list it and ask. Do not invent tokens.
Since spec 008 (2026-11-06) the Figma files carry the KERN Revamp's values, and those values are the
target: a KERN variable whose Revamp value differs from KERN 2.8's is set in the overlay block of
`frontend/src/index.css` under KERN's own name, as the token map in
`specs/008-kern-revamp-redesign/design-notes.md` records; only a Figma variable with no KERN name
becomes a new `@theme` token.

## 3. Implementation (per node, in the returned order)
1. Check the active feature's `figma-audit/report.md`, sections "Figma must change (decided)" (F#)
   and "Build without frames (decided)" (W#). For a node listed there, build the spec's behaviour
   and wording with Figma's layout and styling; for a W# item, build the missing state from the
   frame or KERN pattern it names. Cite the item number in the task.
2. `get_design_context` on the node-id.
3. `get_screenshot` on the node-id.
4. Implement with EXACT values (spacing, borders, radii, font size/weight, line height, colors).
   No approximation. Treat the MCP's React/Tailwind output as a spec, not final code;
   adapt it to project conventions and reuse existing components.
5. Use assets as returned by the MCP; do not substitute icons or images.

## 4. Visual verification (per node)
Dev server: `<npm run dev>` → `<http://localhost:5173/login>`. Start it in the background if not running.
1. `browser_resize` to the ROOT frame size (w×h from figma-node-finder), then `browser_navigate`.
   KERN reserves the scrollbar's width on `html` (`scrollbar-gutter: stable`), so the page can be
   narrower than the window even when nothing scrolls, and every centred element is then off by
   half the gutter. Check `document.body.getBoundingClientRect().width`, and widen the window by
   the difference from the frame width (1455 for a 1440 frame in Chromium on Linux).
2. Font check: `browser_evaluate` with `document.fonts.check('<weight> <size>px "<Figma font>"')`.
   If it returns false, fix font loading before anything else.
3. Numeric check (primary): `browser_evaluate` with getBoundingClientRect + getComputedStyle on the
   section's key elements: width/height, padding, margin, gap, border width/style/color, border-radius,
   font-family/size/weight, line-height, letter-spacing, color, background.
   Compare against the get_design_context values. Output a table: element | property | Figma | actual.
4. Visual check (secondary): `browser_take_screenshot` of the section element only. Compare it with the
   Figma `get_screenshot` for alignment, missing elements and ordering.
5. Fix every mismatch and repeat 3–4. Tolerance: 0px for spacing, borders and radii; exact for colors
   and typography; ±1px for text box heights (font rendering).
6. Move to the next node only when the table is clean. Otherwise report what's unresolved and why.

## Rules
- Never call get_design_context on the full page frame.
- Never implement nodes outside the current task.
- A difference from Figma that an F# or W# item prescribes is not a mismatch: list it with its item
  number in the verification table instead of fixing it.
- History, superseded by spec 008 on 2026-11-06: until then, the Figma file
  (`s8mU9oJDq3411e8bxMjQO9`) bound KERN's variable names to the values of the unreleased KERN
  "Revamp" while the app kept KERN 2.8's values, and a visual check listed such a value as "KERN 2.8
  vs Revamp" instead of fixing it (decision 2026-10-25, `specs/002-connection-rules/design-notes.md`
  §9). Spec 008 reversed this (its `brief.md`, decision 2): the Revamp value is the target, a
  difference from it is a mismatch to fix, and "KERN 2.8 vs Revamp" is no longer a reason to leave
  one. Spec 002's verification tables keep their old entries as history.
