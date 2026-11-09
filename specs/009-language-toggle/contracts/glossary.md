# Contract: the German glossary and style of the copy

**Requirements**: FR-013 (one fixed glossary, formal address, KERN's conventions), FR-004,
FR-006, FR-007, FR-014. **Decisions**: research R3, R4. **Status**: to be reviewed by the team
before the German copy is written (FR-013); the review's corrections are applied here first and
then in the code. A term that is not in this table is translated once, added here, and reused.

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
| "Something went wrong" (a `5xx`) | "Etwas ist schiefgelaufen" | plus the error ID line as today |
| loading, "Loading…" | "Wird geladen …" | the design system's text, with the narrow space before the ellipsis as KERN writes it |
| optional | optional | the KERN field hint |
| close | Schließen | |
| cancel / back / next / save | Abbrechen / Zurück / Weiter / Speichern | |
| try again | Erneut versuchen | |
| search | Suchen | the field's placeholder "Search connections" → "Anbindungen durchsuchen" |
| today in Germany (the test day) | heute in Deutschland | "Tested as if shared today, 01.11.2026." → "Getestet, als würde heute geteilt: 01.11.2026." |
| language switch | Sprache | the switch's own labels "DE" / "EN" and its accessible names "Deutsch" / "English" (FR-011) |

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
| N years / months (plural rules) | N Jahre / Monate, 1 Jahr / Monat | |
| on or before / before / after / on or after / on | am oder vor dem / vor dem / nach dem / am oder nach dem / am | `RELATION_WORDS` |
| A, B or C / A, B and C | A, B oder C / A, B und C | `orList`, `listOf` |
| "You need to be at least 21 years old." | "Sie müssen mindestens 21 Jahre alt sein." | proposed messages |
| "You need to live in Stuttgart." | "Sie müssen in Stuttgart wohnen." | |
| "You need a class B or BE licence." | "Sie brauchen einen Führerschein der Klasse B oder BE." | |
| "Your height must be greater than 150." | "Ihre Körpergröße muss größer als 150 sein." | |
| "You need a personal ID that's valid for at least 6 more months." | "Sie brauchen einen Personalausweis, der noch mindestens 6 Monate gültig ist." | |
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

The English column is `backend/app/catalog.py`'s and `option_sets.py`'s labels as of 2026-11-09
(two document types, 56 fields, 6 parts, 294 option values). The full lists are translated in the
code from this table's conventions; a label that this table does not settle is added here first.
