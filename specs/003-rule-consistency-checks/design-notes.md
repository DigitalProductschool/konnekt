# Design notes: conflict and redundancy checks

**Tasks**: T001 (copy), T002 (tokens, §7); §1–§6 rewritten for the redesign on 2026-11-01 | **Dates**: 2026-10-28, redesign 2026-11-01 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Middleware – V4"** (`s8mU9oJDq3411e8bxMjQO9`), section `6171:6748` ("Rules · 5 ·
  Contradictions and duplicates"), redesigned on 2026-11-01: units U01–U11 of the
  [audit](figma-audit/report.md), items A1–A8 (adopted), O1–O6 (out of scope) and W1–W20 (built
  without frames). Components: `Rules/Findings banner` `6750:40865`, `Rules/Finding item`
  `6750:40604`, `Rules/Problem note` `6177:7837`, `Rules/Tooltip` `6139:3739`.
- [spec.md](spec.md) with its Clarifications of 2026-10-28 and 2026-11-01, research R8 and R12.
- Spec 002's design notes ([../002-connection-rules/design-notes.md](../002-connection-rules/design-notes.md)),
  which still apply, in particular §1 (language) and §9 (tokens).

Node ids can change when the file is edited.

**What decides what** (decision 2026-11-01): the redesign decides the findings' look, behaviour and
wording; spec.md decides what is a finding. The page around the findings stays as built (O1–O6).
These notes quote every text Figma draws, and give the undrawn ones in the same voice, marked
**Proposed**. `checks/findingMessages.ts` builds every text below and nothing else does (research
R12); its tests pin them. The copy of 2026-10-28 ("Conflicting. …", the summary alert's counts) is
in this file's history and in [figma-audit/archive-2026-10-28/](figma-audit/archive-2026-10-28/).

## 1. Language and conventions

As in spec 002, §1: English, "variant" for a branch, "connection" for a form connection, the main
branch called "Standard" until it is renamed. In addition:
- **Apostrophes are typographic (’)** in the built strings: "Can’t", "doesn’t", "couldn’t".
- **Names**: every text names rules, groups, sub-groups and variants by their current names
  (FR-011), as the rules step shows them ("Rule 01", "Group 01", "Sub-group 01").
- **Order**: items in a list follow the display order of the rules step (spec 002, FR-007).
- **Lists** (W3): "Rule 02"; "Rule 02 and Rule 03"; "Rule 02, Rule 03 and Rule 04", without a
  serial comma. The same with "or". "neither Rule 04 nor Rule 05" for two items in §2.2 and §3.
- **No visible kind label** (decision 2026-11-01, A3): notes and lines say what is wrong in plain
  words. The kind is shown by the icon, which carries a visually hidden text: "Conflicting:",
  "Redundant:" or "Always met:" (FR-012). Notices and the incomplete sentence have none.
- **Words for the kinds**: a conflict "can’t be met together"; a redundant item with the same check
  is a "duplicate" ("is the same as"); one that another item makes redundant is "already covered"
  (from U07's frame name, "Rule 01 already covers Group 01"); an always-met item is one that
  "every applicant meets". The words "conflicting", "redundant" and "always met" appear only in the
  hidden kind texts and the announcements (§5).
- **Today** (FR-008, A7): a conflict that holds only for applicants who share today ends with "at
  the moment"; the notice reads "Right now, no applicant can meet the rules of <variant>." Redundant
  and always-met findings never depend on the day.
- **Never "to fix"** (FR-016): no text calls a finding a mistake or something to fix. Notes on
  duplicates and covered items offer "You can delete …".

## 2. Notes under a rule or a group's header (S2; FR-003, FR-005, FR-006, FR-012; A3, A5)

One note per item, under the rule or under the group's header. `<items>` is a list as in §1.

### 2.1 Conflict with other items (FR-003; A3, A7, W2, W3)

| Case | Note | Source |
|---|---|---|
| A rule or group that can't be met together with T | "Can’t be met together with <items of T>." | U01 `6171:7010` |
| The same, today only | "Can’t be met together with <items of T> at the moment." | U08 `6753:41332` |

Examples: U01 "Can’t be met together with Rule 02."; EC-11 "Can’t be met together with Rule 02,
Rule 03 and Rule 04." (W3); a group that conflicts with a rule: "Can’t be met together with Rule
01.".

### 2.2 A group that can't be met on its own (FR-003; A5, W18)

The group names the smallest set of its members that can't be met together (AND), or its members,
none of which can be met (OR). The members keep their own notes (§2.1, §2.3).

| Case | Note | Source |
|---|---|---|
| AND group, two or more members named | "<items> in this group can’t be met together." | U02 `6750:41000` |
| OR group, two members | "Neither <a> nor <b> in this group can be met." | **Proposed** (W18) |
| OR group, three or more members | "None of <items> in this group can be met." | **Proposed** (W18) |
| One member named | "<item> in this group can’t be met." | **Proposed** |
| Any of these, today only | the same sentence ending "… at the moment." | **Proposed** (A7's words) |

### 2.3 A rule that can't be met on its own (FR-003, "its condition"; W18)

| Case | Note | Source |
|---|---|---|
| No applicant can meet the rule, whatever the other rules | "No applicant can meet this rule." | **Proposed** |
| The same, today only | "No applicant can meet this rule at the moment." | **Proposed** |

The rule's statement stands right above the note, so the note doesn't repeat the condition
(quickstart V4: "Driving licence – Nationality includes none of" every country).

### 2.4 Duplicate and already covered (FR-005; A3, A5, W6, W7)

| Case | Note | Source |
|---|---|---|
| Same check as one item | "Same as <item>. You can delete one of them." | U02 `6171:7510` |
| A group implied by others, in an AND level | "Anyone who meets <items> also meets this group. You can delete the group." | U07 `6753:41298` |
| A rule implied by others, in an AND level | "Anyone who meets <items> also meets this rule. You can delete the rule." | **Proposed** (W6, from U07) |
| A rule or group that implies others, in an OR level | "Anyone who meets this rule also meets <items>. You can delete the rule." / "… this group … You can delete the group." | **Proposed** (W6, W7) |

"Same as" is used only when the reason is a single item Y that also implies the item back, and no
enclosing level takes part (research R8, step 4). Otherwise one of the "Anyone who meets"
sentences.

**Through an enclosing level** (research R8, step 4; R12 item 5) — **Proposed**. One form, "Anyone
who meets <P> also meets <Q>. You can delete the rule.", where the item itself is "this rule" or
"this group", first in its list:
- In an OR level, with the AND context of an enclosing level: "Anyone who meets this rule and Rule
  05 also meets Rule 01. You can delete the rule."
- In an AND level, with the alternatives of an enclosing OR level: "Anyone who meets Rule 02 also
  meets this rule or Group 03. You can delete the rule."
- When P is empty: "Every applicant meets this rule or Group 03. You can delete the rule."

### 2.5 Always met (FR-006; A5, W8)

| Case | Note | Source |
|---|---|---|
| A group | "Every applicant meets this group." | U06 `6753:40824` |
| A rule | "Every applicant meets this rule." | **Proposed** (W8) |

## 3. Findings banner (S2; FR-004, FR-006, FR-010, FR-013; A1, A2, A7, W12, W13, W17)

One `Rules/Findings banner` at the top of the open variant's rules (A1). It is made of **lines**,
an optional **notice** and an optional **incomplete sentence**.

### 3.1 Lines

One line per conflict set and per other finding, with the names as links to the items (A1). A
line names its items in display order.

| Finding | Line | Source |
|---|---|---|
| Conflict set (the item and its T) | "<items> can’t be met together." | U01 `6750:40882` |
| The same, today only | "<items> can’t be met together at the moment." | U08 `6753:41324` |
| A group's own conflict, AND | "<group>: <items> can’t be met together." | U05 `6753:40144` |
| A group's own conflict, OR or one member | "<group>: neither <a> nor <b> can be met.", "<group>: none of <items> can be met.", "<group>: <item> can’t be met." | **Proposed** (W18) |
| A rule that can't be met on its own | "No applicant can meet <rule>." | **Proposed** (W18) |
| Any conflict line, today only | ends "… at the moment." | U08; **Proposed** for the others |
| Duplicate | "<item> is the same as <y>." | U04 `6750:41077` |
| Covered, AND | "Anyone who meets <items> also meets <item>." | U07 `6753:40851` |
| Covered, OR | "Anyone who meets <item> also meets <items>." | **Proposed** (W6) |
| Covered through a level | "Anyone who meets <item> and Rule 05 also meets Rule 01.", "Anyone who meets Rule 02 also meets <item> or Group 03.", "Every applicant meets <item> or Group 03." | **Proposed** |
| Always met | "Every applicant meets <item>, so it doesn’t check anything." | U06 `6753:40514` |

**Which findings share a line** (A2):
- The conflicting findings whose sets are equal share one line: U01's Rule 01 and Rule 02, EC-11's
  four rules (W3).
- A conflict set contained in the members that a group's own conflict names is shown on the group's
  line: U05's Rule 04 and Rule 05 on Sub-group 01's line.
- Every other finding has a line of its own.
- Order: by each line's first item in display order.

### 3.2 Notice and incomplete sentence (no link)

| Case | As its own item, or alone | Appended to a single line or to the counts row | Source |
|---|---|---|---|
| No applicant can meet the variant | "No applicant can meet the rules of <variant>." | "So no applicant can meet the rules of <variant>." | U01; own item **Proposed** (W17) |
| The same, today only | "Right now, no applicant can meet the rules of <variant>." | the same | U08 |
| Every applicant meets the variant | "Every applicant meets the rules of <variant>." | the same | **Proposed** (W8) |
| Incomplete (FR-010) | "The rules of <variant> couldn’t be checked completely. Only findings that are certain are shown." | " · couldn’t be checked completely" after the counts row; the full sentence after a single line | FR-010; **Proposed** (W12) |

### 3.3 States (A1, W17)

- **None**: the variant hasn't been checked yet, has no checked rules (W13), or has no line, notice
  or incomplete sentence.
- **Single**, no chevron: one line, followed by the notice and the incomplete sentence where they
  apply (U01, U08); or the notice or the incomplete sentence alone (W12, W17).
- **Collapsed**, the default with two or more lines: the counts row (§3.4), then the notice where
  it applies, and a chevron button "Show findings" (U02).
- **Expanded**: the counts row, the chevron "Hide findings", then one `Rules/Finding item` per
  line, then the notice and the incomplete sentence as items without a link (U05).
- Whether a variant's banner is expanded is kept per variant while the editor is open, and is
  never stored (FR-019). **Proposed**.
- **Kind** (A1): warning when the variant has a conflict or the "No applicant …" notice, info
  otherwise. Each item's icon: warning for conflicts and the "No applicant …" notice, info for the
  others.

### 3.4 Counts row (A2) — the banner, the tab's tooltip and the dialog

The kinds in this order, joined with " · ", each as one phrase; within a phrase, rules before
groups, joined with "and":

| Kind | Phrase | Source |
|---|---|---|
| Conflicts in sets (reason `with`) | "2 rules can’t be met together", "1 rule and 1 group can’t be met together" | U02 `6750:40933` |
| Rules or groups that can't be met on their own (reason `condition`) | "1 rule can’t be met" | **Proposed** |
| Duplicates | "1 duplicate rule", "2 duplicate rules and 1 duplicate group" | U02 |
| Covered | "1 rule already covered", "1 group already covered" | **Proposed** (U07's frame name) |
| Always met | "1 rule every applicant meets", "1 group every applicant meets" | **Proposed** (U06's frame name) |

- A group whose own conflict names its members (reason `members`) isn't counted: its members are
  (U02 counts "2 rules" for Sub-group 01, Rule 04 and Rule 05).
- Only checked, certain findings count (FR-002, FR-010, W11, W12).

### 3.5 Worked examples

- U01 (single, warning): "Rule 01 and Rule 02 can’t be met together. So no applicant can meet the
  rules of Standard."
- U02 (collapsed, warning): "2 rules can’t be met together · 1 duplicate rule"; expanded as U05:
  "Sub-group 01: Rule 04 and Rule 05 can’t be met together." / "Rule 06 is the same as Rule 03."
- U08 (single, warning): "Rule 01 and Rule 02 can’t be met together at the moment. Right now, no
  applicant can meet the rules of Standard."
- EC-11 with a second, separate conflict (collapsed, warning): "6 rules can’t be met together. So
  no applicant can meet the rules of Standard."
- W8, an OR top level that every applicant meets, no marked item (single, info): "Every applicant
  meets the rules of Standard."
- W12 without a certain finding (single, info): "The rules of Standard couldn’t be checked
  completely. Only findings that are certain are shown."

## 4. Tab icon and tooltip (S4; FR-014; A6, W20)

- **Icon**: after the variant's name, selected or not. The warning triangle when the variant has a
  conflict or the "No applicant …" notice; otherwise the info icon, which is also spec 002's (i) of
  the description. No icon without findings and without a description.
- **Accessible name of the icon**: "<variant> has findings" when the variant has findings, "About
  <variant>" (spec 002) otherwise.
- **Tooltip** (`Rules/Tooltip`): the description, if any; then, below a divider, the findings
  segment with the kind icon of the banner (A1):

| Variant's findings | Findings segment | Source |
|---|---|---|
| One duplicate line | "1 duplicate: <line>" | U11 `6758:43967` ("1 duplicate: Rule 06 is the same as Rule 03.") |
| One conflict line | "1 conflict: <line>" | **Proposed** (W20) |
| One covered or always-met line | "1 finding: <line>" | **Proposed** (W20) |
| Two or more lines | the counts row | U10 `6758:43524` ("2 rules can’t be met together · 1 duplicate rule") |
| A notice or the incomplete sentence alone | its text | **Proposed** |

After a line or the counts row, the notice and the incomplete sentence follow as in the banner
(§3.2). **Proposed**.

## 5. Announcements (FR-015; W1; R12 item 6)

The polite status region speaks the difference between the previous result and the new one after
an action. The sentences of one change go in together, joined with a space. The wording of
2026-10-28 stays (FR-015), except that "by applicants who share today" becomes "at the moment" and
"No applicant who shares today" becomes "Right now, no applicant" (A7).

| Change | Sentence |
|---|---|
| New conflict with T | "<item> conflicts with <items of T>." (today: "… at the moment.") |
| New duplicate | "<item> is the same as <y>." |
| New covered item | "<item> makes no difference beside <items of the reason>." |
| New always met | "Every applicant meets <item>." |
| Conflict gone | "<item> no longer conflicts with <items of the old T>." |
| Duplicate or covered gone | "<item> is no longer redundant." |
| Always met gone | "<item> is no longer always met." |
| A group's own conflict | "<items> in <group> can’t be met together." / "Neither <a> nor <b> in <group> can be met." / "None of <items> in <group> can be met." |
| A rule that can't be met on its own | "No applicant can meet <rule>." |
| A conflict without T gone | "<item> is no longer conflicting." |
| New notice, newly incomplete | its text (§3.2) |
| Other variants | "In <variant>: " before the sentence ("In Ambulance: Rule 02 conflicts with Rule 05.") |

Order: the variant shown first, then the others in tab order; within a variant, the items in
display order, then the notice, then the incomplete sentence.

## 6. Publish and save dialog (S5; FR-017, FR-019; W10)

Not in the redesigned section; built from spec 002's warnings line (U33 `6376:26181`) with the
counts row of §3.4.

| Line | Copy | Source |
|---|---|---|
| Counts | "<variant>: <counts row>" | W10 ("Ambulance: 2 rules can’t be met together · 1 duplicate rule") |
| Unmeetable | "No applicant can meet the rules of <variant>." / "Right now, no applicant can meet the rules of <variant>." after the counts | W10, A7 |
| Every applicant meets the variant | "Every applicant meets the rules of <variant>."; alone, without "<variant>: ", when it is the variant's only finding | **Proposed** |
| Button | "Check rules again" | FR-017 |

- Warning style with a conflict or the "No applicant …" notice, info style otherwise (FR-019).
- The incomplete sentence isn't repeated in the dialog. **Proposed**.
- Without findings, nothing is added (US4-AS4).

## 7. Tokens (T002)

**Update 2026-11-01** (redesign): `get_variable_defs` on the section returns the same KERN variables
as below, with Revamp values (O6), plus two new ones, `variant/changed-text` #8a22b5 and
`variant/changed-background` #f8f1fc, "(purple, same as New addition)", for the purple "Changed
here", which is deferred (O3): `--color-variant-changed` stays. What changes for the findings:
- **Notes** (A3): the text is `layout-text-default` (`text-kern-layout-text-default`), body/small
  regular, not the feedback colour and not semibold; only the 20 px icon takes
  `feedback-warning` or its info colour. Read the info icon's exact colour with
  `get_design_context` on a note (U02 `6171:7510`): it is drawn darker than the banner's info icon.
- **Banner** (A1): warning: background `feedback-warning-background`, 1 px border
  `feedback-warning`; info: `feedback-info-background` and `feedback-info`; radius `default` (8);
  padding 8, 16 on the left; text `layout-text-default`, links `action-default`, underlined.
- **Tooltip** (A6): background `layout-background-inverse`, text `layout-text-inverse`, radius
  `default`, padding 8/16, as spec 002's tooltip.
- The contrast table below still holds for outlines and icons (3:1). Note text is now
  `layout-text-default`, at least 14.9:1 on every background a note sits on.

`get_variable_defs` on the section `6171:6748` returns only variables that spec 002 §9 has already
mapped; the section binds no new one. As there, the file binds KERN's names with the values of the
unreleased "Revamp", and the UI uses the KERN 2.8 token of the same name with KERN 2.8's value
(decision 2026-10-25). A value that differs only for that reason is listed in a visual check as
"KERN 2.8 vs Revamp", not fixed.

### What the section binds

| Group | Variables | KERN 2.8 |
|---|---|---|
| Spacing | `metric-space-none` 0, `-2x-small` 2, `-x-small` 4, `-small` 8, `-default` 16, `-large` 24, `-x-large` 32, `-5x-large` 64, `-10x-large` 160 | same |
| Dimensions, borders | `metric-dimension-small` 20, `-default` 24, `-x-large` 48; `metric-border-width-light` 1, `-default` 2; `component-alert-icon-size` 32 | same |
| Radii | `none` 0, `small` 4, `default` 8, `large` 12, `circle` 9999 | KERN 2.8 vs Revamp: 2, 4, 8, 50 % (spec 002 §9) |
| Type | `title/small`, `title/default`, `heading/large`, `label/default`, `label/small`, `body/default/regular`, `body/small/regular`; baseline paddings of `title-default` 5/3 | KERN 2.8 vs Revamp for `small-static` 14 (16), `medium-adaptive` 18 (21), `large-adaptive` 24 (26); the rest same (spec 002 §9) |
| Effects | `Elevation/Card` | `--shadow-card` (spec 001) |
| Opacity | `action-state-opacity-disabled` 40 | same |

### Colours

Every colour is in spec 002 §9's table; the ones the findings use:

| Figma variable | Figma (Revamp) | Token (Tailwind class) | KERN 2.8 | Used for |
|---|---|---|---|---|
| `feedback-warning-contextual` | #9a4a00 | `--kern-color-feedback-warning` (`text-kern-feedback-warning`, `border-kern-feedback-warning`, `bg-kern-feedback-warning`) | #925400 | conflict outline, note text and icon; warning tab icon; warning dialog line |
| `feedback-warning-background-contextual` | #fff4e0 | `--kern-color-feedback-warning-background` | #ffe7b6 | KERN's warning alert (set by `kern-alert--warning`) |
| `feedback-info(-contextual)` | #0284c7 | `--kern-color-feedback-info` (`text-kern-feedback-info`, `border-kern-feedback-info`, `bg-kern-feedback-info`) | #006b8c | redundant and always-met outline, note text and icon; info tab icon; info dialog line |
| `feedback-info-background-contextual` | #e0f2fe | `--kern-color-feedback-info-background` | #c0f3ff | KERN's info alert (set by `kern-alert--info`) |
| `feedback-danger(-contextual)` | #c4271c | `--kern-color-feedback-danger` | #c31c13 | spec 002's problems only (unchanged, W11) |
| `feedback-danger-background-contextual` | #fef1f0 | `--kern-color-feedback-danger-background` | #fee4e0 | spec 002's problems only |
| `variant-changed(-background)-contextual` | #9a4a00 / #fff4e0 | `--color-variant-changed(-background)` (project, = KERN's warning) | #925400 / #ffe7b6 | "Changed here", unchanged |
| `variant-new(-background)-contextual` | #8a22b5 / #f8f1fc | `--color-variant-new(-background)` (project) | #8a22b5 / #f8f1fc | "New addition", unchanged |
| `layout-text-default`, `layout-text-muted`, `layout-background-default`, `layout-background-hued`, `decorative-border-contextual`, `decorative-brand-contextual`, `action-default`, `action-on-default`, `layout-text-inverse-contextual` | | as in spec 002 §9 | | |

All findings' colours have Tailwind classes in the KERN theme (`--color-kern-feedback-warning`,
`-warning-background`, `-info`, `-info-background`), so none takes a raw variable.

### Icons (research R15, first point)

KERN 2.8.2 (`@kern-ux/native/dist/kern.css`) has both glyphs as mask icons:
- **Warning**: `kern-icon kern-icon--warning`, the triangle with "!" (Material "warning"), which
  `kern-alert--warning` uses. With `kern-icon--small` and `bg-kern-feedback-warning!` in a note, as
  `ProblemNote` colours its icon.
- **Info**: `kern-icon kern-icon--info`, the circled "i", which `kern-alert--info` uses, with
  `bg-kern-feedback-info!`.

Spec 002's `ProblemNote` uses `kern-icon--info` in the danger colour for its problems; the
findings' notes keep that layout and change only the icon and its colour (A3; the note's text is
`layout-text-default`, see the update above).

### Text contrast (research R15; SC-006)

KERN 2.8's light theme, computed from its OKLCH values (orange-600, lightblue-600), WCAG 2.1
contrast of the feedback colours as text and as outline:

| Text colour | on white (rule row, sub-group) | on `layout-background-hued` #f3f4f7 (group frame) | on `variant-changed-background` #ffe7b6 (changed row) | on `variant-new-background` #f8f1fc (added row) | on `feedback-info-background` #c0f3ff |
|---|---|---|---|---|---|
| `feedback-warning` #925400 | 6.02:1 | 5.47:1 | 4.97:1 | 5.44:1 | 5.02:1 |
| `feedback-info` #006b8c | 6.03:1 | 5.48:1 | 4.99:1 | 5.45:1 | 5.03:1 |

Both reach AA (4.5:1) for text of any size on every background a note can sit on, and 3:1 for the
outlines and icons. No darker text token is needed. The alerts' body text is KERN's
`layout-text-default` (#131525), at least 14.9:1 on both alert backgrounds.

**No token was added** to `@theme`: every value the findings need has a KERN 2.8 token.
