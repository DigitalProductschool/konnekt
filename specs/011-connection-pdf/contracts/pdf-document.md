# Contract: the PDF file

**Requirements**: FR-007 to FR-027, FR-034 to FR-045. **Decisions**: research R4, R5, R7, R8,
R11. **Reference**: the agreed layout `prototype/published-ids-top.pdf` and
`prototype/draft-ids-top.pdf` (regenerate with `npm install && node make.mjs` in `prototype/`);
where this contract and the prototype differ, this contract wins and
[design-notes.md](../design-notes.md) §5 lists each difference.

## 1. Page and type

| Property | Value |
|---|---|
| Size | A4 portrait, 595.28 × 841.89 pt (FR-043) |
| Margins | left and right 56.69 pt (20 mm), top 84 pt, bottom 52 pt; the body is 481.9 × 705.89 pt |
| Top band (every page) | y 24, height 38, full body width |
| Bottom line (every page) | rule at 841.89 − 52 + 18; the text 8 pt below it |
| Fonts | Fira Sans Regular, Medium, SemiBold; Fira Mono Regular, Medium; the committed TTFs, embedded as subsets with a Unicode map (FR-036, research R7) |
| PDF | version 1.7, `subset: 'PDF/UA'`, `tagged: true`, `displayTitle: true`, `font: null` (no Helvetica), `lang` = `en-GB` or `de-DE`; no `CIDSet` in the embedded fonts (research R5, the PDFKit workaround) |

Sizes and spacing are the prototype's (`make.mjs`); colours are KERN's (design-notes §4).

## 2. Content, in reading order

### Page 1

1. The eyebrow: "Connection details", a draft's "Connection details · Draft for review", drawn
   in capitals without letter spacing (the prototype's 1 pt spacing made text extraction read
   "C O N N E C T I O N"; spike).
2. **H1**: the connection's name, in full, wrapping.
3. The description, when there is one.
4. The status: a pill ("Active", "Deactivated", "Scheduled", "Draft"; the pill's shape and dot
   are artifacts, its word is text) and beside it "as of <generated>", for a scheduled connection
   "as of <generated> · starts on <start date>" (spec 010; the date as "dd.mm.yyyy", FR-035), or,
   for a draft, "Not live yet".
5. The details box, a **Table** with one row per line, the key a **TH** (`scope: Row`):
   "Connection ID" (mono), "Version" (mono, larger), a draft's "Last saved" ("<date> (draft save
   <n>)"), "Generated" ("<date> (Germany)"), "Contents" ("2 documents · 12 data items · 3 variants
   · 12 rules", with singular forms).
6. The note on checking the copy (FR-009): the published or the draft wording (§5).
7. A draft with gaps: the box "To finish before publishing (n)" (**H2**), its sentence, and the
   gaps as an **L** of **LI**/**LBody**, one per gap. Each gap is its own block (research R11),
   so a long list continues on the next page; the box's heading and sentence stay with the first
   gap.

### 1 Links for your service (**H2**)

- Published: the lead ("Add both links to your form. Each one goes in its own field."), then
  - ① "Request link" (**H3**), what it is for, and the URL;
  - ② "Result links" (**H3**), what they are for including the {reference} sentence, then per
    variant in the details' order "Variant · <name>" and its URL.
  - A deactivated connection adds, under the lead, that the links answer "unavailable" until the
    connection is activated again (FR-012).
  - A scheduled connection adds, under the lead, that the links can already be added to the
    service and answer "unavailable" until the connection starts on its start date (FR-012).
- Draft: no URL anywhere (FR-013). A dashed box: "Created when the connection is published and
  active." and "There will be one request link for all variants, and a result link for each
  variant: Standard, Taxi and Hire car."
- URLs are mono text, not link annotations, printed in full, broken only after a "/"
  (`urlLines()`; research R11). A label and its URL form one block; the result links are one
  unit, kept on one page when they fit on one (FR-026), else split between two links.

### 2 Documents and data items (**H2**)

The lead, then per document in the Summary's order a framed block: its name (**H3**) with "<n>
data items", and its data items as an **L** in two columns (the left column first in reading
order). Placeholders: no documents → "No documents yet"; a document without data items → "No data
chosen yet" (the details' texts).

### 3 Rules per variant (**H2**)

The lead, then per variant (a **Sect**):
- **H3** "Variant <name>", the origin badge ("Main variant", "Based on Standard", "Own rules"),
  the description when there is one, and the top-level AND/OR in words ("All rules must be met
  (AND)", "At least one rule must be met (OR)"), with the "Changed here" badge when switched.
- The items in the Summary's order and nesting (`shownItems`), each a **Div**:
  - a rule: its heading (**H4** at the top level, **H5** in a group, **H6** in a sub-group)
    holding the identifier (mono) and the name; its mark badge; the statement; "Message for
    citizens: <message>" when it has one; a draft's "Not complete: <what is missing>";
  - a group: its heading (same levels) with identifier and name, its mark badge, "Group · <AND/OR
    in words>", its members one level deeper, and its own message after the last member.
- Between two items the AND or OR chip (an artifact: the variant's or group's line says it in
  words, research R5).
- Removed items, and the members of a removed or dissolved group: struck through, in the muted
  colour, with "Removed here" in words (FR-017); never told apart by colour alone.
- A variant without rules: "No rules. Anyone who shares the requested documents can apply."

### Every page (artifacts, `Pagination`)

- **Top band**: the name on one line, cut with "…" when it doesn't fit; "Connection ID <id>";
  right-aligned "Version <version>" and "Generated <date>"; a draft's "Draft · Not live" pill
  left of the version (FR-020).
- **Bottom**: from page 2 the page's place ("2 Documents and data items", "3 Rules per variant ›
  Variant Taxi", "… (continued)"; data-model §4) and, on every page, "Page n of N" (FR-021).
- **Watermark** (draft): "DRAFT" rotated −38°, 150 pt SemiBold, the draft blue at 6 % opacity,
  centred. Drawn last, as the prototype does, so that the cards' white and tinted fills don't
  hide it; at 6 % it reads as behind the content and lowers no text's contrast below FR-039's
  4.5:1 (design-notes §4).

## 3. Page breaks (FR-023 to FR-027; research R4)

| Never split | Kept together by |
|---|---|
| a rule (unless taller than a page) | one block |
| a group's header and its first member | `keepWithNext` on the header |
| a group's last member and the group's own message | `keepWithNext` on the last member |
| the AND/OR and the item after it | `keepWithNext` on the connector |
| a heading and what follows it | `keepWithNext` on every heading block |
| a link's label and its URL | one block |
| a document and its data items | one block |

A variant, a group and the result links are units: one that fits on a page but not on the rest
of the current one starts on a new page; a longer one splits between its blocks and the next page
says "(continued)". A rule taller than a page is split by the builder into a head (identifier,
name, mark, the statement up to the values that fit) and continuation blocks of the remaining
values and the message, cut at value boundaries, each at most a page tall (research R11).

## 4. Structure, outline and properties

- **Tags** (FR-036, research R5): `Document` › one `Sect` per part (page 1, the gaps, sections 1
  to 3, a `Sect` per variant inside section 3) › `H1`…`H6`, `P`, `L`/`LI`/`LBody`,
  `Table`/`TR`/`TH`/`TD`, `Div`, `Span`. Reading order is drawing order, which is the order
  above. Every glyph is inside a tag or an artifact.
- **Artifacts** (FR-037): frames, fills, bars, pills' shapes, the step numbers' circles, list
  bullets, the AND/OR chips, the top band, the bottom line and its text, the watermark.
- **Outline** (FR-038): "1 Links for your service", "2 Documents and data items", "3 Rules per
  variant" with one child per variant ("Variant Taxi"), each pointing to the page where it
  starts. A draft's gaps box gets no entry.
- **Document properties** (FR-033, FR-036): `Title` "<name> – Connection details" (a draft's
  "Draft – <name> – Connection details"), shown instead of the file name; `Subject` "Connection
  <id>, version <version>"; `Keywords` "connection <id>; version <version>[; draft]"; `Author`
  and `Creator` "Konnekt"; `Lang`. No custom keys and nothing about who downloaded it.
- **Dates**: "dd.mm.yyyy, hh:mm", 24 hours, Europe/Berlin, in both languages (FR-035).

## 5. Texts

The PDF's own texts are one `defineTexts(en, de)` table, `PDF_TEXTS` in
`frontend/src/utils/connectionPdf/constants.ts`, so spec 009's copy test checks both columns.
Texts the details page already has are reused from `DETAIL_COPY`, not copied, so that the screen
and the file never word the same thing differently: the links' lead, "Request link", the request
link's explanation, the result link's explanation (the PDF adds the {reference} sentence), the
draft's "Created when the connection is published and active.", "No documents yet", "No data
chosen yet", "No rules. Anyone who shares the requested documents can apply.", and the marks'
"Changed here", "Added here", "Removed here" (`BRANCH_MARK_COPY`). Statements, the AND/OR
wording of the rules package and the gaps come from `rules/src/` in the language (spec 009).

The German column is written in the task that creates the table, with spec 009's glossary, and
reviewed with the team in the running app (spec, Assumptions). Terms the glossary lacks are added
there first. The proposal:

| Key | English (the prototype's, adjusted by the spec) | German (proposal, to review) |
|---|---|---|
| eyebrow | Connection details | Details der Anbindung |
| eyebrowDraft | Connection details · Draft for review | Details der Anbindung · Entwurf zur Prüfung |
| statusActive / statusDeactivated / statusScheduled / statusDraft | Active / Deactivated / Scheduled / Draft | Aktiv / Deaktiviert / Geplant / Entwurf |
| asOf(date) | as of {date} | Stand: {date} |
| startsOn(date) | starts on {date} | Start am {date} |
| notLiveYet | Not live yet | Noch nicht aktiv |
| connectionId | Connection ID | Anbindungs-ID |
| version | Version | Version |
| lastSaved / lastSavedValue(date, n) | Last saved / {date} (draft save {n}) | Zuletzt gespeichert / {date} ({n}. Speicherung) |
| generated / generatedValue(date) | Generated / {date} (Germany) | Erstellt / {date} (deutsche Zeit) |
| contents(d, i, v, r) | {d} documents · {i} data items · {v} variants · {r} rules | {d} Dokumente · {i} Felder · {v} Varianten · {r} Regeln |
| checkNote | Every page of this document names the connection and this version. The connection’s details page shows its current version: if they differ, this copy is out of date. | Jede Seite dieses Dokuments nennt die Anbindung und diese Version. Die Detailseite der Anbindung zeigt ihre aktuelle Version. Weichen beide voneinander ab, ist dieses Exemplar veraltet. |
| checkNoteDraft | This draft is for review: it isn’t live, and its links are created only when it’s published. Its details page shows its current version: if they differ, this copy is out of date. Published unchanged, the connection keeps this version, so you can check that what goes live is what was reviewed. | Dieser Entwurf dient zur Prüfung. Er ist nicht aktiv, und seine Links entstehen erst beim Veröffentlichen. Seine Detailseite zeigt seine aktuelle Version. Weichen beide voneinander ab, ist dieses Exemplar veraltet. Wird die Anbindung unverändert veröffentlicht, behält sie diese Version. So können Sie prüfen, ob veröffentlicht wird, was geprüft wurde. |
| gapsTitle(n) | To finish before publishing ({n}) | Vor dem Veröffentlichen zu erledigen ({n}) |
| gapsLead | These parts aren’t finished yet. The draft can be reviewed as it is, but it can only be published once they are. | Diese Teile sind noch nicht fertig. Sie können den Entwurf so prüfen, veröffentlichen lässt er sich aber erst, wenn sie fertig sind. |
| section1 | Links for your service | Links für Ihren Dienst |
| resultLinks | Result links | Ergebnislinks (spec 009's "Ergebnislink", plural) |
| referenceNote | Your service replaces {reference} with the reference the request link returned. | Ihr Dienst ersetzt {reference} durch die Referenz, die der Anfragelink zurückgegeben hat. |
| variantLink(name) | Variant · {name} | Variante · {name} |
| deactivatedLinks | The connection is deactivated: its links answer “unavailable” until it is activated again. | Die Anbindung ist deaktiviert: Ihre Links antworten mit „unavailable“, bis sie wieder aktiviert wird. |
| scheduledLinks(date) | The connection is scheduled: its links can already be added to your service and answer “unavailable” until it starts on {date}. | Die Anbindung ist geplant: Ihre Links können bereits in Ihren Dienst eingefügt werden und antworten mit „unavailable“, bis sie am {date} startet. |
| linksToCreate(list) | There will be one request link for all variants, and a result link for each variant: {list}. | Es wird einen Anfragelink für alle Varianten geben und einen Ergebnislink für jede Variante: {list}. |
| section2 / section2Lead | Documents and data items / The wallet asks the citizen for these documents and shares only these data items with your service. | Dokumente und Felder / Das Wallet fragt die Bürgerin oder den Bürger nach diesen Dokumenten und teilt nur diese Felder mit Ihrem Dienst. |
| dataItems(n) | {n} data items (1 data item) | {n} Felder (1 Feld) |
| section3 / section3Lead | Rules per variant / A citizen’s data meets a variant when its rules are met. Each variant has its own result link. In a variant based on Standard, marks show where it differs from Standard. | Regeln je Variante / Die Daten einer Person erfüllen eine Variante, wenn deren Regeln erfüllt sind. Jede Variante hat ihren eigenen Ergebnislink. In einer Variante auf Basis von Standard zeigen Markierungen, wo sie von Standard abweicht. |
| variant(name) | Variant {name} | Variante {name} |
| originMain / originBased / originEmpty | Main variant / Based on Standard / Own rules | Hauptvariante / Basiert auf Standard / Eigene Regeln |
| combinesAnd / combinesOr | All rules must be met (AND) / At least one rule must be met (OR) | Alle Regeln müssen erfüllt sein (UND) / Mindestens eine Regel muss erfüllt sein (ODER) |
| chipAnd / chipOr | AND / OR | UND / ODER |
| group(combines) | Group · {combines} | Gruppe · {combines} |
| messageLabel | Message for citizens: | Nachricht an die antragstellende Person: |
| notComplete(what) | Not complete: {what} | Nicht vollständig: {what} |
| writeMessage | Write the message for citizens. | Schreiben Sie die Nachricht an die antragstellende Person. |
| draftNotLive | Draft · Not live | Entwurf · Nicht aktiv |
| idLine(id) / versionLine(v) / generatedLine(date) | Connection ID {id} / Version {v} / Generated {date} | Anbindungs-ID {id} / Version {v} / Erstellt {date} |
| page(n, total) | Page {n} of {total} | Seite {n} von {total} |
| continued | (continued) | (Fortsetzung) |
| watermark | DRAFT | ENTWURF |
| title(name) / titleDraft(name) | {name} – Connection details / Draft – {name} – Connection details | {name} – Details der Anbindung / Entwurf – {name} – Details der Anbindung |

Glossary terms, settled by decision D2 (design-notes §8.2) against what spec 009's code says for
the same English, which wins: "data item" → "Feld" (the glossary had it; the proposal
"Datenfeld" is dropped), "Added here" → "Hier hinzugefügt" and "Removed here" → "Hier entfernt"
(the glossary had them; `BRANCH_MARK_COPY`), "version (the content's fingerprint)" → "Version"
and "Not live" → "Nicht aktiv" (added to spec 009's `contracts/glossary.md` §2; "live" is
"aktiv" there). The same comparison corrected "Connection details" ("Details der Anbindung"),
"result link" and "request link" ("Ergebnislink", "Anfragelink") and "Message for citizens:"
("Nachricht für …") in the table above.

Rows the table lists that existing copy tables already hold are reused from them, not added to
`PDF_TEXTS` (design-notes §8.1): the statuses (`STATUS_PILL_COPY`), `chipAnd` / `chipOr` and
`combinesAnd` / `combinesOr` (`CONNECTOR_COPY`'s labels and descriptions), `messageLabel`
(`RULE_ROW_COPY`), `section1` (`CONNECTION_DETAIL_COPY.linksTitle`), `dataItems`
(`CONNECTION_DETAIL_COPY.items`) and `contents` (`CONNECTION_DETAIL_COPY.summaryCounts` with
`rulesCounts`).
