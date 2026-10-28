# Design notes: conflict and redundancy checks

**Tasks**: T001 (copy, §1–§6), T002 (tokens, §7) | **Date**: 2026-10-28 | **Contract**: [contracts/ui-screens.md](contracts/ui-screens.md)

**Sources**:
- **Figma "Connection Portal"** (`s8mU9oJDq3411e8bxMjQO9`), section `6171:6748` ("Rules · 5 ·
  Problems: contradiction and duplicate"), units U01–U04 of the
  [audit](figma-audit/report.md). Variables: `get_variable_defs` on the section (§7).
- [spec.md](spec.md) with its Clarifications of 2026-10-28, research R8 and R12, and the "Copy" and
  "Deviations from Figma" (F#, W#) of [contracts/ui-screens.md](contracts/ui-screens.md).
- Spec 002's design notes ([../002-connection-rules/design-notes.md](../002-connection-rules/design-notes.md)),
  which still apply, in particular §1 (language) and §9 (tokens).

Node ids can change when the file is edited.

**What decides what**: spec.md decides behaviour and wording, Figma layout and styling only. These
notes hold the copy that the decisions leave open (research R12, items 1–7) and what follows from
it. Copy marked **Proposed** is in no decision and no frame; the rest quotes the spec, its
Clarifications or the contract, named next to it. `checks/findingMessages.ts` builds every text
below and nothing else does (research R12); its tests pin them.

## 1. Language and conventions

As in spec 002, §1: English, "variant" for a branch, "connection" for a form connection, the main
branch called "Standard" until it is renamed. In addition:
- **Apostrophes are typographic (’)** in the built strings, as in every other string of the app
  (`RulesStep/constants.ts`): "Can’t", "couldn’t", "There’s". The spec and the contract write
  straight ones; the tests compare with ’.
- **Names**: every text names rules, groups, sub-groups and variants by their current names
  (FR-011). Groups and sub-groups are named as the rules step shows them ("Group 01",
  "Sub-group 01").
- **Order**: items in a list follow the display order of the rules step (spec 002, FR-007).
- **Lists** (W3): one item "Rule 02"; two "Rule 02 and Rule 03"; more "Rule 02, Rule 03 and
  Rule 04", without a serial comma. The same with "or" where a text says "or". "Neither Rule 04
  nor Rule 05" for two items in §2.2.
- **Kinds** (FR-012): every note starts with "Conflicting.", "Redundant." or "Always met.".
- **Today** (FR-008): a conflict or a notice that holds only for applicants who share today says
  so with "by applicants who share today" at the end of a note's sentence, or "who shares today"
  after "No applicant" and "nobody". Redundant and always-met findings never depend on the day.
- **Never "to fix"** (FR-016): no text calls a finding a mistake, an error or something to fix,
  resolve or correct. Redundancy notes offer "You can delete …", the summary without a conflict
  says "You can still continue.".

## 2. Notes on rules and groups (S2; FR-003, FR-005, FR-006, FR-012; F5, F6, W2–W8)

`<items>` is a list as in §1. One note per item, under the rule or the group's header.

### 2.1 Conflicting: with other items (FR-003; F5, W2, W3, W5)

| Case | Note | Source |
|---|---|---|
| A rule or group that can't be met together with T | "Conflicting. Can’t be met together with <items of T>." | FR-003, F5, W3 |
| The same, today only | "Conflicting. Can’t be met together with <items of T> by applicants who share today." | FR-008, W5 |

Examples: U01 "Conflicting. Can’t be met together with Rule 02."; EC-11 "Conflicting. Can’t be
met together with Rule 02, Rule 03 and Rule 04."; a group: "Conflicting. Can’t be met together
with Rule 01." (the same pattern for rules and groups).

### 2.2 Conflicting: a group that can't be met on its own (FR-003; F6; items 2 and 8)

The group names the smallest set of its members that can't be met together (AND), or its members,
none of which can be met (OR). The members carry their own notes (§2.1, §2.3).

| Case | Note | Source |
|---|---|---|
| AND group, two or more members named | "Conflicting. <items> in this group can’t be met together." | FR-003, F6 |
| The same, today only | "Conflicting. <items> in this group can’t be met together by applicants who share today." | **Proposed** (FR-008's words) |
| OR group, two members, none can be met | "Conflicting. Neither <item> nor <item> in this group can be met." | **Proposed** (R12 item 2) |
| OR group, three or more members | "Conflicting. None of <items> in this group can be met." | **Proposed** (R12 item 2) |
| Either kind, one member named (a group whose only checked member, or whose smallest set, is one item that can't be met on its own) | "Conflicting. <item> in this group can’t be met." | **Proposed** |
| OR group or single member, today only | The same sentence ending "… can be met by applicants who share today." or "… can’t be met by applicants who share today." | **Proposed** (FR-008's words) |

Examples: U02 Sub-group 01 "Conflicting. Rule 04 and Rule 05 in this group can’t be met
together."; an OR group "Conflicting. Neither Rule 04 nor Rule 05 in this group can be met.".

### 2.3 Conflicting: a rule that can't be met on its own (FR-003 "its condition"; R12 item 1)

| Case | Note | Source |
|---|---|---|
| A rule no applicant can meet, whatever the other rules | "Conflicting. No applicant can meet this rule’s condition." | **Proposed** |
| The same, today only | "Conflicting. No applicant who shares today can meet this rule’s condition." | **Proposed** (FR-008's words) |

Example: quickstart V4, "Driving licence – Nationality includes none of" every country: "Conflicting.
No applicant can meet this rule’s condition." The rule's statement stands right above the note, so
the note doesn't repeat the condition; "this rule’s condition" points at it (FR-003).

### 2.4 Redundant (FR-005; F5, W6, W7)

| Case | Note | Source |
|---|---|---|
| Same check as one item | "Redundant. Same as <item>. You can delete one to keep the list clear." | FR-005, F5 |
| Implied by others, in an AND level | "Redundant. Anyone who meets <items> also meets this rule. You can delete it to keep the list clear." | FR-005, W6 |
| Implies others, in an OR level | "Redundant. Anyone who meets this rule also meets <items>. You can delete it to keep the list clear." | FR-005, W6 |
| A group | The same sentences with "this group" | W7 |

"Same as" is used only when the reason is a single item Y that also implies the item back, and no
enclosing level takes part (research R8, step 4). Otherwise one of the two "Anyone who meets"
sentences.

**Through an enclosing level** (research R8, step 4; R12 item 5) — **Proposed**. One general form,
"Anyone who meets <P> also meets <Q>.", where the item itself is "this rule" or "this group":
- **In an OR level, with the AND context of an enclosing level**: P is the item and the context
  items, Q its siblings that it implies. "Redundant. Anyone who meets this rule and Rule 05 also
  meets Rule 01. You can delete it to keep the list clear." Several: "… meets this rule, Rule 05
  and Rule 07 also meets Rule 01. …"
- **In an AND level, with the alternatives of an enclosing OR level**: P the siblings that imply
  it, Q the item or the alternatives, joined with "or". "Redundant. Anyone who meets Rule 02 also
  meets this rule or Group 03. You can delete it to keep the list clear." Several: "… also meets
  this rule, Group 03 or Rule 07. …"
- **When P is empty** (the item or the alternatives are met by everyone, though the item alone
  isn't): "Redundant. Every applicant meets this rule or Group 03. You can delete it to keep the
  list clear."
- "this rule" / "this group" comes first in its list, then the other items in display order.

### 2.5 Always met (FR-006; W8)

| Case | Note | Source |
|---|---|---|
| A rule | "Always met. Every applicant meets this rule." | FR-006, W8 |
| A group | "Always met. Every applicant meets this group." | FR-006, W8 |

## 3. Summary alert (S2; FR-013; F1, F2, W5, W8, W12, W13, W16; R12 items 3 and 4)

The summary is a KERN warning alert when the variant has a conflict or no applicant can meet it, a
KERN info alert otherwise (F2). It is built from up to six parts, in this order, joined with a
space. Parts that don't apply are left out.

1. **Conflict counts** (if any conflicting item), then " in this variant" (see below), then ": ",
   then the **first conflict's clause**, then ".".
2. **Other counts after conflicts**: "There’s also <counts>." when the first number is 1, "There
   are also <counts>." otherwise (**Proposed**: the spec's "There's also" fits one).
3. **Without conflicts**: the counts, " in this variant", ": ", the **first finding's clause**, ".",
   then "You can still continue." (F1, U04).
4. **The variant's notice** (FR-004, FR-006, FR-008), one of: "No applicant can meet the rules of
   <variant>.", "No applicant who shares today can meet the rules of <variant>.", "Every applicant
   meets the rules of <variant>.".
5. **Incomplete** (FR-010): "The rules of <variant> couldn’t be checked completely. Only findings
   that are certain are shown."

### Counts (R12 item 4) — **Proposed**, following F1 and W8

- **Order of kinds**: conflicting, redundant, always met. Within a kind, rules before groups.
  Sub-groups count as groups (U02: "1 conflicting group" for Sub-group 01).
- **Phrases**: "1 conflicting rule", "2 conflicting rules", "1 conflicting group", "2 conflicting
  groups", "1 redundant rule", "1 redundant group", "1 always-met rule", "1 always-met group",
  plural with "s" on "rule" and "group".
- **Joined as a list** (§1): "2 conflicting rules and 1 conflicting group" (F1),
  "1 redundant rule and 1 always-met group".
- **Only checked, certain findings count** (FR-002, FR-010, W11): rules with a spec 002 problem,
  removed rules and findings that aren't certain are not counted.
- **"in this variant"** (U03 `6616:44417`): after the first counts when the connection has more
  than one variant, on every tab (U01, U02 and U04 have one variant and don't say it). It appears
  once, never after "There’s also".

### Clauses (R12 item 3) — **Proposed**, following F1

The clause explains the first item with a finding of the leading kind, in display order. For a
conflict, its set is the item and T (§2.1), or the members named by a group's own note (§2.2), or
the rule alone (§2.3), in display order.

| First finding | Clause | Example |
|---|---|---|
| Conflict, set of two | "nobody can meet both <a> and <b>" | U01 "nobody can meet both Rule 01 and Rule 02"; U02 (Sub-group 01's own) "nobody can meet both Rule 04 and Rule 05" |
| Conflict, set of three or more | "nobody can meet all of <items>" | EC-11 "nobody can meet all of Rule 01, Rule 02, Rule 03 and Rule 04" |
| Conflict, one rule (§2.3) | "nobody can meet <rule>" | "nobody can meet Rule 03" |
| Conflict, OR group none of whose members can be met (§2.2) | "nobody can meet <items joined with or>" | "nobody can meet Rule 04 or Rule 05" |
| Any conflict, today only | "nobody" becomes "nobody who shares today" | "nobody who shares today can meet both Rule 01 and Rule 02" |
| Redundant, same check | "<item> is the same as <y>" | U04 "Rule 06 is the same as Rule 03" |
| Redundant, any other reason | "<item> makes no difference beside <items of the reason>" | "Rule 01 makes no difference beside Rule 02"; through a level: "Rule 02 makes no difference beside Rule 01 and Rule 05" |
| Always met | "every applicant meets <item>" | "every applicant meets Rule 05" |

The redundancy and always-met clauses use FR-015's announcement words. **Several conflicts**: the
clause explains only the first. When a conflicting item is neither in the first conflict's set nor
the group whose note names it, the first sentence is followed by "The other conflicts are marked
below." (**Proposed**), so that the clause doesn't read as the whole story. "Go to next finding"
visits them all.

### Worked examples

- U01: "2 conflicting rules: nobody can meet both Rule 01 and Rule 02. No applicant can meet the
  rules of Standard." (warning)
- U02: "2 conflicting rules and 1 conflicting group: nobody can meet both Rule 04 and Rule 05.
  There’s also 1 redundant rule." (warning)
- U03: "2 conflicting rules and 1 conflicting group in this variant: nobody can meet both Rule 04
  and Rule 05. There’s also 1 redundant rule." (warning)
- U04: "1 redundant rule: Rule 06 is the same as Rule 03. You can still continue." (info)
- EC-11 with another, separate conflict: "6 conflicting rules: nobody can meet all of Rule 01,
  Rule 02, Rule 03 and Rule 04. The other conflicts are marked below. No applicant can meet the
  rules of Standard." (warning)
- W5: "2 conflicting rules: nobody who shares today can meet both Rule 01 and Rule 02. No
  applicant who shares today can meet the rules of Standard." (warning)
- W8, always met everywhere: "1 always-met rule: every applicant meets Rule 01. You can still
  continue. Every applicant meets the rules of Standard." (info)
- A notice without marked items (an OR top level that everyone meets, W16): "Every applicant meets
  the rules of Standard." (info, no "Go to next finding")
- W12 with certain findings: "1 redundant rule: Rule 06 is the same as Rule 03. You can still
  continue. The rules of Standard couldn’t be checked completely. Only findings that are certain
  are shown." (info); without: the incomplete sentence alone (info, no button).

## 4. Tab (S4; FR-014; F7)

Text alternative "<variant> has findings", for a variant with any certain finding, its notices
included: "Standard has findings", "Ambulance has findings" (F7). Warning icon with a conflict or
the "No applicant …" notice, info icon otherwise; a variant whose only finding is "Every applicant
meets …" gets the info icon.

## 5. Announcements (FR-015; W1; R12 item 6)

The polite status region speaks the difference between the previous result and the new one after
an action (research R11). Every sentence ends with ".", and the sentences of one change go in
together, joined with a space.

### Rules — FR-015 and the Clarifications

| Change | Sentence | Source |
|---|---|---|
| New conflict with T | "<item> conflicts with <items of T>." | FR-015 |
| New redundancy, same check | "<item> is the same as <y>." | FR-015 |
| New redundancy, other reason | "<item> makes no difference beside <items of the reason>." | FR-015 |
| New always met | "Every applicant meets <item>." | FR-015 |
| Conflict gone | "<item> no longer conflicts with <items of the old T>." | FR-015 |
| Redundancy gone | "<item> is no longer redundant." | FR-015 |
| Always met gone | "<item> is no longer always met." | FR-015 |
| New variant notice | Its text (§3, part 4) | FR-015 |

### Groups and cases the spec doesn't word — **Proposed**

| Change | Sentence |
|---|---|
| A group or sub-group with T | as for a rule: "Sub-group 01 conflicts with Rule 01." |
| A group's own conflict, AND | "<items> in <group> can’t be met together." ("Rule 04 and Rule 05 in Sub-group 01 can’t be met together.") |
| A group's own conflict, OR | "Neither <a> nor <b> in <group> can be met." / "None of <items> in <group> can be met." |
| A rule that can't be met on its own | "No applicant can meet <rule>." |
| Today only | as in §1: "… by applicants who share today.", "No applicant who shares today can meet <rule>." |
| A conflict without T gone (a group's own, a rule on its own) | "<item> is no longer conflicting." |
| A finding whose reason changed, kind unchanged | the new finding's sentence, as if new |
| A finding whose kind changed | the old kind's "no longer" sentence, then the new kind's sentence |
| A notice gone | nothing: the items' "no longer" sentences say it |
| Incomplete, newly | its sentence (§3, part 5) |
| Incomplete, gone | nothing |

### Other variants — **Proposed** (R12 item 6)

A finding in a variant other than the one shown starts with "In <variant>: ": "In Ambulance: Rule
02 conflicts with Rule 05.", "In Ambulance: Rule 05 is no longer always met." The notices and the
incomplete sentence name their variant already and take no prefix.

**Order**: the variant shown first, then the others in tab order; within a variant, the items in
display order, then the notice, then the incomplete sentence.

## 6. Publish and save dialog (S5; FR-017, FR-019; W10; R12 item 7)

One block per variant with findings, in tab order, below spec 002's lines:

| Line | Copy | Source |
|---|---|---|
| Counts | "<variant>: <counts>", the counts of §3 in the same order, joined with ", " and without "and" or a final full stop | FR-017, W10 ("Ambulance: 2 conflicting rules, 1 redundant rule") |
| Counts with groups and always-met items | "Ambulance: 1 conflicting group, 1 always-met rule" | **Proposed**, from W10 |
| Unmeetable | "No applicant can meet the rules of <variant>." after the counts | FR-017, W10 |
| Unmeetable, today only | "No applicant who shares today can meet the rules of <variant>." | **Proposed** (FR-008's words) |
| Every applicant meets the variant | "Every applicant meets the rules of <variant>." after the counts; alone, without "<variant>: ", when it is the variant's only finding | **Proposed** (R12 item 7) |
| Button | "Check rules again" (spec 002's secondary action) | FR-017 |

- Warning style for a variant with a conflict or the "No applicant …" notice, info style otherwise
  (FR-019, W10).
- The incomplete sentence isn't repeated in the dialog: it isn't a finding, and the rules step
  shows it (FR-010, FR-017). **Proposed**.
- Without findings, nothing is added (US4-AS4).

## 7. Tokens (T002)

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
findings' notes keep that layout and change only icon and colour (F4).

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
