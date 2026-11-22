"""The rules' validation messages in English and German (spec 009, R6, glossary §3).

`services/rules.py` raises with these texts, and `scripts/export_check_fixtures.py`
renders them with sample parameters into `rules/src/fixtures/server-messages.json`,
the parity fixture of the rules step's mirrored messages (`rules/src/constants.ts`,
word for word in both languages; research R8). So this module is a leaf: it imports
only `app.language`, never `app.config` (developer scripts never import it).

Each template is named after its key in `rules/src/constants.ts` and takes that
function's parameters in the same order. Stored names ("Rule 01", "Standard",
variant names) are inserted as they are; only the sentence around them follows the
language. A name that a message composes ("Variant 3" for an unnamed draft variant)
is a `Text` itself, so a template's name parameters take a `Label`.
"""

from collections.abc import Sequence
from typing import Literal

from ..language import Text

ItemNoun = Literal['rule', 'group', 'sub-group']
TimeUnit = Literal['years', 'months']
Label = str | Text
"""A name as a message shows it: a stored name, or a `Text` the message composes."""

# Size limits (spec 002, Assumptions)
MAX_BRANCHES = 20
MAX_ITEMS_PER_BRANCH = 200
NAME_MAX_LENGTH = 100
DESCRIPTION_MAX_LENGTH = 500
MESSAGE_MAX_LENGTH = 500

# The German nouns of the items. All three are feminine and keep their form in
# every case of the singular, so the templates' articles ("eine", "jede", "die")
# fit each of them; a masculine or neuter noun added here would need its own
_NOUNS_DE: dict[ItemNoun, str] = {
    'rule': 'Regel',
    'group': 'Gruppe',
    'sub-group': 'Untergruppe',
}
_UNIT_ONE_DE: dict[TimeUnit, str] = {'years': 'Jahr', 'months': 'Monat'}

INVALID_IDENTIFIER = Text(
    en='The rules contain an invalid identifier. Reload the connection and try again.',
    de=(
        'Die Regeln enthalten eine ungültige Kennung. Laden Sie die Anbindung neu '
        'und versuchen Sie es erneut.'
    ),
)
UNKNOWN_BRANCH = Text(en='Unknown variant.', de='Unbekannte Variante.')

_RELOAD = Text(
    en='Reload the connection and try again.',
    de='Laden Sie die Anbindung neu und versuchen Sie es erneut.',
)


def _forms(label: Label) -> tuple[str, str]:
    """A label's English and German form; a stored name is the same in both."""
    if isinstance(label, Text):
        return label.en, label.de
    return label, label


def variant_label(name: str, position: int) -> Text:
    """How a message names a variant: its name, or "Variant <n>" while it has none."""
    if name:
        return Text(en=name, de=name)
    return Text(en=f'Variant {position}', de=f'Variante {position}')


# The variants (RULES_MESSAGES)


def too_many_branches() -> Text:
    """`tooManyBranches`."""
    return Text(
        en=f'A connection can have at most {MAX_BRANCHES} variants.',
        de=f'Eine Anbindung kann höchstens {MAX_BRANCHES} Varianten haben.',
    )


def main_branch() -> Text:
    """`mainBranch`."""
    return Text(
        en='The rules need exactly one main branch.',
        de='Die Regeln brauchen genau eine Hauptvariante.',
    )


def branch_name_missing() -> Text:
    """`branchNameMissing`."""
    return Text(
        en='Enter a name for every variant.',
        de='Geben Sie für jede Variante einen Namen ein.',
    )


def branch_name_too_long() -> Text:
    """`branchNameTooLong`."""
    return Text(
        en=f'A variant’s name can have at most {NAME_MAX_LENGTH} characters.',
        de=(
            f'Der Name einer Variante darf höchstens {NAME_MAX_LENGTH} Zeichen lang '
            'sein.'
        ),
    )


def branch_name_twice(name: str) -> Text:
    """`branchNameTwice`."""
    return Text(
        en=f'Two variants are called {name}. Give each variant its own name.',
        de=(
            f'Zwei Varianten heißen {name}. Geben Sie jeder Variante einen eigenen '
            'Namen.'
        ),
    )


def description_too_long(branch: Label) -> Text:
    """`descriptionTooLong`."""
    en, de = _forms(branch)
    return Text(
        en=(
            f'The description of {en} can have at most {DESCRIPTION_MAX_LENGTH} '
            'characters.'
        ),
        de=(
            f'Die Beschreibung von {de} darf höchstens {DESCRIPTION_MAX_LENGTH} '
            'Zeichen lang sein.'
        ),
    )


def too_many_items(branch: Label) -> Text:
    """`tooManyItems`."""
    en, de = _forms(branch)
    return Text(
        en=f'{en} can have at most {MAX_ITEMS_PER_BRANCH} rules and groups.',
        de=f'{de} kann höchstens {MAX_ITEMS_PER_BRANCH} Regeln und Gruppen haben.',
    )


def out_of_step(branch: Label, main: Label) -> Text:
    """A variant that no correct propagation gives (spec 002, research R4).

    Not mirrored in `rules/src/`: only the server finds it.
    """
    branch_en, branch_de = _forms(branch)
    main_en, main_de = _forms(main)
    if branch_en == main_en:
        return Text(
            en=f'The variant {branch_en} is out of step. {_RELOAD.en}',
            de=f'Die Variante {branch_de} ist nicht auf dem aktuellen Stand. '
            f'{_RELOAD.de}',
        )
    return Text(
        en=f'The variant {branch_en} is out of step with {main_en}. {_RELOAD.en}',
        de=f'Die Variante {branch_de} ist nicht auf dem Stand von {main_de}. '
        f'{_RELOAD.de}',
    )


# Rules and groups (RULES_MESSAGES)


def item_name_missing(noun: ItemNoun, branch: Label) -> Text:
    """`itemNameMissing`."""
    en, de = _forms(branch)
    return Text(
        en=f'Enter a name for every {noun} in {en}.',
        de=f'Geben Sie für jede {_NOUNS_DE[noun]} in {de} einen Namen ein.',
    )


def item_name_too_long(noun: ItemNoun, branch: Label) -> Text:
    """`itemNameTooLong`."""
    en, de = _forms(branch)
    return Text(
        en=(f'A {noun} in {en} has a name longer than {NAME_MAX_LENGTH} characters.'),
        de=(
            f'Eine {_NOUNS_DE[noun]} in {de} hat einen Namen mit mehr als '
            f'{NAME_MAX_LENGTH} Zeichen.'
        ),
    )


def name_taken(noun: ItemNoun, branch: Label, name: str) -> Text:
    """`nameTaken`."""
    en, de = _forms(branch)
    return Text(
        en=f'There’s already a {noun} called "{name}" in {en}.',
        de=f'In {de} gibt es bereits eine {_NOUNS_DE[noun]} namens „{name}“.',
    )


def name_reserved(name: str, noun: ItemNoun, number: str) -> Text:
    """`nameReserved`: "Rule 08" belongs to `rule-8` (spec 002, FR-005)."""
    return Text(
        en=f'{name} is kept for the {noun} numbered {number}.',
        de=f'{name} ist für die {_NOUNS_DE[noun]} mit der Nummer {number} reserviert.',
    )


def choose_data(rule: str, branch: Label) -> Text:
    """`chooseData`."""
    en, de = _forms(branch)
    return Text(
        en=f'{rule} in {en}: choose the data to check.',
        de=f'{rule} in {de}: Wählen Sie die zu prüfenden Daten aus.',
    )


def not_requested(rule: str, branch: Label) -> Text:
    """`notRequested`."""
    en, de = _forms(branch)
    return Text(
        en=f'{rule} in {en} checks data that’s no longer requested.',
        de=f'{rule} in {de} prüft Daten, die nicht mehr angefordert werden.',
    )


def unknown_part(rule: str, branch: Label, field: Label) -> Text:
    """`unknownPart`. `field` is the catalog's label, in both languages."""
    branch_en, branch_de = _forms(branch)
    field_en, field_de = _forms(field)
    return Text(
        en=f'{rule} in {branch_en} checks a part that {field_en} doesn’t have.',
        de=(
            f'{rule} in {branch_de} prüft einen Bestandteil, den das Feld '
            f'„{field_de}“ nicht hat.'
        ),
    )


def no_message(rule: str, branch: Label) -> Text:
    """`noMessage`."""
    en, de = _forms(branch)
    return Text(
        en=f'{rule} in {en} has no error message.',
        de=f'{rule} in {de} hat keine Fehlermeldung.',
    )


def message_too_long(item: str, branch: Label) -> Text:
    """`messageTooLong`."""
    en, de = _forms(branch)
    return Text(
        en=(
            f'The error message of {item} in {en} can have at most '
            f'{MESSAGE_MAX_LENGTH} characters.'
        ),
        de=(
            f'Die Fehlermeldung von {item} in {de} darf höchstens '
            f'{MESSAGE_MAX_LENGTH} Zeichen lang sein.'
        ),
    )


def rules_only(sub_group: str, branch: Label) -> Text:
    """`rulesOnly`: a sub-group holds rules only (spec 002, FR-008)."""
    en, de = _forms(branch)
    return Text(
        en=f'{sub_group} in {en} can only hold rules.',
        de=f'{sub_group} in {de} kann nur Regeln enthalten.',
    )


def too_few_members(group: str, branch: Label) -> Text:
    """`tooFewMembers`."""
    en, de = _forms(branch)
    return Text(
        en=f'{group} in {en} needs at least two rules.',
        de=f'{group} in {de} braucht mindestens zwei Regeln.',
    )


# A rule's condition (CONDITION_PROBLEM_MESSAGES): the part after "{rule} in
# {branch}: ", which `condition_problem` puts in front


CONDITION_PROBLEMS: dict[str, Text] = {
    'choose_check': Text(en='choose a check.', de='Wählen Sie eine Prüfung aus.'),
    'enter_number': Text(en='enter a number.', de='Geben Sie eine Zahl ein.'),
    'enter_text': Text(
        en='enter a text to compare with.',
        de='Geben Sie einen Text zum Vergleichen ein.',
    ),
    'choose_value': Text(
        en='choose at least one value.', de='Wählen Sie mindestens einen Wert aus.'
    ),
    'values_from_list': Text(
        en='choose values from the list.', de='Wählen Sie Werte aus der Liste.'
    ),
    'value_once': Text(
        en='choose each value only once.', de='Wählen Sie jeden Wert nur einmal aus.'
    ),
    'enter_date': Text(en='enter a date.', de='Geben Sie ein Datum ein.'),
    'years_at_least_1': Text(
        en='enter a number of years of at least 1.',
        de='Geben Sie mindestens 1 Jahr ein.',
    ),
    'choose_unit': Text(
        en='choose years or months.', de='Wählen Sie Jahre oder Monate aus.'
    ),
}
"""The condition problems without a parameter, by their key in `rules/src/`."""


def amount_at_least_1(unit: TimeUnit) -> Text:
    """`amount_at_least_1`: a number of years or months below 1."""
    return Text(
        en=f'enter a number of {unit} of at least 1.',
        de=f'Geben Sie mindestens 1 {_UNIT_ONE_DE[unit]} ein.',
    )


def condition_prefix(rule: str, branch: Label) -> Text:
    """What a condition problem's message starts with: "Rule 01 in Standard: "."""
    en, de = _forms(branch)
    return Text(en=f'{rule} in {en}: ', de=f'{rule} in {de}: ')


def condition_problem(rule: str, branch: Label, problem: Text) -> Text:
    """A condition problem's message: `condition_prefix` and the problem."""
    prefix = condition_prefix(rule, branch)
    return Text(en=prefix.en + problem.en, de=prefix.de + problem.de)


# A save over rules another team member saved meanwhile (spec 002, FR-028)


def _variants(names: Sequence[str]) -> Text:
    """'the variant Taxi', 'the variants Taxi and Bus', 'the variants A, B and C'."""
    if len(names) == 1:
        return Text(en=f'the variant {names[0]}', de=f'die Variante {names[0]}')
    listed = ', '.join(names[:-1])
    return Text(
        en=f'the variants {listed} and {names[-1]}',
        de=f'die Varianten {listed} und {names[-1]}',
    )


def rules_changed(deleted: Sequence[str], returning: Sequence[str]) -> Text:
    """The 409 `rules_changed`, in the UI's words: "variant", "result link".

    It names the variants that replacing would delete and bring back.
    """
    effects_en: list[str] = []
    effects_de: list[str] = []
    if deleted:
        effects_en.append(f'deletes {_variants(deleted).en}')
        effects_de.append(f'löschen Sie {_variants(deleted).de}')
    if returning:
        one = len(returning) == 1
        links_en = 'a new result link' if one else 'new result links'
        links_de = 'einem neuen Ergebnislink' if one else 'neuen Ergebnislinks'
        effects_en.append(f'brings back {_variants(returning).en} with {links_en}')
        # "löschen Sie … und stellen … wieder her": the subject is named once
        subject = '' if deleted else ' Sie'
        effects_de.append(
            f'stellen{subject} {_variants(returning).de} mit {links_de} wieder her'
        )
    en = 'Another team member saved the rules of this connection after you opened it.'
    de = (
        'Ein anderes Teammitglied hat die Regeln dieser Anbindung gespeichert, '
        'nachdem Sie sie geöffnet haben.'
    )
    if effects_en:
        en += f' Replacing their changes {" and ".join(effects_en)}.'
        de += f' Wenn Sie diese Änderungen ersetzen, {" und ".join(effects_de)}.'
    return Text(en=en, de=de)
