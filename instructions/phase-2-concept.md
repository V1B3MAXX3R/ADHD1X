# Phase 2: Product Concept (deliverable)

**Version 1.1.1** (2026-10-10)

Status: **approved by Christian 2026-10-10.** Direction A and all tags as written (A96, A97). Logged in [decision-log.md](decision-log.md). Planning only, no code (A2).

Inputs: [Phase 1 report](https://claude.ai/code/artifact/be0199da-9277-4620-92b6-cfc034293509), [ADHD and autism evidence report](https://claude.ai/code/artifact/93d76cd1-8565-4d79-8d36-42327f50c6a5), [idea scan](../research/idea-scan.md), and decisions A1 to A94.

Most of the direction was already set during Phase 1 (A32: MVP is starting tasks plus an automatic day plan; A33: success is better grades and on-time work). So this phase mostly confirms that direction and sorts the approved features into build order.

## 1. Three concepts

| | **A. School Day Copilot** (recommended) | B. Executive-Function Dashboard | C. Modular Toolkit |
|---|---|---|---|
| **One line** | A school helper that plans your day and gets you started | A life-and-school dashboard: tasks, energy, routines, home life, all in one view | Separate one-job tools (break it down, rewrite this, sort my dump), no plan holding them together |
| **Home screen** | Today's plan, or one "do this next" card | Many widgets at once | A menu of tools |
| **What drives it** | Syllabus, due dates, points, study blocks | User-entered everything | Whatever the user pastes in |
| **Like** | Shovel plus Help me start | Tiimo | Goblin Tools |

### Scores (1 = poor, 5 = strong for ADHD1X)

| Criterion | A | B | C | Why |
|---|---|---|---|---|
| User value for Christian's goal (A31, A33) | 5 | 3 | 3 | A attacks procrastination and on-time work directly; B spreads thin; C helps in the moment but doesn't plan |
| Feasibility for a part-time weak coder (Q4 answer) | 4 | 2 | 5 | C is simplest; A is moderate (plan logic is plain code, A41); B is large |
| Accessibility (A3) | 4 | 2 | 4 | B's busy dashboard fights the low-stimulation and one-thing-at-a-time findings |
| Complexity (lower is better, so 5 = simplest) | 3 | 1 | 5 | |
| AI needs (5 = light, cheap, free tier friendly) | 4 | 3 | 2 | A uses Gemini only for presets (A26) and scheduling is plain logic; C leans on Gemini for everything |
| Privacy (5 = least personal data) | 4 | 2 | 3 | B pulls in life data; A keeps grades local (A36) |
| Scalability (5 = easy to grow later) | 4 | 3 | 3 | A can add C's tools as presets later |
| **Total (out of 35)** | **28** | **16** | **25** | |

**Recommendation: A, School Day Copilot,** with C's best tools folded in as presets (which A26, A60, A61 and A94 already do). It's the only concept that matches the MVP and success metric you already approved, and it stays school-only, true to the original plan.

## 2. Feature inventory with priority tags

Tags: **MVP** = in the first working version. **Enhancement** = next, once the MVP works for you. **Future** = parked. Feature letters A to L are from the master prompt.

### Master prompt features A to L

| # | Feature | Tag | Covered by | Reason |
|---|---|---|---|---|
| A | Brain dump | Enhancement | A26, A94 | Useful, but the plan works without it; adds a Gemini privacy step |
| B | Task chunking | **MVP** | A49, A82, A83 | Core of Help me start |
| C | Time estimates | **MVP** (basic estimate, Enough time? check, finish time) / Enhancement (reading time from pages, time check-back) | A86, A87, A89, A90 | The plan needs estimates; the learning-your-pace parts can come after |
| D | Academic planner | **MVP** | A32, A37, A40 to A48, A55, A88 | The day plan itself, syllabus upload, Assignments page, Not now list |
| E | Energy recommendations | Enhancement | A64 | Optional add-on to the plan |
| F | Sensory and social load | **MVP** (Low theme, sensory controls, plain words) / Enhancement (Message my professor, tone buttons) | A35, A74, A76, A61, A92 | Accessibility basics belong in v1; social helpers next |
| G | Routines and transitions | **MVP** (block-change prompt, heads-up) / Enhancement (saved routines) | A45, A63, A93 | Transitions are part of the day plan |
| H | Focus timer | **MVP** | A44, A75 | Starter timer is half of Help me start |
| I | Body doubling | Future | F1 | Parked; Discord link later |
| J | Interest mapping (major) | **MVP** (major weighting in plan logic) / Enhancement (major-based Gemini examples) | A38 | Weighting is cheap plain logic |
| K | Gamification | **MVP** (Space or Regular mode, small spaceship progress) / Enhancement (logbook, fun facts, celebrations) | A53, A54, A57, A67, A24 | Space mode is a Basic 5 quiz question, so it should exist at launch; keep it "small and simple" (A53) |
| L | Goal creation | Enhancement | A24, A36 | Goals and Catch Up target grades come after the plan works |

### Other approved features

| Feature | Tag | Covered by | Reason |
|---|---|---|---|
| Disclaimer, 18+ checkbox, optional quiz | **MVP** | A20, A21, A30, A78, A85 | Required first screens |
| Assignment details box and upload | **MVP** | A50 | Help me start and the plan need real details |
| Hover info and Assignments page | **MVP** | A52, A55 | Basic way to see assignments |
| Stuck path with tip or switch | **MVP** | A58, A59 | Part of Help me start |
| Campus support page | **MVP** | A65 | Static page, nearly free to build |
| Make it clear preset | Enhancement | A60 | Strong value, but a second Gemini preset after Help me start |
| Where was I? note | Enhancement | A62 | Small, after core flow works |
| Session goal line | Enhancement | A91 | Small add-on to the timer |
| Catch Up / Hyperdrive mode | Enhancement | A36 to A39, A56 | Needs grade weights and pace logic; builds on a working plan |
| Tips library with evidence badges | Enhancement | A79, A66 | Content needs writing and evidence checks (A71) |
| Personalization levers beyond the Basic 5 | Enhancement | A80 | MVP uses the Basic 5 answers; the rest switch on later |
| Ask about this assignment preset | Future | A84 | Was approved as a "possible later" preset |
| Canvas API, more Gemini controls, peer rooms | Future | F1 to F3 | Already parked |

### MVP at a glance

Onboarding (disclaimer, 18+, Basic 5 quiz) → syllabus and assignment input → automatic day plan with study blocks, Enough time? check and finish time → Help me start (one question, tiny first move, starter timer, stuck path) → Assignments page → Low theme, sensory controls, Space or Regular mode with a small spaceship.

## 3. Decisions for Christian at the gate

1. **Direction:** A (recommended), B, C, or a mix?
2. **Tags:** do the MVP and Enhancement tags look right? The two I'm least sure about are Catch Up (I put it in Enhancement; move it to MVP if grades are the first thing you want to fix) and Space mode (I put the basic version in MVP because the quiz asks about it).

## Carries forward to Phase 3

- **Chosen concept:** A, School Day Copilot (A96).
- **MVP feature list:** every row tagged MVP above (A97), summarized in "MVP at a glance."
- **Next after MVP:** every row tagged Enhancement, including Catch Up / Hyperdrive.
- **Deferred:** Future rows (body doubling, Ask about this assignment, Canvas, more Gemini controls). **Rejected:** R1 to R3.
