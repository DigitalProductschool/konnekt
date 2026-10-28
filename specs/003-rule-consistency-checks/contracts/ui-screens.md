# Contract: management UI screens, with findings

**Users**: signed-in DO.IT team members (FR-020). **Requirements**: FR-002, FR-010 to FR-017,
FR-019, FR-020, SC-005, SC-006; US1 to US4. **Decisions**: research R10–R12, R14; the spec's
Clarifications of 2026-10-28; the Figma audit ([../figma-audit/report.md](../figma-audit/report.md)).

This extends spec 002's screen contract
([../../002-connection-rules/contracts/ui-screens.md](../../002-connection-rules/contracts/ui-screens.md)),
which still applies, and reuses its screen ids: S2 rules step, S3 rule editor, S4 branches
(variants), S5 publish and save dialog, S6 details, S7 edit flow. No route changes.

**What decides what**: **spec.md, including its Clarifications, decides behaviour and wording.**
**Figma decides layout and styling only.** The section `6171:6748` ("Rules · 5 · Problems:
contradiction and duplicate") of file `s8mU9oJDq3411e8bxMjQO9` draws four states, U01 to U04. Where
it differs from the spec, [Deviations from Figma](#deviations-from-figma) says what to build, using
the audit's item numbers. The file binds KERN's names to an unreleased KERN ("Revamp"): use the
KERN 2.8 token of the same name, and list a value that differs only for that reason as "KERN 2.8 vs
Revamp" (CLAUDE.md).

---

## Screens and behaviour

### S2. Rules step: notes, group marks, summary, status region

- **Rule notes** (FR-012): a rule with a finding is outlined and has a note under it, in the layout
  of spec 002's problem note. A conflict uses KERN's warning colour and warning icon; a redundant or
  always-met rule uses KERN's info colour and info icon. The note starts with its kind
  ("Conflicting.", "Redundant.", "Always met.") and names the items involved by their current names
  (FR-011). The row is described by its note.
- **Group marks** (FR-003, FR-005, FR-006): a group or sub-group with a finding is outlined, and
  its note sits under its header, in the same two looks. Inside a redundant or always-met group the
  rules stay plain; inside a conflicting group they keep their own conflict notes.
- **Spec 002's problems** keep their red outline and note. A rule with a problem carries no finding,
  isn't counted, and the others are checked without it (FR-002, W11).
- **Summary** above the rules of the shown branch (FR-013): a KERN warning alert when the branch has
  a conflict or no applicant can meet it, a KERN info alert otherwise. Its text counts the marked
  items per kind, then FR-004's or FR-006's notice. Its "Go to next finding" button (KERN tertiary)
  scrolls the next rule or group with a finding, in display order, into view and moves the focus to
  its row or group header, starting over after the last one. No summary for a branch without checked
  rules (W13).
- **Live updates** (FR-011): after every change of any branch's rules, including the documents
  step's, the notes, summary and tabs update in place, without the team member asking. The
  previous notes stay until the new ones arrive (research R10).
- **Status region** (FR-015): a visually hidden polite `role="status"` region announces each
  changed finding without moving the focus.
- **Footer**: "Publish" (create) and "Save" (edit) stay enabled whatever the findings. Only spec
  002's problems refuse them (FR-016).

### S3. Rule editor

Unchanged. It shows nothing about findings; a new rule is checked once it is added (FR-002, W15).

### S4. Branches (variants)

- Each branch is checked on its own, with the rules it inherits, changes and adds (FR-001).
- **Tab icon** (FR-014): every tab whose branch has findings, selected or not, shows an icon after
  its name, without a number. It is KERN's warning icon when the branch has a conflict or no
  applicant can meet it, its info icon otherwise. Its text alternative is "<branch> has findings".
- A rule removed in a based branch shows spec 002's removed state and no note there; it is
  checked again once restored. A conflict among inherited rules shows in both branches (W9).

### S5. Publish and save dialog

- Below its existing lines, one line per branch with findings, in tab order, such as "Ambulance: 2
  conflicting rules, 1 redundant rule". A branch that no applicant can meet adds "No applicant can
  meet the rules of Ambulance.". Lines with a conflict use the warning style, the others the info
  style (FR-017, FR-019).
- "Check rules again" (KERN secondary, the dialog's existing secondary action) opens the rules step
  on the first branch, in tab order, that has findings.
- Without findings, the dialog is as in spec 002. "Publish" and "Save" go ahead without a further
  question (FR-016, US4-AS5).

### S6. Details

No findings, no summary and no tab icons: findings appear only in S2, S4 and S5 (FR-020). The
details' rules card uses the shared `RuleRow` and `GroupFrame` without their `finding` prop.

### S7. Edit flow

The rules step looks as in create (U01–U04) and checks the published rules when it opens (FR-011,
W14).

### Accessibility (SC-006)

- The kind never rests on colour alone: each note starts with its kind, and each icon has a text
  alternative (FR-012, FR-014).
- Warning and info texts meet WCAG 2.1 AA contrast in KERN 2.8 (research R15).
- "Go to next finding" moves the focus to a focusable row or group header, which its note
  describes.
- The status region is polite, never takes the focus, and announces the sentences of one change
  together (FR-015).
- The summary and notes reflow at 320 px and 200 % zoom like spec 002's problem notes.

---

## Deviations from Figma

Build each item as the spec says, keeping Figma's layout and styling. The full rows, with every
node id, are in the audit's [report](../figma-audit/report.md), sections "Figma must change
(decided)" and "Build without frames (decided)". Every UI task cites the items it covers.

### S2. Rules step

| # | Figma (units, node ids) | Build instead |
|---|---|---|
| F1 | Summary alert: U01 `6616:44378`, U02 `6616:44400`, U03 `6616:44417`, U04 `6616:44434` | The spec's counts and notice, never "to fix": U01 "2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the rules of Standard."; U02 "2 conflicting rules and 1 conflicting group: nobody can meet both Rule 04 and Rule 05. There's also 1 redundant rule."; U03 "2 conflicting rules and 1 conflicting group in this variant: nobody can meet both Rule 04 and Rule 05. There's also 1 redundant rule."; U04 "1 redundant rule: Rule 06 is the same as Rule 03. You can still continue." |
| F2 | The same alerts | U01–U03: KERN warning alert. U04: KERN info alert. Red stays for spec 002's problems. Position and width as drawn |
| F3 | The same alerts | Add "Go to next finding" (KERN tertiary). Cycles: U01 Rule 01 `6171:6762` → Rule 02 `6171:6765`; U02 Sub-group 01 `6171:7093` → Rule 04 `6171:7094` → Rule 05 `6171:7097` → Rule 06 `6171:7442`; U03 Sub-group 01 `6171:7563` → Rule 04 `6171:7564` → Rule 05 `6171:7569` → Rule 06 `6171:7578`; U04 Rule 06 `6178:8168` |
| F4 | Conflict outlines and notes (U01 `6171:7008`/`7010`, `7022`/`7024`; U02 `6171:7487`, `7488`/`7490`, `7498`/`7500`; U03 `6171:7957`, `7958`/`7960`, `7568`/`7968`); redundancy notes (U02 `6171:7508`/`7510`; U03 `6171:7577`/`7983`; U04 `6178:8214`/`8216`) | Keep the outline and note layout. Conflicts: KERN warning colour and triangle icon. Redundant and always met: KERN info colour and info icon. The orange "Changed here" chip stays; the kind label tells it apart |
| F5 | The same notes | Start each note with its kind: U01 "Conflicting. Can't be met together with Rule 02." / "… with Rule 01."; U02 `7490` "… with Rule 05.", `7500` "… with Rule 04.", `7510` "Redundant. Same as Rule 03. You can delete one to keep the list clear."; U03 `7960` "… with Rule 05." (without "(changed here)"), `7968` "… with Rule 04.", `7983` "Redundant. Same as Rule 01. You can delete one to keep the list clear."; U04 `8216` "Redundant. Same as Rule 03. You can delete one to keep the list clear." |
| F6 | Sub-group 01: U02 `6171:7093`, U03 `6171:7563` | A conflicting mark on the sub-group in F4's conflict look: outline and a note under its header, "Conflicting. Rule 04 and Rule 05 in this group can't be met together." Group 01 and U04's Sub-group 01 stay plain |
| F8 | Footer: U01 `6171:6771`, U02 `6171:7104`, U03 `6171:7581`; frame name U02 `6171:7064` | "Publish" (and "Save") stays enabled, as in U04 `6178:7840`. "(blocks)" in the frame name is an annotation only |

| # | Expected surface | Build |
|---|---|---|
| W1 | Notes, summary, tab icon, status region after any change | Checks rerun unasked and everything updates in place (switching U01's connector `6171:6764` to OR removes both notes and the alert). The status region announces each change (Copy, "Announcements") |
| W2 | US1-AS5 | Only the rule inside the OR group gets "Conflicting. Can't be met together with Rule 01."; its AND sibling, the group and the group's other rule stay plain, and the branch has no notice |
| W3 | EC-11 | Each of the four rules names the other three: "Conflicting. Can't be met together with Rule 02, Rule 03 and Rule 04." |
| W4 | EC-20 | A branch that no applicant can meet shows only its conflict notes; redundancy and always-met notes appear once the conflict is gone |
| W5 | FR-008, EC-7 | "Conflicting. Can't be met together with Rule 02 by applicants who share today."; summary notice "No applicant who shares today can meet the rules of Standard." in the warning alert |
| W6 | US2-AS1, AS2, AS4 | "Redundant. Anyone who meets Rule 02 also meets this rule. You can delete it to keep the list clear." (several: "Rule 02 and Rule 03"); "Redundant. Anyone who meets this rule also meets Rule 01. You can delete it to keep the list clear." |
| W7 | US2-AS6 | Group outline and header note in the info look: "Redundant. Anyone who meets Rule 01 also meets this group. You can delete it to keep the list clear." or "Always met. Every applicant meets this group."; the rules inside stay plain |
| W8 | US2-AS5, FR-006 | "Always met. Every applicant meets this rule." / "… this group."; summary counts "1 always-met rule" / "1 always-met group", after "There's also" when there are conflicts, and ends with "Every applicant meets the rules of Standard." when that holds |
| W11 | FR-002, EC-13 | A rule with a spec 002 problem keeps the red note and outline, carries no finding, isn't counted |
| W12 | FR-010, EC-19 | The summary adds "The rules of Standard couldn't be checked completely. Only findings that are certain are shown."; with no certain finding, that sentence alone in a KERN info alert in U04's place, without "Go to next finding". The tab icon reflects certain findings only |
| W13 | EC-15 | A branch without checked rules: no summary, no notice, no tab icon |
| W16 | FR-013 | No "Go to next finding" when no rule or group has a finding (a summary with only a notice) |

### S3. Rule editor

| # | Build |
|---|---|
| W15 | Spec 002's rule editor unchanged: nothing about findings |

### S4. Branches (variants)

| # | Figma | Build instead |
|---|---|---|
| F7 | Tabs: U01 "Standard" `6171:6755`, U02 "Standard" `6171:7070`, U03 "Ambulance" `6171:7542`, U04 "Standard" `6178:7806` | An icon after the name of every tab with findings, no number: warning on U01, U02, U03 "Ambulance"; info on U04. Text alternative "Standard has findings", "Ambulance has findings". U03 "Standard" `6171:7541` stays plain |
| W9 | US3-AS2, AS4 (built from U03's tabs, link strip `6344:60080`, branch marks, notes and alert) | A rule removed in "Ambulance" shows spec 002's removed state and no note, and its findings leave Ambulance's summary and tab; restored, it is checked again. A conflict among inherited rules shows the same notes and summary in both tabs, and both tabs show F7's icon |

### S5. Publish and save dialog

| # | Build from | Build |
|---|---|---|
| W10 | Spec 002's warnings line, U33 `6376:26181` | One line per branch with findings below it, in tab order ("Ambulance: 2 conflicting rules, 1 redundant rule"), adding "No applicant can meet the rules of Ambulance." for an unmeetable branch; warning style with a conflict, info style otherwise; "Check rules again" (KERN secondary) opens the rules step on the first branch with findings; nothing new without findings; "Publish"/"Save" enabled and without a further question |

### S7. Edit flow

| # | Build |
|---|---|
| W14 | The rules step looks like U01–U04 (step headers U01 `6702:41182`, U02 `6702:41215`, U03 `6702:41248`, U04 `6702:41281`) and checks the published rules when it opens |

### Coverage index

| Item | Screen | Item | Screen |
|---|---|---|---|
| F1, F2, F3, F4, F5, F6 | S2 | W1–W8, W11–W13, W16 | S2 |
| F7 | S4 | W9 | S4 |
| F8 | S2, S5 | W10 | S5 |
| | | W14 | S7 |
| | | W15 | S3 |

The audit's FYI rows 1–8 need no action (spec 001 and 002 baseline, annotations).

---

## Copy

`checks/findingMessages.ts` is the only place these texts are built (research R12). In the
patterns, `<item>` is a rule's or group's current name and `<branch>` a branch's.

**Notes** (FR-012, F5, F6, W2–W8):
- "Conflicting. Can't be met together with <items>." — with FR-008: "… with <items> by applicants
  who share today."
- "Conflicting. <items> in this group can't be met together." (a group that can't be met on its
  own)
- "Redundant. Same as <item>. You can delete one to keep the list clear."
- "Redundant. Anyone who meets <items> also meets this rule. You can delete it to keep the list
  clear." / "… also meets this group. …"
- "Redundant. Anyone who meets this rule also meets <items>. You can delete it to keep the list
  clear."
- "Always met. Every applicant meets this rule." / "… this group."

**Branch notices** (FR-004, FR-006, FR-008): "No applicant can meet the rules of <branch>.", "No
applicant who shares today can meet the rules of <branch>.", "Every applicant meets the rules of
<branch>."

**Incomplete** (FR-010): "The rules of <branch> couldn't be checked completely. Only findings that
are certain are shown."

**Summary** (F1, W8): the counts per kind ("2 conflicting rules and 1 conflicting group", "1
redundant rule", "1 always-met group"), "in this variant" as in U03, ": " and the first finding's
clause ("nobody can meet both Rule 04 and Rule 05", "Rule 06 is the same as Rule 03"), "There's
also …" for the other kinds after conflicts, "You can still continue." when there is no conflict,
then the notice, then the incomplete sentence.

**Tab** (F7): "<branch> has findings".

**Dialog** (W10): "<branch>: 2 conflicting rules, 1 redundant rule", "No applicant can meet the
rules of <branch>.", button "Check rules again".

**Announcements** (FR-015, W1): "Rule 02 conflicts with Rule 01.", "Rule 06 is the same as Rule
03.", "Rule 01 makes no difference beside Rule 02.", "Every applicant meets Rule 05.", "Rule 02 no
longer conflicts with Rule 01.", "Rule 06 is no longer redundant.", "Rule 05 is no longer always
met.", and a new notice's own text.

**Button**: "Go to next finding".

**Left to `design-notes.md`** (written by the first UI task; research R12): the note of a rule that
can't be met on its own and of an OR group none of whose members can be met; the summary's clause
for conflicts that aren't pairs, or several conflicts; the general rules for the counts
(order, plural, "in this variant", FR-008's words, the incomplete sentence); the reasons of a
redundancy through an enclosing level; announcements for groups and for other branches; the
dialog line of a branch whose only finding is that every applicant meets it. None may word a
finding as something "to fix" (FR-016).
