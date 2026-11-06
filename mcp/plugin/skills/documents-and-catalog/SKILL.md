---
name: documents-and-catalog
description: The catalog of document types the wallet offers, their fields, parts and value sets, choosing documents and fields for a connection, and what removing a document or field does to the rules.
---

# Documents and the catalog

The **catalog** lists what the EUDI Wallet can share: document types such as the Personal ID
(`pid`) and the driving licence (`mdl`), each with its fields. A connection requests one or more
document types and, for each, only the fields the form needs; the citizen is asked to share exactly
those.

## Reading the catalog

`get_catalog` without a document type lists the document types with their keys, labels and
number of fields. With a `document_type` (`pid`, `mdl`), it answers that type's fields: each
field's `key`, `label`, `kind`, its `option_set` for a value list, whether it holds several values
(`multiple_values`), its `parts` for a field made of parts (with `per_licence_class` for the dates
kept per licence class), and the `conditions` a rule can set on it: the `operator`, its `words` as
the editor shows them, and the `input` it takes (`number`, `text`, `values`, `date`, `years` or
`amount`). An unknown document type is refused with the known keys.

`search_values` searches a value set by its key (`option_set`, as `get_catalog` names it), with a
`query` matched on the label and the code, ignoring letter case. It answers 25 values per page
(`value`, `label` and a `description` where there is one); pass `next_cursor` for the next page.
Conditions name values by their `value`.

## Fields and their kinds

Every field has a kind, which decides what a rule can check on it: number, text, date, a value
from a list (enum), an image (which rules can't check), or a field made of **parts**. Some fields
can hold several values, such as the nationalities on the Personal ID.

Parts are checked on their own: the place of birth has its country, region and city or town; the
driving licence's classes have the classes held and, per licence class, an issue date and an
expiry date. A rule names a part as `field.part` (`place_of_birth.country`) and a licence class's
date as `driving_privileges.issue_date#B`.

## Value sets

An enum field or part takes its values from a **value set**: countries, sexes, licence classes,
eye colours. Long value sets such as the countries are searched, never listed whole; a rule names
the values by their codes (`DE`, `B`).

## Choosing documents and fields

`set_document` sets one document type of a draft: `document_type` is its catalog key, and
`fields` lists the keys of every field to request, replacing the fields requested so far (they
are stored in catalog order). A document type not yet requested is added; `fields: []` adds it
without fields, to choose them later; `fields: null` removes the document. An unknown document
type or field is refused with the known keys. The answer lists the draft's documents with their
fields.

## Removing a document or a field

Rules can only check data the connection requests. Removing a document, or a field that rules
check, would leave those rules without their data, so `set_document` refuses it with the names of
the rules concerned ("Rule 02 in Standard, Rule 02 in Ambulance"), unless you pass
`also_remove_rules: true`: then those rules are removed too, in every variant, and the answer
lists them in `removed_rules`. Tell the team member which rules went with it.

When the catalog no longer offers a document type or field that a draft requests, the draft still
shows it, labelled by its key (`get_connection` lists it in `dropped`), and the Connection Portal
refuses to store the draft until it is gone: every change answers `validation` with "Unknown
document type …". Remove it with `set_document` before anything else: `fields: null` for a
document type, or the document's remaining fields for a dropped field.
