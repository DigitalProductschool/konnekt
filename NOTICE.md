# Notices

Konnekt is licensed under the European Union Public Licence v. 1.2 (EUPL-1.2): the English text is
in [LICENSE](LICENSE), the German one in [LICENSE.de](LICENSE.de).

Copyright 2026 Team Faro, Batch#27, Digital Product School

This file names what in the repository, and in the product it builds, comes from others or is
under other terms, with its source and licence. `REUSE.toml` states the licence and the copyright
holder of every file, and `LICENSES/` holds the licence texts it names.

## In this repository

### Fonts

| Font      | Version | Files                                                                                                                              | Licence                                                                                            | Copyright and source                                                                                                                          |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fira Sans | 4.203   | `FiraSans-Regular.ttf`, `FiraSans-Medium.ttf`, `FiraSans-SemiBold.ttf` in [frontend/src/assets/fonts/](frontend/src/assets/fonts/) | SIL Open Font License, Version 1.1 (OFL-1.1), text in [OFL.txt](frontend/src/assets/fonts/OFL.txt) | Copyright (c) 2012-2015, The Mozilla Foundation and Telefonica S.A.; Google Fonts' release, through npm `@expo-google-fonts/fira-sans` 0.4.1  |
| Fira Mono | 3.206   | `FiraMono-Regular.ttf`, `FiraMono-Medium.ttf` in [frontend/src/assets/fonts/](frontend/src/assets/fonts/)                          | SIL Open Font License, Version 1.1 (OFL-1.1), text in [OFL.txt](frontend/src/assets/fonts/OFL.txt) | Copyright (c) 2012-2013, The Mozilla Corporation and Telefonica S.A.; Google Fonts' release, through npm `@expo-google-fonts/fira-mono` 0.4.1 |

Fira Sans is a trademark of The Mozilla Corporation. The five files reach the built frontend, and
the connection PDFs it makes embed subsets of them.

### Icons

The 48 SVG files in [frontend/src/assets/icons/](frontend/src/assets/icons/) are glyphs of Google's
Material Symbols and Material Icons, exported from the team's Figma file: Apache License, Version
2.0 (Apache-2.0), Copyright Google LLC, <https://github.com/google/material-design-icons>. Eleven of
them came through KERN's icon set, whose icons are Material Symbols Rounded glyphs. Five were
changed by the team.

| Group                        | Files                                                                                                                                                                                                                                                                                      | Upstream glyph                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Material Symbols (19)        | `document.svg`, `document-action.svg`, `document-danger.svg`, `document-ink.svg`, `document-muted.svg`                                                                                                                                                                                     | Outlined `description`                                                                                                                                                                                   |
|                              | `driving-licence-action.svg`, `driving-licence-danger.svg`, `driving-licence-ink-24.svg`, `driving-licence-ink.svg`, `driving-licence-muted.svg`                                                                                                                                           | Outlined `directions_car`                                                                                                                                                                                |
|                              | `personal-id-action.svg`, `personal-id-danger.svg`, `personal-id-ink.svg`, `personal-id-muted.svg`                                                                                                                                                                                         | Outlined `badge`                                                                                                                                                                                         |
|                              | `lock.svg`, `person.svg`, `save.svg`, `science-ink.svg`, `group-brackets.svg`                                                                                                                                                                                                              | `lock`, Outlined `person`, Outlined `save`, `science`, `data_array`                                                                                                                                      |
| Material Icons (13)          | `check-filled-white.svg`, `done-white.svg`, `fact-check-ink.svg`, `link.svg`, `link-ink.svg`, `link-off.svg`, `link-off-white.svg`, `public-ink.svg`, `remove-circle-danger.svg`, `rename.svg`, `reset-restore.svg`, `undo.svg`, `warning-amber.svg`                                       | `check_circle` (filled), `done`, Outlined `fact_check`, `link` (two files), `link_off` (two files), `public`, `remove_circle_outline`, `title`, `settings_backup_restore`, `undo`, `warning`             |
| Through KERN's icon set (11) | `check-white-small.svg`, `done-action-small.svg`, `delete-white.svg`, `download-action.svg`, `edit-white-small.svg`, `expand-less-action-small.svg`, `expand-more-action-small.svg`, `expand-more-small.svg`, `expand-more-white-small.svg`, `picker-expand.svg`, `picker-expand-open.svg` | KERN 2.8.2's `check`, `delete`, `download`, `edit`, `arrow-up` and `arrow-down`, which are Material Symbols Rounded `check` (also `done`), `delete`, `download`, `edit`, `expand_less` and `expand_more` |
| Changed by the team (5)      | `add-link-action.svg`                                                                                                                                                                                                                                                                      | `add_link`, scaled and moved by one pixel                                                                                                                                                                |
|                              | `copy-to-variant.svg`                                                                                                                                                                                                                                                                      | `tab`, with an arrow added                                                                                                                                                                               |
|                              | `calendar-pencil.svg`                                                                                                                                                                                                                                                                      | a calendar after `event`, with a pencil added                                                                                                                                                            |
|                              | `message-alert.svg`                                                                                                                                                                                                                                                                        | a message with an alert sign, after `announcement` and `feedback`                                                                                                                                        |
|                              | `ungroup-brackets.svg`                                                                                                                                                                                                                                                                     | `data_array`, its two halves moved apart, with a double arrow added                                                                                                                                      |

### KERN declarations restated here

[frontend/src/index.css](frontend/src/index.css) restates declarations of `dist/kern.css` of
`@kern-ux/native` 2.8.2 (EUPL-1.2), each marked at its place with the upstream file and lines:

- 23 custom properties in the `:root` overlay, with KERN's names and values, repeated so that one
  size holds on every window width;
- six rules of one declaration each, which restate an upstream declaration under a more specific
  selector;
- three `color-mix()` formulas of `.kern-btn--danger`, with the danger colour in place of the action
  colour.

[docs/KERN-DESIGN-SYSTEM.md](docs/KERN-DESIGN-SYSTEM.md), section 4, repeats the button's `variant`
union and the `KernIconType` union of `COMPONENTS.md` (lines 86 and 1537–1544) of
`@kern-ux-annex/kern-react-kit` 2.40.0 (EUPL-1.2). Neither package names a copyright holder; their
sources are listed under "Shipped with the running product".

`.kern-btn--danger` and `.kern-loader--56` are this project's own classes in KERN's namespace; they
are not part of KERN.

### Spec Kit

The files of Spec Kit 1.1.1 (<https://github.com/github/spec-kit>), MIT License, Copyright GitHub,
Inc.: [.specify/scripts/bash/](.specify/scripts/bash/), [.specify/templates/](.specify/templates/),
[.specify/extensions/bug/](.specify/extensions/bug/),
[.specify/workflows/speckit/](.specify/workflows/speckit/) and the `speckit-*` skills in
[.claude/skills/](.claude/skills/). They are as Spec Kit's installer wrote them, with its paths and
front matter filled in; the team changed nothing else in them.

### Unicode data

[rules/src/checks/caseFolding.ts](rules/src/checks/caseFolding.ts) and the case-folded strings in
[rules/src/checks/fixtures/evaluator-vectors.json](rules/src/checks/fixtures/evaluator-vectors.json)
are generated from the Unicode Character Database 15.1.0, through Python 3.13's `str.casefold()`
([backend/scripts/export_check_fixtures.py](backend/scripts/export_check_fixtures.py)): Unicode
License v3 (Unicode-3.0), Copyright Unicode, Inc., <https://www.unicode.org/license.txt>.

### Data sets and references

- The English country names in [backend/app/option_sets.py](backend/app/option_sets.py) were
  compiled by the team from general knowledge, with the ISO 3166-1 alpha-2 codes; the German names
  follow the Federal Foreign Office's country list.
- The given and family names, towns with postal codes and authorities, and street names that the
  test personas use ([rules/src/personas/samples.ts](rules/src/personas/samples.ts)) were compiled
  by the team from general knowledge; the personas are fictitious.
- The Stuttgart streets with their postcodes, and the towns with their postcodes and authorities,
  in [backend/scripts/issue_test_credentials/person.py](backend/scripts/issue_test_credentials/person.py)
  were picked by the team; they are real places, and no person's data.

The code lists, attribute names and identifiers follow these references, from which no text or
table is copied: ISO 3166-1; the Federal Foreign Office's country list; ISO/IEC 18013-5; ISO/IEC
5218; the EUDI PID rulebook v1.7; Directive 2006/126/EC.

With thanks: the seeded random generator in
[rules/src/personas/random.ts](rules/src/personas/random.ts) and
[rules/src/checks/testOracle.ts](rules/src/checks/testOracle.ts) is mulberry32, by Tommy Ettinger.

### The template

The repository started from Digital Product School's React + FastAPI + PostgreSQL template for its
teams. The template's files that remain, whole or in part, are under the EUPL-1.2, as Digital
Product School confirmed; `REUSE.toml` names Digital Product School as the holder of the files
taken over whole.

### Test images

`portrait.jpg` and `signature.jpg` in
[backend/scripts/issue_test_credentials/](backend/scripts/issue_test_credentials/) were generated
by the team with an AI image tool. They are under the EUPL-1.2 like the rest of the repository.

### The design's values

The team's designer derived the design's values from KERN's design kit on Figma Community (the
"KERN 2 Design-Kit" of KERN UX-Standard, <https://www.figma.com/@kern_ux>), themed and modified in
the team's own copy. The kit's terms: not stated here.

### Only in the history

Plus Jakarta Sans Regular, Latin subset (`frontend/src/fonts/plus-jakarta-sans-v12-latin-regular.woff2`),
came with the template and was deleted on 2026-10-09; it remains in the repository's history.
SIL Open Font License, Version 1.1 (OFL-1.1); the file never came with its licence text. Earlier
icons in the history are Material glyphs like those above.

## Shipped with the running product

| Component                                                            | Version | Licence                                                     | Use and source                                                                                                                                                         |
| -------------------------------------------------------------------- | ------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| KERN UX, `@kern-ux/native`                                           | 2.8.2   | European Union Public Licence v. 1.2 (EUPL-1.2)             | styles and fonts, compiled into the frontend; <https://gitlab.opencode.de/kern-ux/kern-ux-plain>                                                                       |
| KERN React Kit, `@kern-ux-annex/kern-react-kit`                      | 2.40.0  | European Union Public Licence v. 1.2 (EUPL-1.2)             | components, bundled unmodified; <https://gitlab.opencode.de/kern-ux/community/kern-react-kit>                                                                          |
| lodash, inside the KERN React Kit                                    | 4.17.23 | MIT License                                                 | Copyright OpenJS Foundation and other contributors; the kit's bundle holds all of it                                                                                   |
| React's JSX runtime, inside the KERN React Kit                       |         | MIT License                                                 | Copyright (c) Meta Platforms, Inc. and affiliates                                                                                                                      |
| KERN UX Tailwind theme, `@digitalservicebund/kern-ux-tailwind-theme` | 4.0.0   | MIT License                                                 | Copyright (c) 2025 DigitalService; the package holds no licence file, the text is upstream's `LICENSE`; <https://github.com/digitalservicebund/kern-ux-tailwind-theme> |
| Fira Sans, inside `@kern-ux/native`                                  | 4.106   | SIL Open Font License, Version 1.1 (OFL-1.1)                | Digitized data copyright © 2012-2015, The Mozilla Foundation and Telefonica S.A.; served to browsers; the package holds no font licence file                           |
| sRGB2014 ICC profile, inside `pdfkit` 0.20.2                         |         | the International Color Consortium's terms                  | Copyright International Color Consortium, 2015; inlined in the frontend's bundle                                                                                       |
| brotli's decoder files, inside `brotli` 1.3.3                        |         | Apache License, Version 2.0 (Apache-2.0)                    | Google's six `dec/*.js` files, in the frontend's bundle; the package declares MIT and holds no licence file                                                            |
| psycopg, psycopg-binary                                              | 3.3.5   | GNU Lesser General Public License v3.0 only (LGPL-3.0-only) | the backend's PostgreSQL driver, loaded unmodified from PyPI; the licence text is in each wheel's `licenses/LICENSE.txt`; <https://github.com/psycopg/psycopg>         |

The binary package `psycopg-binary` 3.3.5 bundles libraries under their own licences, among them
(as upstream states them; not read from the wheel):

| Library      | Version | Licence                                         |
| ------------ | ------- | ----------------------------------------------- |
| libpq        | 18      | PostgreSQL License                              |
| OpenSSL      | 3.5.8   | Apache License, Version 2.0                     |
| MIT Kerberos | 1.15.1  | MIT License                                     |
| `libcom_err` | 1.42.9  | MIT License                                     |
| OpenLDAP     |         | OpenLDAP Public License v2.8                    |
| Cyrus SASL   | 2.1.26  | BSD-style licence with an attribution clause    |
| PCRE         | 8.32    | BSD 3-Clause License                            |
| keyutils     | 1.5.8   | GNU Lesser General Public License v2.1 or later |
| `libcrypt`   |         | GNU Lesser General Public License v2.1 or later |
| `libselinux` | 2.5     | public domain                                   |

The built frontend serves the licence texts of the packages it bundles, with those of the parts
above that have no licence file of their own, at `/THIRD-PARTY-NOTICES.txt` beside the app. The
file is [frontend/public/THIRD-PARTY-NOTICES.txt](frontend/public/THIRD-PARTY-NOTICES.txt);
`npm run notices -w frontend`, run from the root after a change to those packages, writes it again.

The MCP server's image installs only its runtime packages: `@modelcontextprotocol/server`,
`@modelcontextprotocol/node` and `@modelcontextprotocol/core` (Apache-2.0), and `zod`, `hono`,
`@hono/node-server` and `fast-deep-equal` (MIT).

## Used to build and develop it

| Component                                | Version        | Licence                                                    | Use and source                                                                                                                    |
| ---------------------------------------- | -------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `lightningcss` and its platform packages | 1.32.0, 1.33.0 | Mozilla Public License 2.0 (MPL-2.0)                       | the CSS transformer of Tailwind and Vite; nothing of it reaches the built files; <https://github.com/parcel-bundler/lightningcss> |
| `pathspec`                               | 1.1.1          | Mozilla Public License 2.0 (MPL-2.0)                       | used by mypy; <https://github.com/cpburnz/python-pathspec>                                                                        |
| `caniuse-lite`                           | 1.0.30001810   | Creative Commons Attribution 4.0 International (CC-BY-4.0) | browser data for the linter; <https://github.com/browserslist/caniuse-lite>                                                       |

## Others' names

serviceBW, EUDI Wallet, KERN and the City of Stuttgart are the names of their owners. This project
is not endorsed by them.

## All other dependencies

All other dependencies declare permissive licences: MIT, MIT-0, ISC, BSD-2-Clause, BSD-3-Clause,
Apache-2.0, BlueOak-1.0.0, PSF-2.0 and Python-2.0. These two commands print the full lists, the
first from the repository root after `npm install`, the second from `backend/`:

```bash
npx --yes license-checker-rseidelsohn@4.4.2 --start . --excludePrivatePackages --markdown
uv run --locked --with pip-licenses==5.5.5 pip-licenses --format=markdown --with-urls --ignore-packages konnekt-backend
```
