"""The example connection's content (spec 010, research R7, data-model.md section 5).

"Start from an example" stores this content as a draft, in the language of the
request (FR-055, FR-061): the drafts service (`drafts.create_example()`) takes
`example_content(language)` through the draft-creation path, so it is checked and
numbered as every new draft is. Its texts are word for word those of data-model.md
section 5 and contracts/copy.md section 6; "Standard", "Rule 01" and "Rule 02" are
stored names and stay as they are in both languages.

A leaf like `services/rules_texts.py`: it imports only `app.language`, `app.catalog`
and the schemas (which import only the catalog), never `app.config`, so that
`scripts/export_check_fixtures.py` can import it to write the example into the rules
package's fixture (FR-056). The rules are built as the editor builds them: Standard
with Rule 01 AND Rule 02, and the variant "Ambulance" linked to Standard with both
rules marked `changed`, so that publishing's checks, the rules package's validation
and the rule checks find nothing in it.
"""

from dataclasses import dataclass

from .catalog import MDL, PID
from .language import Language, Text
from .schemas import (
    BranchInput,
    Condition,
    DraftCreate,
    DraftRules,
    NumberingBase,
    RequestedDocument,
    RuleItem,
    RuleTarget,
)

NAME = Text(
    en='Passenger transport licence (example)',
    de='Personenbeförderungsschein (Beispiel)',
)
DESCRIPTION = Text(
    en=(
        'Licence to drive taxis, rental cars and ambulances. Checks age and driving '
        'experience.'
    ),
    de=(
        'Erlaubnis zum Fahren von Taxis, Mietwagen und Krankenwagen. Prüft Alter und '
        'Fahrpraxis.'
    ),
)
MAIN_BRANCH_NAME = 'Standard'
VARIANT_NAME = Text(en='Ambulance', de='Krankentransport')
VARIANT_DESCRIPTION = Text(
    en='For ambulance services. Some rules differ from Standard.',
    de='Für Krankentransporte. Einige Regeln weichen von Standard ab.',
)

# The documents in the example's own order, each with its data items in catalog
# order (design-notes section 4.1, call 3)
DOCUMENTS: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        PID.key,
        (
            'family_name',
            'given_name',
            'birthdate',
            'address_street_address',
            'address_house_number',
            'address_postal_code',
            'address_locality',
        ),
    ),
    # The catalog lists the expiry date before the licence classes
    (MDL.key, ('expiry_date', 'driving_privileges')),
)

# The counters the stored example has: Rule 01 and Rule 02 are taken, no group
NEXT_RULE_NUMBER = 3
NEXT_GROUP_NUMBER = 1

# The licence class whose issue date Rule 02 checks
LICENCE_CLASS = 'B'


@dataclass(frozen=True)
class ExampleRule:
    """A rule of the example: what it checks, in Standard and in the variant.

    Both are "at least N years ago" on a date: Standard's years and message, and
    the variant's own, which mark the variant's copy `changed`.
    """

    number: int
    target: RuleTarget
    years: int
    message: Text
    variant_years: int
    variant_message: Text


RULES: tuple[ExampleRule, ...] = (
    # "Date of birth (Age) is at least 21 years old"
    ExampleRule(
        number=1,
        target=RuleTarget(document_type=PID.key, field='birthdate'),
        years=21,
        message=Text(
            en='You need to be at least 21 years old.',
            de='Sie müssen mindestens 21 Jahre alt sein.',
        ),
        variant_years=19,
        variant_message=Text(
            en='You need to be at least 19 years old.',
            de='Sie müssen mindestens 19 Jahre alt sein.',
        ),
    ),
    # "Licence class B – Issue date is at least 2 years ago"
    ExampleRule(
        number=2,
        target=RuleTarget(
            document_type=MDL.key,
            field='driving_privileges',
            part='issue_date',
            licence_class=LICENCE_CLASS,
        ),
        years=2,
        message=Text(
            en='You need to have held a class B driving licence for at least 2 years.',
            de=(
                'Sie müssen seit mindestens 2 Jahren einen Führerschein der Klasse B '
                'besitzen.'
            ),
        ),
        variant_years=1,
        variant_message=Text(
            en='You need to have held a class B driving licence for at least 1 year.',
            de=(
                'Sie müssen seit mindestens 1 Jahr einen Führerschein der Klasse B '
                'besitzen.'
            ),
        ),
    ),
)

YEARS_AGO_OPERATOR = 'at_least_years_ago'


def _rule(rule: ExampleRule, years: int, message: str, *, changed: bool) -> RuleItem:
    """A rule as the editor stores it: `rule-N`, "Rule NN", one condition."""
    return RuleItem(
        type='rule',
        id=f'rule-{rule.number}',
        name=f'Rule {rule.number:02d}',
        mark='changed' if changed else None,
        target=rule.target.model_copy(),
        condition=Condition(operator=YEARS_AGO_OPERATOR, years=years),
        message=message,
    )


def example_content(language: Language) -> DraftCreate:
    """The example as a new draft's body, its texts in `language` (FR-061).

    The variants have no id yet (the server assigns them), the rules are numbered
    from (1, 1) as a new draft's are, and the step is the connection step, where
    the wizard opens it (Clarification #36). Stored, its counters are
    `NEXT_RULE_NUMBER` and `NEXT_GROUP_NUMBER`.
    """
    standard = BranchInput(
        id=None,
        name=MAIN_BRANCH_NAME,
        description=None,
        origin='main',
        operator='and',
        operator_mark=None,
        items=[
            _rule(rule, rule.years, rule.message.resolve(language), changed=False)
            for rule in RULES
        ],
    )
    variant = BranchInput(
        id=None,
        name=VARIANT_NAME.resolve(language),
        description=VARIANT_DESCRIPTION.resolve(language),
        origin='based',
        operator='and',
        operator_mark=None,
        items=[
            _rule(
                rule,
                rule.variant_years,
                rule.variant_message.resolve(language),
                changed=True,
            )
            for rule in RULES
        ],
    )
    return DraftCreate(
        name=NAME.resolve(language),
        description=DESCRIPTION.resolve(language),
        documents=[
            RequestedDocument(document_type=document_type, fields=list(fields))
            for document_type, fields in DOCUMENTS
        ],
        rules=DraftRules(
            branches=[standard, variant],
            numbering_base=NumberingBase(rule=1, group=1),
        ),
        step='connection',
    )
