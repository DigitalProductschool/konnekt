# Specification Quality Checklist: Conflict and Redundancy Checks for Rules

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-28
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

- Iteration 1 (2026-10-28): The first validation fixed four issues:
  - FR-005 and FR-006: an always-met item was reported "wherever it is", which contradicted FR-005's
    rule that a branch no applicant can meet reports only its conflicts. Always-met items now follow
    that rule, and a group reported always met hides its members' findings, as a redundant group
    does.
  - US2-AS7 and SC-002: deleting the redundant items keeps every outcome only for applicants whose
    documents give every value (FR-009). An item that is redundant because another is always met
    can still decide the outcome when that other item's value is missing.
  - FR-011: adding or removing a group's message was listed as a trigger, although messages don't
    affect findings (Assumptions, "Outcomes, not messages"). Removed from the list.
  - FR-005: now refers to FR-009 for the applicants it considers.
- Iteration 2 (2026-10-28): The one clarification marker, in FR-019, is resolved (Clarifications,
  Session 2026-10-28, answer A). It asked whether a team member can dismiss a finding about a rule
  they keep on purpose, since spec 002's own User Story 1 example ("Licence classes includes one of
  B" next to "Licence class B – Issue date is at least 2 years ago") gets a redundancy finding under
  FR-005 and FR-007. Findings can't be dismissed and nothing about them is stored; redundant and
  always-met findings are shown less prominently than conflicts. Every item now passes.
- Scans: no template placeholders remain. Every scenario has Given/When/Then (7, 7, 5 and 5 per
  story). FR-001 to FR-020 and SC-001 to SC-006 are numbered without gaps, and every reference to
  spec 002 names it.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
