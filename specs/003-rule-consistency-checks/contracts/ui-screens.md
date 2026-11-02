# Contract: management UI screens, with findings

**Users**: signed-in DO.IT team members (FR-020). **Requirements**: FR-002, FR-010 to FR-017,
FR-019, FR-020, SC-005, SC-006; US1 to US4. **Decisions**: research R10–R12, R14; the spec's
Clarifications of 2026-10-28 and 2026-11-01; the Figma audit of 2026-11-01
([../figma-audit/report.md](../figma-audit/report.md)).

This extends spec 002's screen contract
([../../002-connection-rules/contracts/ui-screens.md](../../002-connection-rules/contracts/ui-screens.md)),
which still applies, and reuses its screen ids: S2 rules step, S3 rule editor, S4 branches
(variants), S5 publish and save dialog, S6 details, S7 edit flow. No route changes.

**What decides what** (decision 2026-11-01): **spec.md decides what is a finding. The redesigned
Figma section decides the findings' look, behaviour and wording**: section `6171:6748` ("Rules · 5
· Contradictions and duplicates") of file `s8mU9oJDq3411e8bxMjQO9`, frames U01–U11. **The page
around the findings stays as built** (spec 001/002) until a later task matches the whole
application to the new design: items O1–O6. The file binds KERN's names to an unreleased KERN
("Revamp"): use the KERN 2.8 token of the same name, and list a value that differs only for that
reason as "KERN 2.8 vs Revamp" (CLAUDE.md).

---

## Screens and behaviour

### S2. Rules step: banner, notes, outlines, status region

- **Rule notes** (FR-012, A3): a rule with a finding is outlined and has a note under it, in the
  layout of `Rules/Problem note` (levels `conflicting`, `redundant`): a 20 px kind icon, then the
  text in body/small regular and the default text colour. A conflict has the warning triangle; a
  duplicate, covered or always-met rule the info icon. The note says what is wrong in plain words
  ("Can’t be met together with Rule 02.", "Same as Rule 03. You can delete one of them."), without
  a visible kind label; the icon carries a visually hidden kind text ("Conflicting:",
  "Redundant:", "Always met:"). It names the items by their current names (FR-011). The row is
  described by its note.
- **Outlines** (A4): 1 px, radius 8, all round, in the warning colour for conflicts and the info
  colour otherwise; a group's outline replaces its left border.
- **Group notes** (A5): a group or sub-group with a finding is outlined, and its note sits under
  its header, in the same look. Inside a duplicate, covered or always-met group the rules stay
  plain; inside a conflicting group they keep their own notes.
- **Spec 002's problems** keep their red outline and note (`Rules/Problem note` level
  `blocking`). A rule with a problem carries no finding, isn't counted, and the others are checked
  without it (W11).
- **Findings banner** (FR-013, A1, A2, W12, W13, W17): one `Rules/Findings banner` at the top of
  the open variant's rules card, inside it, below the link strip in a based variant:
  - **kind**: warning when the variant has a conflict or no applicant can meet it, info otherwise;
  - **single** (one line, no chevron), **collapsed** (the counts row and a chevron, the default
    with two or more lines) or **expanded** (the counts row, then one `Rules/Finding item` per
    line, then the notice and the incomplete sentence);
  - the names in each line are links: each scrolls its rule or group into view and moves the focus
    to its row or group header. The notice and the incomplete sentence have no link;
  - no banner before the variant's first check, for a variant without checked rules (W13), or
    without findings.
- **Live updates** (FR-011, W1): after every change of any variant's rules, including the
  documents step's, the notes, banner and tab icons update in place, without the team member
  asking. The previous notes stay until the new ones arrive (research R10).
- **Status region** (FR-015): a visually hidden polite `role="status"` region announces each
  changed finding without moving the focus.
- **Footer**: "Publish" (create) and "Save" (edit) stay enabled whatever the findings. Only spec
  002's problems refuse them (FR-016, A8). The footer itself stays as built (O1).

### S3. Rule editor

Unchanged. It shows nothing about findings; a new rule is checked once it is added (FR-002, W15).

### S4. Branches (variants)

- Each variant is checked on its own, with the rules it inherits, changes and adds (FR-001).
- **Tab icon** (FR-014, A6): one icon after the variant's name, selected or not, merged with spec
  002's (i) of the description: the warning triangle when the variant has a conflict or no
  applicant can meet it, the info icon otherwise. No icon without findings and without a
  description. Its accessible name is "<variant> has findings" when the variant has findings.
- **Tooltip** (A6, W20): on hover and keyboard focus, `Rules/Tooltip` shows the description, then,
  below a divider, the findings segment with the kind icon (design-notes §4).
- A rule removed in a based variant shows spec 002's removed state and no note there; it is
  checked again once restored. A conflict among inherited rules shows in both variants (W9).

### S5. Publish and save dialog

- Below its existing lines, one line per variant with findings, in tab order, "<variant>: <counts
  row>", such as "Ambulance: 2 rules can’t be met together · 1 duplicate rule". A variant that no
  applicant can meet adds "No applicant can meet the rules of Ambulance.". Lines with a conflict
  use the warning style, the others the info style (FR-017, FR-019, W10).
- "Check rules again" (KERN secondary, the dialog's existing secondary action) opens the rules step
  on the first variant, in tab order, that has findings.
- Without findings, the dialog is as in spec 002. "Publish" and "Save" go ahead without a further
  question (FR-016, US4-AS5).

### S6. Details

No findings, no banner and no findings icons: findings appear only in S2, S4 and S5 (FR-020). The
details' rules card uses the shared `RuleRow` and `GroupFrame` without their `finding` prop.

### S7. Edit flow

The rules step looks as in create and checks the published rules when it opens (FR-011, W14).

### Accessibility (SC-006, W19)

- The kind never rests on colour alone: icons differ in shape (triangle, circle), each note's and
  line's icon carries a hidden kind text, and each note's text says what is wrong (FR-012).
- The banner's chevron is a button, "Show findings" / "Hide findings", with `aria-expanded`.
- Each name link moves the focus to a focusable row or group header, which its note describes.
- The tab icon's accessible name says "<variant> has findings", and its tooltip opens on keyboard
  focus as on hover (FR-014).
- Icons and outlines reach 3:1 and texts 4.5:1 in KERN 2.8 (research R15).
- The status region is polite, never takes the focus, and announces the sentences of one change
  together (FR-015).
- The banner, notes and tooltip reflow at 320 px and 200 % zoom.

---

## Items from the audit

Build each item as the audit says. The full rows, with every node id, are in
[../figma-audit/report.md](../figma-audit/report.md). Every UI task cites the items it covers.

### S2. Rules step

| # | Build |
|---|---|
| A1 | The findings banner replaces the summary alert and "Go to next finding": kind, single / collapsed / expanded, name links, at the top of the rules card |
| A2 | The banner's lines (one per conflict set or other finding), counts row and notices (design-notes §3) |
| A3 | Notes without a visible kind label, in the default text colour, with the kind's icon and a hidden kind text |
| A4 | Outlines, 1 px, radius 8, all round, warning or info; for groups too |
| A5 | Group notes under the header; rules inside a duplicate, covered or always-met group stay plain |
| A7 | Findings for today only: "… at the moment.", "Right now, no applicant can meet the rules of <variant>." |
| A8 | Findings never disable "Publish" or "Save" |
| W1–W8, W11–W13, W17–W19 | As in the report |

### S3. Rule editor

| # | Build |
|---|---|
| W15 | Spec 002's rule editor unchanged: nothing about findings |

### S4. Branches (variants)

| # | Build |
|---|---|
| A6 | The tab icon merged with the description's (i), and the tooltip's findings segment |
| W9 | Removed and restored rules; inherited conflicts in both variants |
| W20 | The tooltip's findings segment for the undrawn cases |

### S5. Publish and save dialog

| # | Build |
|---|---|
| W10 | One line per variant with findings, with the counts row; "Check rules again" |

### S7. Edit flow

| # | Build |
|---|---|
| W14 | The rules step checks the published rules when it opens |

### Out of scope (O1–O6)

The page around the findings stays as built: app header, step header and footer (O1), rule rows,
group frames, connectors and add buttons (O2), the orange "Changed here" and "New addition" (O3),
the link strip (O4), the tabs' styling (O5). Values that differ only for the Revamp: O6. Visual
checks list a difference that one of these explains with its number, and don't fix it.

### Coverage index

| Item | Screen | Item | Screen |
|---|---|---|---|
| A1, A2, A3, A4, A5, A7 | S2 | W1–W8, W11–W13, W17–W19 | S2 |
| A6 | S4 | W9, W20 | S4 |
| A8 | S2, S5 | W10 | S5 |
| | | W14 | S7 |
| | | W15 | S3 |

F1–F8 and W16 of 2026-10-28 are retired (report, "Retired items"). Tasks completed before
2026-11-01 cite them; [../figma-audit/archive-2026-10-28/report.md](../figma-audit/archive-2026-10-28/report.md)
keeps their wording.

---

## Copy

`checks/findingMessages.ts` is the only place these texts are built (research R12). The full copy,
with the drawn texts and the proposed ones, is in [../design-notes.md](../design-notes.md) §1–§6.
In the patterns, `<item>` is a rule's or group's current name and `<variant>` a variant's.

**Notes** (A3, A5, W2–W8, W18):
- "Can’t be met together with <items>." — today: "… at the moment."
- "<items> in this group can’t be met together."
- "No applicant can meet this rule."
- "Same as <item>. You can delete one of them."
- "Anyone who meets <items> also meets this rule. You can delete the rule." / "… this group. You
  can delete the group."
- "Anyone who meets this rule also meets <items>. You can delete the rule."
- "Every applicant meets this rule." / "… this group."

**Banner lines** (A2): "<items> can’t be met together.", "<group>: <items> can’t be met
together.", "<item> is the same as <y>.", "Anyone who meets <items> also meets <item>.", "Every
applicant meets <item>, so it doesn’t check anything.", "No applicant can meet <rule>."

**Counts row** (A2): "2 rules can’t be met together · 1 duplicate rule", with "1 rule can’t be
met", "1 rule already covered" and "1 group every applicant meets" for the other kinds.

**Notices** (FR-004, FR-006, A7): "So no applicant can meet the rules of <variant>." after a line,
"No applicant can meet the rules of <variant>." alone, "Right now, no applicant can meet the rules
of <variant>.", "Every applicant meets the rules of <variant>."

**Incomplete** (FR-010): "The rules of <variant> couldn’t be checked completely. Only findings that
are certain are shown."

**Buttons**: "Show findings", "Hide findings" (the banner's chevron).

**Tab** (A6): accessible name "<variant> has findings"; tooltip segment "1 duplicate: <line>" or
the counts row.

**Dialog** (W10): "<variant>: <counts row>", "No applicant can meet the rules of <variant>.",
button "Check rules again".

**Announcements** (FR-015, W1): "Rule 02 conflicts with Rule 01.", "Rule 06 is the same as Rule
03.", "Rule 01 makes no difference beside Rule 02.", "Every applicant meets Rule 05.", "Rule 02 no
longer conflicts with Rule 01.", "Rule 06 is no longer redundant.", "Rule 05 is no longer always
met.", and a new notice's own text.
