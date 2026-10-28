# Units — fileKey s8mU9oJDq3411e8bxMjQO9 | root 6171:6748 | Rules · 5 · Problems: contradiction and duplicate (later: not in spec yet, needs engine logic) | 6480×2199
Mapper Figma calls: 1. Estimated audit calls: 15.

Scope source: `requirements.md` was missing from AUDIT_DIR, so scope was judged from `specs/003-rule-consistency-checks/spec.md` (US1 conflicts, US2 redundancy, US3 every branch, "does not block publishing"). The section's "later: not in spec yet" label predates spec 003, which now covers it. Hidden layers ("Old · …", hidden card headers, old problems banners) were skipped.

| UNIT-ID | node-ids | name | kind | w×h | desc | scope | status | counts | notes |
|---|---|---|---|---|---|---|---|---|---|
| U01 | 6171:6749 | 5.1 · Rules · contradiction | SCREEN | 1440×1027 | 32 | IN | DONE | calls=0 covered=5 partial=7 conflict=5 figma_only=5 missing=38 | Rules step, top level: slim alert (6616:44378) + 2 rule rows outlined as "Problem" with Rules/Problem note (6171:7010, 6171:7024). US1 conflict. |
| U02 | 6171:7064 | 5.2 · Group: suggestion (duplicate) + sub-group: conflict (blocks) | SCREEN | 1440×1797 | 57 | IN | DONE | calls=0 covered=4 partial=7 conflict=4 figma_only=7 missing=33 | Findings inside group and sub-group: conflict pair in Group 02 (notes 6171:7490, 6171:7500), duplicate suggestion in Group 01 (6171:7510). Name says conflict "blocks"; spec says findings never block publishing, check wording. |
| U03 | 6171:7535 | 5.3 · Variant · problems on changed and new rules | SCREEN | 1440×1851 | 57 | IN | DONE | calls=0 covered=7 partial=6 conflict=3 figma_only=6 missing=32 | Branch (variant) tab with Rules/Link strip (6344:60080); problem notes on "Variant outline" changed/new rows (6171:7960, 6171:7968, 6171:7983). US3. |
| U04 | 6178:7800 | 5.4 · Suggestion only (does not block) | SCREEN | 1440×1729 | 48 | IN | DONE | calls=1 covered=7 partial=4 conflict=2 figma_only=5 missing=3 | Only a redundancy suggestion (frame "Suggestion" 6178:8214, note 6178:8216) plus the alert (6616:44434). US2 and the non-blocking case. |
