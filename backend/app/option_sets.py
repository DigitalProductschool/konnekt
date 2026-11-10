"""The value sets of enum fields and parts (research R6).

The catalog names a set by its key (`CatalogField.option_set`), and
`GET /api/option-sets` hands every set to the frontend, so the menus, the server's
checks and the evaluation use the same values. A value is what the credential holds:
a country code, a sex code, a licence class or an ISO/IEC 18013-5 colour. Labels and
descriptions are UI copy, each with its German beside it (`label_de`,
`description_de`, spec 009, glossary §4); `label_of()` and `description_of()` pick the
request's language. This module imports only `app.language`, a leaf.
"""

import dataclasses
from dataclasses import dataclass

from .language import current_language


@dataclass(frozen=True)
class Option:
    """One value of a set, with its label and an optional description."""

    value: str | int
    label: str
    label_de: str = dataclasses.field(kw_only=True)
    description: str | None = None
    description_de: str | None = dataclasses.field(default=None, kw_only=True)


# ISO 3166-1 alpha-2: every officially assigned code with an English short name, in
# alphabetical order of the names. The PID and the driving licence encode
# nationalities and countries this way (PID rulebook v1.7, ISO/IEC 18013-5). The
# German is the short name of the Federal Foreign Office's country list, as it spells it
_COUNTRIES: tuple[tuple[str, str, str], ...] = (
    ('AF', 'Afghanistan', 'Afghanistan'),
    ('AX', 'Åland Islands', 'Åland'),
    ('AL', 'Albania', 'Albanien'),
    ('DZ', 'Algeria', 'Algerien'),
    ('AS', 'American Samoa', 'Amerikanisch-Samoa'),
    ('AD', 'Andorra', 'Andorra'),
    ('AO', 'Angola', 'Angola'),
    ('AI', 'Anguilla', 'Anguilla'),
    ('AQ', 'Antarctica', 'Antarktis'),
    ('AG', 'Antigua and Barbuda', 'Antigua und Barbuda'),
    ('AR', 'Argentina', 'Argentinien'),
    ('AM', 'Armenia', 'Armenien'),
    ('AW', 'Aruba', 'Aruba'),
    ('AU', 'Australia', 'Australien'),
    ('AT', 'Austria', 'Österreich'),
    ('AZ', 'Azerbaijan', 'Aserbaidschan'),
    ('BS', 'Bahamas', 'Bahamas'),
    ('BH', 'Bahrain', 'Bahrain'),
    ('BD', 'Bangladesh', 'Bangladesch'),
    ('BB', 'Barbados', 'Barbados'),
    ('BY', 'Belarus', 'Belarus'),
    ('BE', 'Belgium', 'Belgien'),
    ('BZ', 'Belize', 'Belize'),
    ('BJ', 'Benin', 'Benin'),
    ('BM', 'Bermuda', 'Bermuda'),
    ('BT', 'Bhutan', 'Bhutan'),
    ('BO', 'Bolivia', 'Bolivien'),
    ('BQ', 'Bonaire, Sint Eustatius and Saba', 'Bonaire, Sint Eustatius und Saba'),
    ('BA', 'Bosnia and Herzegovina', 'Bosnien und Herzegowina'),
    ('BW', 'Botswana', 'Botsuana'),
    ('BV', 'Bouvet Island', 'Bouvetinsel'),
    ('BR', 'Brazil', 'Brasilien'),
    (
        'IO',
        'British Indian Ocean Territory',
        'Britisches Territorium im Indischen Ozean',
    ),
    ('VG', 'British Virgin Islands', 'Britische Jungferninseln'),
    ('BN', 'Brunei', 'Brunei Darussalam'),
    ('BG', 'Bulgaria', 'Bulgarien'),
    ('BF', 'Burkina Faso', 'Burkina Faso'),
    ('BI', 'Burundi', 'Burundi'),
    ('CV', 'Cabo Verde', 'Cabo Verde'),
    ('KH', 'Cambodia', 'Kambodscha'),
    ('CM', 'Cameroon', 'Kamerun'),
    ('CA', 'Canada', 'Kanada'),
    ('KY', 'Cayman Islands', 'Kaimaninseln'),
    ('CF', 'Central African Republic', 'Zentralafrikanische Republik'),
    ('TD', 'Chad', 'Tschad'),
    ('CL', 'Chile', 'Chile'),
    ('CN', 'China', 'China'),
    ('CX', 'Christmas Island', 'Weihnachtsinsel'),
    ('CC', 'Cocos (Keeling) Islands', 'Kokosinseln'),
    ('CO', 'Colombia', 'Kolumbien'),
    ('KM', 'Comoros', 'Komoren'),
    ('CG', 'Congo', 'Kongo'),
    ('CK', 'Cook Islands', 'Cookinseln'),
    ('CR', 'Costa Rica', 'Costa Rica'),
    ('CI', 'Côte d’Ivoire', 'Côte d’Ivoire'),
    ('HR', 'Croatia', 'Kroatien'),
    ('CU', 'Cuba', 'Kuba'),
    ('CW', 'Curaçao', 'Curaçao'),
    ('CY', 'Cyprus', 'Zypern'),
    ('CZ', 'Czechia', 'Tschechien'),
    ('CD', 'Democratic Republic of the Congo', 'Kongo, Demokratische Republik'),
    ('DK', 'Denmark', 'Dänemark'),
    ('DJ', 'Djibouti', 'Dschibuti'),
    ('DM', 'Dominica', 'Dominica'),
    ('DO', 'Dominican Republic', 'Dominikanische Republik'),
    ('EC', 'Ecuador', 'Ecuador'),
    ('EG', 'Egypt', 'Ägypten'),
    ('SV', 'El Salvador', 'El Salvador'),
    ('GQ', 'Equatorial Guinea', 'Äquatorialguinea'),
    ('ER', 'Eritrea', 'Eritrea'),
    ('EE', 'Estonia', 'Estland'),
    ('SZ', 'Eswatini', 'Eswatini'),
    ('ET', 'Ethiopia', 'Äthiopien'),
    ('FK', 'Falkland Islands', 'Falklandinseln'),
    ('FO', 'Faroe Islands', 'Färöer'),
    ('FJ', 'Fiji', 'Fidschi'),
    ('FI', 'Finland', 'Finnland'),
    ('FR', 'France', 'Frankreich'),
    ('GF', 'French Guiana', 'Französisch-Guayana'),
    ('PF', 'French Polynesia', 'Französisch-Polynesien'),
    ('TF', 'French Southern Territories', 'Französische Süd- und Antarktisgebiete'),
    ('GA', 'Gabon', 'Gabun'),
    ('GM', 'Gambia', 'Gambia'),
    ('GE', 'Georgia', 'Georgien'),
    ('DE', 'Germany', 'Deutschland'),
    ('GH', 'Ghana', 'Ghana'),
    ('GI', 'Gibraltar', 'Gibraltar'),
    ('GR', 'Greece', 'Griechenland'),
    ('GL', 'Greenland', 'Grönland'),
    ('GD', 'Grenada', 'Grenada'),
    ('GP', 'Guadeloupe', 'Guadeloupe'),
    ('GU', 'Guam', 'Guam'),
    ('GT', 'Guatemala', 'Guatemala'),
    ('GG', 'Guernsey', 'Guernsey'),
    ('GN', 'Guinea', 'Guinea'),
    ('GW', 'Guinea-Bissau', 'Guinea-Bissau'),
    ('GY', 'Guyana', 'Guyana'),
    ('HT', 'Haiti', 'Haiti'),
    ('HM', 'Heard Island and McDonald Islands', 'Heard und McDonaldinseln'),
    ('HN', 'Honduras', 'Honduras'),
    ('HK', 'Hong Kong', 'Hongkong'),
    ('HU', 'Hungary', 'Ungarn'),
    ('IS', 'Iceland', 'Island'),
    ('IN', 'India', 'Indien'),
    ('ID', 'Indonesia', 'Indonesien'),
    ('IR', 'Iran', 'Iran'),
    ('IQ', 'Iraq', 'Irak'),
    ('IE', 'Ireland', 'Irland'),
    ('IM', 'Isle of Man', 'Insel Man'),
    ('IL', 'Israel', 'Israel'),
    ('IT', 'Italy', 'Italien'),
    ('JM', 'Jamaica', 'Jamaika'),
    ('JP', 'Japan', 'Japan'),
    ('JE', 'Jersey', 'Jersey'),
    ('JO', 'Jordan', 'Jordanien'),
    ('KZ', 'Kazakhstan', 'Kasachstan'),
    ('KE', 'Kenya', 'Kenia'),
    ('KI', 'Kiribati', 'Kiribati'),
    ('KW', 'Kuwait', 'Kuwait'),
    ('KG', 'Kyrgyzstan', 'Kirgisistan'),
    ('LA', 'Laos', 'Laos'),
    ('LV', 'Latvia', 'Lettland'),
    ('LB', 'Lebanon', 'Libanon'),
    ('LS', 'Lesotho', 'Lesotho'),
    ('LR', 'Liberia', 'Liberia'),
    ('LY', 'Libya', 'Libyen'),
    ('LI', 'Liechtenstein', 'Liechtenstein'),
    ('LT', 'Lithuania', 'Litauen'),
    ('LU', 'Luxembourg', 'Luxemburg'),
    ('MO', 'Macao', 'Macau'),
    ('MG', 'Madagascar', 'Madagaskar'),
    ('MW', 'Malawi', 'Malawi'),
    ('MY', 'Malaysia', 'Malaysia'),
    ('MV', 'Maldives', 'Malediven'),
    ('ML', 'Mali', 'Mali'),
    ('MT', 'Malta', 'Malta'),
    ('MH', 'Marshall Islands', 'Marshallinseln'),
    ('MQ', 'Martinique', 'Martinique'),
    ('MR', 'Mauritania', 'Mauretanien'),
    ('MU', 'Mauritius', 'Mauritius'),
    ('YT', 'Mayotte', 'Mayotte'),
    ('MX', 'Mexico', 'Mexiko'),
    ('FM', 'Micronesia', 'Mikronesien'),
    ('MD', 'Moldova', 'Moldau'),
    ('MC', 'Monaco', 'Monaco'),
    ('MN', 'Mongolia', 'Mongolei'),
    ('ME', 'Montenegro', 'Montenegro'),
    ('MS', 'Montserrat', 'Montserrat'),
    ('MA', 'Morocco', 'Marokko'),
    ('MZ', 'Mozambique', 'Mosambik'),
    ('MM', 'Myanmar', 'Myanmar'),
    ('NA', 'Namibia', 'Namibia'),
    ('NR', 'Nauru', 'Nauru'),
    ('NP', 'Nepal', 'Nepal'),
    ('NL', 'Netherlands', 'Niederlande'),
    ('NC', 'New Caledonia', 'Neukaledonien'),
    ('NZ', 'New Zealand', 'Neuseeland'),
    ('NI', 'Nicaragua', 'Nicaragua'),
    ('NE', 'Niger', 'Niger'),
    ('NG', 'Nigeria', 'Nigeria'),
    ('NU', 'Niue', 'Niue'),
    ('NF', 'Norfolk Island', 'Norfolkinsel'),
    ('KP', 'North Korea', 'Nordkorea'),
    ('MK', 'North Macedonia', 'Nordmazedonien'),
    ('MP', 'Northern Mariana Islands', 'Nördliche Marianen'),
    ('NO', 'Norway', 'Norwegen'),
    ('OM', 'Oman', 'Oman'),
    ('PK', 'Pakistan', 'Pakistan'),
    ('PW', 'Palau', 'Palau'),
    ('PS', 'Palestine', 'Palästinensische Gebiete'),
    ('PA', 'Panama', 'Panama'),
    ('PG', 'Papua New Guinea', 'Papua-Neuguinea'),
    ('PY', 'Paraguay', 'Paraguay'),
    ('PE', 'Peru', 'Peru'),
    ('PH', 'Philippines', 'Philippinen'),
    ('PN', 'Pitcairn Islands', 'Pitcairninseln'),
    ('PL', 'Poland', 'Polen'),
    ('PT', 'Portugal', 'Portugal'),
    ('PR', 'Puerto Rico', 'Puerto Rico'),
    ('QA', 'Qatar', 'Katar'),
    ('RE', 'Réunion', 'Réunion'),
    ('RO', 'Romania', 'Rumänien'),
    ('RU', 'Russia', 'Russland'),
    ('RW', 'Rwanda', 'Ruanda'),
    ('BL', 'Saint Barthélemy', 'Saint-Barthélemy'),
    (
        'SH',
        'Saint Helena, Ascension and Tristan da Cunha',
        'St. Helena, Ascension und Tristan da Cunha',
    ),
    ('KN', 'Saint Kitts and Nevis', 'St. Kitts und Nevis'),
    ('LC', 'Saint Lucia', 'St. Lucia'),
    ('MF', 'Saint Martin (French part)', 'Saint-Martin (französischer Teil)'),
    ('PM', 'Saint Pierre and Miquelon', 'Saint-Pierre und Miquelon'),
    ('VC', 'Saint Vincent and the Grenadines', 'St. Vincent und die Grenadinen'),
    ('WS', 'Samoa', 'Samoa'),
    ('SM', 'San Marino', 'San Marino'),
    ('ST', 'São Tomé and Príncipe', 'São Tomé und Príncipe'),
    ('SA', 'Saudi Arabia', 'Saudi-Arabien'),
    ('SN', 'Senegal', 'Senegal'),
    ('RS', 'Serbia', 'Serbien'),
    ('SC', 'Seychelles', 'Seychellen'),
    ('SL', 'Sierra Leone', 'Sierra Leone'),
    ('SG', 'Singapore', 'Singapur'),
    ('SX', 'Sint Maarten (Dutch part)', 'Sint Maarten (niederländischer Teil)'),
    ('SK', 'Slovakia', 'Slowakei'),
    ('SI', 'Slovenia', 'Slowenien'),
    ('SB', 'Solomon Islands', 'Salomonen'),
    ('SO', 'Somalia', 'Somalia'),
    ('ZA', 'South Africa', 'Südafrika'),
    (
        'GS',
        'South Georgia and the South Sandwich Islands',
        'Südgeorgien und die Südlichen Sandwichinseln',
    ),
    ('KR', 'South Korea', 'Südkorea'),
    ('SS', 'South Sudan', 'Südsudan'),
    ('ES', 'Spain', 'Spanien'),
    ('LK', 'Sri Lanka', 'Sri Lanka'),
    ('SD', 'Sudan', 'Sudan'),
    ('SR', 'Suriname', 'Suriname'),
    ('SJ', 'Svalbard and Jan Mayen', 'Svalbard und Jan Mayen'),
    ('SE', 'Sweden', 'Schweden'),
    ('CH', 'Switzerland', 'Schweiz'),
    ('SY', 'Syria', 'Syrien'),
    ('TW', 'Taiwan', 'Taiwan'),
    ('TJ', 'Tajikistan', 'Tadschikistan'),
    ('TZ', 'Tanzania', 'Tansania'),
    ('TH', 'Thailand', 'Thailand'),
    ('TL', 'Timor-Leste', 'Timor-Leste'),
    ('TG', 'Togo', 'Togo'),
    ('TK', 'Tokelau', 'Tokelau'),
    ('TO', 'Tonga', 'Tonga'),
    ('TT', 'Trinidad and Tobago', 'Trinidad und Tobago'),
    ('TN', 'Tunisia', 'Tunesien'),
    ('TR', 'Türkiye', 'Türkei'),
    ('TM', 'Turkmenistan', 'Turkmenistan'),
    ('TC', 'Turks and Caicos Islands', 'Turks- und Caicosinseln'),
    ('TV', 'Tuvalu', 'Tuvalu'),
    ('UG', 'Uganda', 'Uganda'),
    ('UA', 'Ukraine', 'Ukraine'),
    ('AE', 'United Arab Emirates', 'Vereinigte Arabische Emirate'),
    ('GB', 'United Kingdom', 'Vereinigtes Königreich'),
    ('US', 'United States', 'Vereinigte Staaten'),
    (
        'UM',
        'United States Minor Outlying Islands',
        'Kleinere Amerikanische Überseeinseln',
    ),
    ('VI', 'United States Virgin Islands', 'Amerikanische Jungferninseln'),
    ('UY', 'Uruguay', 'Uruguay'),
    ('UZ', 'Uzbekistan', 'Usbekistan'),
    ('VU', 'Vanuatu', 'Vanuatu'),
    ('VA', 'Vatican City', 'Vatikanstadt'),
    ('VE', 'Venezuela', 'Venezuela'),
    ('VN', 'Vietnam', 'Vietnam'),
    ('WF', 'Wallis and Futuna', 'Wallis und Futuna'),
    ('EH', 'Western Sahara', 'Westsahara'),
    ('YE', 'Yemen', 'Jemen'),
    ('ZM', 'Zambia', 'Sambia'),
    ('ZW', 'Zimbabwe', 'Simbabwe'),
)

# PID rulebook v1.7, section 2.3, which ISO/IEC 5218 follows for 0, 1, 2 and 9.
# The driving licence uses ISO/IEC 5218, so its values are a subset
_SEX: tuple[tuple[int, str, str], ...] = (
    (0, 'Not known', 'Unbekannt'),
    (1, 'Male', 'Männlich'),
    (2, 'Female', 'Weiblich'),
    (3, 'Other', 'Anderes'),
    (4, 'Inter', 'Inter'),
    (5, 'Diverse', 'Divers'),
    (6, 'Open', 'Offen'),
    (9, 'Not applicable', 'Nicht zutreffend'),
)

# The categories of ISO/IEC 18013-5 and Directive 2006/126/EC, plus Germany's
# national L and T, in the order of the design's class menu. The descriptions are
# design-notes.md's (F32); statements show the codes alone
_LICENCE_CLASSES: tuple[tuple[str, str, str], ...] = (
    ('AM', 'Mopeds up to 45 km/h', 'Kleinkrafträder bis 45 km/h'),
    ('A1', 'Light motorcycles up to 125 cm³', 'Leichtkrafträder bis 125 cm³'),
    ('A2', 'Motorcycles up to 35 kW', 'Krafträder bis 35 kW'),
    ('A', 'All motorcycles', 'Krafträder'),
    ('B1', 'Quadricycles up to 15 kW', 'Vierrädrige Kraftfahrzeuge bis 15 kW'),
    ('B', 'Cars up to 3.5 t', 'Pkw bis 3,5 t'),
    ('BE', 'Car with a heavy trailer', 'Pkw mit schwerem Anhänger'),
    ('C1', 'Trucks 3.5–7.5 t', 'Lkw 3,5–7,5 t'),
    ('C1E', 'C1 with a heavy trailer', 'C1 mit schwerem Anhänger'),
    ('C', 'Trucks over 3.5 t', 'Lkw über 3,5 t'),
    ('CE', 'C with a heavy trailer', 'C mit schwerem Anhänger'),
    ('D1', 'Minibuses up to 16 passengers', 'Kleinbusse bis 16 Fahrgäste'),
    ('D1E', 'D1 with a heavy trailer', 'D1 mit schwerem Anhänger'),
    ('D', 'Buses', 'Busse'),
    ('DE', 'D with a heavy trailer', 'D mit schwerem Anhänger'),
    ('L', 'Tractors up to 40 km/h', 'Zugmaschinen bis 40 km/h'),
    ('T', 'Tractors up to 60 km/h', 'Zugmaschinen bis 60 km/h'),
)

# ISO/IEC 18013-5, eye_colour and hair_colour: the values in the standard's order,
# with their German labels. The English label is the value capitalised
_EYE_COLOURS: tuple[tuple[str, str], ...] = (
    ('black', 'Schwarz'),
    ('blue', 'Blau'),
    ('brown', 'Braun'),
    ('dichromatic', 'Zweifarbig'),
    ('grey', 'Grau'),
    ('green', 'Grün'),
    ('hazel', 'Haselnussbraun'),
    ('maroon', 'Rotbraun'),
    ('pink', 'Rosa'),
    ('unknown', 'Unbekannt'),
)
_HAIR_COLOURS: tuple[tuple[str, str], ...] = (
    ('bald', 'Kahl'),
    ('black', 'Schwarz'),
    ('blond', 'Blond'),
    ('brown', 'Braun'),
    ('grey', 'Grau'),
    ('red', 'Rot'),
    ('auburn', 'Kastanienbraun'),
    ('sandy', 'Rotblond'),
    ('white', 'Weiß'),
    ('unknown', 'Unbekannt'),
)

OPTION_SETS: dict[str, tuple[Option, ...]] = {
    'countries': tuple(
        Option(code, name, label_de=name_de) for code, name, name_de in _COUNTRIES
    ),
    'sex': tuple(
        Option(code, label, label_de=label_de) for code, label, label_de in _SEX
    ),
    'licence_classes': tuple(
        Option(code, code, description, label_de=code, description_de=description_de)
        for code, description, description_de in _LICENCE_CLASSES
    ),
    'eye_colours': tuple(
        Option(value, value.capitalize(), label_de=label_de)
        for value, label_de in _EYE_COLOURS
    ),
    'hair_colours': tuple(
        Option(value, value.capitalize(), label_de=label_de)
        for value, label_de in _HAIR_COLOURS
    ),
}


def label_of(option: Option) -> str:
    """Return the option's label in the current request's language (spec 009, R6).

    For the website's answers only: the evaluator and the rules' checks read `value`.
    """
    return option.label_de if current_language() == 'de' else option.label


def description_of(option: Option) -> str | None:
    """Return the option's description in the current request's language, or None."""
    if current_language() == 'de':
        return option.description_de
    return option.description
