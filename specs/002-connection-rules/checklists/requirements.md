# Specification Quality Checklist: Rules for Form Connections, with Groups and Branches

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-22
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

- Iteration 1 (2026-10-22): The first validation fixed four issues:
  - FR-003: the condition "class is valid" also accepts a licence class without an expiry date of
    its own. Class B usually has none, so the rule would otherwise fail for most citizens.
  - FR-006: rules removed in a branch don't count when checking for an empty group, and a branch
    needs a name.
  - SC-006: rewritten as a measurable outcome (100% of linked branches follow, 0 branch changes
    lost).
  - Assumptions, "Design": the design tool is no longer named.
- Open: one clarification marker, in FR-016. It asks whether a field that rules check is always
  delivered to serviceBW, or whether a team member can mark it "only for rules". Spec 001 deferred
  this choice to the iteration that adds custom logic (spec 001, Clarifications, Session
  2026-10-07). Its iteration 3 also removed an assumption about fields used only by rules.
- Scans: no template placeholders remain. Every scenario has Given/When/Then (7, 7, 9 and 3 per
  story). FR-001 to FR-031 and SC-001 to SC-009 are numbered without gaps, and every
  cross-reference resolves, including those to spec 001.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
