# Requirements index — spec.md mtime 1793566163 (2026-11-01T20:49:23Z)
| ID | Requirement (≤ 20 words) | Prio | UI | Surface | State | Flags | Spec § |
|---|---|---|---|---|---|---|---|
| FR-001a | Wizard progress shows Connection, Documents, Rules, Test, Publish; test step sits between rules and publishing | — | Y | Wizard progress | default | | FR-001 |
| FR-001b | No rule and no open editor: rules step button reads "Publish/Save without rules" and skips test step | — | Y | Rules step action bar | empty | | FR-001 |
| FR-002a | Going to test step refused with publishing's message on incomplete/messageless/unrequested rules or bad branch names | — | Y | Rules step | error | | FR-002 |
| FR-002b | Unsaved rule editor changes: ask to keep or discard before opening test step | — | Y | Rules step (keep/discard dialog) | default | | FR-002 |
| FR-003a | With a rule or open editor, rules step's only go-on button is "Test rules"; no Publish/Save there | — | Y | Rules step action bar | default | | FR-003 |
| FR-003b | Test step offers back to rules step and "Publish" ("Save" when editing) opening unchanged publish dialog | — | Y | Test step action bar | default | | FR-003 |
| FR-003c | Persona results never refuse, delay, add a question to publishing/saving, nor disable any action | — | Y | Test step action bar | default | | FR-003 |
| FR-003d | Publish dialog opened from test step keeps secondary "Check rules again": opens rules step at first branch, with findings | — | Y | Publish dialog (from test step) | default | | FR-003 |
| FR-004a | Test step shows three personas, each with a name and values for data the rules check | — | Y | Test step – personas | default | | FR-004 |
| FR-004b | Personas generated when the test step first opens | — | Y | Test step – personas | loading | | FR-004 |
| FR-004c | Personas shown as row of three chips, one selected, first by default; selection stays on tab change | — | Y | Test step – applicants row | default | | FR-004 |
| FR-004d | Only selected persona's values, headed "<Name>'s data" (e.g. "Mia's data"), and its results fill the panel | — | Y | Test step – persona panel | default | | FR-004 |
| FR-004e | Intro reads "Choose a sample applicant to see which rules they meet and which messages they'd see. The data is made up, and nothing is shared." | — | Y | Test step – intro | default | | FR-004 |
| FR-005a | Persona has values for exactly the fields/parts checked by rules evaluated in some branch, nothing else | — | Y | Test step – persona | default | | FR-005 |
| FR-005b | Values grouped by document, named as rules name them, e.g. "Personal ID – Date of birth (Age)" | — | Y | Test step – persona | default | | FR-005 |
| FR-005c | Rule on class date adds "Licence classes"; class date shown only while persona holds the class | — | Y | Test step – persona | default | | FR-005 |
| FR-005d | On screen values sit under document headings ("Personal ID", "Driving licence"), names without document prefix | — | Y | Test step – persona panel | default | | FR-005 |
| FR-005e | "Licence classes" lists codes in one row ("B, BE"); each checked class date has its own row | — | Y | Test step – persona panel | default | | FR-005 |
| FR-006a | Every persona value editable by kind: text, whole number, date, enum by labels, licence classes by codes | — | Y | Test step – persona | default | | FR-006 |
| FR-006b | Nationality and Licence classes take one or more values; every other enum field one | — | Y | Test step – persona | default | | FR-006 |
| FR-006c | Values can be cleared; empty text or empty list counts as missing | — | Y | Test step – persona | empty | | FR-006 |
| FR-006d | Several values picked from a list, not typed: licence classes by code, nationalities by label | — | Y | Test step – persona (edit mode) | default | | FR-006 |
| FR-006e | Every value the persona shows has an edit field; none read-only or hidden | — | Y | Test step – persona (edit mode) | default | | FR-006 |
| FR-006f | Editing happens in persona panel, not a dialog: "Edit data" turns values into fields, "Done" back | — | Y | Test step – persona panel | default | | FR-006 |
| FR-006g | Nothing to confirm or cancel: every valid change applies at once | — | Y | Test step – persona (edit mode) | default | | FR-006 |
| FR-007a | Next to Date of birth, show the age it gives today | — | Y | Test step – persona | default | | FR-007 |
| FR-007b | Date of birth editable as date or by entering an age, keeping day and month where possible | — | Y | Test step – persona | default | | FR-007 |
| FR-008a | Invalid entry pointed out under its field: "Enter a date that exists, e.g. 28.02.2007."; "Enter a whole number, e.g. 25." | — | Y | Test step – persona (edit mode) | error | | FR-008 |
| FR-008b | Until corrected, results use that field's last valid value; persona's other changes still apply | — | Y | Test step – results | error | | FR-008 |
| FR-009a | Persona name is an editable team label, not data the rules check | — | Y | Test step – persona | default | | FR-009 |
| FR-009b | Empty name pointed out under its field with "Enter a name."; persona keeps its previous name | — | Y | Test step – persona (edit mode) | error | | FR-009 |
| FR-009c | Generated Given/Family name values come from persona name but are edited separately | — | Y | Test step – persona | default | | FR-009 |
| FR-009d | When rules check them, Given/Family name are own fields under "Personal ID", labelled as rules name them | — | Y | Test step – persona panel | default | | FR-009 |
| FR-010a | Generated personas fictitious and plausible: realistic distinct names, age 18–80, unless an FR-011 goal needs otherwise | — | N | ? | ? | | FR-010 |
| FR-010b | Generated issue dates not before birth, expiry not before issue; fields on same fact agree | — | N | ? | ? | | FR-010 |
| FR-010c | Each generation draws new random values; two generations normally differ | — | N | ? | ? | | FR-010 |
| FR-011a | Generation goal 1: for every meetable branch, a persona that meets its rules | — | N | ? | ? | | FR-011 |
| FR-011b | Generation goal 2: for every branch not every applicant meets, a persona that doesn't | — | N | ? | ? | | FR-011 |
| FR-011c | Generation goal 3: for two branches met differently, a persona meeting one but not the other | — | N | ? | ? | | FR-011 |
| FR-011d | Generation goal 4: every evaluated rule and group met by one persona and failed by another, where possible | — | N | ? | ? | | FR-011 |
| FR-011e | Unreachable goals reached as far as possible, in order; never trade a goal for a later one | — | N | ? | ? | | FR-011 |
| FR-012a | Team member can generate one persona anew towards FR-011 goals; other two unchanged | — | Y | Test step – persona | default | | FR-012 |
| FR-012b | Team member can generate all three personas anew | — | Y | Test step | default | | FR-012 |
| FR-012c | Regenerating asks to confirm first when it would replace values the team member changed | — | Y | Test step (confirm dialog) | default | | FR-012 |
| FR-012d | Generate all: tertiary button "Generate all again" with refresh icon, right end of persona row | — | Y | Test step – applicants row | default | | FR-012 |
| FR-012e | Confirm: "Generate new data for all applicants?", "Your changes to Mia's data will be replaced.", "Cancel", "Generate new data" | — | Y | Test step (confirm dialog) | default | | FR-012 |
| FR-012f | While generating all anew, step shows the same loading state as first generation | — | Y | Test step – personas | loading | | FR-012 |
| FR-013a | Generation finishes within 5 seconds with best personas found, values still valid | — | N | ? | ? | | FR-013 |
| FR-013b | Editing other personas, going back, publishing and saving never wait for generation | — | Y | Test step | loading | | FR-013 |
| FR-013c | Persona being generated is placeholder without "Edit data"/"Generate again"; on first open none editable | — | Y | Test step – persona panel | loading | | FR-013 |
| FR-013d | Generation error: "Couldn't create sample applicants", "Try again, or publish/save without testing.", "Try again" regenerates all | — | Y | Test step – personas | error | | FR-013 |
| FR-013e | On generation error, branch tabs, going back, publishing and saving stay usable | — | Y | Test step | error | | FR-013 |
| FR-014a | Every persona tested against every branch, including rule-less ones, exactly as evaluation, shared today | — | N | ? | ? | | FR-014 |
| FR-014b | Result equals serviceBW's evaluation: overall outcome, reported rules and groups, their messages | — | N | ? | ? | | FR-014 |
| FR-014c | Result also holds outcome of every top-level rule and group as the evaluation judges it | — | N | ? | ? | | FR-014 |
| FR-015a | Per persona and branch, outcome not by colour alone: chip icon differing in shape; selected persona in text | — | Y | Test step – applicants row / results | default | | FR-015 |
| FR-015b | When not met, list each reported rule/group: name, statement, not met or couldn't be checked, message | — | Y | Test step – results | error | | FR-015 |
| FR-015c | Group reported with own message also lists its rules and sub-groups not met or uncheckable | — | Y | Test step – results | error | | FR-015 |
| FR-015d | Branches appear by name, in the order of their tabs in the rules step | — | Y | Test step – results | default | | FR-015 |
| FR-015e | Chip's accessible name states outcome: "Mia Schulz: meets / doesn't meet the rules of Standard" | — | Y | Test step – applicants row | default | a11y, not visible | FR-015 |
| FR-015f | Heading "Result: meets the rules" or counts reported items, group as one: "Result: doesn't meet 1 rule and 1 group" | — | Y | Test step – results | default | | FR-015 |
| FR-015g | Statuses "Not met" and "Couldn't be checked" each have their own icon | — | Y | Test step – results | error | | FR-015 |
| FR-015h | After reported items, every other top-level rule and group listed with outcome; rule in met group not failing | — | Y | Test step – results | default | | FR-015 |
| FR-015i | Under a branch the persona meets, list headed "Rules <first name> meets", e.g. "Rules Mia meets" | — | Y | Test step – results | success | | FR-015 |
| FR-015j | Met rule/group shows name and statement like reported rows, check icon, no message: "–" in unmet branch; met branch no message column | — | Y | Test step – results | success | | FR-015 |
| FR-015k | Reported group's failing members indented below it with name, statement, status; unreported groups' members not listed | — | Y | Test step – results | error | | FR-015 |
| FR-016a | "Today" is the calendar date in Germany when results are made | — | N | ? | ? | | FR-016 |
| FR-016b | Step says personas tested as if shared today, naming date: "Tested as if shared today, 29 Oct 2026." | — | Y | Test step | default | | FR-016 |
| FR-016c | Test-day line sits directly under the step's intro | — | Y | Test step – intro | default | | FR-016 |
| FR-016d | Test-day line shown whenever results shown, also during one-persona regeneration; hidden on first load and failure | — | Y | Test step – intro | loading | | FR-016 |
| FR-017a | Results update at once after every change to a persona's values, without asking | — | Y | Test step – results | default | | FR-017 |
| FR-017b | Outcome changes announced via polite status region without moving focus, e.g. "Lena Hoffmann now meets…" | — | Y | Test step (status region) | success | a11y, not visible | FR-017 |
| FR-017c | No visible toast for outcome changes | — | Y | Test step | success | | FR-017 |
| FR-018 | Unmeetable branch shows spec 003 notice next to its results: "No applicant can meet the rules of Ambulance." | — | Y | Test step – results | error | | FR-018 |
| FR-018b | Unmeetable-branch notice sits above the "Result: …" heading | — | Y | Test step – results | error | | FR-018 |
| FR-018c | Unmeetable branch's tab has warning icon; tooltip shows same notice, opens on keyboard focus and hover | — | Y | Test step – variant tabs | error | | FR-018 |
| FR-019a | Personas with edits kept while moving between wizard steps, also after a failed publish or save | — | N | ? | ? | | FR-019 |
| FR-019b | Personas tested against current rules each time the test step opens | — | N | ? | ? | | FR-019 |
| FR-019c | Personas discarded on publish, save or leaving the flow; never stored; next flow starts anew | — | N | ? | ? | | FR-019 |
| FR-020a | After rule changes, newly checked data gets values as generation would; existing values unchanged | — | N | ? | ? | | FR-020 |
| FR-020b | Data no evaluated rule checks hidden and ignored; returns with earlier value when checked again | — | Y | Test step – persona | default | | FR-020 |
| FR-020c | Results follow current branches: added branch gets results, deleted branch loses them | — | Y | Test step – results | default | | FR-020 |
| FR-020d | Licence class dates return with earlier value when persona holds the class again | — | Y | Test step – persona | default | | FR-020 |
| FR-021a | Personas and results visible only to signed-in DO.IT team members, in the test step | — | Y | Test step | default | | FR-021 |
| FR-021b | Personas not stored, sent to wallet/EUDIPLO/serviceBW, logged, nor change any evaluation or delivery | — | N | ? | ? | | FR-021 |
| US1-AS1 | "Test rules" opens test step: three personas with name, age, city, licence classes, class B date if held | P1 | Y | Test step – personas | default | | US1 |
| US1-AS2 | Each persona shows met per Standard and Ambulance; failures name rule/group, not met/uncheckable, message | P1 | Y | Test step – results | error | | US1 |
| US1-AS3 | Generated personas: one meets both variants, one only Ambulance, one neither | P1 | Y | Test step – results | default | | US1 |
| US1-AS4 | Step says personas tested as if shared today and names today's date | P1 | Y | Test step | default | | US1 |
| US1-AS5 | Generating one persona anew gives it new values; others keep theirs; its results update | P1 | Y | Test step – persona | default | | US1 |
| US1-AS6 | Publishing or saving from test step proceeds regardless of personas failing branches | P1 | Y | Test step action bar | default | | US1 |
| US1-AS7 | No rules: "Publish without rules" from documents or rules step publishes, skipping test step | P1 | Y | Documents step / Rules step action bar | empty | | US1 |
| US1-AS8 | Rule without error message in Ambulance: going to test step refused naming rule and Ambulance | P1 | Y | Rules step | error | | US1 |
| US2-AS1 | Changing age 25 to 20 updates date of birth; fails Standard age rule with message, meets Ambulance | P2 | Y | Test step – persona / results | error | | US2 |
| US2-AS2 | Date of birth exactly 21 years before today meets "at least 21 years old" | P2 | Y | Test step – persona / results | default | | US2 |
| US2-AS3 | City "STUTTGART" fails case-sensitive "equal to Stuttgart", meets case-insensitive version | P2 | Y | Test step – persona / results | default | | US2 |
| US2-AS4 | Removing class B hides its issue date, rule reported not met; re-adding restores earlier date | P2 | Y | Test step – persona / results | default | | US2 |
| US2-AS5 | Clearing date of birth: its rules reported couldn't be checked; persona fails branches needing them | P2 | Y | Test step – persona / results | empty | | US2 |
| US2-AS6 | Data no rule checks, such as family name, is absent from the persona | P2 | Y | Test step – persona | default | | US2 |
| US2-AS7 | Renaming a persona shows the new name and changes none of its results | P2 | Y | Test step – persona | default | | US2 |
| US3-AS1 | After changing Standard's age rule 21→18 and returning, personas keep values; results follow rule | P2 | Y | Test step – results | default | | US3 |
| US3-AS2 | New Nationality rule: every persona gets a nationality, at least one meets, one fails; others unchanged | P2 | Y | Test step – persona | default | | US3 |
| US3-AS3 | Deleting the only city rule: no persona shows city, no result depends on it | P2 | Y | Test step – persona | default | | US3 |
| US3-AS4 | Added branch "School transport" gets results for every persona; deleting it removes them | P2 | Y | Test step – results | default | | US3 |
| US3-AS5 | After publishing, a later edit flow's test step shows three new personas | P2 | Y | Test step – personas | default | | US3 |
| EC-1 | No rules and no open editor: button "Publish/Save without rules", progress skips test step | — | Y | Rules step action bar / Wizard progress | empty | | Edge Cases |
| EC-2 | First rule being edited shows "Test rules"; discarding it keeps rules step, button "Publish without rules" | — | Y | Rules step action bar | default | | Edge Cases |
| EC-3 | Branch without rules (or all main rules removed): every persona meets it | — | Y | Test step – results | default | | Edge Cases |
| EC-4 | Unmeetable branch: no persona meets it, generation doesn't try; notice above its results, warning icon on tab | — | Y | Test step – results / variant tabs | error | | Edge Cases |
| EC-5 | Branch every applicant meets: every persona meets it; generation doesn't try to fail it | — | Y | Test step – results | default | | Edge Cases |
| EC-6 | Rules removed in a branch aren't tested there; their data stays while evaluated elsewhere | — | Y | Test step – persona / results | default | | Edge Cases |
| EC-7 | Rules with problems keep team member in rules step with publishing's message | — | Y | Rules step | error | | Edge Cases |
| EC-8 | Unsaved rule editor changes: keep/discard prompt before going to test step | — | Y | Rules step (keep/discard dialog) | default | | Edge Cases |
| EC-9 | Birthday today counts as reached; 29 February birthdays reach next age on 1 March | — | N | ? | ? | | Edge Cases |
| EC-10 | Tested as if shared today (Germany date), named in step; testing another day out of scope | — | Y | Test step | default | | Edge Cases |
| EC-11 | Rule on a class not held reported not met; class dates offered only for held classes | — | Y | Test step – persona / results | default | | Edge Cases |
| EC-12 | Held class with empty expiry date: rule on it reported couldn't be checked | — | Y | Test step – results | empty | | Edge Cases |
| EC-13 | Nationality and Licence classes hold several values; German+Italian meets both "includes one of" rules | — | Y | Test step – persona | default | | Edge Cases |
| EC-14 | Fields describing same fact generated in agreement but edited independently | — | Y | Test step – persona | default | | Edge Cases |
| EC-15 | Persona name is a label; Given/Family name values derived at generation, independent afterwards | — | Y | Test step – persona | default | | Edge Cases |
| EC-16 | Unlikely values (future birth date, age 200) accepted and evaluated; generated only when rules require | — | N | ? | ? | | Edge Cases |
| EC-17 | Non-value entry (31 February, letters/decimals) pointed out under its field; results use field's last valid value, other changes apply | — | Y | Test step – persona (edit mode) | error | | Edge Cases |
| EC-18 | More rules than three personas cover: goals reached in FR-011 order as far as possible | — | N | ? | ? | | Edge Cases |
| EC-19 | At 200 rules, generation stops after 5 seconds with best valid personas; only the persona being generated waits | — | N | ? | ? | | Edge Cases |
| EC-20 | Documents step drops data rules check: test step unreachable until rules fixed | — | Y | Rules step | error | | Edge Cases |
| EC-21 | Branches following main branch changes: their results follow on returning to test step | — | Y | Test step – results | default | | Edge Cases |
| EC-22 | Generation fails: "Couldn't create sample applicants", "Try again"; going back and publishing still possible | — | Y | Test step – personas | error | | Edge Cases |
| ENT-Persona.name | Team label of the fictitious applicant | — | Y | Test step – persona | default | | Key Entities |
| ENT-Persona.values | Value, possibly empty, for each piece of data the rules check | — | Y | Test step – persona | default | | Key Entities |
| ENT-Persona.lifetime | Three per create/edit flow, lasting until the flow ends, never stored | — | N | ? | ? | | Key Entities |
| ENT-PersonaValue.field | One field or field part of one document | — | Y | Test step – persona | default | | Key Entities |
| ENT-PersonaValue.value | Value of the field's kind, or empty for a document not giving it | — | Y | Test step – persona | empty | | Key Entities |
| ENT-TestResult.scope | Outcome of one persona against one branch's rules, as if shared today | — | N | ? | ? | | Key Entities |
| ENT-TestResult.met | Whether the branch's rules are met overall | — | Y | Test step – results | default | | Key Entities |
| ENT-TestResult.reported | Rules and groups with messages, each not met or couldn't be checked | — | Y | Test step – results | error | | Key Entities |
| ENT-TestResult.outcomes | For showing: outcome of every top-level rule and group as the evaluation judges it | — | Y | Test step – results | default | | Key Entities |
| ENT-TestDay.date | Today's calendar date in Germany, used for every persona | — | Y | Test step | default | | Key Entities |

## Exclusions
| OUT-ID | Excluded behaviour | Spec § |
|---|---|---|
| OUT-1 | More or fewer than three personas; adding or removing personas | Assumptions (Three personas, Out of scope) |
| OUT-2 | Recording expected outcomes for a persona (e.g. "should meet Ambulance") and checking them | Assumptions (Out of scope) |
| OUT-3 | Keeping personas after publish or save, e.g. to reuse in the next edit | Assumptions (Out of scope), Clarifications |
| OUT-4 | Testing as if shared on a day other than today | Assumptions (Out of scope), Edge Cases |
| OUT-5 | Testing with real documents or a wallet | Assumptions (Out of scope) |
| OUT-6 | Showing which rules no persona meets or fails | Assumptions (Out of scope) |
| OUT-7 | Showing personas or results on connection details or in the overview | Assumptions (Out of scope) |
| OUT-8 | Changing the publish and save dialog | Assumptions (Out of scope), FR-003 |
| OUT-9 | Judging whether a rule is right (stays with DO.IT) | Assumptions (The evaluation decides) |
| OUT-10 | The Figma file's redesign of the whole site; only what this spec covers is built | Assumptions (Design) |
| OUT-11 | "Your rules are saved." in the generation failure state (nothing stored before publishing) | Clarifications 2026-11-01, FR-013 |
| OUT-12 | Figma tooltip wording "Rule 01 and Rule 02 can't be met together, so no applicant can meet these rules." | Clarifications 2026-11-01, FR-018 |
| OUT-13 | Edit dialog with Cancel, Close or "Save and test"; confirming persona edits | Clarifications 2026-11-01, FR-006 |
| OUT-14 | Visible toast announcing changed results | Clarifications 2026-11-01, FR-017 |
| OUT-15 | Success message for a branch the persona meets | Clarifications 2026-11-01, FR-015 |

## Glossary
form connection = connection
branch = variant, variant tab, tab
main branch = Standard
test step = Test, test rules, rules test, step 4
"Test rules" = test rules button, go on, next
persona = fictitious applicant, test person, sample applicant, applicant, Testperson, profile, card, chip
applicants row = persona chips, chip row, applicant switch, selected applicant
persona panel = "<Name>'s data", "Mia's data", data panel, applicant data
edit mode = "Edit data", "Done", edit fields, editor
generate anew = regenerate, new values, shuffle, refresh, reroll, generate all, "Generate again", "Generate all again", "Generate new data"
placeholder = skeleton, loading, spinner, skeleton rows
generation failure = "Couldn't create sample applicants", "Try again", error state
result = outcome, meets / doesn't meet, passes / fails, pass, fail, status, "Result: …"
met rules list = "Rules Mia meets", rules met, met rows, check icon, "Rule NN · <name>", "–"
not met = failed, not fulfilled, "Not met"
couldn't be checked = not checkable, unknown, missing data, can't be checked, "Couldn't be checked"
test day = today, "Tested as if shared today", date banner, date line
intro = "Choose a sample applicant…", description, subtitle
rule = condition, statement
group = rule group, sub-group
error message = message, rejection message, message column
notice = finding, warning, warning icon, tooltip, "No applicant can meet the rules of …"
progress = stepper, wizard steps, step indicator, step bar
action bar = footer, buttons, Back, Publish, Save
publish = Publish, Save, Publish changes, Publish without rules, Save without rules, publish dialog
"Check rules again" = secondary action, Back to test
Personal ID = PID, identity card, Personalausweis
Driving licence = mDL, Führerschein
Date of birth = DOB, birthday, age, "Age today", "(age 19)"
Licence classes = classes, licence categories, class B, BE, C1, "Licence class B – Issue date"
Nationality = citizenship, German, Italian
City or town = city, place of residence
Given name = first name; Family name = surname, last name
status region = live region, aria-live, announcement, toast
keep or discard = unsaved changes dialog, discard changes, "Save changes to Rule 01?"
