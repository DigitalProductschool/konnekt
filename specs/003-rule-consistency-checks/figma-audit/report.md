# Figma ↔ spec audit — 2026-11-01 (redesign of the findings)

## Summary

Section `6171:6748` of file `s8mU9oJDq3411e8bxMjQO9` was redesigned in place: it now has 11 frames
(U01–U11, [units.md](units.md)) instead of 4, and is named "Rules · 5 · Contradictions and
duplicates (findings: warning / info, never block Publish)". This is a **targeted delta audit**,
done by hand (decision 2026-11-01): it compares only the findings surfaces with the spec and with
the UI built in Phase 3 (T029–T033). Figma calls: 16 (1 metadata, 10 screenshots, 1 variable
definitions, 3 design contexts, 1 failed retry).

**Decisions 2026-11-01** (the user, in the session that ran this audit; recorded in the spec's
Clarifications of 2026-11-01):
1. The redesign decides the findings' look, behaviour and wording. The rest of the page stays as
   built (spec 001/002) until a later task matches the whole application to the new design.
2. Notes drop the visible kind label ("Conflicting.", "Redundant.", "Always met."), as Figma draws
   them. The icon carries a visually hidden text alternative with the kind (FR-012).
3. The purple "Changed here" and the label "Added here" are page design: deferred (O3).
4. A targeted delta audit, not the `/figma-audit` pipeline.

| category | count |
|---|---|
| Adopted from Figma (decided) | 8 (A1–A8) |
| Out of scope (decided) | 6 (O1–O6) |
| Build without frames (decided) | 19 (W1–W15, W17–W20) |
| Retired | 9 (F1–F8 of 2026-10-28, W16) |
| Open questions | 0 |

The audit of 2026-10-28 is archived in [archive-2026-10-28/report.md](archive-2026-10-28/report.md).
Its **F1–F8 are retired**: Figma now draws what they asked for, or the decisions above replace
them (see "Retired items"). **W1–W15 keep their numbers** with updated content, so that the tasks
that cite them stay valid. W16 is retired, and W17–W20 are new.

## Adopted from Figma (decided 2026-11-01)

Build these as Figma draws them. Every text follows
[../design-notes.md](../design-notes.md) §2–§6, which quotes the drawn texts and proposes the
undrawn ones in the same voice.

| # | surface | Figma (units, node ids) | build | replaces |
|---|---|---|---|---|
| A1 | Findings banner | `Rules/Findings banner` `6750:40865`; U01 `6750:40882`, U02 `6750:40933`, U03 `6750:41008`, U04 `6750:41077`, U05 `6753:40144`, U06 `6753:40514`, U07 `6753:40851`, U08 `6753:41324`, U09 `6753:41612`, U10 `6758:43067`, U11 `6758:43557` | One compact banner at the top of the rules card, inside it (8 px inset), below the link strip in a based variant (U03), replacing the KERN alert and "Go to next finding". Body/small text, no title. **Kind**: warning (warning background and border) when the variant has a conflict or no applicant can meet it, info otherwise. **States**: *single* (one line, no chevron: U01, U04, U06–U09, U11); *collapsed* (counts row and a chevron that opens the list: U02, U03, U10), the default when there are several lines; *expanded* (counts row, then one `Rules/Finding item` per line, each with its kind icon: U05). The rule and group names in a line are links that scroll the item into view and move the focus to its row or group header ("Go to rule"); branch notices and the incomplete sentence have no link. Warning icon for conflicts and the "No applicant …" notice, info icon for duplicates, covered and always-met items, the "Every applicant …" notice and the incomplete sentence | F1, F2, F3, W16 |
| A2 | Banner copy | U01 "Rule 01 and Rule 02 can’t be met together. So no applicant can meet the rules of Standard."; U02/U03/U10 "2 rules can’t be met together · 1 duplicate rule"; U04/U09/U11 "Rule 06 is the same as Rule 03."; U05 "Sub-group 01: Rule 04 and Rule 05 can’t be met together." and "Rule 06 is the same as Rule 03."; U06 "Every applicant meets Group 01, so it doesn’t check anything."; U07 "Anyone who meets Rule 01 also meets Group 01."; U08 "Rule 01 and Rule 02 can’t be met together at the moment. Right now, no applicant can meet the rules of Standard." | Lines per conflict set, not per item: a pair or larger set is one line (U01), a group's own conflict takes the lines of the members it names (U05). The counts row counts rules and groups per kind, joined with " · ". Undrawn lines, counts and notices: design-notes §3 | F1 |
| A3 | Rule and group notes | `Rules/Problem note` `6177:7837` (levels `conflicting`, `redundant`); U01 `6171:7010`, `6171:7024`; U02 `6171:7490`, `6171:7500`, `6171:7510`; U03 `6171:7960`, `6171:7968`, `6171:7983`; U04 `6178:8216`; U05 `6753:40171`, `6753:40178`, `6753:40187`; U08 `6753:41332`, `6753:41339`; U09 `6753:41644`; U11 `6758:43589` | No visible kind label (decision 2). Text in body/small regular and the default text colour; only the 20 px icon has the kind's colour (warning triangle; info icon). 4 px between icon and text, 24 px from the left, 8 px below. Texts: "Can’t be met together with Rule 02." (U01), "Same as Rule 03. You can delete one of them." (U02), "Can’t be met together with Rule 02 at the moment." (U08). The icon has a visually hidden text alternative: "Conflicting:", "Redundant:" or "Always met:" (FR-012) | F5, F4 (note colours) |
| A4 | Outlines | Rules: U01 `6171:7008`, `6171:7022`; U02 `6171:7488`, `6171:7498`, `6171:7508`; U08 `6753:41329`, `6753:41336`. Groups: U02 `6171:7091`, U05 `6753:40162` (warning), U06 `6753:40525`, U07 `6753:40862` (info) | 1 px outline, radius 8, all round, in the warning colour for conflicts and the info colour for duplicates, covered and always-met items; a group's outline replaces its left border. As built in T030; verify the values | F4 (outline), F6 |
| A5 | Group notes | U02 `6750:41000`, U03 `6750:41069`, U05 `6753:40166` "Rule 04 and Rule 05 in this group can’t be met together."; U06 `6753:40824` "Every applicant meets this group."; U07 `6753:41298` "Anyone who meets Rule 01 also meets this group. You can delete the group." | Under the group's header, in A3's look. Inside a redundant or always-met group the rules stay plain (U06, U07); inside a conflicting group they keep their own notes (U02) | F6, W7 (now drawn) |
| A6 | Tab icon and tooltip | Tabs: U01 `6171:6755`, U02 `6171:7070`, U03 `6171:7541`/`6171:7542`, U04 `6178:7806`, U09 `6753:41605`/`6753:41694`, U10 `6758:43059`/`6758:43060`, U11 `6758:43549`. `Rules/Tooltip` `6139:3739`: U10 `6758:43524`, U11 `6758:43967` | One icon after the variant's name, selected or not (U09), merged with spec 002's (i) of the description: the warning triangle when the variant has a conflict or no applicant can meet it, the info icon otherwise ("ⓘ stays", U11). A variant with neither findings nor a description shows no icon. On hover and keyboard focus, `Rules/Tooltip` shows the description, then, below a divider, a findings segment with the kind icon: the counts row (U10 "2 rules can’t be met together · 1 duplicate rule"), or for a single line "1 duplicate: Rule 06 is the same as Rule 03." (U11). The icon's accessible name is "<variant> has findings" when it has findings (FR-014) | F7 |
| A7 | Findings for today only | U08 banner `6753:41324`, notes `6753:41332`, `6753:41339` | "… at the moment." at the end of a note or line; the notice "Right now, no applicant can meet the rules of Standard." | W5 (now drawn) |
| A8 | Footer | U01 `6171:6771` … U11 `6758:43594` | Findings never disable an action (the section's name: "never block Publish"). The footer itself is page design (O1) | F8 |

## Out of scope (decided 2026-11-01)

The redesigned page around the findings. Build nothing from it in spec 003; a later task matches
the whole application to the new design. Visual checks list these as "page design (O#)", like
"KERN 2.8 vs Revamp".

| # | Figma (every unit) | stays as built |
|---|---|---|
| O1 | App header ("Konnekt", breadcrumb, "Draft" badge), step header ("Step 3 of 4", progress, "Next: Test"), footer ("Back", "Save and exit", "Test rules") | Spec 001/002's `WizardLayout`, step header and `EditorFooter` ("Publish", "Save") |
| O2 | Rule rows (blue names, "Message for applicants:", value chips), group headers and frames, connectors, "+ Add rule" | Spec 002's `RuleRow`, `GroupFrame`, connectors and add buttons; only the `finding` look of A3–A5 changes |
| O3 | "Changed here" in purple, the same as the new mark (variables `variant/changed-text`, `variant/changed-background` "(purple, same as New addition)"), and "Added here" (U03 `6171:7569`, `6171:7578`) | The orange "Changed here" and "New addition" (decision 3). A conflict note on a changed row is told apart by its icon and text, not by colour (US3-AS5) |
| O4 | Link strip "Rules you don’t change follow Standard." (U03 `6344:60080`) | Spec 002's strip and copy |
| O5 | Variant tabs' and "+ Add variant"'s styling | Spec 002's `BranchTab`; only A6's icon and tooltip change |
| O6 | Values bound to KERN's names with the unreleased "Revamp" (`layout-text-default` #0b1220, `action-default` #1d56f0, `layout-background-hued` #f2f5fb, the feedback colours, radii) | KERN 2.8's token of the same name, listed as "KERN 2.8 vs Revamp" (CLAUDE.md, decision 2026-10-25) |

## Build without frames (decided)

W1–W15 keep their numbers; their content follows the decisions of 2026-11-01.

| # | req | build |
|---|---|---|
| W1 | FR-011, FR-015, US1-AS2, US1-AS6, US2-AS3 | Checks rerun unasked after every change, and notes, banner and tab icon update in place: switching U01's connector `6171:6764` to OR removes both notes and the banner. The status region announces each change (design-notes §5) |
| W2 | US1-AS5 | Only the rule inside the OR group gets "Can’t be met together with Rule 01."; its AND sibling, the group and the group's other rule stay plain; no notice |
| W3 | EC-11 | Each of the four notes names the other three: "Can’t be met together with Rule 02, Rule 03 and Rule 04."; one banner line "Rule 01, Rule 02, Rule 03 and Rule 04 can’t be met together." |
| W4 | EC-20, FR-005 | A variant that no applicant can meet shows only its conflicts; duplicate, covered and always-met marks and lines appear once the conflict is gone |
| W5 | FR-008, EC-7 | Drawn for rule pairs (A7). Built the same way for groups, rules on their own and the dialog: "… at the moment.", "Right now, no applicant can meet the rules of <variant>." |
| W6 | FR-005, US2-AS1, AS2, AS4 | Covered rules, in U07's voice: AND "Anyone who meets Rule 02 also meets this rule. You can delete the rule.", OR "Anyone who meets this rule also meets Rule 01. You can delete the rule."; banner lines "Anyone who meets Rule 02 also meets Rule 01." and so on (design-notes §2.4, §3) |
| W7 | FR-005, FR-006, US2-AS5, AS6 | Drawn (A4, A5). Built the same way for a group that is covered in an OR level: "Anyone who meets this group also meets Rule 01. You can delete the group." |
| W8 | FR-006 | An always-met rule: note "Every applicant meets this rule.", line "Every applicant meets Rule 05, so it doesn’t check anything."; the notice "Every applicant meets the rules of Standard." in the info look, without a link |
| W9 | US3-AS2, AS4, AS5 | A rule removed in a based variant shows spec 002's removed state and no note, and leaves its lines, counts and tab icon; restored, it is checked again. A conflict among inherited rules shows in both variants, with A6's warning icon on both tabs. A changed row with a finding keeps the orange "Changed here" (O3) |
| W10 | FR-017, US4-AS1 to AS5 | Publish and save dialog, from spec 002's warnings line U33 `6376:26181`: one line per variant with findings, in tab order, "<variant>: <counts row>" ("Ambulance: 2 rules can’t be met together · 1 duplicate rule"), adding "No applicant can meet the rules of Ambulance." where it applies; warning style with a conflict, info otherwise; "Check rules again" (KERN secondary) opens the rules step on the first variant with findings; "Publish" and "Save" go ahead without a further question |
| W11 | FR-002, EC-13 | A rule with a spec 002 problem keeps the red `Rules/Problem note` (level `blocking`) and outline, carries no finding, and isn't counted |
| W12 | FR-010, EC-19 | The banner adds the info item "The rules of Standard couldn’t be checked completely. Only findings that are certain are shown." (without a link), and " · couldn’t be checked completely" to a counts row; with no certain finding it stands alone in a single info banner. Only certain findings have notes, lines, counts and the tab icon |
| W13 | EC-15 | A variant without checked rules: no banner and no findings icon on its tab |
| W14 | EC-21 | The edit flow's rules step looks like the create flow's and checks the published rules when it opens |
| W15 | FR-002, EC-14 | The rule editor shows nothing about findings |
| W17 | FR-004, FR-013 | Banner states that aren't drawn: several lines in a variant that no applicant can meet: counts row, then ". So no applicant can meet the rules of <variant>." collapsed, and the notice as its own item, without a link, when expanded; a notice or the incomplete sentence alone: a single banner without links |
| W18 | FR-003 | Conflicts without a pair: a rule that can't be met on its own, note "No applicant can meet this rule.", line "No applicant can meet Rule 03."; a group none of whose members can be met, note "Neither Rule 04 nor Rule 05 in this group can be met.", line "Sub-group 01: neither Rule 04 nor Rule 05 can be met." |
| W19 | FR-012 to FR-014, SC-006 | Accessibility of the redesigned parts: the notes' and lines' kind icons carry a hidden kind text (A3); the chevron is a button "Show findings" / "Hide findings" with `aria-expanded`; the name links are links or link-styled buttons that move the focus to the row or group header, which its note describes; the tab icon's accessible name is "<variant> has findings" with findings, and the tooltip opens on keyboard focus |
| W20 | FR-014 | The tooltip's findings segment for the cases that aren't drawn: "1 conflict: <line>" for a single conflict line, "1 finding: <line>" for a single covered or always-met line, otherwise the counts row; the notice appended as in the banner (design-notes §4) |

## Retired items of 2026-10-28

| item | was | now |
|---|---|---|
| F1 | Summary alert's counts and wording | A1, A2 |
| F2 | KERN warning / info alert | A1 (the banner's kinds) |
| F3 | "Go to next finding" | A1 (name links) |
| F4 | Warning and info look of outlines and notes | A3 (notes), A4 (outlines) |
| F5 | Kind label at the start of each note | A3 (no visible label; hidden text) |
| F6 | Conflicting sub-group mark | A4, A5 (now drawn) |
| F7 | Tab icon after the name, separate from the (i) | A6 |
| F8 | Disabled "Publish" | A8 (Figma no longer disables it) |
| W16 | No "Go to next finding" without marked items | W17 (a notice alone: a single banner without links) |

## Coverage

| req | items |
|---|---|
| FR-003 | A2, A3, A5, W2, W3, W18 |
| FR-004 | A2, W17 |
| FR-005 | A2, A3, A5, W4, W6, W7 |
| FR-006 | A2, A5, W8 |
| FR-008 | A7, W5 |
| FR-010 | W12 |
| FR-011 | W1, W14 |
| FR-012 | A3, A4, A5, W11, W19 |
| FR-013 | A1, A2, W17, W19 |
| FR-014 | A6, W9, W12, W13, W19, W20 |
| FR-015 | W1 |
| FR-016 | A8, W10 |
| FR-017 | W10 |
| FR-019 | A1, A3, A4, A6, W10 |
| FR-020 | O1 (the signed-in page), W14 |
| US1 | A1–A5, W1–W3, W18 |
| US2 | A2, A3, A5, W4, W6–W8 |
| US3 | A6, W9 |
| US4 | W10 |

## Not audited

- The publish and save dialog, the rule editor, the edit flow, an incomplete check, a variant
  without rules and the status region: no frame in the section (W10, W15, W14, W12, W13, W1).
- Page design around the findings (O1–O6): out of scope by decision 1.
