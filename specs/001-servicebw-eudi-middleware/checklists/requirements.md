# Specification Quality Checklist: serviceBW ↔ EUDI Wallet Form Connections

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Iterations 1–2 (2026-10-07): The initial draft's untestable wording was fixed. The requirements
  affected were later removed or rewritten in iteration 3.
- Iteration 3 (2026-10-07): The spec was restructured after the user's review, recorded under
  Clarifications, Session 2026-10-07:
  - Two connection modes, pull and webhook, sharing one trigger URL, replace the earlier
    integration options.
  - Custom logic was removed. It appears only as an out-of-scope line for a later iteration.
  - Assumptions about fields used only by rules and about mandatory documents were removed.
  - Features nobody asked for were removed.
- Iteration 4 (2026-10-07): Both clarifications were resolved.
  - FR-014: DO.IT enters the webhook address in the middleware UI, and a form connection with a
    webhook address uses webhook mode.
  - FR-015: the "completed" update carries the documents, which are delivered only to the
    webhook address.
  - The wallet returning all documents or none was added as an assumption.
  - Final scans: no clarification markers, template placeholders, implementation terms or vague
    wording. Every scenario has Given/When/Then (5, 8, 5 and 5 per story). FR-001 to FR-020 and
    SC-001 to SC-008 are numbered without gaps, and every cross-reference resolves.
- All items pass. The spec is ready for `/speckit-plan`, or for `/speckit-clarify` if open points
  need revisiting.
- Iteration 5 (2026-10-07, during `/speckit-plan`): Three answers were recorded under
  Clarifications.
  - FR-007: team members sign in with personal accounts that are set up outside the UI.
  - FR-017: access to the connection URLs is restricted by the network, not by credentials.
  - FR-016: proof of sender for webhook updates is out of scope. US3's sender-confirmation
    scenario was removed, and the new "Restricted network" assumption covers both directions.
  - Re-check: still no clarification markers. Scenarios per story are now 5, 8, 4 and 5, and every
    cross-reference still resolves. All items still pass.
- Iteration 6 (2026-10-07, during `/speckit-plan` review): FR-018 now says what "delivered only
  once" means for webhooks, following the user's answer recorded under Clarifications: documents
  can't be obtained again after a confirmed delivery, and an update whose confirmation was lost
  may be repeated. All items still pass.
- Iteration 7 (2026-10-07, `/speckit-clarify` and follow-up): Five answers were recorded under
  Clarifications:
  - serviceBW waits for a final status;
  - pulls may repeat for 60 seconds (FR-018, FR-020, US2 scenarios 8–9);
  - the risk of a forwarded link is accepted, and serviceBW checks the applicant;
  - WCAG 2.1 AA for the management UI (SC-009);
  - request records are deleted after 7 days (FR-021).

  Afterwards, with the user's approval, wording was aligned with the plan:
  - FR-008: two entry points, a link and a QR code for another device;
  - FR-005: what "configuration" includes;
  - FR-006: what "in progress" means, and "unavailable" for every call;
  - FR-011: what "unavailable" means;
  - FR-016: retry limits for each kind of update;
  - FR-020 and SC-006: they also cover the service used to talk to wallets;
  - the edge case about a cancel that the wallet doesn't report.

  Re-check: no markers. FR-001–FR-021 and SC-001–SC-009 are numbered without gaps. All items
  still pass.
- Iteration 8 (2026-10-08, `/speckit-analyze` follow-up): Two answers were recorded under
  Clarifications, Session 2026-10-08:
  - requests expire exactly 10 minutes after the trigger, with no extra wait (FR-012 unchanged);
  - SC-005 covers what a test wallet can produce, and the new assumption "Checks a test wallet
    can't trigger" records what the middleware relies on.

  SC-004 now names its measurement point, and SC-007 says what "simultaneous" means.

  Re-check: no markers, and the numbering is unchanged. All items still pass.
- Iteration 9 (2026-10-08, review gate): Ten answers were recorded under Clarifications, Session
  2026-10-08. Together with wording that states existing plan decisions, the spec changed in these
  places:
  - FR-004: the reference placeholder in the pull URL;
  - FR-005: catalog and trusted-issuer changes;
  - FR-007: deleting an account ends access at once;
  - FR-010: documents whose revocation can't be checked are rejected;
  - FR-017: which environments enforce the restriction;
  - FR-019: encrypted connections with an explicit exception, and nothing personal in logs;
  - FR-020 and SC-006: the accepted delay during outages;
  - SC-002 and SC-003: their measurement conditions;
  - three new edge cases, and an addition to "Documents never collected";
  - three new assumptions, and additions to three existing ones.

  Re-check: no markers, no implementation terms, and the numbering is unchanged. All items still
  pass.
