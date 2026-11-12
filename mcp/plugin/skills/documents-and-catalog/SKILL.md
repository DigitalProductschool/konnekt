---
name: documents-and-catalog
description: The catalog of document types the wallet offers, their fields, parts and value sets, choosing documents and fields for a connection, the documents' order, and what removing a document or field does to the rules.
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
`amount`). Each field also carries its data `group` (below), and the answer's `groups` lists the
document's data groups in Konnekt's order. An unknown document type is refused with the known
keys.

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
are stored in catalog order). A document type not yet requested is added at the end of the
documents; `fields: []` adds it without fields, to choose them later; `fields: null` removes the
document. A document whose fields change keeps its place, and removing one leaves the others in
their order. An unknown document type or field is refused with the known keys. The answer lists
the draft's documents with their fields, in their order.

Konnekt shows a document's fields in **data groups**, such as Name, Birth, Address, Document and
Other details (and Licence and Appearance for the driving licence), where a person can select a
whole group at once. `get_catalog` gives each field its `group`, the group's English name, and
the document's `groups` in the order Konnekt shows them; the `fields` stay in catalog order. A
document with ten fields or fewer has no groups: its fields carry no `group` and `groups` is
empty. Use the groups to find related fields and to talk with the team member in Konnekt's words
("the fields under Address"), but choose the fields one by one: no tool takes a group, so list
every field you want in `set_document`'s `fields`, and only the fields the form needs.

## The documents' order

A connection keeps its documents in the team's order: the order they were added in, until someone
moves one. Konnekt lists them in that order everywhere, and so do the answers (`get_connection`,
`set_document`, `move_document`). The order is only how Konnekt shows them: what the wallet asks
the citizen for and what serviceBW receives stay in catalog order, so moving a document in a
published connection changes nothing for them.

`move_document` moves one document of a draft: `document_type` is its catalog key and `position`
its new place, 1 being the first and the number of documents the last; the others keep their
order. It is the same move as dragging the document in Konnekt's documents step, one move per
call, and answers the documents in their new order. It is refused with `not_found` for a document
the draft doesn't request ("The connection doesn’t request “mdl”."), and with `validation` for a
position outside the list ("Choose a position from 1 to 2.") or the place the document already has
("“mdl” is already in position 2."). The order of a published connection is changed in Konnekt.

## Removing a document or a field

Rules can only check data the connection requests. Removing a document, or a field that rules
check, would leave those rules without their data, so `set_document` refuses it with the names of
the rules concerned ("Rule 02 in Standard, Rule 02 in Ambulance"), unless you pass
`also_remove_rules: true`: then those rules are removed too, in every variant, and the answer
lists them in `removed_rules`. Tell the team member which rules went with it.

When the catalog no longer offers a document type or field that a draft requests, the draft still
shows it, labelled by its key (`get_connection` lists it in `dropped`), and Konnekt
refuses to store the draft until it is gone: every change answers `validation` with "Unknown
document type …". Remove it with `set_document` before anything else: `fields: null` for a
document type, or the document's remaining fields for a dropped field.
