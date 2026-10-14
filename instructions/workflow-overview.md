# ADHD1X Workflow Overview

**Version 1.1.1** (2026-10-10)

## Workspace folders (strict, one job each)
| Folder | Holds |
|---|---|
| `research/` | Raw data, technical benchmarks, academic and conceptual findings |
| `instructions/` | Prompts, system rules, functional requirements, prompt history (this file lives here) |
| `coding/` | Source code, unit tests, architecture files. Empty and locked until Phase 6 |
| `artifacts/` | Final generated assets, config files, documentation maps |


One space per phase. Each phase has its own file here, its own deliverable, and a gate that only Christian can open.

```
[1 Research] --gate--> [2 Concept] --gate--> [3 UX] --gate--> [4 AI + Tech] --gate--> [5 Blueprint] --exact phrase--> [6 Build: LOCKED]
                                                                                      ^ you are here
```

| Phase | File | Deliverable | Gate to move on |
|---|---|---|---|
| 1. Research and user needs | [01-research.md](phases/01-research.md) | Research report | Christian approves the research |
| 2. Product concept | [02-concept.md](phases/02-concept.md) | Concept comparison, feature inventory, recommended direction | Christian picks or edits a direction |
| 3. UX and personalization | [03-ux.md](phases/03-ux.md) | UX/UI spec and user journey | Explicit approval |
| 4. AI and architecture | [04-ai-architecture.md](phases/04-ai-architecture.md) | AI architecture and feasibility plan | Explicit approval |
| 5. Development blueprint | [05-blueprint.md](phases/05-blueprint.md) | Master blueprint plus ordered AI Studio prompts (not run) | Explicit authorization to build |
| 6. Implementation | [06-implementation-LOCKED.md](phases/06-implementation-LOCKED.md) | Working site | Only on "I approve the final blueprint. Begin implementation." |

## Rules that apply in every phase
- Planning only. No code, files, or components until Phase 6 unlocks.
- Christian is the product owner. Claude proposes, Christian decides.
- Nothing tentative becomes final without Christian saying so.
- Evidence is labeled: verified research, user requirement, recommendation, unverified assumption, open question.
- Accessibility (WCAG 2.2 AA minimum), privacy, and "no guilt, no punishment" are checked at every gate.

## Shared decision log
One running log for the whole project: approved, tentative, open questions, deferred, rejected (with reasons). It is owned by the Phase 1 research thread and lives at [`instructions/decision-log.md`](decision-log.md). Every phase reads it before starting and adds to it at its gate. Phase files here never copy decisions; they point to the log.

## How a phase moves forward
1. Read the previous phase's deliverable and the decision log.
2. Do the work in that phase's own space (its own thread, its own file).
3. Present the deliverable and the decisions needed.
4. Stop. Wait for Christian at the gate.
5. Record the outcome in the decision log, then fill in "Carries forward" in the phase file.
