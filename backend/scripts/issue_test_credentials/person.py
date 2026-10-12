"""A random German test person: the holder that both test documents describe.

Faker's German locale makes up the names, the street and the numbers. The towns come
from a short list of real ones, so that postcode, state and issuing authorities fit
together. Every date counts from today, so that the documents are valid whenever the
script runs: the same seed gives the same person on the same day.
"""

import string
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from faker import Faker

COUNTRY = 'DE'
COUNTRY_NAME = 'Deutschland'
# ISO/IEC 5218
MALE = 1
FEMALE = 2

# Values from the lists of ISO/IEC 18013-5
EYE_COLOURS = ('blue', 'brown', 'green', 'grey', 'hazel')
HAIR_COLOURS = ('black', 'blond', 'brown', 'red', 'auburn')
HAIR_COLOURS_LATER_IN_LIFE = ('grey', 'white')
# German mobile network prefixes, without the leading 0
MOBILE_PREFIXES = (
    *('151', '152', '157', '160', '162', '170', '171', '172', '173', '175'),
    *('176', '177', '178', '179'),
)
# How German letters are written without umlauts, as in an email address
UMLAUTS = (('ä', 'ae'), ('ö', 'oe'), ('ü', 'ue'), ('ß', 'ss'))
# German identity card numbers use digits and these letters
ID_CARD_LETTERS = 'CFGHJKLMNPRTVWXYZ'
# The order of the vehicle categories on a driving licence
CATEGORY_ORDER = ('AM', 'A1', 'A2', 'A', 'B', 'BE', 'C1', 'C1E', 'C', 'CE', 'L', 'T')


@dataclass(frozen=True)
class Place:
    """A real German town, one of its postcodes and its issuing authorities."""

    city: str
    postal_code: str
    state: str
    # ISO 3166-2 code of the state
    state_code: str
    # Issues identity cards to the town's residents
    id_card_authority: str
    # Issues driving licences to the town's residents
    licence_authority: str


PLACES: tuple[Place, ...] = (
    Place(
        'Stuttgart',
        '70173',
        'Baden-Württemberg',
        'DE-BW',
        'Landeshauptstadt Stuttgart',
        'Landeshauptstadt Stuttgart',
    ),
    Place(
        'Esslingen am Neckar',
        '73728',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Esslingen am Neckar',
        'Landratsamt Esslingen',
    ),
    Place(
        'Ludwigsburg',
        '71634',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Ludwigsburg',
        'Landratsamt Ludwigsburg',
    ),
    Place(
        'Tübingen',
        '72070',
        'Baden-Württemberg',
        'DE-BW',
        'Universitätsstadt Tübingen',
        'Landratsamt Tübingen',
    ),
    Place(
        'Karlsruhe',
        '76133',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Karlsruhe',
        'Stadt Karlsruhe',
    ),
    Place(
        'Mannheim',
        '68159',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Mannheim',
        'Stadt Mannheim',
    ),
    Place(
        'Freiburg im Breisgau',
        '79098',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Freiburg im Breisgau',
        'Stadt Freiburg im Breisgau',
    ),
    Place(
        'Ulm',
        '89073',
        'Baden-Württemberg',
        'DE-BW',
        'Stadt Ulm',
        'Stadt Ulm',
    ),
    Place(
        'München',
        '80331',
        'Bayern',
        'DE-BY',
        'Landeshauptstadt München',
        'Landeshauptstadt München',
    ),
    Place(
        'Köln',
        '50667',
        'Nordrhein-Westfalen',
        'DE-NW',
        'Stadt Köln',
        'Stadt Köln',
    ),
    Place(
        'Frankfurt am Main',
        '60311',
        'Hessen',
        'DE-HE',
        'Stadt Frankfurt am Main',
        'Stadt Frankfurt am Main',
    ),
    Place(
        'Leipzig',
        '04109',
        'Sachsen',
        'DE-SN',
        'Stadt Leipzig',
        'Stadt Leipzig',
    ),
)


@dataclass(frozen=True)
class DrivingPrivilege:
    """A vehicle category of the driving licence, and since when it is held."""

    category: str
    issue_date: date


@dataclass(frozen=True)
class IdentityCard:
    """The person's identity card."""

    number: str
    issue_date: date
    expiry_date: date


@dataclass(frozen=True)
class DrivingLicence:
    """The person's driving licence card."""

    number: str
    issue_date: date
    expiry_date: date
    privileges: tuple[DrivingPrivilege, ...]
    administrative_number: str
    portrait_capture_date: datetime


@dataclass(frozen=True)
class Person:
    """A made-up person, with everything the two test documents say about them."""

    given_name: str
    family_name: str
    birth_family_name: str
    # ISO/IEC 5218: MALE or FEMALE
    sex: int
    birth_date: date
    birth_place: Place
    home: Place
    street: str
    house_number: str
    email: str
    phone_number: str
    height_cm: int
    weight_kg: int
    eye_colour: str
    hair_colour: str
    personal_administrative_number: str
    id_card: IdentityCard
    licence: DrivingLicence

    def age_on(self, day: date) -> int:
        """The person's age in years on a day."""
        had_birthday = (day.month, day.day) >= (
            self.birth_date.month,
            self.birth_date.day,
        )
        return day.year - self.birth_date.year - (0 if had_birthday else 1)


def years_after(day: date, years: int) -> date:
    """The same day `years` later (or earlier), 29 February becoming 28 February."""
    try:
        return day.replace(year=day.year + years)
    except ValueError:
        return day.replace(year=day.year + years, day=28)


def random_person(seed: int, today: date | None = None) -> Person:
    """Make up a person. The same seed gives the same person on the same day."""
    today = today or date.today()
    fake = Faker('de_DE')
    fake.seed_instance(seed)

    sex = fake.random_element((MALE, FEMALE))
    given_name = fake.first_name_male() if sex == MALE else fake.first_name_female()
    family_name = fake.last_name()
    # Some changed their family name when they married
    married_name = fake.random_int(1, 100) <= 30
    birth_family_name = fake.last_name() if married_name else family_name
    # Old enough for a car licence, and not just turned 18
    birth_date = fake.date_between(
        years_after(today, -75), years_after(today, -18) - timedelta(days=60)
    )
    height_cm = fake.random_int(165, 195) if sex == MALE else fake.random_int(155, 182)
    body_mass_index = fake.random_int(19, 29)
    later_in_life = today.year - birth_date.year >= 55
    hair_colours = HAIR_COLOURS + (HAIR_COLOURS_LATER_IN_LIFE if later_in_life else ())

    return Person(
        given_name=given_name,
        family_name=family_name,
        birth_family_name=birth_family_name,
        sex=sex,
        birth_date=birth_date,
        birth_place=fake.random_element(PLACES),
        home=fake.random_element(PLACES),
        street=fake.street_name(),
        house_number=str(fake.random_int(1, 120)),
        email=f'{_ascii(given_name)}.{_ascii(family_name)}@{fake.safe_domain_name()}',
        phone_number='+49'
        + fake.random_element(MOBILE_PREFIXES)
        + fake.numerify('#' * fake.random_int(7, 8)),
        height_cm=height_cm,
        weight_kg=round(body_mass_index * (height_cm / 100) ** 2),
        eye_colour=fake.random_element(EYE_COLOURS),
        hair_colour=fake.random_element(hair_colours),
        personal_administrative_number=fake.numerify('%##########'),
        id_card=_identity_card(fake, birth_date, today),
        licence=_driving_licence(fake, birth_date, today),
    )


def _identity_card(fake: Faker, birth_date: date, today: date) -> IdentityCard:
    # Issued in the last five years: a card is valid for 6 years (under 24) or 10
    issue_date = fake.date_between(
        max(years_after(today, -5), years_after(birth_date, 16)),
        today - timedelta(days=7),
    )
    issued_at_age = issue_date.year - birth_date.year
    expiry_date = years_after(issue_date, 10 if issued_at_age >= 24 else 6)
    number = fake.random_element(ID_CARD_LETTERS) + ''.join(
        fake.random_choices(ID_CARD_LETTERS + string.digits, length=8)
    )
    return IdentityCard(number, issue_date, expiry_date)


def _driving_licence(fake: Faker, birth_date: date, today: date) -> DrivingLicence:
    # Category B, which includes AM and L, passed between 18 and 30
    passed = fake.date_between(
        years_after(birth_date, 18),
        min(years_after(birth_date, 30), today - timedelta(days=30)),
    )
    privileges = [DrivingPrivilege(category, passed) for category in ('AM', 'B', 'L')]
    if fake.random_int(1, 100) <= 30:
        privileges.append(
            DrivingPrivilege(
                'BE', fake.date_between(passed, today - timedelta(days=30))
            )
        )
    if fake.random_int(1, 100) <= 25:
        # A motorcycle licence includes the smaller categories
        motorcycle = fake.date_between(passed, today - timedelta(days=30))
        privileges.extend(
            DrivingPrivilege(category, motorcycle) for category in ('A1', 'A2', 'A')
        )
    privileges.sort(key=lambda privilege: CATEGORY_ORDER.index(privilege.category))

    # The current card is valid for 15 years
    issue_date = fake.date_between(
        max(passed, years_after(today, -14)), today - timedelta(days=7)
    )
    photo_day = issue_date - timedelta(days=fake.random_int(3, 40))
    photo_time = time(fake.random_int(8, 17), fake.random_int(0, 59))
    return DrivingLicence(
        number=fake.random_element(string.ascii_uppercase)
        + fake.numerify('###')
        + ''.join(fake.random_choices(string.ascii_uppercase + string.digits, length=5))
        + fake.numerify('##'),
        issue_date=issue_date,
        expiry_date=years_after(issue_date, 15),
        privileges=tuple(privileges),
        administrative_number=fake.numerify('##########'),
        portrait_capture_date=datetime.combine(photo_day, photo_time, timezone.utc),
    )


def _ascii(name: str) -> str:
    """A name as the local part of an email address: lower case ASCII, no spaces."""
    lower = name.lower()
    for letter, spelled in UMLAUTS:
        lower = lower.replace(letter, spelled)
    plain = unicodedata.normalize('NFKD', lower).encode('ascii', 'ignore').decode()
    return ''.join(character for character in plain if character.isalnum())
