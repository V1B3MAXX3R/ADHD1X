# ADHD1X Decision Log Archive

**Version 1.1.1** (2026-10-10)

Settled items moved out of [decision-log.md](decision-log.md) to keep it short. Kept for history; nothing here is active.

Archived: 2026-10-10

## Tentative
| # | Proposal | Recommended by | Status |
|---|---|---|---|
| T1 | ~~Purpose: a real tool for a small group of students~~ | Phase 1 report §7 | Superseded by A9 (personal project) |
| T2 | ~~Diagnosis-free design~~ | Phase 1 report §7 | Approved as A11 |
| T3 | ~~First release: US users, 18+~~ | Phase 1 report §7 | Approved as A18 |
| T4 | ~~Production must use paid Gemini API tier; free tier data may be used to improve Google products and seen by human reviewers~~ | Phase 1 report §6 | Rejected by Christian 2026-10-10; superseded by A15 (free tier) |
| T5 | ~~5 to 8 student interviews before Phase 2~~ | Phase 1 report §3, §7 | Replaced by A12 (Christian as test user); revisit before any release |
| T9 | ~~Disclaimer wording~~ | Claude | Approved as A21 |
| T13 | ~~Gemini interaction model~~ | Claude | Approved as A26 (presets only for now); rest moved to F2 |
| T14 | ~~Quiz delivery~~ | Claude | Approved as A28 |

## Open questions
| # | Question | Owner |
|---|---|---|
| Q1 | ~~Project purpose~~ Answered: personal for now (A9). Still open: when and whether to release | Christian |
| Q4 | ~~Skills and time~~ Answered: beginner coder who can spot bad or broken code (reviewer role); part-time alongside college, no fixed weekly hours. Implications for Phase 4/5: simple common stack the AI tools know well; small build steps Christian can check in one sitting; plain-language changelog notes; every stage leaves the app in a working state; no deadlines on the plan | Christian |
| Q9 | ~~Free vs paid Gemini key~~ Decided free for now (A15). Still open: switch to paid before real personal data? Original note: a free AI Studio key means prompts may be used by Google and seen by human reviewers (see T4). Fine for fake test data; decide before putting real personal brain dumps through it | Christian, before first real use |
| Q12 | ~~How to collect age~~ Answered: full birthday (A19) | Phase 3 |
| Q13 | ~~Does the rest of feature K stay?~~ Answered: gamification narrows to goal-completion awards (A24); what the awards are is still open | Christian |
| Q14 | ~~Does A22 decide features or only claims?~~ Answered: claims only (A23) | Christian |

## Approved (later reversed)
| # | Decision | Date | Where decided |
|---|---|---|---|
| A19 | ~~Sign-up collects the user's full birthday (answers Q12). Used for the 18+ check. Birthday is never sent to Gemini; the app only needs it locally/server-side~~ Reversed 2026-10-10 by Christian: replaced by an 18+ checkbox (A30) | 2026-10-10 | Christian, Phase 1 thread ("never sent to Gemini" is Claude's recommendation, pending Christian's OK) |

## Tentative (rejected)
| # | Proposal | Recommended by | Status |
|---|---|---|---|
| T8 | ~~Age affects personalization, backed by research. Status: no evidence found yet in the Phase 1 research for age-based personalization within 18+ students; needs a targeted evidence check before it becomes a requirement. Risk: stereotyping by age, which conflicts with the 'personalize by user choice' principle~~ | Christian; evidence check by Phase 1 thread | Rejected by Christian 2026-10-10: no evidence age changes needs in a meaningful way |

## Archived 2026-10-10 (later batch)
| # | Item | Status |
|---|---|---|
| T11 | ~~Working definition for A22 (Claude draft). Clinically proven = meta-analysis, systematic review, randomized controlled trial, or clinical consensus statement. Enough real-world examples = at least 2 independent peer-reviewed studies showing it works in practice, OR consistent first-person reports plus at least 1 peer-reviewed study. Everything else is labeled theory and kept out | Claude~~ | Approved as A34 (3 studies, community sources as consistent supporting info) |
| T6 | ~~Low-stimulation theme is a first-class choice at onboarding, not a fallback | Phase 1 report §4 accessibility notes~~ | Approved as A35 (three themes) |
| Q6 | ~~Which 2 or 3 problems does the MVP solve?~~ | Answered: A32 |
| Q7 | ~~What does success look like after one semester?~~ | Answered: A33 |
| Q17 | ~~What does 'major' mean in the day-plan logic: courses in your major get higher priority, or something else?~~ | Answered: A38 |
| Q18 | ~~Where do grade numbers for Catch Up come from: typed in by hand, or pulled from a syllabus upload (grade weights) plus typed-in scores?~~ | Answered: A37 |
| T16 | ~~Catch Up theme behavior (Claude): shows only what is due soonest and hides everything else, no red warnings or 'you are behind' language (A5, A25). The app may offer to switch into it, but never switches on its own (A4) | Claude~~ | Approved as A39 (manual switch only) |
| Q19 | ~~Day type: picked automatically from what's due, or chosen by the user each morning with a suggestion?~~ | Answered: A42 |
| T18 | ~~Wording under "Change it". Christian's draft: "Doing this prevents brain fog, mental exhaustion, and relaxes you enough to get off while finishing productive." Claude flag: 'prevents brain fog and mental exhaustion' is a health claim A22/A23 rule out. Claude draft: "Switching to something lighter can give your brain a breather, so you finish the day still feeling productive. Your call." | Christian + Claude~~ | Approved as A46 |
| Q21 | ~~Study blocks: does one block ~ 5-hour day, two ~ 10-hour, three ~ all-day (so burnout safeguards kick in at two or more)? ('load' part answered in A43)~~ | Answered: A47 |
| T12 | ~~Award ideas revised per A25: a one-time celebration when a goal is reached (e.g. a hand-drawn doodle or message), nothing to collect, maintain, or come back for. Earlier ideas (galaxy map collection, unlock tracks) dropped because they create a commitment | Claude~~ | Superseded by A53 (spaceship progress) |
| T7 | ~~Use cumulative progress counts instead of streaks (Silverman & Barasch 2023) | Phase 1 report §4.9~~ | Folded into A53/T20 (forward-only progress instead of streaks) |
| T20 | ~~Spaceship rules to stay within A25 (no commitment): progress only ever goes forward, never decays or resets; no daily targets, timers, or missable events; nothing lost by being away; can be hidden entirely. Point values per assignment type set in Phase 3 | Claude~~ | Approved as A54, with semester return added |
| T21 | ~~Interface style choice: Space mode (themed names like Hyperdrive, spaceship voyage progress, galaxy look) or Basic (plain names like Catch-up mode, a simple progress bar, plainer look). Open: is Basic the same as the Low theme (A35), or a separate setting? | Christian (idea)~~ | Approved as A57 (presentation only, separate from themes) |
| Q22 | ~~Evidence check: does switching tasks at a block change reduce brain fog?~~ | Answered: no study meets A34; closed by A68 |
| Q8 | ~~Competitor audit~~ | Reframed by Christian 2026-10-10: not competing, just look for ideas. Done as an idea scan (T43 to T51) |
| Q2 | ~~Deployment region and minimum user age~~ | Answered: US, 18+ (A18, A30) |
| Q20 | ~~Tap to accept each day's plan?~~ | Answered: yes, tap to accept or edit (A85 quiz Q1, A4) |
