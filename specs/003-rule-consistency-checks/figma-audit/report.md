# Figma ↔ spec audit — 2026-10-28

## Summary
Units audited 4/4 (OUT 0, UNCERTAIN 0, FAILED 0). Figma calls 5: 1 by the mapper and 1 per unit, as each unit file's header records. `units.md`'s counts list a call for U04 only.

Figma file `s8mU9oJDq3411e8bxMjQO9`, section `6171:6748` "Rules · 5 · Problems: contradiction and duplicate". The decisions come from the spec's Clarifications session 2026-10-28, which has 15 answers. Answers #2 to #15 refer to the design. Answer #1 doesn't, so it settles nothing here.

| category | count |
|---|---|
| Conflicts | 0 |
| Spec-only (not in Figma) | 0 |
| Figma-only — behavioural | 0 |
| Partial matches | 0 |
| Figma-only — cosmetic (FYI) | 8 |
| Figma must change (decided) | 8 |
| Build without frames (decided) | 16 |

Top 5 issues: none open. A 2026-10-28 design decision or a standing rule settles every non-cosmetic item (F1–F8, W1–W16).

## Conflicts
None open. The conflicts the units found are settled:
- the summary alert's wording (F1) and style (F2)
- the finding look (F4)
- the disabled "Publish" button and the "(blocks)" frame name (F8)

## Spec-only (not in Figma)
None open. No unit covers 34 requirements with UI = Y. All of them are settled under Build without frames, W1–W16 (see Coverage).

## Figma-only — behavioural
None open. Every FIGMA-ONLY behavioural row in the units is spec 001/002 baseline that spec 003 doesn't change. These rows are listed under cosmetic (FYI), rows 1–6.

## Partial matches
None open. The partial matches are settled:
- F1: summary counts and the FR-004 notice
- F3: "Go to next finding"
- F5: the kind prefix
- F6: the sub-group mark
- F7: the tab icon

## Figma-only — cosmetic (FYI)
These are spec 001/002 baseline or annotations. They need no action and no question.

| # | item | where (units, node-ids) | why no action |
|---|------|-------------------------|---------------|
| 1 | App header: "Proov" logo, breadcrumb "Your connections / Passenger transport licence", "Draft" badge, avatar "LW" | U01 `6702:41161`, U02 `6702:41194`, U03 `6702:41227`, U04 `6702:41260` | Spec 001/002 baseline. It is the signed-in context of FR-020 (CLAR 2026-10-28 #11) |
| 2 | Step header: "Step 3 of 4", title "Rules", description | U01 `6702:41182`, U02 `6702:41215`, U03 `6702:41248`, U04 `6702:41281` | Spec 002 baseline. The edit flow's rules step looks the same (CLAR 2026-10-28 #11, W14) |
| 3 | "+ Add variant" with the "What is a variant" tooltip | U01 `6171:6757`, `6171:6758`; U02 `6171:7072`, `6171:7073`; U03 `6171:7543`; U04 `6178:7808`, `6178:7809` | Spec 002 baseline |
| 4 | AND/OR connectors, ⋮ menus on rules and groups, "+ Add rule" | Connectors: U01 `6171:6764`, `6171:6767`; U02 `6171:7079`, `6171:7082`, `6171:7089`, `6171:7096`, `6171:7441`; U03 `6171:7549`, `6171:7552`, `6171:7559`, `6171:7566`, `6171:7575`; U04 `6178:7815`, `6178:7818`, `6178:7825`, `6178:7832`, `6178:8167`. Add buttons: U01 `6171:6770`; U02 `6171:7099`, `6171:7101`, `6171:7103`; U03 `6171:7571`, `6171:7573`, `6171:7580`; U04 `6178:7835`, `6178:7837`, `6178:7839` | Spec 002 baseline. Every change made through them reruns the checks (CLAR 2026-10-28 #4, W1) |
| 5 | Rule rows without a finding | U02 Rule 01 `6171:7077`, Rule 02 `6171:7080` (the same rows are COVERED in U03 `6171:7547`, `6171:7550` and U04 `6178:7813`, `6178:7816`) | Spec 002 rule row, correctly unmarked |
| 6 | Variant link strip "Linked to Standard" / "Rules you don't change here update with Standard." | U03 `6344:60080` | Spec 002 baseline |
| 7 | Page scrollbar | U01 `6274:33711`, U02 `6274:33713`, U03 `6274:33715` | Cosmetic |
| 8 | Frame and layer names: "problems on changed and new rules", layers "Problem" / "Problem note", "Suggestion only (does not block)", "suggestion (duplicate)" | U03 `6171:7535`, `6171:7957`, `6171:7959`, `6171:7967`, `6171:7982`; U04 `6178:7800`; U02 `6171:7064` | Annotations, not built. The UI uses the kinds "conflicting", "redundant" and "always met" (F1, F5) and the finding look (F4). U02's "(blocks)" is handled in F8 |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision (CLAR … or RULE wording) |
|---|-----|------------------------|-------------|---------------|-----------------------------------|
| F1 | FR-013a, FR-016d, FR-004, FR-013c, FR-003b, FR-005b, FR-011d, FR-016a, ENT-Finding.kind, ENT-Finding.branchKind, US1-AS1 | Summary alert: U01 `6616:44378`, U02 `6616:44400`, U03 `6616:44417`, U04 `6616:44434` | U01 "1 rule conflict to fix: nobody can meet both Rule 01 and Rule 02."; U02 "1 rule conflict to fix: nobody can meet both Rule 04 and Rule 05. There's also 1 suggestion."; U03 "1 rule conflict to fix in this variant: nobody can meet both Rule 04 and Rule 05. There's also 1 suggestion."; U04 "1 suggestion: Rule 06 is the same as Rule 03. You can still continue." Problems: counts pairs instead of marked items; says "to fix"; says "suggestion" for redundant; U01 lacks the FR-004 notice; U02/U03 don't count the conflicting sub-group | U01 "2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the rules of Standard."; U02 "2 conflicting rules and 1 conflicting group: nobody can meet both Rule 04 and Rule 05. There's also 1 redundant rule."; U03 "2 conflicting rules and 1 conflicting group in this variant: nobody can meet both Rule 04 and Rule 05. There's also 1 redundant rule." (the decision gives only the start and "…": completed with U03's own clause and U02's count wording); U04 "1 redundant rule: Rule 06 is the same as Rule 03. You can still continue." In other states, count the marked items per kind ("N conflicting rules/groups", "N redundant rules/groups", "N always-met rules/groups", W8), put "There's also …" after the conflicts, end with the FR-004 or FR-006 notice, and never say "to fix" | CLAR 2026-10-28 #2 (U01; no "to fix"; U04 keeps "You can still continue."); CLAR 2026-10-28 #13 (U02, U03); RULE wording (U04 "1 suggestion" → "1 redundant rule") |
| F2 | FR-013c, FR-019c, FR-012c | Summary alert: U01 `6616:44378`, U02 `6616:44400`, U03 `6616:44417`, U04 `6616:44434` | U01–U03: red error/danger alert with a diamond "!" icon. U04: orange warning alert with a triangle icon and bold text, though the branch has only a redundancy | U01, U02, U03: KERN warning alert (warning colour, triangle icon). U04: KERN info alert (info colour, info icon), less prominent than a conflict. Red stays reserved for spec 002 problems. Keep position and width | CLAR 2026-10-28 #3 |
| F3 | FR-013b, FR-013d (button present when a rule or group has a finding) | Summary alert: U01 `6616:44378`, U02 `6616:44400`, U03 `6616:44417`, U04 `6616:44434` | Items named in bold plain text, with no link or button. U02/U03 don't name Rule 06 | Add a "Go to next finding" button (KERN tertiary) to each alert. The alert text stays as in F1. Each press scrolls the next rule or group with a finding, in display order, into view and moves the focus to its row or group header. After the last one it starts over. Cycles: U01 Rule 01 `6171:6762` → Rule 02 `6171:6765`; U02 Sub-group 01 header `6171:7093` → Rule 04 `6171:7094` → Rule 05 `6171:7097` → Rule 06 `6171:7442`; U03 Sub-group 01 header `6171:7563` → Rule 04 `6171:7564` → Rule 05 `6171:7569` → Rule 06 `6171:7578`; U04 Rule 06 `6178:8168`. When to leave the button out: W16 | CLAR 2026-10-28 #15 |
| F4 | FR-012c, FR-012a, FR-019c | Conflict outlines/notes: U01 `6171:7008`/`6171:7010`, `6171:7022`/`6171:7024`; U02 `6171:7487`, `6171:7488`/`6171:7490`, `6171:7498`/`6171:7500`; U03 `6171:7957`, `6171:7958`/`6171:7960`, `6171:7568`/`6171:7968`. Redundancy outlines/notes: U02 `6171:7508`/`6171:7510`; U03 `6171:7577`/`6171:7983`; U04 `6178:8214`/`6178:8216` | Conflicts use spec 002's red "Problem" outline and the `Rules/Problem note` component (red icon, red text). Redundancy notes have an amber/orange outline and an orange info icon (U02, U04) or warning icon (U03), also built from `Rules/Problem note` | Keep the outline and note layout. Conflicts: KERN warning colour and warning triangle icon. Redundant and always-met findings: KERN info colour and info icon. Spec 002 problems keep their red "Problem" look. The "Changed here" chip (U03 `6171:7568`, `6171:7569`) is orange too, so F5's kind label is what tells a conflict apart from it | CLAR 2026-10-28 #3 |
| F5 | FR-012d, FR-012a, FR-003b, FR-005b, FR-011d, FR-016d, ENT-Finding.kind, ENT-Finding.reason, US1-AS1, US2-AS3, EC-9 | Notes: U01 `6171:7010`, `6171:7024`; U02 `6171:7490`, `6171:7500`, `6171:7510`; U03 `6171:7960`, `6171:7968`, `6171:7983`; U04 `6178:8216` | Notes don't name their kind: "Can't be met together with Rule 02.", "Same as Rule 03. You can delete one to keep the list clear."; U03 `6171:7960` reads "Can't be met together with Rule 05 (changed here)." | U01 `6171:7010` "Conflicting. Can't be met together with Rule 02.", `6171:7024` "Conflicting. Can't be met together with Rule 01."; U02 `6171:7490` "Conflicting. Can't be met together with Rule 05.", `6171:7500` "Conflicting. Can't be met together with Rule 04.", `6171:7510` "Redundant. Same as Rule 03. You can delete one to keep the list clear."; U03 `6171:7960` "Conflicting. Can't be met together with Rule 05.", `6171:7968` "Conflicting. Can't be met together with Rule 04.", `6171:7983` "Redundant. Same as Rule 01. You can delete one to keep the list clear."; U04 `6178:8216` "Redundant. Same as Rule 03. You can delete one to keep the list clear." | CLAR 2026-10-28 #3; RULE wording (U03 `6171:7960` drops "(changed here)", which is copy only). CLAR #13's "The rule notes … stay as drawn" keeps these notes next to the new group mark. It doesn't bring back their drawn text |
| F6 | FR-012e, FR-003b, FR-003a, FR-012a, US1-AS3, US1-AS4, ENT-Finding.target | Sub-group 01: U02 header `6171:7093` (frame `6171:7091`), U03 header `6171:7563` (frame `6171:7561`) | Sub-group unmarked. Only Rule 04 and Rule 05 carry notes, although the sub-group can't be met on its own | Conflicting mark on Sub-group 01 in the conflict look of F4: an outline round the group and a note under its header, "Conflicting. Rule 04 and Rule 05 in this group can't be met together." The rule notes stay. Group 01 (U02 `6171:7086`, U03 `6171:7556`, U04 `6178:7822`) and U04's Sub-group 01 `6178:7829` stay plain. The summary counts the group (F1) | CLAR 2026-10-28 #13 (look: #3) |
| F7 | FR-014a, FR-014b, US3-AS1 | Variant tabs: U01 "Standard" `6171:6755`, U02 "Standard" `6171:7070`, U03 "Ambulance" `6171:7542`, U04 "Standard" `6178:7806` | U01, U02, U04: no icon (only the component variant name "Rules/Variant tab · fixes" hints at one). U03: blue info icon, although Ambulance has a conflict. No text alternative | Every tab whose branch has findings, selected or not, shows an icon after the name, without a number. KERN warning icon on U01 `6171:6755`, U02 `6171:7070` and U03 `6171:7542` (these branches have conflicts). KERN info icon on U04 `6178:7806` (redundancy only). Text alternative "<branch> has findings", e.g. "Standard has findings", "Ambulance has findings". U03 "Standard" `6171:7541` stays plain | CLAR 2026-10-28 #14 (colours: #3) |
| F8 | FR-016c, FR-016a, FR-016b, US1-AS7, US4-AS5 | Footer: U01 `6171:6771`, U02 `6171:7104`, U03 `6171:7581`. Frame name: U02 `6171:7064` | "Publish" drawn pale (disabled) while a conflict is shown and no spec 002 problem is on screen. The frame is named "… sub-group: conflict (blocks)" | "Publish" (and "Save" in the edit flow) stays enabled, as in U04 `6178:7840`, unless a spec 002 FR-006 problem refuses it. Findings never disable, delay or add a step to any action. The frame name drops "(blocks)" (annotation only) | CLAR 2026-10-28 #2 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|-----|------------------|--------------------------------------------|----------|
| W1 | FR-015, US1-AS2, US1-AS6, US2-AS3 (mark gone after a change), FR-011b | Rules step: notes, summary alert, tab icon, status region | The existing controls (cosmetic row 4) trigger it: after every change the checks rerun unasked, and the notes, summary alert and tab update in place. Example: switching U01's connector `6171:6764` to OR removes both notes (`6171:7010`, `6171:7024`) and the alert `6616:44378`. A visually hidden polite status region (`role="status"`) announces each change without moving the focus. New conflict: "Rule 02 conflicts with Rule 01."; new redundancy: "Rule 06 is the same as Rule 03." or "Rule 01 makes no difference beside Rule 02."; new always-met item: "Every applicant meets Rule 05."; finding gone: "Rule 02 no longer conflicts with Rule 01.", "Rule 06 is no longer redundant.", "Rule 05 is no longer always met."; a new FR-004 or FR-006 notice is announced with its own text | CLAR 2026-10-28 #4 |
| W2 | US1-AS5 | Rules step – rule note | The conflict note of F4/F5 (U01 `6171:7010`). Only the rule inside the OR group (Group 01: U02 `6171:7086`, U03 `6171:7556`, U04 `6178:7822`) gets a note: "Conflicting. Can't be met together with Rule 01." Its AND sibling, the group and the group's other rule stay plain, and the branch gets no notice | CLAR 2026-10-28 #5 |
| W3 | EC-11 | Rules step – rule notes | The conflict note of F4/F5. Each of the four rules names the other three, e.g. "Conflicting. Can't be met together with Rule 02, Rule 03 and Rule 04." | CLAR 2026-10-28 #5 |
| W4 | EC-20, FR-006b | Rules step – notes | U01 `6171:6749`: an unmeetable branch shows only its conflict notes. The redundancy and always-met notes (as U02 `6171:7510`, U03 `6171:7983`, U04 `6178:8216`) appear once the conflict is gone. Rules inside a redundant or always-met group stay plain (W7), as FR-005e/FR-005c require | CLAR 2026-10-28 #5, #6 |
| W5 | FR-008b, EC-7, ENT-Finding.appliesToday | Rules step – rule note, summary alert | Conflict note of F4/F5: "Conflicting. Can't be met together with Rule 02 by applicants who share today." A branch that can be met on other days but not today gets "No applicant who shares today can meet the rules of Standard." in its warning summary alert (F1/F2) | CLAR 2026-10-28 #5 |
| W6 | FR-005b, US2-AS1, US2-AS2, US2-AS4 | Rules step – rule note | U04's redundancy note `6178:8214`/`6178:8216` in the info look (F4). Implied by others in a level combined with AND: "Redundant. Anyone who meets Rule 02 also meets this rule. You can delete it to keep the list clear."; with several rules: "Redundant. Anyone who meets Rule 02 and Rule 03 also meets this rule. You can delete it to keep the list clear." Implies another in a level combined with OR: "Redundant. Anyone who meets this rule also meets Rule 01. You can delete it to keep the list clear." | CLAR 2026-10-28 #6 |
| W7 | FR-005c, FR-012e (redundant and always-met groups), US2-AS6 | Rules step – group mark | Group headers (U02 `6171:7086`, `6171:7093`; U03 `6171:7556`, `6171:7563`; U04 `6178:7822`, `6178:7829`) with F6's group outline and header note, in the info look. Redundant group: "Redundant. Anyone who meets Rule 01 also meets this group. You can delete it to keep the list clear." Always-met group: "Always met. Every applicant meets this group." The rules inside stay plain | CLAR 2026-10-28 #6 (look: #3) |
| W8 | FR-006a, FR-006c, US2-AS5, ENT-Finding.branchKind (all-meet) | Rules step – rule/group note, summary alert | U04's note `6178:8216` and alert `6616:44434`, in the info look. Notes: "Always met. Every applicant meets this rule." / "Always met. Every applicant meets this group." The summary counts "1 always-met rule" / "1 always-met group", after "There's also" when the branch has conflicts. It ends with "Every applicant meets the rules of Standard." when every applicant meets the top level | CLAR 2026-10-28 #6 |
| W9 | US3-AS2, US3-AS4 | Rules step – variant | U03: tabs `6171:7541`/`6171:7542`, link strip `6344:60080`, branch marks `6171:7568`/`6171:7569` and `6171:7577`/`6171:7578`, notes `6171:7960`/`6171:7968`/`6171:7983`, alert `6616:44417`. US3-AS2: a rule removed in "Ambulance" shows spec 002's removed state and no note there. The findings it took part in leave Ambulance's summary and tab icon. Once the rule is restored, it is checked again. US3-AS4: a conflict among inherited rules that Ambulance keeps unchanged shows the same notes and summary in both tabs, and both tabs show F7's icon | CLAR 2026-10-28 #7 |
| W10 | FR-017a, FR-017b, FR-017c, FR-017d, US4-AS1, US4-AS2, US4-AS3, US4-AS4, US4-AS5, FR-016c, FR-019c, US1-AS7 (dialog) | Publish/save dialog | Spec 002's warnings line, U33 `6376:26181` ("1 warning on Ambulance"). Below it, one line per branch with findings, in tab order, e.g. "Ambulance: 2 conflicting rules, 1 redundant rule". An unmeetable branch's line adds "No applicant can meet the rules of Ambulance." Lines with conflicts use the warning style. Lines with only redundant or always-met findings use the info style. A "Check rules again" button (KERN secondary) opens the rules step on the first branch, in tab order, that has findings. Without findings the dialog stays as spec 002 has it. "Publish" and "Save" stay enabled and go ahead without a further question | CLAR 2026-10-28 #8 |
| W11 | FR-002b, EC-13 | Rules step | The rule keeps spec 002's red `Rules/Problem note` and outline unchanged and carries no finding. It isn't counted in the summary alert or by the tab icon, and the other rules are checked without it. Once fixed, it is checked again. A rule without an error message is still checked (FR-002a) | CLAR 2026-10-28 #9 |
| W12 | FR-010c, EC-19 | Rules step – summary alert, tab | The summary alert (U01 `6616:44378`, U02 `6616:44400`, U03 `6616:44417`, U04 `6616:44434`) adds "The rules of Standard couldn't be checked completely. Only findings that are certain are shown." When no finding is certain, that sentence stands alone in a KERN info alert in place of U04's alert `6616:44434`, without "Go to next finding". The tab icon (F7) reflects only certain findings, so with none it shows no icon. Nothing waits for the checks | CLAR 2026-10-28 #10, #14, #15 |
| W13 | EC-15 | Rules step | A branch without rules, or with all of them removed, shows spec 002's rules step with no summary alert, no notice and no tab icon | CLAR 2026-10-28 #11 |
| W14 | EC-21 (FR-011a in the edit flow) | Rules step, edit flow | Looks like U01–U04 (step headers U01 `6702:41182`, U02 `6702:41215`, U03 `6702:41248`, U04 `6702:41281`). It checks the published rules when it opens | CLAR 2026-10-28 #11 |
| W15 | FR-002d (OUT-8; also FR-002c, EC-14) | Rule editor | Spec 002's rule editor, unchanged: it shows nothing about findings. A new rule is checked once it is added, and the rule and group notes stay the only place where findings show | CLAR 2026-10-28 #12 |
| W16 | FR-013d | Rules step – summary alert | Leave F3's "Go to next finding" out when no rule or group has a finding, e.g. a summary with only a branch notice. After an incomplete check (W12) it visits only certain findings, and the info alert that stands alone has no button | CLAR 2026-10-28 #15 |

Superseded: the tab counts in CLAR 2026-10-28 #6, #7, #10 and #13 give way to #14, the later answer: a tab shows an icon and no number. F7, W9 and W12 follow #14.

## Clarify questions
None. CLAR 2026-10-28 #1 (findings can't be dismissed and nothing about them is stored) doesn't refer to the design and settles nothing here. FR-019a, its UI point, is COVERED in U01, U02 and U04.

## Coverage
| req-id | status | units |
|--------|--------|-------|
| FR-001a | COVERED (UI = N) | U02, U03 |
| FR-001b | COVERED (UI = N) | U03 |
| FR-001c | COVERED (UI = N) | U03 |
| FR-002a | COVERED (UI = N) | U01 |
| FR-002b | SPEC-ONLY → W11 | — (missing U01, U02, U03) |
| FR-002d | SPEC-ONLY → W15 | — |
| FR-003a | PARTIAL (UI = N) → F6 | U01 COVERED, U02 COVERED/PARTIAL, U03 COVERED/PARTIAL |
| FR-003b | PARTIAL → F1, F5, F6 | U01 COVERED, U02 PARTIAL, U03 PARTIAL |
| FR-003c | COVERED (UI = N) | U01 (70 %), U02 |
| FR-004 | PARTIAL → F1 | U01 PARTIAL, U04 COVERED (correctly absent) |
| FR-005b | PARTIAL → F1, F5, W6 | U02 PARTIAL, U03 COVERED, U04 PARTIAL |
| FR-005c | SPEC-ONLY → W7 | — |
| FR-005d | COVERED | U02, U03, U04 |
| FR-005e | COVERED | U01 (70 %), U04 |
| FR-006a | SPEC-ONLY → W8 | — |
| FR-006b | SPEC-ONLY → W4 | — |
| FR-006c | COVERED (correctly absent only) → W8 | U04 |
| FR-007d | COVERED (UI = N) | U01 |
| FR-008b | SPEC-ONLY → W5 | — |
| FR-010a | COVERED (UI = N) | U03, U04 |
| FR-010b | COVERED (UI = N) | U04 |
| FR-010c | SPEC-ONLY → W12 | — |
| FR-011b | not mapped (UI = N) → W1 | — |
| FR-011d | PARTIAL → F1, F5 | U01 COVERED, U02 PARTIAL, U03 PARTIAL, U04 PARTIAL |
| FR-012a | PARTIAL → F4, F5, F6 | U01, U02, U03 PARTIAL; U04 CONFLICT row (PARTIAL for FR-012a) |
| FR-012b | COVERED | U03 |
| FR-012c | CONFLICT → F2, F4 | U01, U02, U03, U04 |
| FR-012d | PARTIAL → F5 | U01, U02, U03, U04 |
| FR-012e | PARTIAL → F6, W7 | U02, U03 |
| FR-013a | PARTIAL → F1 | U01, U02, U03, U04 |
| FR-013b | PARTIAL → F3 | U01, U02, U03, U04 |
| FR-013c | CONFLICT → F1, F2 | U01, U02, U03, U04 |
| FR-013d | PARTIAL → F3, W16 | U02, U03, U04 |
| FR-014a | PARTIAL → F7 | U01, U02, U03, U04 |
| FR-014b | PARTIAL → F7 | U01, U02, U03, U04 |
| FR-015 | SPEC-ONLY → W1 | — |
| FR-016a | CONFLICT → F1, F8 | U01 CONFLICT (80 %) / PARTIAL (70 %), U02 CONFLICT, U03 CONFLICT, U04 COVERED |
| FR-016b | CONFLICT (UI = N) → F8 | U01 (80 %), U02 |
| FR-016c | CONFLICT → F8, W10 | U01, U02, U03 |
| FR-016d | CONFLICT → F1, F5 | U01, U02, U03 CONFLICT; U04 PARTIAL |
| FR-017a | SPEC-ONLY → W10 | — |
| FR-017b | SPEC-ONLY → W10 | — |
| FR-017c | SPEC-ONLY → W10 | — |
| FR-017d | SPEC-ONLY → W10 | — |
| FR-019a | COVERED | U01, U02, U04 |
| FR-019c | CONFLICT → F2, W10 | U02 PARTIAL, U03 COVERED, U04 CONFLICT |
| FR-020 | COVERED | U01 (60 %), U03 |
| US1-AS1 | PARTIAL → F1, F5 | U01, U02, U03 |
| US1-AS2 | SPEC-ONLY → W1 | — |
| US1-AS3 | PARTIAL → F6 | U02 |
| US1-AS4 | PARTIAL → F6 | U02, U03 |
| US1-AS5 | SPEC-ONLY → W2 | — |
| US1-AS6 | SPEC-ONLY → W1 | — |
| US1-AS7 | CONFLICT → F8, W10 | U01 (80 %), U02 |
| US2-AS1 | SPEC-ONLY → W6 | — |
| US2-AS2 | SPEC-ONLY → W6 | — |
| US2-AS3 | PARTIAL → F5, W1 | U02 PARTIAL, U03 COVERED, U04 PARTIAL |
| US2-AS4 | SPEC-ONLY → W6 | — |
| US2-AS5 | SPEC-ONLY → W8 | — |
| US2-AS6 | SPEC-ONLY → W7 | — |
| US3-AS1 | PARTIAL → F7 | U03 |
| US3-AS2 | SPEC-ONLY → W9 | — |
| US3-AS4 | SPEC-ONLY → W9 | — |
| US3-AS5 | COVERED | U03 |
| US4-AS1 | SPEC-ONLY → W10 | — |
| US4-AS2 | SPEC-ONLY → W10 | — |
| US4-AS3 | SPEC-ONLY → W10 | — |
| US4-AS4 | SPEC-ONLY → W10 | — |
| US4-AS5 | CONFLICT → F8, W10 | U03 |
| EC-7 | SPEC-ONLY → W5 | — |
| EC-9 | PARTIAL → F5 | U02 PARTIAL, U03 COVERED, U04 PARTIAL |
| EC-10 | COVERED | U02, U03, U04 |
| EC-11 | SPEC-ONLY → W3 | — |
| EC-13 | SPEC-ONLY → W11 | — |
| EC-15 | SPEC-ONLY → W13 | — |
| EC-19 | SPEC-ONLY → W12 | — |
| EC-20 | SPEC-ONLY → W4 | — |
| EC-21 | SPEC-ONLY → W14 | — |
| ENT-Finding.target | PARTIAL → F6 | U01 COVERED, U02 PARTIAL |
| ENT-Finding.kind | PARTIAL → F1, F5 | U01, U02 |
| ENT-Finding.reason | PARTIAL → F5 | U01 COVERED, U02 PARTIAL |
| ENT-Finding.branchKind | PARTIAL → F1, W8 | U01 |
| ENT-Finding.appliesToday | SPEC-ONLY → W5 | — |

The remaining requirements have UI = N and no unit mapped them, as they have no Figma surface:
- FR-002c, FR-005a, FR-007a, FR-007b, FR-007c, FR-007e, FR-007f, FR-007g
- FR-008a, FR-008c, FR-009, FR-010d, FR-011a, FR-011c, FR-018, FR-019b
- US2-AS7, US3-AS3
- EC-1, EC-2, EC-3, EC-4, EC-5, EC-6, EC-8, EC-12, EC-14, EC-16, EC-17, EC-18
- ENT-CheckedRules.scope, ENT-RuleCheck.trigger, ENT-RuleCheck.effects

FR-002c and EC-14 are carried by W15, and FR-011a by W14 for the edit flow.

## Not audited
- No unit was skipped. U01–U04 are all IN and DONE: none is OUT, unresolved UNCERTAIN, FAILED or RATE_LIMIT.
- The mapper skipped hidden layers: "Old · …" frames, hidden card headers and old problems banners.
- The mapper judged scope from `spec.md`, because `requirements.md` was missing at mapping time. All four frames in the section were IN, so no unit was lost to that.
- These surfaces have no frame in section `6171:6748`, so no unit audited them:
  - the publish/save dialog: W10 builds it from spec 002's U33 `6376:26181`, which this audit didn't open
  - the rule editor (W15)
  - the edit flow's rules step (W14)
  - a branch without rules (W13)
  - an incomplete check (W12)
  - the status region (W1)
