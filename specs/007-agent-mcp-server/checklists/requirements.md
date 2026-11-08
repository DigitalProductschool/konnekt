# Specification Quality Checklist: Agent Access through an MCP Server

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-04
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

- **Named technology, on purpose.** The MCP protocol, its standard authorization, its skills
  extension and Claude Code are named because they are the product itself: what team members install
  and connect. The decisions on OAuth 2.1 with PKCE, client registration and the reuse of the
  editor's TypeScript rules logic were taken in the discussion of 2026-11-04. They are recorded in
  Clarifications and Assumptions as constraints for the plan, not in the requirements.
- **Final decisions only.** The input, Clarifications and requirements state each decision once, in
  its final form; no section corrects or amends another. Update them together when a decision
  changes.
- **Description in place of the serviceBW form** (spec 006). Agents search by, read and set a
  connection's optional description where they used the serviceBW form. An empty description blocks
  nothing, and one longer than 500 characters is refused (FR-012, FR-016, FR-022). Answers give it
  in full (FR-008); the approval page shows it as the details page does (FR-023). Like the rest of a
  published connection's content, its description is read-only for agents (FR-018).
- **Three access levels.** "Read only", "Read and edit drafts", and "Read, edit drafts and manage
  live connections". Only the third lets agents deactivate, reactivate and delete published
  connections, each with approval (FR-003, FR-018, FR-021, User Story 7). No level lets agents
  change a published connection's content. The team member can raise or lower the level of each
  agent connection and token on the user page, or revoke it (FR-006).
- **Defaults chosen without asking**, listed in Assumptions:
  - approval requests expire after 10 minutes;
  - agent connections end after 30 days without use;
  - personal access tokens expire after at most 90 days;
  - an agent can create at most 20 drafts per hour, a setting;
  - pages of at most 25 connections;
  - an agent-built draft continues at the furthest step its content reaches;
  - an approval for a published connection applies to its status (live or deactivated), so a change
    to its content in the management interface while the approval waits doesn't void it;
  - an access level changed on the user page applies from the agent's next call, and a token keeps
    its secret and expiry;
  - revoking an agent, or lowering its level, cancels its waiting approval requests that it could no
    longer make.
- **Validation**: one iteration. FR-007's "No tool MUST list…" was reworded to "A tool MUST NOT
  list…". All items pass.
