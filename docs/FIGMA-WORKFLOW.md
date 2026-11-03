# Figma implementation workflow

How to build a UI task from a Figma design. `CLAUDE.md` sends you here whenever a task comes with a
Figma URL; follow the steps in order.

Where the design's decisions are recorded:

- `specs/001-servicebw-eudi-middleware/design-notes.md`: the copy, tokens and decisions of the
  form connections' screens.
- `specs/002-connection-rules/design-notes.md`: those of the rules and variants. Figma is out of step
  with spec 002, so its `contracts/ui-screens.md` lists the decided deviations (F#, W#).
- The active feature's `figma-audit/report.md`: sections "Figma must change (decided)" (F#) and
  "Build without frames (decided)" (W#).
- SVG glyphs from the design go into `frontend/src/assets/icons/`, decorative SVGs into
  `frontend/src/assets/illustrations/`; KERN's own icons use the `kern-icon` classes.

## 1. Node discovery
Delegate to the `figma-node-finder` subagent. Pass it the Figma URL and the current speckit task.
Do not call get_metadata or explore the Figma tree in the main context.
If its output contains UNCERTAIN items, ask me before implementing.

## 2. Tokens (once)
Call `get_variable_defs` on the ROOT node. Map Figma variables to existing project tokens.
If a value has no matching token, list it and ask. Do not invent tokens.

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
- Spec 002's Figma file (`s8mU9oJDq3411e8bxMjQO9`) binds KERN's variable names with the values of
  an unreleased KERN ("Revamp"): other colours, radii and type sizes than KERN 2.8. Use the KERN
  2.8 token of the same name, and list a value that differs only for that reason as "KERN 2.8 vs
  Revamp" instead of fixing it (decision 2026-10-25, `specs/002-connection-rules/design-notes.md`
  §9).
