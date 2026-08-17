---
name: project-initialization
description: Collects and validates the business inputs required before creating or substantially rebuilding a website specification. Use when starting a new project, beginning a discovery phase, converting a reference site into a requirements questionnaire, or when the information needed for a PRD or SPEC is incomplete.
---

# Project Initialization

Use `INIT_QUESTIONNAIRE.md` as the intake template for this project.

## Workflow

1. Read the existing project documents and identify confirmed information that can be prefilled.
2. If the user provides a reference site, inspect its public information architecture and distinguish transferable patterns from its business-specific content.
3. Ask for the remaining inputs in small, related groups. Prioritize brand identity, enterprise profile, contact and conversion routes, catalogue data, content, legal information, and launch scope.
4. Record answers in the initialization questionnaire. Keep undecided fields marked as pending; do not treat them as requirements.
5. Summarize the confirmed scope, missing decisions, assumptions, and proposed next deliverables.
6. After the user confirms the collected information, use `managing-specs` to create or update `SPEC.md`, then use `managing-tasks` to create the implementation plan.

## Output Rules

- Keep the questionnaire readable by non-technical stakeholders.
- Ask only for information that affects business scope, user experience, content, legal compliance, data, or launch readiness.
- Do not add technical architecture or implementation details to the questionnaire unless they require a business decision.
- Do not begin implementation from an initialization questionnaire alone.
