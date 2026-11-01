# Figma ↔ spec audit — 2026-11-01

Figma file s8mU9oJDq3411e8bxMjQO9, root 7057:58708 ("Test · 1 · Test rules"). Spec: specs/004-rule-test-personas/spec.md as of 2026-11-01 (mtime 2026-11-01T20:49:23Z). Its Clarifications session of 2026-11-01 now has 16 entries. The 16th answers the previous report's only open question (Q1: do met rows show the rule's statement?). This report reconciles a second remap, which made no Figma calls: U01, U03, U05, U06, U07, U08 and U11 were remapped for the changed FR-015j. The report covers spec 004 only and leaves out the site-wide redesign (see Not audited).

## Summary
Units audited 12/12 (OUT 0, UNCERTAIN 0, FAILED 0). Figma calls 21: 1 by the mapper and 20 by the units, all during the full audit. Neither remap made any.

| category | count |
|---|---|
| Conflicts | 0 |
| Spec-only (not in Figma) | 0 |
| Figma-only — behavioural | 0 |
| Partial matches | 0 |
| Figma-only — cosmetic (FYI) | 4 |
| Figma must change (decided) | 14 |
| Build without frames (decided) | 13 |

How the items were settled:
- **CLAR 2026-11-01:** all 16 answers refer to the design. They settle F1–F12, F14 and W1–W13.
- **F14 is new.** It was the previous report's partial P1 and question Q1. CLAR 2026-11-01 #16 keeps FR-015j as written and tells Figma to add the statement to its met rows and to the skeleton rows of frames 18–19.
- **CLAR 2026-11-01 #9 (2)** listed met rules "as Figma has them". #16 settles what those rows contain. The two answers name different points, so they don't conflict.
- **CLAR 2026-11-01 #8 and #14** only confirm what the frames already show: one selected persona with icon-only chips, and no editing of a persona while it is being generated.
- **F13** rests on RULE wording.
- **CLAR 2026-10-29:** its three answers don't refer to the design, so they settle nothing here.

Top 5 issues (open items only): none. Every non-cosmetic item is decided. The four cosmetic items (K1–K4) are FYI only.

## Conflicts
| # | req | Figma (unit, node-id) | conflict |
|---|---|---|---|

None open. All seven conflicts are decided:
- the edit dialog (F1)
- the toast (F2)
- the success message under a met variant (F3)
- "Back to test" (F4)
- nobody meeting Ambulance (F5)
- the tooltip wording (F6)
- "Your rules are saved." (F7)

## Spec-only (not in Figma)
| # | req | prio | expected surface | note |
|---|---|---|---|---|

None open. Every requirement that no frame draws is decided in W1–W13. FR-003d and FR-006e have no mapping row, but Figma draws a different element in their place, so they belong to F4 and F12.

## Figma-only — behavioural
| # | item | where (units, node-ids) | suggested requirement |
|---|---|---|---|

None open. The units' behavioural FIGMA-ONLY rows resolve as follows:
- **RULE ui-detail (K1–K3):** the failing-value marker, the "· edited" marker and the panel-only scrolling.
- **Covered by changed requirements:** U07 #8 and U08 #5b (the selection model) and U05 #2 (the intro copy). FR-004c, FR-004d and FR-004e now cover them, as U01 #6 and U01 #2b map. Those unit rows cite no changed ID, so they weren't remapped.
- **Redesign or pre-existing (see Not audited):** "Save and exit" and the Standard tab's info icon.

## Partial matches
| # | req | where | difference |
|---|---|---|---|

None open. The previous partial P1 (met rows without a statement) is now F14.

## Figma-only — cosmetic (FYI)
| # | item | where | note |
|---|---|---|---|
| K1 | A red dot and bold text on values that a failing rule checks | U01 7057:59074, 7057:59082, 7057:59904, 7057:59909, 7057:59914; U02 7058:60581, 7058:60589; U03 7058:61020; U05 7057:60335, 7057:60343, 7057:60778, 7057:61210, 7057:61215, 7057:61220; U07 7058:61439, 7058:61447; U08 7058:61715, 7058:61723, 7058:61731 | RULE ui-detail: build as designed. "Failing" follows the result: a rule inside a group that is met doesn't count as failing (CLAR 2026-11-01 #9). Only colour and weight carry the meaning, so add text for screen readers |
| K2 | "· edited" after a value the team member changed | U03 7058:61193 | RULE ui-detail: build as designed, using the change tracking that FR-012c needs anyway. CLAR 2026-11-01 #1 replaces frame 6, but it removes the dialog flow, not this marker |
| K3 | Only the applicant panel scrolls, and the data list and the results share one scrollbar | U08 7058:61704, 7058:61705, 7058:61835 | RULE ui-detail: build as designed. Failing values low in the data list scroll away from their result rows |
| K4 | Frame 15 is named "Many rules (12)", but its table has 13 rows and no Rule 06 | U08 7058:61648, 7058:61764 | An inconsistency inside the design. It implies no behaviour |

## Figma must change (decided)
Build these as the spec says, keeping Figma's layout and styling, until the design is updated.

| # | req | Figma (unit, node-ids) | Figma shows | build instead | decision (CLAR … or RULE wording) |
|---|---|---|---|---|---|
| F1 | FR-006f, FR-006g, FR-017a, FR-008b, EC-17, US2-AS1, OUT-13 | U02: dialog 7058:60639 (title 7058:60644), Close 7058:60645, intro 7058:60650, Cancel and "Save and test" 7058:60668, invalid state 7058:60812, 7058:60824 (frames 7058:60514, 7058:60670). U03: frame 7058:60945. "Edit data" buttons that open the dialog: U01 7057:58770, 7057:59184, 7057:59597; U03 7058:61006; U05 7057:60013, 7057:60454, 7057:60889; U06 7057:61328; U07 7058:61433; U08 7058:61709 | "Edit data" opens a modal "Edit Mia's data" with a Close (X), the intro "Change the values to try a case. Results update when you save.", and the buttons Cancel and "Save and test". Results update only on "Save and test". While one field is invalid, "Save and test stays until fixed" and holds back every other change. Frame 6 shows the results after "Save and test" | "Edit data" turns the selected persona's values into fields inside the persona panel, and "Done" turns them back. The fields are the dialog's (Name, Date of birth, Age today, Licence classes and the class dates, completed by F10–F12), under "Personal ID" and "Driving licence". Every valid change applies at once, and the results next to it update without asking. An invalid field shows its error under it ("Enter a date that exists, e.g. 28.02.2007.") and keeps its last valid value, while the persona's other changes still apply. Drop Cancel, Close, "Save and test" and the intro "Results update when you save." | CLAR 2026-11-01 #1 |
| F2 | FR-017b, FR-017c, OUT-14 | U03 7058:61203 | A visible toast: "Results updated. Mia now meets Rule 01." | No toast. An invisible polite status region announces each change of outcome, per persona and variant, without moving the focus: "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the rules of Standard." | CLAR 2026-11-01 #13 |
| F3 | FR-015j, OUT-15 | U01 7057:59533; U06 7057:61655, 7057:62047, 7057:62439 | "Message Anna reads": "Your wallet data meets the requirements. Other documents are checked separately.", under a variant the persona meets | A met variant has no message and no message column, because the evaluation gives none. Standard for Anna shows "Result: meets the rules" and the list "Rules Anna meets" (7057:59239, rows as in F14). School transport shows "Result: meets the rules" and the no-rules note (7057:61658, 7057:62050, 7057:62442) | CLAR 2026-11-01 #9, #16 |
| F4 | FR-003b, FR-003d, OUT-8 | U09 7058:62120 | The dialog's secondary action is "Back to test", which returns to the test step | "Check rules again", as today. It closes the dialog and opens the rules step at the first branch in tab order, with findings (spec 003), also when the dialog was opened from the test step. The rest of the dialog stays unchanged, in both "Ready to publish?" and "Ready to save?" | CLAR 2026-11-01 #2 |
| F5 | US1-AS3, FR-011a | U05 frames 7057:59952, 7057:60393, 7057:60828 (chips 7057:60317, 7057:60322, 7057:60327; headings 7057:60054, 7057:60495, 7057:60930) | No applicant meets Ambulance (Mia fails 3 rules, Anna 1, Yusuf 4), although Ambulance can be met | Generation follows FR-011 goal 1: every branch that some applicant can meet gets a persona who meets it. Frames 8–10 should show at least one applicant who meets Ambulance, for example one who holds class C1. No UI element changes | CLAR 2026-11-01 #3 |
| F6 | FR-018, FR-018b, FR-018c, EC-4, OUT-12 | U07: tab 7058:61618, tooltip 7058:61632, result heading 7058:61454 (frame 7058:61372) | A warning icon on the Standard tab. The notice appears only in the tab's hover tooltip, worded "Rule 01 and Rule 02 can't be met together, so no applicant can meet these rules.". Nothing appears above the result | Keep the warning icon on the tab. Its tooltip reads "No applicant can meet the rules of Standard." and opens on keyboard focus as well as on hover. The same notice (spec 003's) also sits next to the branch's results, above "Result: doesn't meet 2 rules" | CLAR 2026-11-01 #10 |
| F7 | FR-013d, OUT-11 | U12 7062:51784 | "Your rules are saved." before "Try again, or publish without testing." | Drop that sentence. The panel shows "Couldn't create sample applicants" (7062:51783), "Try again, or publish without testing." ("Try again, or save without testing." when editing) and the "Try again" button (7062:51785). The button generates all three personas anew, with U11 frame 18's loading state | CLAR 2026-11-01 #7 |
| F8 | FR-015b, FR-015g, EC-12, US2-AS5, US1-AS2, ENT-TestResult.reported | U01 7057:58825, 7057:59652, 7057:59916, 7057:59925, 7057:59934; U02 7058:60594; U03 7058:61042, 7058:61052; U05 7057:60348, 7057:60357, 7057:60366, 7057:60783, 7057:61222, 7057:61231, 7057:61240, 7057:61249; U07 7058:61468; U08 7058:61765, 7058:61770, 7058:61775, 7058:61780 | Each reported row shows "Rule NN · <name>" and the message, with the same failed icon on every row. There is no statement and no status text, so rules on "Not shared" values (U01 7057:59925, U05 7057:61231) look like rules that aren't met | Each reported row shows the rule's name, its statement as the rules step words it, the status "Not met" or "Couldn't be checked" (each with its own icon) and its message. A rule on an empty value reads "Couldn't be checked" (EC-12, US2-AS5). Met rows: F14 | CLAR 2026-11-01 #9 |
| F9 | FR-005b, FR-005d | U01 7057:58772, 7057:59186, 7057:59599; U03 7058:61008; U05 7057:60015, 7057:60456, 7057:60891; U06 7057:61330; U07 7058:61435; U08 7058:61711 | One flat list whose labels name no document: "Date of birth", "Nationality", "Licence classes", "Expiry date". U08 adds "Penalty points", "Place of residence", "Issuing country", "Place of birth", "Family name" and "ID valid until" | The values sit under the dialog's document headings, "Personal ID" and "Driving licence" (U02 7058:60654, 7058:60659), both in the panel and in edit mode. Each value is labelled as the rules name its field or part, without the document prefix: the spec's "Personal ID – Date of birth (Age)" reads "Date of birth (Age)" under "Personal ID" | CLAR 2026-11-01 #1, #11 |
| F10 | FR-007a, FR-007b, US1-AS1 | U01 7057:58772, 7057:59186, 7057:59599; U03 7058:61191; U05 7057:60336, 7057:60771, 7057:61206; U06 7057:61643, 7057:62035, 7057:62427; U07 7058:61435; U08 7058:61711 | Only the date of birth ("08.07.2007"). The age appears only in the dialog's "Age today" (U02 7058:60657) | The panel shows "08.07.2007 (age 19)". In edit mode the age can be entered too ("Age today"), which keeps the day and month where possible (FR-007b) | CLAR 2026-11-01 #11 |
| F11 | FR-005c, FR-005e, EC-11, FR-020d | U01 7057:58772, 7057:59186; U03 7058:61017; U05 7057:60344, 7057:60779; U06 7057:61649, 7057:62041; U08 7058:61711; dialog field U02 7058:60662 | The classes and a single date share one row: "B since 20.08.2025", "B, BE since 02.05.2010". The dialog labels the date "Class B since" | "Licence classes" lists the codes, such as "B, BE". Each class date that a rule checks gets its own row under "Driving licence", labelled as the rules name it ("Licence class B – Issue date"). The row shows only while the persona holds the class | CLAR 2026-11-01 #11 |
| F12 | FR-006a, FR-006b, FR-006d, FR-006e, EC-13, FR-005a, ENT-Persona.values | U02 7058:60661, 7058:60663 (hidden), 7058:60664 (hidden); U08 7058:61711 and the rows of Rules 09 and 12 in 7058:61785–7058:61830 | The dialog has no Nationality field, and its Expiry date row is hidden. Licence classes is a plain text input ("B"). In U08, Rule 12 "Licence not suspended" and Rule 09 "Class B valid today" check data that has no value in the persona | Edit mode has a field for every value the persona shows, including Nationality, Expiry date and every row of U08's list. The persona has a value for every field a rule checks, such as "Licence not suspended" and class B's expiry date. Licence classes and Nationality each take several values, picked from a list: licence classes by code (B, BE, C1, …) and nationalities by label (German, Italian, …). Every other choice field takes one value | CLAR 2026-11-01 #12 |
| F13 | FR-003b | U10 7058:62440 | The primary button "Publish changes", with a forward arrow, in the edit flow of a live connection | "Save", which opens the unchanged save dialog ("Ready to save?", with "Check rules again" as in F4). CLAR 2026-11-01 #7 also calls this button "Save" | RULE wording |
| F14 | FR-015j, FR-015i, FR-015h, ENT-TestResult.outcomes | U01: "Rules Anna meets" 7057:59239, met rows in 7057:58825 and 7057:59652. U02 7058:60594 (background). U03 7058:61194, 7058:61057, 7058:61062. U05 7057:60375, 7057:60384, 7057:60792, 7057:60801, 7057:60810, 7057:60819, 7057:61258. U07 7058:61484, 7058:61489. U08 7058:61785–7058:61830. U11 skeleton result cards 7062:51226 (frame 18) and 7062:51513 (frame 19) | Met rows show only "Rule NN · <name>" (e.g. "Rule 03 · Licence not expired") with a check icon. In a variant the persona doesn't meet, they have "–" in the message column. Under a met variant ("Rules Anna meets") there is no message column. The skeleton rule rows have no line for a statement | Every met rule and group shows its name and its statement as the rules step words it, the same as reported rows (F8), with the check icon and no message. In a variant the persona doesn't meet, a met row shows "–" in the message column. A variant the persona meets has no message column (F3). A met group gets the same row, and its members aren't listed (FR-015k). The skeleton rule rows of U11 frames 18–19 get a placeholder for the statement too | CLAR 2026-11-01 #16 |

## Build without frames (decided)
| # | req | expected surface | build from (nearest frame or KERN pattern) | decision |
|---|---|---|---|---|
| W1 | FR-016b, FR-016c, FR-016d, US1-AS4, EC-10, ENT-TestDay.date | Test step, directly under the intro | The intro block (U01 7057:58714; U05 7057:59957; U06 7057:61272; U07 7058:61377; U08 7058:61653; U11 7062:51254). Add one line: "Tested as if shared today, 1 Nov 2026." (today's date in Germany, in that format). <br>• Show it whenever results are shown, also while one persona is generated anew (U11 frame 19, 7062:51249). <br>• Hide it in the first-open loading state (U11 frame 18, 7062:50960) and in the failure state (U12 7062:51536). | CLAR 2026-11-01 #4 |
| W2 | US1-AS7, FR-001b, FR-003a, EC-1, EC-2 | Rules step action bar; documents step action bar; progress | The current rules and documents steps (no frame on this page). <br>• The rules step's button to go on reads "Test rules" while any branch has a rule or a rule editor is open. <br>• Otherwise it reads "Publish without rules" ("Save without rules" when editing). It opens the publish dialog and skips the test step, and the progress skips it too. <br>• The documents step keeps its own "Publish without rules". | CLAR 2026-11-01 #5 |
| W3 | US1-AS8, FR-002a, EC-7, EC-20 | Rules step (error) | The current rules step. "Test rules" is refused with publishing's existing message, which names the rule and the variant. This happens when: <br>• a rule is incomplete, lacks a message or checks data that isn't requested <br>• a branch name is invalid <br>• the documents step dropped data that the rules check | CLAR 2026-11-01 #5 |
| W4 | US2-AS4, FR-020d | Persona panel (edit mode) and results | Edit mode's Licence classes field and class date row (U02 7058:60661, 7058:60662; see F11, F12). Removing class B hides its date row, and the rule on that date reports "Not met". Adding B again brings the earlier date back | CLAR 2026-11-01 #11 |
| W5 | US2-AS2, US2-AS3, EC-5 | Results | The existing results (U01, U06), with no new element: <br>• A birthday exactly 21 years ago meets "at least 21 years old". <br>• "STUTTGART" fails a case-sensitive "equal to Stuttgart" and meets the case-insensitive one. <br>• A branch every applicant meets is met by every persona. | CLAR 2026-11-01 #15 |
| W6 | US3-AS1, US3-AS3, FR-020b, EC-6, EC-21 | Persona panel and results after coming back from the rules step | The panel shows rows only for the fields that evaluated rules check, so rows come and go, as between U01's 4 rows (7057:58772) and U08's 10 (7058:61711). A row that comes back keeps its earlier value. The results follow the current rules and branches | CLAR 2026-11-01 #15 |
| W7 | US3-AS5 | Test step on first open in a later flow | U11 frame 18's loading state (7062:50960), then three new personas | CLAR 2026-11-01 #15 |
| W8 | FR-002b, EC-8 | Rules step, the existing keep/discard question | Before the test step opens, unsaved editor changes raise the rules editor's existing question, such as "Save changes to Rule 01?" | CLAR 2026-11-01 #5 |
| W9 | FR-012b, FR-012d, FR-012e, FR-012f | Applicants row; confirm dialog; loading state | A tertiary button "Generate all again" with a refresh icon, at the right end of the applicants row (U01 7057:58754), styled like "Generate again" (7057:58771). <br>• When any persona has changes, it first asks with U04's dialog (7058:61334). Title: "Generate new data for all applicants?" Body: "Your changes to Mia's data will be replaced.", naming every persona with changes ("Your changes to Mia's and Anna's data will be replaced."). Buttons: "Cancel" and "Generate new data". <br>• When no persona has changes, it doesn't ask. <br>• While it runs, the step shows U11 frame 18's loading state (7062:51206–7062:51226, with the status "Creating 3 sample applicants…" 7062:51210). | CLAR 2026-11-01 #6 |
| W10 | FR-015c, FR-015k, FR-015f (group count) | Results | U08's result table (7058:61764). <br>• A reported group gets a row with its name, statement, status and message. <br>• Below it, indented, come its members that aren't met or couldn't be checked, each with name, statement and status. <br>• The heading counts reported items, a group as one: "Result: meets the rules" or "Result: doesn't meet 1 rule and 1 group". <br>Met groups: F14. | CLAR 2026-11-01 #9 |
| W11 | FR-008a (whole number), FR-009b | Persona panel, edit mode | U02's invalid-date state (7058:60812) and Name field (7058:60652), moved into the panel (F1). <br>• Letters or decimals in "Age today" show "Enter a whole number, e.g. 25." under it. <br>• An empty Name shows "Enter a name." under it, and the persona keeps its previous name. | CLAR 2026-11-01 #12 |
| W12 | FR-009c, FR-009d, EC-14, EC-15 | Persona panel and edit mode, under "Personal ID" | U08's "Family name: Schulz" (7058:61711). <br>• When rules check the given name and family name, each gets its own row and field under "Personal ID", labelled as the rules name it. <br>• Generation fills them from the persona name ("Mia Schulz" gives "Mia" and "Schulz"). <br>• Afterwards they are edited separately, so renaming the persona changes neither. <br>• Other fields on the same fact are also generated in agreement and edited independently (EC-14). | CLAR 2026-11-01 #12, #15 |
| W13 | FR-021a | Test step | The signed-in editor, where every frame already sits. The step exists only there | CLAR 2026-11-01 #15 |

## Clarify questions

None open. The previous report's Q1 (do met rows show the rule's statement?) is answered by CLAR 2026-11-01 #16, which keeps FR-015j. It is now F14.

## Coverage
| req-id | status | units |
|---|---|---|
| FR-001a | COVERED (step count and names left to the redesign) | U01, U02, U03, U05, U06, U07, U08, U11, U12 |
| FR-001b | SPEC-ONLY → W2 | — |
| FR-002a | SPEC-ONLY → W3 | — |
| FR-002b | SPEC-ONLY → W8 | — |
| FR-003a | SPEC-ONLY → W2 | — |
| FR-003b | COVERED; CONFLICT (U09) → F4; PARTIAL (U10) → F13 | U01, U02, U03, U05, U06, U07, U08, U09, U10, U11, U12 |
| FR-003c | COVERED | U01, U02, U03, U05, U06, U07, U08, U10, U11, U12 |
| FR-003d | SPEC-ONLY (U09 draws "Back to test" in its place) → F4 | — (U09: missing) |
| FR-004a | COVERED | U01, U02, U03, U05, U06, U08, U11 |
| FR-004b | COVERED | U11 |
| FR-004c | COVERED | U01, U05 (U07 #8 and U08 #5b draw the same model) |
| FR-004d | COVERED | U01, U05 |
| FR-004e | COVERED | U01 (U05 #2 draws the same text) |
| FR-005a | COVERED; PARTIAL (U02 #11, U08 #10d) → F12 | U01, U02, U03, U05, U06, U07, U08 |
| FR-005b | PARTIAL → F9 | U01, U02, U03, U05, U06, U07, U08 |
| FR-005c | PARTIAL → F11 | U01, U02, U03, U05, U06, U08 |
| FR-005d | PARTIAL → F9 | U01, U08 |
| FR-005e | PARTIAL → F11 | U01, U05, U08 |
| FR-006a | COVERED; PARTIAL (U02 #9, #11) → F12 | U01, U02, U03, U04, U05, U06, U07, U08 |
| FR-006b | COVERED; PARTIAL (U02) → F12 | U02, U03, U06 |
| FR-006c | COVERED | U01, U05, U06 |
| FR-006d | PARTIAL → F12 | U02 |
| FR-006e | SPEC-ONLY (same point as U02's missing fields) → F12 | — (U02: missing) |
| FR-006f | CONFLICT → F1 | U01, U02 |
| FR-006g | CONFLICT → F1 | U02 |
| FR-007a | PARTIAL → F10 | U01, U02, U03, U05, U06, U07, U08 |
| FR-007b | COVERED → F10 (keeping day and month) | U02 |
| FR-008a | COVERED (date case); whole-number case → W11 | U02 |
| FR-008b | COVERED; CONFLICT (U02 #17) → F1 | U02 |
| FR-009a | COVERED | U01, U02, U03, U06, U08 |
| FR-009b | SPEC-ONLY → W11 | — |
| FR-009c | SPEC-ONLY → W12 | — |
| FR-009d | SPEC-ONLY → W12 | — |
| FR-010a | COVERED (UI = N) | U01, U03, U06, U07, U08, U11, U12 |
| FR-010b | not UI | — |
| FR-010c | not UI | — |
| FR-011a | CONFLICT (UI = N) → F5 | U05 |
| FR-011b | not UI | — |
| FR-011c | not UI | — |
| FR-011d | not UI | — |
| FR-011e | not UI | — |
| FR-012a | COVERED | U01, U02, U03, U04, U05, U06, U07, U08, U11 |
| FR-012b | COVERED in the failure state only (U12 "Try again") → W9 | U12 |
| FR-012c | COVERED | U04 |
| FR-012d | SPEC-ONLY → W9 | — |
| FR-012e | PARTIAL (labels in U04; the generate-all title isn't drawn) → W9 | U04 |
| FR-012f | SPEC-ONLY → W9 | — |
| FR-013a | not UI | — |
| FR-013b | COVERED | U11, U12 |
| FR-013c | COVERED | U11 |
| FR-013d | COVERED; OUT-11 sentence → F7 | U12 |
| FR-013e | COVERED | U12 |
| FR-014a | COVERED (UI = N) | U06 |
| FR-014b | not UI | — |
| FR-014c | not UI | — |
| FR-015a | COVERED | U01, U02, U03, U05, U06, U07, U08, U11 |
| FR-015b | PARTIAL → F8 | U01, U02, U03, U05, U07, U08, U12 |
| FR-015c | SPEC-ONLY → W10 | — |
| FR-015d | COVERED | U01, U02, U03, U05, U06, U07, U08, U11, U12 |
| FR-015e | COVERED (accessible name, not visible; as CLAR 2026-11-01 #8 sets it) | U06 |
| FR-015f | COVERED; group count → W10 | U01, U03, U05, U06, U07, U08 |
| FR-015g | PARTIAL → F8 | U01, U08 |
| FR-015h | COVERED; met-row statement → F14 | U01, U03, U05, U07, U08 |
| FR-015i | COVERED (heading); PARTIAL (statement) → F14 | U01 |
| FR-015j | CONFLICT (U06 #16; U01 #18 via OUT-15) → F3; PARTIAL (U01 #19, U03 #18, U07 #15, U08 #15) → F14 | U01, U03, U06, U07, U08 (U05: missing; U11 skeleton rows named by CLAR 2026-11-01 #16) |
| FR-015k | SPEC-ONLY → W10 | — |
| FR-016a | not UI | — |
| FR-016b | SPEC-ONLY → W1 | — |
| FR-016c | SPEC-ONLY → W1 | — |
| FR-016d | SPEC-ONLY → W1 | — |
| FR-017a | CONFLICT → F1 | U02, U03 |
| FR-017b | CONFLICT → F2 | U03 |
| FR-017c | CONFLICT → F2 | U03 |
| FR-018 | PARTIAL → F6 | U07 |
| FR-018b | PARTIAL → F6 | U07 |
| FR-018c | COVERED (tab icon); PARTIAL (tooltip) → F6 | U07 |
| FR-019a | not UI | — |
| FR-019b | not UI | — |
| FR-019c | not UI | — |
| FR-020a | not UI | — |
| FR-020b | SPEC-ONLY → W6 | — |
| FR-020c | COVERED | U03, U05, U06 |
| FR-020d | PARTIAL → F11; restoring the date → W4 | U05, U06 |
| FR-021a | SPEC-ONLY → W13 | — |
| FR-021b | COVERED (UI = N) | U01, U03, U06, U07, U08, U11, U12 |
| US1-AS1 | COVERED (personas); PARTIAL (age) → F10 | U01, U05, U06, U08 |
| US1-AS2 | PARTIAL → F8 | U01, U03, U05, U07, U08, U12 |
| US1-AS3 | CONFLICT → F5 | U05 |
| US1-AS4 | SPEC-ONLY → W1 | — |
| US1-AS5 | COVERED | U01, U02, U03, U04, U05, U06, U07, U08 |
| US1-AS6 | COVERED | U01, U03, U05, U06, U07, U08, U09, U10, U12 |
| US1-AS7 | SPEC-ONLY → W2 | — |
| US1-AS8 | SPEC-ONLY → W3 | — |
| US2-AS1 | COVERED (U02 #1); PARTIAL (U03 #19) → F1 | U02, U03 |
| US2-AS2 | SPEC-ONLY → W5 | — |
| US2-AS3 | SPEC-ONLY → W5 | — |
| US2-AS4 | SPEC-ONLY → W4 | — |
| US2-AS5 | PARTIAL → F8 | U01, U05 |
| US2-AS6 | COVERED | U01, U05, U08 |
| US2-AS7 | COVERED | U02 |
| US3-AS1 | SPEC-ONLY → W6 | — |
| US3-AS2 | COVERED | U03 |
| US3-AS3 | SPEC-ONLY → W6 | — |
| US3-AS4 | COVERED | U03, U05, U06, U12 |
| US3-AS5 | SPEC-ONLY → W7 | — |
| EC-1 | SPEC-ONLY → W2 | — |
| EC-2 | SPEC-ONLY → W2 | — |
| EC-3 | COVERED | U06 |
| EC-4 | COVERED (icon, nobody meets); PARTIAL (notice) → F6 | U07 |
| EC-5 | SPEC-ONLY → W5 | — |
| EC-6 | SPEC-ONLY → W6 | — |
| EC-7 | SPEC-ONLY → W3 | — |
| EC-8 | SPEC-ONLY → W8 | — |
| EC-9 | not UI | — |
| EC-10 | SPEC-ONLY → W1 | — |
| EC-11 | COVERED; PARTIAL (U01 #9) → F11 | U01, U02, U03, U05 |
| EC-12 | PARTIAL → F8 | U01, U05, U06 |
| EC-13 | PARTIAL → F12 | U02 |
| EC-14 | SPEC-ONLY → W12 | — |
| EC-15 | SPEC-ONLY → W12 | — |
| EC-16 | not UI | — |
| EC-17 | COVERED; CONFLICT (U02 #17) → F1 | U02 |
| EC-18 | not UI | — |
| EC-19 | not UI | — |
| EC-20 | SPEC-ONLY → W3 | — |
| EC-21 | SPEC-ONLY → W6 | — |
| EC-22 | COVERED | U12 |
| ENT-Persona.name | COVERED | U01, U02, U03, U05, U06, U07, U08 |
| ENT-Persona.values | COVERED; PARTIAL (U02 #11) → F12 | U01, U02, U03, U05, U07, U08 |
| ENT-Persona.lifetime | not UI | — |
| ENT-PersonaValue.field | COVERED | U01, U05, U07, U08 |
| ENT-PersonaValue.value | COVERED | U01, U05, U06 |
| ENT-TestResult.scope | not UI | — |
| ENT-TestResult.met | COVERED | U01, U03, U05, U06, U07, U08 |
| ENT-TestResult.reported | PARTIAL → F8 | U01, U02, U03, U05, U07, U08 |
| ENT-TestResult.outcomes | COVERED (U01 #16); PARTIAL (U08 #15, statement) → F14 | U01, U08 |
| ENT-TestDay.date | SPEC-ONLY → W1 | — |

## Not audited
- **Skipped units:** none. All 12 units are IN and DONE. None is OUT, UNCERTAIN, FAILED or RATE_LIMIT.
- **Limited by user decision:**
  - U09: only the publish dialog's "Back to test" action was audited (F4). The rest of the dialog is excluded (OUT-8, general redesign).
  - U10: only "Publish changes" was audited (F13). The clickable step bar is excluded.
- **Left out as the general redesign (OUT-10), by user scope:**
  - Page chrome: the app header, the breadcrumb, the Draft, Live and "Unpublished changes" badges, and the footer styling. Also colours, typography, spacing and the forward arrow on "Publish changes".
  - The compact step header "Step 4 of 4", which names no steps. This drops the units' FR-001a partials on step count and names (U01 #1, U02 #19, U03 #1, U05 #1, U06 #1, U07 #1, U08 #2, U11 #1). Build FR-001a's five entries in the current progress.
  - "Save and exit" in the action bar (U01 #21, U02 #26, U03 #22, U05 #23, U06 #19, U07 #17, U08 #18b, U11 #13, U12's scope note). The current editor leaves it out on purpose (frontend/src/pages/FormConnectionEditor/EditorFooter.tsx), and nothing is stored before publishing (CLAR 2026-10-29 #2).
  - The info icon and the "What is a variant" tooltip on the Standard tab, which predate spec 004 (U05 #4; also noted in U01, U02, U06, U07, U08, U11, U12).
- **Not on this Figma page:**
  - the rules step and the documents step (W2, W3, W8)
  - the edit flow of the test step, apart from U10's button
- **Skipped layers:** the hidden "Old ·" layers and the hidden "<name>'s value" result column.
- **Stale or thin unit rows resolved in this merge:**
  - U05 #2, U07 #8 and U08 #5b are FIGMA-ONLY in their units, but FR-004c, FR-004d and FR-004e now cover them.
  - U03 #18 maps FR-015j as "COVERED ?", with a caveat that the statement is missing. Under CLAR 2026-11-01 #16 that missing statement is part of F14.
  - U11 was listed for the FR-015j remap, but its file has no FR-015j row. Its skeleton rule rows (7062:51226, 7062:51513) are in F14 because CLAR 2026-11-01 #16 names them.
  - U12 still lists four test-day rows as missing (FR-016b, US1-AS4, EC-10, ENT-TestDay.date). FR-016d hides the line on failure, so these match the spec. W1 covers the other states.
