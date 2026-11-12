# Contract: the copy this feature writes

**Requirements**: FR-008, FR-009, FR-011 to FR-014, FR-025, FR-027, FR-034, FR-036, FR-041,
FR-043, FR-044, FR-047, FR-055, FR-058, FR-060, FR-061, FR-065, FR-066, FR-071, FR-079.
**Decisions**: the spec's Clarifications 2026-11-10 #11 to #18, the audit's W1 to W18
([../figma-audit/report.md](../figma-audit/report.md)), research R11.

## Rules

1. **A frame's English is used word for word** (FR-071), and so is every sentence the spec words
   (FR-001 to FR-082 and the Clarifications). They are not repeated here: a task reads the frame or
   the requirement.
2. **This file holds what neither draws nor words**: the texts of the states built without frames.
   Their English is binding as written here; a task that needs another wording changes this file
   first.
3. **German** follows [spec 009's glossary](../../009-language-toggle/contracts/glossary.md): §1's
   style (formal "Sie", infinitive buttons, „…“), and §2's terms, which gain the terms of §1 below
   in the first task that uses them. The German of the frames' and the spec's sentences is written
   in the task that makes the copy table, from the glossary, as in spec 009; the German given here
   is binding for the terms and a proposal for the sentences.
4. **Where texts live**: the website's in `defineTexts(en, de)` tables in the sibling
   `constants.ts`; the server's as `Text(en, de)`; the activity's sentences in the frontend (the
   server sends the kind, never a sentence) and, in English, in `mcp/src/`; the example's content
   in `backend/app/example.py`. Dates read `DD.MM.YYYY` and `DD.MM.YYYY, HH:MM` in both languages
   (FR-020).

## 1. Terms the glossary gains

| English | German | Note |
|---|---|---|
| scheduled (a connection's status); "Scheduled", "Scheduled · 01.12.2026" | geplant; "Geplant", "Geplant · 01.12.2026" | the status pill and the header pill |
| start date; "Change start date", "Save date" | Startdatum; "Startdatum ändern", "Datum speichern" | |
| "Active from" (the choice, the pill, the row); "Now" / "On a date"; "Schedule" (the button) | "Aktiv ab"; "Sofort" / "Ab einem Datum"; "Planen" | "Active from 01.12.2026, 00:00" → "Aktiv ab 01.12.2026, 00:00" |
| "Active since" / "Deactivated since" (the pill); "Published <date>" / "Deactivated <date>" (a row) | "Aktiv seit" / "Deaktiviert seit"; "Veröffentlicht <date>" / "Deaktiviert <date>" | |
| activity; "View activity" / "Hide activity"; "Last edited by"; "Deactivated by" | Aktivität; "Aktivität ansehen" / "Aktivität ausblenden"; "Zuletzt bearbeitet von"; "Deaktiviert von" | the details' third card |
| example; "Start from an example"; "Create the example" | Beispiel; "Mit einem Beispiel beginnen"; "Beispiel erstellen" | |
| selected (overview rows); "2 selected" | ausgewählt; "2 ausgewählt" | as "chosen" for data items |
| restore, restored (a deleted connection) | wiederherstellen, wiederhergestellt | |
| "Move up" / "Move down"; position | "Nach oben" / "Nach unten"; Position | the documents' reorder menu |
| data group names | data-model §6 | the catalog's labels |

## 2. Scheduling (W1 to W8)

| Where | English | German |
|---|---|---|
| "Change start date" on an active connection, "On a date": the hint (FR-009) | "Until that date, citizens can't start a new request. Requests in progress are cancelled." | "Bis zu diesem Datum können Bürgerinnen und Bürger keine neue Anfrage starten. Laufende Anfragen werden abgebrochen." |
| "Activate this connection again?", "On a date": the hint (FR-011) | "The connection becomes active again on the date you choose. Until then, its links don't work." | "Die Anbindung wird am gewählten Datum wieder aktiv. Bis dahin funktionieren ihre Links nicht." |
| The same dialog's busy label with a date | "Scheduling…" | "Wird geplant …" |
| The deactivate dialog for a scheduled connection: the sentence (FR-012) | "This connection will be active from <date>. If you deactivate it, it won't become active and its links won't work. You can activate it again later." | "Diese Anbindung ist ab <date> aktiv. Wenn Sie sie deaktivieren, wird sie nicht aktiv und ihre Links funktionieren nicht. Sie können sie später wieder aktivieren." |
| The same dialog's cancel button | "Keep scheduled" | "Geplant lassen" |
| "Save changes?" for a scheduled connection: the sentence (FR-013) | "Your changes become active with the connection on <date>. Citizens can't use it before then." | "Ihre Änderungen werden mit der Anbindung am <date> aktiv. Vorher können Bürgerinnen und Bürger sie nicht nutzen." |
| The toast after "Activate again" on a date | "Connection scheduled for <date>." | "Anbindung für den <date> geplant." |
| "Change start date": the failure's title | "Couldn’t save the start date" | "Das Startdatum konnte nicht gespeichert werden" |
| "Change start date": the sentence when no answer came (FR-014) | "Couldn’t save the start date, so nothing has changed. Check your internet connection and try again." | "Das Startdatum konnte nicht gespeichert werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." (changed 2026-11-11, T026: "daher" as the glossary's "Couldn’t publish, so nothing has changed.") |
| "Activate this connection again?": the sentence when no answer came (FR-014) | "Couldn’t reactivate, so nothing has changed. Check your internet connection and try again." | "Die Anbindung konnte nicht reaktiviert werden, daher hat sich nichts geändert. Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." (added 2026-11-11, T027; with a date too, as its title "Couldn’t reactivate") |
| The date field's label for screen readers (the frame draws the placeholder only) | "Start date (DD.MM.YYYY)" | "Startdatum (TT.MM.JJJJ)" |

The toast after every change of a start date is the spec's "Start date saved." (FR-008), also when
"Now" made the connection active. After "Schedule" in the publish dialog the status texts stay
"Publishing…" and "Published": the connection is published (FR-014).

## 3. Activity (W10)

One row is "date and time · event · person". The events, by `kind` (data-model §2.2):

| Kind | English | German |
|---|---|---|
| `created` | "Created" (drawn) | "Erstellt" |
| `renamed` | "Name changed" | "Name geändert" |
| `description_changed` | "Description changed" | "Beschreibung geändert" |
| `documents_changed` | "Documents changed" (drawn) | "Dokumente geändert" |
| `variant_added` | "Variant added: <name>" (drawn) | "Variante hinzugefügt: <name>" |
| `variant_removed` | "Variant removed: <name>" | "Variante entfernt: <name>" |
| `variant_renamed` | "Variant renamed: <name>" (the new name) | "Variante umbenannt: <name>" |
| `rules_changed` | "Rules changed in <variant>" (drawn) | "Regeln in <variant> geändert" |
| `published` | "Published" (drawn) | "Veröffentlicht" |
| `scheduled` | "Scheduled for <date>" | "Geplant für den <date>" |
| `start_date_changed`, a date | "Start date changed to <date>" | "Startdatum auf den <date> geändert" |
| `start_date_changed`, now | "Start date changed to now" | "Startdatum auf sofort geändert" |
| `became_active` | "Became active" | "Aktiv geworden" |
| `deactivated` | "Deactivated" (drawn) | "Deaktiviert" |
| `reactivated` | "Activated again" | "Wieder aktiviert" |
| `deleted` / `restored` | "Deleted" / "Restored" | "Gelöscht" / "Wiederhergestellt" |

| Where | English | German |
|---|---|---|
| The person, a team member | "<name>" | "<name>" |
| The person, an agent's change (FR-027) | "<name> with <agent>" | "<name> mit <agent>" |
| The person, an approved request (FR-027) | "<name>, asked by <agent>" | "<name>, angefragt von <agent>" |
| The closed line without a person (FR-032) | "Last edited · <date>, <time>" | "Zuletzt bearbeitet · <date>, <time>" |
| The closed line, deactivated, without a person | "Deactivated · <date>, <time>" | "Deaktiviert · <date>, <time>" |
| The list's name for screen readers | "Activity, newest first" | "Aktivität, neueste zuerst" |
| Loading the list; loading earlier entries | "Loading activity…"; "Loading earlier activity…" | "Aktivität wird geladen …"; "Frühere Aktivität wird geladen …" |
| The list could not be loaded | "Couldn’t load the activity" with "Try again" | "Die Aktivität konnte nicht geladen werden" |
| Its body when no answer came (the Summary's sentence, reused; T033) | "Check your connection and try again." | "Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." |

## 4. Undo and bulk delete (W11, W12)

| Where | English | German |
|---|---|---|
| The toast after "Undo" (FR-034, the spec's) | "“<name>” restored." | "„<name>“ wiederhergestellt." |
| The toast after a late or second "Undo" (FR-036, the spec's) | "“<name>” can no longer be restored." | "„<name>“ kann nicht mehr wiederhergestellt werden." |
| The toast after a bulk deletion (FR-044, the spec's) | "<n> connections deleted." | "<n> Anbindungen gelöscht." |
| The toast after its "Undo" | "<n> connections restored." | "<n> Anbindungen wiederhergestellt." |
| The toast after its late or second "Undo" | "The connections can no longer be restored." | "Die Anbindungen können nicht mehr wiederhergestellt werden." |
| The toast when "Undo" got no answer or a server failure; its action stays "Undo" | "Couldn’t restore. Try again." | "Wiederherstellen nicht möglich. Versuchen Sie es erneut." |
| A row's checkbox, for screen readers (FR-038) | "Select “<name>”" | "„<name>“ auswählen" |
| The select-all checkbox, for screen readers | "Select all connections" | "Alle Anbindungen auswählen" |
| The bulk dialog's warning line for a scheduled connection (FR-041) | "<name> is scheduled for <date>. It won’t become active." | "<name> ist für den <date> geplant. Sie wird nicht aktiv." |
| The bulk dialog when a connection changed (FR-043, the spec's) | "Nothing was deleted: “<name>” was deleted or changed in the meantime." | "Nichts wurde gelöscht: „<name>“ wurde inzwischen gelöscht oder geändert." |

Several active connections get one drawn line each ("<name> is active. Citizens won’t be able to
use it."), in the list's order; there is no combined line.

## 5. Document order and data groups (W13, W18)

| Where | English | German |
|---|---|---|
| The row's ⋯ button, for screen readers | "Move <document>" | "<document> verschieben" |
| Its entries (FR-047) | "Move up", "Move down" | "Nach oben", "Nach unten" |
| The announcement after a move, by menu or by drag (the spec's) | "“<document>” moved to position <n> of <m>." | "„<document>“ auf Position <n> von <m> verschoben." |
| The question before a group's data that a rule checks is cleared: the title (FR-079) | "Stop requesting “<group>” data from <document>?" | "Felder der Gruppe „<group>“ aus <document> nicht mehr anfordern?" |

The rest of that question (the rules it names, "Cancel", "Stop requesting") is the "All data
items" question's, unchanged. A group's checkbox is named by its heading.

## 6. The example (W15)

| Where | English | German |
|---|---|---|
| Creating failed: the dialog's failure title | "Couldn’t create the example" | "Das Beispiel konnte nicht erstellt werden" |
| The dialog's busy label | "Creating…" | "Wird erstellt …" |
| The dialog's body (1g `6793:47710`) | "This creates a draft called “Passenger transport licence (example)” with 2 documents and 2 rules. It only becomes active when you publish." | "Dadurch wird ein Entwurf namens „Personenbeförderungsschein (Beispiel)“ mit 2 Dokumenten und 2 Regeln erstellt. Er wird erst aktiv, wenn Sie ihn veröffentlichen." (T067: each language names the example as it will be created) |
| Creating failed with no answer: the alert's body | "Check your connection and try again." (the overview's) | "Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut." (T067) |
| The publish dialog's line (S14, `7137:50210`) | "This is still the example. Check that the name, documents and rules fit your service." | "Dies ist noch das Beispiel. Prüfen Sie, ob Name, Dokumente und Regeln zu Ihrem Dienst passen." (T068) |
| The banner on step 1, the documents step and the test step (C4) | "This is an example. Change anything to see how it works." | "Dies ist ein Beispiel. Ändern Sie, was Sie möchten, um zu sehen, wie es funktioniert." (T066) |
| The banner on the rules step for Standard (C4) | "Try changing the age to 18 or adding a rule. Then use Test rules to check the result." | "Versuchen Sie, das Alter auf 18 zu ändern oder eine Regel hinzuzufügen. Prüfen Sie das Ergebnis dann mit „Regeln testen“." (T066) |

The example's own texts are content, created in the language of the request and stored (FR-061):

| Part | English | German |
|---|---|---|
| Name | "Passenger transport licence (example)" | "Personenbeförderungsschein (Beispiel)" |
| Description | "Licence to drive taxis, rental cars and ambulances. Checks age and driving experience." | "Erlaubnis zum Fahren von Taxis, Mietwagen und Krankenwagen. Prüft Alter und Fahrpraxis." |
| The variant's name and description | "Ambulance"; "For ambulance services. Some rules differ from Standard." | "Krankentransport"; "Für Krankentransporte. Einige Regeln weichen von Standard ab." |
| Rule 01's message, Standard / the variant | "You need to be at least 21 years old." / "… 19 years old." | "Sie müssen mindestens 21 Jahre alt sein." / "… 19 Jahre alt sein." |
| Rule 02's message, Standard / the variant | "You need to have held a class B driving licence for at least 2 years." / "… for at least 1 year." | "Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B besitzen." / "… seit mindestens 1 Jahr …" |

"Standard", "Rule 01" and "Rule 02" stay as stored names in both languages (spec 009, FR-007). The
variant's banner (FR-058) shows on a variant that carries the example variant's name in either
language (research R7) and reads, in German, "Krankentransport ist weniger streng als Standard.
Rule 01 und Rule 02 sind hier geändert.". The sentence names the variant by its stored name
("<variant> is more lenient than Standard. Rules 01 and 02 are changed here." / "<variant> ist
weniger streng als Standard. Rule 01 und Rule 02 sind hier geändert."), so that an example created
in German and read in English names "Krankentransport", as its tab does (the coordinator, phase 9,
T066's UNCERTAIN 2; design-notes §4.2).

## 7. The approval page (W14)

| Where | English | German |
|---|---|---|
| `publish`, `reactivate` without a date | "The connection goes live at once." | "Die Anbindung wird sofort aktiv." |
| `publish`, `reactivate`, `set_start_date` with a date (the spec's) | "Active from <date>" | "Aktiv ab <date>" |
| `set_start_date`: the title, with and without a name | "Change the start date of ‘<name>’?" / "Change the start date?" | "Startdatum von „<name>“ ändern?" / "Startdatum ändern?" |
| `set_start_date` for an active connection: the sentence (FR-065) | "Until then its links stop working, and requests in progress are cancelled." | "Bis dahin funktionieren die Links nicht, und laufende Anfragen werden abgebrochen." |
| `set_start_date` to now | "The connection goes live at once." | "Die Anbindung wird sofort aktiv." |
| Done: `publish` with a date | "Published and scheduled for <date>." | "Veröffentlicht und für den <date> geplant." |
| Done: `reactivate` with a date | "Connection scheduled for <date>." | "Anbindung für den <date> geplant." |
| Done: `set_start_date` | "Start date saved." | "Startdatum gespeichert." |
| Cancelled: the connection became active (FR-066) | "The connection became active in the meantime." | "Die Anbindung ist inzwischen aktiv geworden." |
| Cancelled: its date moved (FR-066) | "The connection's start date changed in the meantime." | "Das Startdatum der Anbindung wurde inzwischen geändert." |
| Cancelled: `start_date_passed` (FR-065) | "The start date is no longer after today. The agent can ask again with a new date." | "Das Startdatum liegt nicht mehr nach dem heutigen Tag. Der Agent kann mit einem neuen Datum erneut fragen." |

Deactivating and deleting a scheduled connection use §2's deactivate sentence and FR-010's delete
sentence; the example's line is FR-060's.

## 8. The server's texts (`Text(en, de)`)

| Code | English | German |
|---|---|---|
| `invalid_start_date` (`400`; the spec's) | "Enter a date after today." | "Geben Sie ein Datum nach dem heutigen Tag ein." |
| `selection_changed` (`409`) | "Nothing was deleted: a connection was deleted or changed in the meantime." | "Nichts wurde gelöscht: Eine Anbindung wurde inzwischen gelöscht oder geändert." |
| `not_restorable` (`409`) | "This can no longer be restored." | "Das kann nicht mehr wiederhergestellt werden." |
| `not_allowed`, `reactivate` on a scheduled connection | "This connection is scheduled. Change its start date instead." | "Diese Anbindung ist geplant. Ändern Sie stattdessen das Startdatum." |
| `not_allowed`, `set_start_date` on a deactivated connection | "This connection is deactivated. Reactivate it instead." | "Diese Anbindung ist deaktiviert. Reaktivieren Sie sie stattdessen." |
| `not_allowed`, `set_start_date` with the date it has | "This connection is already scheduled for that date." | "Diese Anbindung ist bereits für dieses Datum geplant." |

The website shows the field's error for `invalid_start_date` from its own table, and the bulk
dialog and the toasts build their sentences from the names they hold; the server's messages are
what an agent or another client reads. What the MCP server words itself is in
[mcp-tools.md](mcp-tools.md), in English only.
