---
name: gap-finder
description: "Diagnostic router that inspects project docs first and recommends the best skill(s) to uncover design, schema, API, or codebase gaps."
disable-model-invocation: true
---

# Gap Finder

A diagnostic router that identifies which gap-finding skill to run next based on your project's current stage, inspecting Markdown documentation first to conserve tokens.

## Process

### 1. Diagnose from `.md` docs first
Inspect the top-level directory layout and existing Markdown documentation (`README.md`, `GLOSSARY.md`, `docs/**/*.md`, ADRs, specs, blueprints) to determine the project's current stage and what decisions are already settled.

Inspect live source code **only** when:
- No design documentation exists yet,
- Existing docs appear stale relative to the codebase, or
- The user specifically asks about code-level gaps.

### 2. Check installed skills
List `.agents/skills/` (if present) so any newly installed review or audit skills are considered alongside the curated stage map below. Read a candidate skill's `SKILL.md` before recommending any skill not already listed in the map.

### 3. Select the top 1–2 highest-leverage skills
Match the detected stage and the user's concern to the best 1–2 skills:

#### Pre-Code Design & Spec
- `/architect-review` — system-wide boundaries, cross-module transactions, concurrency, scalability, and conflicting ADRs.
- `/database-design` — schema relationships, normalization, composite indexes, N+1 risks, and migration safety.
- `/api-patterns` — API style, response/error envelopes, pagination, versioning, rate limiting, and auth/authz contracts.
- `/domain-modeling` — fuzzy or overloaded vocabulary, edge-case business scenarios, `GLOSSARY.md` & ADR alignment.
- `/prototype` — risks that cannot be settled on paper; throwaway spike to validate a tricky mechanism or state model.

#### Pre-Launch / Operations
- `/deployment-procedures` — backups, migration ordering, rollback triggers, health checks, and post-deploy verification.

#### Live Codebase (Post-Code)
- `/code-review` — parallel Standards + Spec review of a branch or PR diff.
- `/brooks-audit` — module dependency graph, layering integrity, circular imports, and structural decay.
- `/improve-codebase-architecture` — shallow modules, leaky seams, testability friction, and deepening refactors.
- `/retro` — post-build review to turn recurring mistakes into lint rules, CI checks, or coding standards.

### 4. Output recommendation and stop
Present your recommendation in four concise parts:

1. **Detected Stage** — Current project stage inferred from the `.md` docs or workspace.
2. **Top 1–2 Skills to Run Now** — Exact `/skill` name and the specific blind spot each will check.
3. **Skip for Now** — Brief note on premature skills so the user avoids over-planning.
4. **Resolve With** — A 1-line handoff (e.g., `/grill-with-docs` to settle and document discovered gaps, or `/prototype` when a gap needs runnable code to prove).

Stop after presenting the four-part recommendation; wait for the user to choose before running any recommended skill.
