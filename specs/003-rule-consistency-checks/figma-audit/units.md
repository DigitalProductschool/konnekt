# Units — fileKey s8mU9oJDq3411e8bxMjQO9 | root 6171:6748 | Rules · 5 · Contradictions and duplicates (findings: warning / info, never block Publish) | 17720×3629

Targeted delta audit of the redesigned section, done by hand on 2026-11-01 (decision 2026-11-01:
"Targeted delta"; see [report.md](report.md)). No subagent ran, so there are no `tree/` or `units/`
files: a later `/figma-audit` run needs a fresh mapping (`/figma-audit <url>`, overwrite). The
audit of 2026-10-28 (U01–U04 of the old section) is in [archive-2026-10-28/](archive-2026-10-28/).

Scope: only the findings surfaces (banner, notes, outlines, group marks, tab icon and tooltip).
The rest of each frame is the redesigned page, which stays as built (decision 2026-11-01; report
"Out of scope"). Hidden layers ("Old · …") were skipped.

| UNIT-ID | node-id | name | w×h | scope | status | findings surfaces (node ids) |
|---|---|---|---|---|---|---|
| U01 | 6171:6749 | 5.1 · Conflict: no applicant can meet Standard (warning, doesn’t block) | 1440×1013 | IN | DONE | tab `6171:6755`; banner `6750:40882` (single, warning); outlines `6171:7008`, `6171:7022`; notes `6171:7010`, `6171:7024` |
| U02 | 6171:7064 | 5.2 · Group: redundant rule + sub-group: conflict (doesn’t block) | 1440×1841 | IN | DONE | tab `6171:7070`; banner `6750:40933` (collapsed, warning); Sub-group 01 frame `6171:7091`, header `6171:7093`, group note `6750:41000`; outlines `6171:7488`, `6171:7498`, `6171:7508`; notes `6171:7490`, `6171:7500`, `6171:7510` |
| U03 | 6171:7535 | 5.3 · Variant: findings on changed and new rules | 1440×1895 | IN | DONE | tabs `6171:7541`, `6171:7542`; link strip `6344:60080`; banner `6750:41008` (collapsed, warning); Sub-group 01 `6171:7561`/`6171:7563`, group note `6750:41069`; outlines `6171:7958`, `6171:7568`, `6171:7577`; notes `6171:7960`, `6171:7968`, `6171:7983` |
| U04 | 6178:7800 | 5.4 · Redundant only (info, doesn’t block) | 1440×1715 | IN | DONE | tab `6178:7806`; banner `6750:41077` (single, info); Rule 06 `6178:8168`, note `6178:8216`; Sub-group 01 `6178:7829` plain |
| U05 | 6753:40127 | 5.5 · Mixed findings: banner open, each finding links to its rule | 1440×1905 | IN | DONE | tab `6753:40137`; banner `6753:40144` (expanded, warning); Sub-group 01 `6753:40162`/`6753:40164`, group note `6753:40166`; outlines `6753:40168`, `6753:40175`, `6753:40184`; notes `6753:40171`, `6753:40178`, `6753:40187` |
| U06 | 6753:40497 | 5.6 · Always met: an OR group every applicant meets (info) | 1440×1282 | IN | DONE | tab `6753:40507`; banner `6753:40514` (single, info); Group 01 `6753:40525`/`6753:40527`, group note `6753:40824`; rules inside plain `6753:40528`, `6753:40544` |
| U07 | 6753:40834 | 5.7 · Redundant group: Rule 01 already covers Group 01 (info, rules inside stay plain) | 1440×1282 | IN | DONE | tab `6753:40844`; banner `6753:40851` (single, info); Group 01 `6753:40862`/`6753:40864`, group note `6753:41298`; rules inside plain `6753:40865`, `6753:40881` |
| U08 | 6753:41307 | 5.8 · Conflict only for applicants who share today (fixed date vs age) | 1440×1013 | IN | DONE | tab `6753:41317`; banner `6753:41324` (single, warning); outlines `6753:41329`, `6753:41336`; notes `6753:41332`, `6753:41339` |
| U09 | 6753:41595 | 5.9 · Another variant has findings: icon on the unselected tab | 1440×1715 | IN | DONE | tabs `6753:41605` (selected, info), `6753:41694` (unselected, warning); banner `6753:41612` (single, info); note `6753:41644` |
| U10 | 6758:43049 | 5.10 · Hover the ⚠ on a tab: description, then what’s wrong | 1440×1895 | IN | DONE | tabs `6758:43059`, `6758:43060`; tooltip `6758:43524`; banner `6758:43067` (collapsed, warning); notes as U03 (`6758:43089`, `6758:43094`, `6758:43101`, `6758:43112`) |
| U11 | 6758:43539 | 5.11 · Duplicates only: ⓘ stays, hover adds the duplicate | 1440×1715 | IN | DONE | tab `6758:43549`; tooltip `6758:43967`; banner `6758:43557` (single, info); note `6758:43589` |

Components (main): `Rules/Findings banner` `6750:40865`, `Rules/Finding item` `6750:40604`,
`Rules/Problem note` `6177:7837` (levels `blocking`, `conflicting`, `redundant`), `Rules/Tooltip`
`6139:3739`.
