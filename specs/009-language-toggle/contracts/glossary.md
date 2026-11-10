# Contract: the German glossary and style of the copy

**Requirements**: FR-013 (one fixed glossary, formal address, KERN's conventions), FR-004,
FR-006, FR-007, FR-014. **Decisions**: research R3, R4. **Status**: **accepted as written by the
user on 2026-11-09**, in place of the team review FR-013 asks for, because no one is available to
review it; this counts as the team's decision (design-notes §3.1). Corrections come from the
review of the German screens in the running app (SC-006) and are applied here first and then in
the code. A term that is not in this table is translated once, added here, and reused.

This glossary binds all four sources of copy (the website, the server, the rules logic and the
design system's texts). The English column is spec 008's copy, word for word (FR-014); the
German column is the one translation of the term everywhere it appears.

## 1. Style

| Rule | German |
|---|---|
| Address | Formal "Sie" everywhere, including dialogs, toasts and screen-reader texts; never "du". The imperative of buttons and menu entries is the infinitive ("Speichern", "Löschen", "Link kopieren"), as KERN's components use it |
| Tone | KERN and the public administration's conventions: short sentences, active voice, one idea per sentence, no exclamation marks, no filler ("bitte" only where the English says "please") |
| Gender | Neutral forms: "Teammitglied", "Antragstellende", "Person"; "Bürgerinnen und Bürger" where a noun is needed; never an asterisk, colon or slash form |
| Capitalisation | German nouns capitalised; buttons and labels in sentence case as in English ("Regel speichern", not "Regel Speichern") |
| Quotes and apostrophes | German quotation marks „…“ around quoted values ("contains "X"" → „X“); the typographic apostrophe ’ where German needs one (rare) |
| Dates | `dd.mm.yyyy` where spec 008 fixed it (the test step), and the German convention elsewhere: "23.10.2005" in rule statements, "9. Nov. 2026" where English shows "9 Nov 2026", "9. November 2026, 14:03" where English shows the long form (research R5) |
| Numbers | As stored; no thousands separators are shown today in either language |
| Identifiers | Unchanged in both languages (FR-007): "Konnekt", "Standard", "Rule 01" / "Group 02" / "Sub-group 03" as stored names, URLs, keys, error IDs, licence class codes ("B", "BE"), ISO country codes where shown |
| Length | German runs about a third longer; where a label must stay short (a pill, a chip, a tab), the glossary's short form is used, never an abbreviation that KERN does not use |

## 2. Product terms

| English (spec 008) | German | Notes |
|---|---|---|
| connection, form connection | Anbindung | "Your connections" → "Ihre Anbindungen"; the wizard step "Connection" → "Anbindung" |
| Konnekt | Konnekt | the product name, never translated |
| variant | Variante | "Standard" stays "Standard" in both |
| Standard (the main variant) | Standard | |
| draft | Entwurf | "Save and exit" (stores a draft) → "Speichern und verlassen" |
| local draft (spec 005) | lokaler Entwurf | "Unsaved work on this device" → "Nicht gespeicherte Arbeit auf diesem Gerät" |
| rule | Regel | |
| group / sub-group | Gruppe / Untergruppe | |
| condition, check (what a rule checks) | Bedingung, Prüfung | "choose a check." → "Wählen Sie eine Prüfung." |
| finding (of the rule checks) | Befund | "Standard has findings" → "Standard hat Befunde" |
| conflicting / redundant / always met | widersprüchlich / redundant / immer erfüllt | the three finding kinds |
| rule checks | Regelprüfung | |
| test step, test (the wizard's step) | Test | the step's name stays "Test" |
| sample citizen, persona | Beispielperson | "Creating 3 sample citizens…" → "3 Beispielpersonen werden erstellt …" |
| citizen (who presents the wallet) | Bürgerin oder Bürger; antragstellende Person | in composed sentences prefer "niemand", "alle" ("no citizen can meet" → "niemand kann … erfüllen") |
| meets / doesn't meet (the rules) | erfüllt / erfüllt nicht | "Not met" → "Nicht erfüllt"; "Couldn't be checked" → "Konnte nicht geprüft werden" |
| message (a rule's citizen message) | Nachricht | "Message Mia reads" → "Nachricht für Mia" |
| document, document type | Dokument, Dokumenttyp | the catalog's names: "Personal ID" → "Personalausweis", "Driving licence" → "Führerschein" |
| field, data (what a rule checks) | Feld, Daten | "choose the data to check." → "Wählen Sie die zu prüfenden Daten." |
| part (of a field) | Bestandteil | "Place of birth – City or town" → "Geburtsort – Ort" |
| option, value | Option, Wert | |
| licence class | Führerscheinklasse | "Licence class B" → "Führerscheinklasse B" |
| publish / published | veröffentlichen / veröffentlicht | |
| active / deactivated / deactivate / reactivate | aktiv / deaktiviert / deaktivieren / reaktivieren | the status pill: "Active" → "Aktiv", "Draft" → "Entwurf", "Deactivated" → "Deaktiviert" |
| revision | Version | |
| delete / discard | löschen / verwerfen | |
| approval request | Freigabeanfrage | "Approve" → "Freigeben", "Decline" → "Ablehnen" |
| agent (an LLM agent of a team member) | Agent | |
| access level | Zugriffsstufe | "Read only" → "Nur lesen"; "Read and edit drafts" → "Lesen und Entwürfe bearbeiten"; "Read, edit drafts and manage live connections" → "Lesen, Entwürfe bearbeiten und aktive Anbindungen verwalten" |
| personal access token | persönliches Zugriffstoken | "Create token" → "Token erstellen" |
| team member | Teammitglied | |
| account, "Your account" | Konto, "Ihr Konto" | |
| sign in / sign out / log in | anmelden / abmelden | the sign-in page's heading follows spec 008's English ("Log in" → "Anmelden") |
| forgot password | Passwort vergessen | |
| overview | Übersicht | |
| details | Details | |
| wizard steps: Connection, Documents, Rules, Test | Anbindung, Dokumente, Regeln, Test | "Step n of 4" → "Schritt n von 4" |
| wallet, EUDI Wallet | Wallet, EUDI-Wallet | |
| serviceBW | serviceBW | |
| link, "Copy link" | Link, "Link kopieren" | |
| error ID | Fehler-ID | shown unchanged after the message |
| "Something went wrong" (a `5xx`) | "Etwas ist schiefgelaufen" | plus the error ID line as today; the server's full `5xx` text "Something went wrong on our side. Contact an administrator and give them the error ID." → "Etwas ist auf unserer Seite schiefgelaufen. Wenden Sie sich an eine Administratorin oder einen Administrator und nennen Sie die Fehler-ID." (T008) |
| administrator | Administratorin oder Administrator | the neutral pair (§1 "Gender"); added 2026-11-09, T008 |
| "Invalid request payload" (the server's generic `400`) | "Ungültige Anfrage." | added 2026-11-09, T008 |
| loading, "Loading…" | "Wird geladen …" | a space before the ellipsis, as in the German column here (KERN's kit itself writes "Wird geladen..."; corrected 2026-11-09, T005) |
| optional | optional | the KERN field hint |
| the kit's field texts: "Please check your input.", Day / Month / Year | "Bitte überprüfen Sie Ihre Eingabe.", Tag / Monat / Jahr | `KERN_TRANSLATIONS` (T005, added 2026-11-09); the kit's own default for the first is "Bitte prüfen Sie Ihre Angaben." |
| close | Schließen | |
| cancel / back / next / save | Abbrechen / Zurück / Weiter / Speichern | |
| try again | Erneut versuchen | |
| search | Suchen | the field's placeholder "Search connections" → "Anbindungen durchsuchen" |
| today in Germany (the test day) | heute in Deutschland | "Tested as if shared today, 01.11.2026." → "Getestet, als würde heute geteilt: 01.11.2026." |
| main variant, main branch (the server's word) | Hauptvariante | "The rules need exactly one main branch." → "Die Regeln brauchen genau eine Hauptvariante."; "Standard" stays the name (added 2026-11-09, T015) |
| identifier (of a rule or group) | Kennung | "an invalid identifier" → "eine ungültige Kennung" (added 2026-11-09, T015) |
| error message (a rule's or group's message, as the server's validation names it) | Fehlermeldung | "has no error message." → "hat keine Fehlermeldung." (added 2026-11-09, T015) |
| result link (a variant's pull URL) | Ergebnislink | "with a new result link" → "mit einem neuen Ergebnislink" (added 2026-11-09, T015) |
| requested (data or documents a connection asks for) | angefordert | "data that’s no longer requested" → "Daten, die nicht mehr angefordert werden" (added 2026-11-09, T015) |
| reload the connection and try again | Laden Sie die Anbindung neu und versuchen Sie es erneut. | (added 2026-11-09, T015) |
| out of step (a variant) | nicht auf dem Stand (von …) | "The variant Taxi is out of step with Standard." → "Die Variante Taxi ist nicht auf dem Stand von Standard."; without a main variant "… ist nicht auf dem aktuellen Stand." (added 2026-11-09, T015) |
| can have at most N characters | darf höchstens N Zeichen lang sein | for a name, description or message; "can have at most N variants / rules and groups" → "kann höchstens N Varianten / Regeln und Gruppen haben" (added 2026-11-09, T015) |
| kept for the rule numbered 08 (a reserved default name) | für die Regel mit der Nummer 08 reserviert | "Rule 08 is kept for the rule numbered 08." → "Rule 08 ist für die Regel mit der Nummer 08 reserviert." (added 2026-11-09, T015) |
| sign in to continue (the `401`) | Melden Sie sich an, um fortzufahren | "Sign in to continue" → "Melden Sie sich an, um fortzufahren" (added 2026-11-09, T016/T017/T018) |
| agent access (the user page's rows) | Agentenzugriff | "Agent access not found" → "Agentenzugriff nicht gefunden" (added 2026-11-09, T016/T017/T018) |
| endpoint | Endpunkt | "This endpoint is for agents." → "Dieser Endpunkt ist für Agenten." (added 2026-11-09, T016/T017/T018) |
| fictitious citizens (the access level's text) | fiktive Personen | "test fictitious citizens" → "fiktive Personen testen" (added 2026-11-09, T016/T017/T018) |
| approval (a team member's, of an agent's request) | Freigabe | "Each of these needs your approval here." → "Dafür ist jeweils hier Ihre Freigabe nötig." (added 2026-11-09, T016/T017/T018) |
| request (an approval request, short) | Anfrage | "You declined this request." → "Sie haben diese Anfrage abgelehnt."; "ask again" → "erneut fragen" (added 2026-11-09, T016/T017/T018) |
| cancelled / revoked / ended (a request, an agent's access) | abgebrochen / widerrufen / abgelaufen | "so this request was cancelled" → "daher wurde diese Anfrage abgebrochen" (added 2026-11-09, T016/T017/T018) |
| in the meantime | in der Zwischenzeit | (added 2026-11-09, T016/T017/T018) |
| "Done." (an approval request's outcome) | "Erledigt." | (added 2026-11-09, T016/T017/T018) |
| client (an agent's OAuth client) | Client | "The client is unknown." → "Der Client ist unbekannt."; `client_id` stays as written (added 2026-11-09, T016/T017/T018) |
| metadata document (a Client ID Metadata Document) | Metadatendokument | (added 2026-11-09, T016/T017/T018) |
| redirect URI | Weiterleitungs-URI | (added 2026-11-09, T016/T017/T018) |
| code challenge | Code-Challenge | "S256" stays (added 2026-11-09, T016/T017/T018) |
| resource, scope (OAuth) | Ressource, Scope | the scope words `read`, `drafts`, `manage` stay (added 2026-11-09, T016/T017/T018) |
| MCP server | MCP-Server | "Konnekt's MCP server" → "der MCP-Server von Konnekt" (added 2026-11-09, T016/T017/T018) |
| wallet service (EUDIPLO, as the messages name it) | Wallet-Dienst | (added 2026-11-09, T016/T017/T018) |
| request configuration | Anfragekonfiguration | (added 2026-11-09, T016/T017/T018) |
| "Try again in a moment." | "Versuchen Sie es in einem Moment erneut." | the sentence; the button stays "Erneut versuchen" (added 2026-11-09, T016/T017/T018) |
| cursor (of the search's pages) | Cursor | "Unknown cursor." → "Unbekannter Cursor." (added 2026-11-09, T016/T017/T018) |
| language switch | Sprache | the switch's own labels "DE" / "EN" and its accessible names "Deutsch" / "English" (FR-011) |
| remove (an item from a based variant) / removed | entfernen / entfernt | "Rule 01 is removed in Ambulance. Restore it first." → "Rule 01 ist in Ambulance entfernt. Stellen Sie sie zuerst wieder her." ("sie": Regel, Gruppe and Untergruppe are all feminine) (added 2026-11-09, T023) |
| restore (a removed item) | wiederherstellen | "there is nothing to restore" → "es gibt nichts wiederherzustellen" (added 2026-11-09, T023) |
| reset (to the main variant) | zurücksetzen | "nothing to reset or restore" → "nichts zurückzusetzen oder wiederherzustellen" (added 2026-11-09, T023) |
| follows (an inherited item follows the main variant) / changed (an item a variant changed) | folgt / geändert | "isn’t changed: it follows Standard already" → "ist nicht geändert und folgt bereits Standard" (added 2026-11-09, T023) |
| based on (a variant based on the main variant) | basiert auf | "Taxi isn’t based on Standard" → "Taxi basiert nicht auf Standard" (added 2026-11-09, T023) |
| group / ungroup (the actions) | gruppieren / die Gruppierung aufheben | "it can only be ungrouped in Standard" → "die Gruppierung kann nur in Standard aufgehoben werden" (added 2026-11-09, T023) |
| level (of the rules' tree) | Ebene | "two or more rules of one level" → "zwei oder mehr Regeln einer Ebene" (added 2026-11-09, T023) |
| copy (a rule to a variant) | kopieren | "Choose another variant to copy Rule 01 to." → "Wählen Sie eine andere Variante, in die Rule 01 kopiert werden soll." (added 2026-11-09, T023) |
| a sample citizen's (the possessive "Mia’s") | von Mia (after the noun, no genitive) | "Mia’s data" → "Daten von Mia"; "Your changes to Mia’s and Anna’s data" → "Ihre Änderungen an den Daten von Mia und Anna" (added 2026-11-09, T028) |
| generate (a sample citizen's data) / add (data a fill run adds) | erstellen / ergänzen | "Generate new data for Mia?" → "Neue Daten für Mia erstellen?"; "Adding new data for Mia…" → "Neue Daten für Mia werden ergänzt …" (added 2026-11-09, T028) |
| edited (a sample citizen's value the team member changed) | bearbeitet | the hidden text ", edited" → ", bearbeitet" (added 2026-11-09, T028) |
| valid until / since (a date on the data card) | gültig bis / seit | "Valid until 19.08.2040" → "Gültig bis 19.08.2040"; "B, BE since 02.05.2010" → "B, BE seit 02.05.2010" (added 2026-11-09, T028) |
| without testing | ohne zu testen | "Try again, or publish without testing." → "Versuchen Sie es erneut oder veröffentlichen Sie, ohne zu testen." ("speichern Sie" when editing) (added 2026-11-09, T028) |

## 3. The operators and composed phrases of the rules (FR-006)

The German phrases below are the vocabulary the composers of research R4 use; the sentence
templates themselves are in the code, one per language, with their tests.

| English | German | Where |
|---|---|---|
| is greater than / is less than / is equal to / is not equal to | ist größer als / ist kleiner als / ist gleich / ist ungleich | number statements |
| contains / doesn't contain | enthält / enthält nicht | text statements |
| matching letter case / ignoring letter case | Groß-/Kleinschreibung beachtet / Groß-/Kleinschreibung ignoriert | the statement's tail |
| includes one of / includes none of | enthält eines von / enthält keines von | option statements |
| is before / is after / is (a date) / is exactly | liegt vor dem / liegt nach dem / ist der / ist genau | date statements |
| is at least N years old / years ago / from now | ist mindestens N Jahre alt / liegt mindestens N Jahre zurück / liegt mindestens N Jahre in der Zukunft | the date-of-birth and date-distance forms |
| is less than N years old / years ago / from now | ist weniger als N Jahre alt / liegt weniger als N Jahre zurück / liegt weniger als N Jahre in der Zukunft | the same forms (added 2026-11-09, T023) |
| is at least / is less than / is exactly (the "Time ago" operators' labels alone) | ist mindestens / ist weniger als / ist genau | `OPERATOR_LABELS`, keyed by kind and operator, not by field: the Date of birth's age form ("ist mindestens 21 Jahre alt") (added 2026-11-09, T023) |
| is at least / is less than (the "Time from now" operators' labels alone) | liegt mindestens / liegt weniger als | `OPERATOR_LABELS`, before "… in der Zukunft" (added 2026-11-09, T023) |
| N years / months (plural rules) | N Jahre / Monate, 1 Jahr / Monat | |
| on or before / before / after / on or after / on | am oder vor dem / vor dem / nach dem / am oder nach dem / am | `RELATION_WORDS` |
| is exactly N years old / years ago | ist genau N Jahre alt / liegt genau N Jahre zurück | the same forms; a statement on a date that isn't the Date of birth says "liegt mindestens / weniger als / genau", the age "ist …" (`STATEMENT_TEXTS.yearsAgoWords`) (added 2026-11-09, T024) |
| matching letter case / ignoring letter case, after a quoted text | „Stuttgart“, Groß-/Kleinschreibung beachtet / ignoriert | the statement's tail after a comma, the value in German quotes (added 2026-11-09, T024) |
| born on or before 23.10.2005 / between 24.10.2004 and 23.10.2005 (the date example) | geboren am oder vor dem 23.10.2005 / zwischen dem 24.10.2004 und dem 23.10.2005 | `boundaryPhrase` (`DATE_TEXTS`) (added 2026-11-09, T024) |
| A, B or C / A, B and C | A, B oder C / A, B und C | `orList`, `listOf` |
| "You need to be at least 21 years old." | "Sie müssen mindestens 21 Jahre alt sein." | proposed messages |
| "You need to live in Stuttgart." | "Sie müssen in Stuttgart wohnen." | |
| "You need a class B or BE licence." | "Sie brauchen einen Führerschein der Klasse B oder BE." | |
| "Your height must be greater than 150." | "Ihre Körpergröße muss größer als 150 sein." | |
| "You need a personal ID that's valid for at least 6 more months." | "Sie brauchen einen Personalausweis, der noch mindestens 6 Monate gültig ist." | |
| N years / months after "for" and "in" (holding, expiring) | seit / in N Jahren / Monaten, 1 Jahr / Monat | the dative plural (`TIME_UNITS.otherDative`) (added 2026-11-09, T025) |
| "You must not live in Esslingen." / "You need to be born in Köln." / "You must not have been born in Köln." | "Sie dürfen nicht in Esslingen wohnen." / "Sie müssen in Köln geboren sein." / "Sie dürfen nicht in Köln geboren sein." | proposed messages, the negations (added 2026-11-09, T025) |
| "You must not hold a class C licence." | "Sie dürfen keinen Führerschein der Klasse C besitzen." | (added 2026-11-09, T025) |
| "You need the nationality of Germany or Austria." / "You must not be a national of France." | "Sie brauchen die Staatsangehörigkeit von Deutschland oder Österreich." / "Sie dürfen nicht die Staatsangehörigkeit von Frankreich besitzen." | (added 2026-11-09, T025) |
| "You need a personal ID issued in Germany." / "Your personal ID must not have been issued in France." | "Sie brauchen einen Personalausweis, der in Deutschland ausgestellt wurde." / "Ihr Personalausweis darf nicht in Frankreich ausgestellt worden sein." | (added 2026-11-09, T025) |
| "You need to be under 18 years old." / "You need to be exactly 18 years old." | "Sie müssen jünger als 18 Jahre sein." / "Sie müssen genau 18 Jahre alt sein." | (added 2026-11-09, T025) |
| "You need to be born before / after / on 01.01.2000." | "Sie müssen vor dem / nach dem / am 01.01.2000 geboren sein." | `RELATION_WORDS` (added 2026-11-09, T025) |
| "You need to have held a class B driving licence for at least / less than / exactly 2 years." | "Sie müssen seit mindestens / weniger als / genau 2 Jahren einen Führerschein der Klasse B besitzen." | (added 2026-11-09, T025) |
| "You need a personal ID that expires in less than 1 year." / "You need a class C licence that's valid for at least 1 more month." | "Sie brauchen einen Personalausweis, der in weniger als 1 Jahr abläuft." / "Sie brauchen einen Führerschein der Klasse C, der noch mindestens 1 Monat gültig ist." | (added 2026-11-09, T025) |
| "Your family name must (not) be / must (not) contain "Müller"." | "Ihr Familienname muss „Müller“ sein / darf nicht „Müller“ sein / muss „Müller“ enthalten / darf „Müller“ nicht enthalten." | plain fields: "Ihr" / "Ihre" by the German label's gender; a number "muss größer als / kleiner als 180 sein", "darf nicht 180 sein" (added 2026-11-09, T025) |
| "The region of your place of birth …" / "The issue date of your driving licence …" / "The expiry date of your class B …" | "Die Region Ihres Geburtsorts …" / "Das Ausstellungsdatum Ihres Führerscheins …" / "Das Ablaufdatum Ihrer Klasse B …" | the article by the label's gender, the document in the genitive (added 2026-11-09, T025) |
| "… must be before 01.01.2020." / "… must be 01.01.2020." / "… must be at least 2 years ago." / "… must be at least 3 months from now." | "… muss vor dem 01.01.2020 liegen." / "… muss der 01.01.2020 sein." / "… muss mindestens 2 Jahre zurückliegen." / "… muss mindestens 3 Monate in der Zukunft liegen." | dates of other fields (added 2026-11-09, T025) |
| a field whose German label has no known gender (an adjective first, two nouns, a field added later) | Das Feld „Ausstellende Behörde“ … | the messages' fallback subject; an unknown document "des Dokuments „…“" (added 2026-11-09, T025) |
| "Can't be met together with Rule 02." | "Kann nicht zusammen mit Rule 02 erfüllt werden." | findings (stored names stay) |
| "Same as Rule 03. You can delete one of them." | "Gleich wie Rule 03. Sie können eine der beiden löschen." | |
| "Every citizen meets this rule." | "Alle erfüllen diese Regel." | |
| "Right now, no citizen can meet the rules of Standard." | "Derzeit kann niemand die Regeln von Standard erfüllen." | |
| "2 rules contradict each other, and 1 rule is a duplicate" | "2 Regeln widersprechen einander, und 1 Regel ist ein Duplikat" | counts |
| "Mia Schulz: meets the rules of Standard" | "Mia Schulz: erfüllt die Regeln von Standard" | persona chips |
| "Result: doesn't meet 2 rules" | "Ergebnis: erfüllt 2 Regeln nicht" | |
| "Rules Mia meets" | "Regeln, die Mia erfüllt" | |
| "All of these must be met" / "At least one of these must be met" | "Alle davon müssen erfüllt sein" / "Mindestens eine davon muss erfüllt sein" | group subtitles |
| "Rule 01 in Standard: choose the data to check." | "Rule 01 in Standard: Wählen Sie die zu prüfenden Daten." | validation (server and client, word for word) |
| Conflicting: / Redundant: / Always met: (a kind icon's hidden text) | Widersprüchlich: / Redundant: / Immer erfüllt: | findings; "Redundant:" is the same in both (added 2026-11-09, T026) |
| 1 conflict / 1 duplicate / 1 finding (the tab tooltip's label of a single line) | 1 Widerspruch / 1 Duplikat / 1 Befund | findings (added 2026-11-09, T026) |
| contradict each other / contradicts another / conflicts with | widersprechen einander / widerspricht einer anderen / widerspricht | findings and counts; "Rule 02 conflicts with Rule 01." → "Rule 02 widerspricht Rule 01." (added 2026-11-09, T026) |
| at the moment / right now (a finding that holds only for citizens who share today) | im Moment / derzeit | "Can't be met together with Rule 02 at the moment." → "Kann im Moment nicht zusammen mit Rule 02 erfüllt werden."; "…, so right now no citizen can meet …" → "…, daher kann derzeit niemand … erfüllen." (added 2026-11-09, T026) |
| "Rule 01 and Rule 02 contradict each other, so no citizen can meet the rules of Standard." | "Rule 01 und Rule 02 widersprechen einander, daher kann niemand die Regeln von Standard erfüllen." | the banner's one sentence; "So no citizen can meet …" alone → "Daher kann niemand … erfüllen." (added 2026-11-09, T026) |
| "No citizen can meet the rules of Standard." / "Every citizen meets the rules of Standard." | "Niemand kann die Regeln von Standard erfüllen." / "Alle erfüllen die Regeln von Standard." | notices; after "<variant>: " in the dialog a full sentence: "Niemand kann diese Regeln erfüllen." (added 2026-11-09, T026) |
| neither A nor B … can be met / none of A, B and C … can be met / A … can't be met | weder A noch B … kann erfüllt werden / keine von A, B und C … kann erfüllt werden / A … kann nicht erfüllt werden | a group's own conflict (added 2026-11-09, T026) |
| "Anyone who meets Rule 01 also meets this group. You can delete the group." | "Wer Rule 01 erfüllt, erfüllt auch diese Gruppe. Sie können die Gruppe löschen." | a covered item (added 2026-11-09, T026) |
| is the same as / makes no difference beside / is no longer … | ist gleich wie / macht neben … keinen Unterschied / ist nicht mehr … | lines and announcements: "Rule 06 ist gleich wie Rule 03."; "Rule 01 ist nicht mehr redundant." (added 2026-11-09, T026) |
| (already) covered / covers | (bereits) abgedeckt / deckt … ab | counts "1 Regel ist bereits abgedeckt"; agents "Rule 03 deckt sie bereits ab" (added 2026-11-09, T026) |
| other rules (items without a current name) | andere Regeln; after "mit" or "von": anderen Regeln | (added 2026-11-09, T026) |
| couldn't be checked completely; findings that are certain | konnten nicht vollständig geprüft werden; sichere Befunde | "The rules of Standard couldn't be checked completely. Only findings that are certain are shown." → "Die Regeln von Standard konnten nicht vollständig geprüft werden. Nur sichere Befunde werden angezeigt."; after the counts row " · nicht vollständig geprüft" (added 2026-11-09, T026) |
| loosen / make stricter (agents' resolutions) | lockern / strenger machen | (added 2026-11-09, T026) |
| "Mia Schulz: doesn’t meet the rules of Standard" | "Mia Schulz: erfüllt die Regeln von Standard nicht" | persona chips (added 2026-11-09, T028) |
| "Result: meets the rules" / "Result: doesn’t meet 1 rule" | "Ergebnis: erfüllt alle Regeln" / "Ergebnis: erfüllt 1 Regel nicht" | the result's heading (added 2026-11-09, T028) |
| "Mia Schulz now meets the rules of Standard." / "Mia Schulz no longer meets the rules of Standard." | "Mia Schulz erfüllt jetzt die Regeln von Standard." / "Mia Schulz erfüllt die Regeln von Standard nicht mehr." | the personas' announcements (added 2026-11-09, T028) |
| "Fails a rule:" (a failing value's hidden text) | "Erfüllt eine Regel nicht:" | the data card (added 2026-11-09, T028) |
| "School transport has no rules yet, so every citizen meets it. Add rules in the Rules step to test them." | "School transport hat noch keine Regeln und wird daher von allen erfüllt. Fügen Sie im Schritt „Regeln“ Regeln hinzu, um sie zu testen." | a variant without rules (added 2026-11-09, T028) |
| "Your changes to Mia’s data will be replaced. The other two citizens stay as they are." / "Generate new data for all citizens?" | "Ihre Änderungen an den Daten von Mia werden ersetzt. Die beiden anderen Beispielpersonen bleiben unverändert." / "Neue Daten für alle Beispielpersonen erstellen?" | the question before generating anew (added 2026-11-09, T028) |
| "Creating new data for Mia and Anna…" / "Creating new data for Yusuf. Adding new data for Mia…" | "Neue Daten für Mia und Anna werden erstellt …" / "Neue Daten für Yusuf werden erstellt. Neue Daten für Mia werden ergänzt …" | the loading status (added 2026-11-09, T028) |

## 4. The catalog and the option sets (FR-005)

| English | German |
|---|---|
| Personal ID | Personalausweis |
| Driving licence | Führerschein |
| Date of birth, Date of birth (Age) | Geburtsdatum, Geburtsdatum (Alter) |
| Given name, Family name, Given name at birth, Family name at birth | Vorname, Familienname, Geburtsvorname, Geburtsname |
| Place of birth; its parts Country, Region, City or town ("Place of birth – City or town") | Geburtsort; Land, Region, Ort („Geburtsort – Ort“) |
| Nationality | Staatsangehörigkeit |
| Address (full), City or town, Postal code, State or region, Country | Adresse (vollständig), Ort, Postleitzahl, Bundesland oder Region, Land |
| Resident address, Resident city, Resident postal code, Resident state | Wohnanschrift, Wohnort, Postleitzahl des Wohnorts, Bundesland des Wohnorts |
| Email address, Mobile phone number | E-Mail-Adresse, Mobilnummer |
| Year of birth, Age in years | Geburtsjahr, Alter in Jahren |
| Expiry date, Issue date, Issuing country, Issuing authority, Issuing jurisdiction | Ablaufdatum, Ausstellungsdatum, Ausstellungsland, Ausstellende Behörde, Ausstellende Gebietskörperschaft |
| Document number, Licence number, Administrative number, UN distinguishing sign | Dokumentennummer, Führerscheinnummer, Verwaltungsnummer, Unterscheidungszeichen (UN) |
| Licence classes; its parts Classes, Issue date, Expiry date ("Licence class B – Issue date") | Führerscheinklassen; Klassen, Ausstellungsdatum, Ablaufdatum („Führerscheinklasse B – Ausstellungsdatum“) |
| Sex: Not known, Male, Female, … | Geschlecht: Unbekannt, Männlich, Weiblich, … |
| Eye colour, Hair colour | Augenfarbe, Haarfarbe |
| Height (cm), Weight (kg) | Körpergröße (cm), Gewicht (kg) |
| Photo, Portrait, Portrait capture date, Signature or usual mark | Foto, Lichtbild, Aufnahmedatum des Lichtbilds, Unterschrift oder übliches Zeichen |
| Licence class descriptions ("Cars up to 3.5 t", …) | the German descriptions of the EU licence classes ("Pkw bis 3,5 t", …) |
| Countries | The German short names of the Federal Foreign Office's country list (for example "Deutschland", "Österreich", "Schweiz", "Vereinigtes Königreich", "Vereinigte Staaten"), in the same order as the English list |
| Street (may include the house number), House number, Country of residence, Personal administrative number | Straße (kann die Hausnummer enthalten), Hausnummer, Wohnsitzland, Persönliche Verwaltungsnummer (added 2026-11-09, T009) |
| Resident country | Land des Wohnorts (added 2026-11-09, T009) |
| Family name (national characters), Given name (national characters) | Familienname (nationale Schriftzeichen), Vorname (nationale Schriftzeichen) (added 2026-11-09, T009) |
| Sex (the field's label) | Geschlecht (added 2026-11-09, T009) |
| Licence classes (the label of the part `classes` of the field Licence classes; the catalog's English part label is "Licence classes", not "Classes") | Führerscheinklassen (added 2026-11-09, T009) |
| Sex values: Not known, Male, Female, Other, Inter, Diverse, Open, Not applicable | Unbekannt, Männlich, Weiblich, Anderes, Inter, Divers, Offen, Nicht zutreffend (added 2026-11-09, T014) |
| Eye colours: Black, Blue, Brown, Dichromatic, Grey, Green, Hazel, Maroon, Pink, Unknown | Schwarz, Blau, Braun, Zweifarbig, Grau, Grün, Haselnussbraun, Rotbraun, Rosa, Unbekannt (added 2026-11-09, T014) |
| Hair colours: Bald, Black, Blond, Brown, Grey, Red, Auburn, Sandy, White, Unknown | Kahl, Schwarz, Blond, Braun, Grau, Rot, Kastanienbraun, Rotblond, Weiß, Unbekannt (added 2026-11-09, T014) |
| Licence class descriptions: Mopeds up to 45 km/h, Light motorcycles up to 125 cm³, Motorcycles up to 35 kW, All motorcycles, Quadricycles up to 15 kW, Cars up to 3.5 t, Car with a heavy trailer, Trucks 3.5–7.5 t, C1 with a heavy trailer, Trucks over 3.5 t, C with a heavy trailer, Minibuses up to 16 passengers, D1 with a heavy trailer, Buses, D with a heavy trailer, Tractors up to 40 km/h, Tractors up to 60 km/h | Kleinkrafträder bis 45 km/h, Leichtkrafträder bis 125 cm³, Krafträder bis 35 kW, Krafträder, Vierrädrige Kraftfahrzeuge bis 15 kW, Pkw bis 3,5 t, Pkw mit schwerem Anhänger, Lkw 3,5–7,5 t, C1 mit schwerem Anhänger, Lkw über 3,5 t, C mit schwerem Anhänger, Kleinbusse bis 16 Fahrgäste, D1 mit schwerem Anhänger, Busse, D mit schwerem Anhänger, Zugmaschinen bis 40 km/h, Zugmaschinen bis 60 km/h (added 2026-11-09, T014) |

The English column is `backend/app/catalog.py`'s and `option_sets.py`'s labels as of 2026-11-09
(two document types, 56 fields, 6 parts, 294 option values). The full lists are translated in the
code from this table's conventions; a label that this table does not settle is added here first.
