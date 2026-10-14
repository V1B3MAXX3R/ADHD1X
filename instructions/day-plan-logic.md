# Day Plan Logic (requirements)

**Version 1.1.1** (2026-10-10)

Status: core requirements approved by Christian on 2026-10-10 (decision log A40, A41, A42). Open questions are at the bottom.

## Why it exists

Having the plan already made removes the mental block before starting coursework. The user spends no energy on scheduling (A32).

## Inputs the logic uses

| Input | Meaning | Where it comes from |
|---|---|---|
| Scenario | Automated plan, current mode (normal or Catch Up), or manual moves by the user | App state, user actions |
| Time | Hours available today, time of day | Day type (below), manual adjustment |
| Day | Today's date and day of week | System |
| Due date | When each assignment is due | Syllabus (A37) |
| Course | Which course the work belongs to; major courses weighted (A38) | Syllabus, onboarding |
| End of course | When the course finishes | Syllabus |
| Points | Points the assignment is worth | Syllabus |
| Point strength percentage | How much of the final grade the assignment counts for | Syllabus grade weights |

The syllabus provides all of these where possible (A37). Everything Gemini extracts from a syllabus is reviewed before saving.

## What the logic produces

- A plan (today's work) or a goal, built from the inputs above.
- All courses are lumped together into **one plan**, not one plan per course.
- Plans cover **today only**, optionally split by time of day (A32).

## Day length (A47)

Day length comes from how many study blocks the user picks. There are no separate day types.

| Blocks picked | Day length | Typical work |
| --- | --- | --- |
| 1 | Short day | Short assignments, homework, light research reading |
| 2 | Long day | Projects, heavy reading, research, small quizzes or tests |
| 3 | All day | Heavy work, heavy projects, tests, research, with break pop-ups to prevent burnout |

Time can always be adjusted manually.

## Deadline tie-breaker (A48)

Anything due within 24 hours jumps the line, overriding a block's usual ordering.

## Study blocks (how the user picks their day)

The user selects which study blocks they're doing today. Blocks are presets: they can be shifted within their time frame, or changed completely by hand.

| Block | Default time | What it holds |
| --- | --- | --- |
| Morning | 6 am to 12 pm | Heavy work first while energy is high, with smaller tasks mixed in between, then back to heavy work |
| Evening | 12 pm to 5 pm | Heavy, hard work first; the end of the block is small tasks only |
| Night | 5 pm to 8 pm | Only necessary heavy work (e.g. due soon). If nothing meets that bar, purely medium and small tasks |
| After 8 pm | Not planned by default | The app asks before planning anything later |

**How blocks behave through the day (A44):**

- Block times and what each block prioritizes are presets set on first load; the user can change all of them.
- As the day moves from one block to the next, tasks that haven't been started are re-sorted under the new block's rules.
- A task with a running timer is never interrupted: if the timer is running when a block ends (e.g. 12 pm), the task keeps going until the timer runs out, then the plan switches to the new block.
- If a timer is still running when a block ends, a pop-up asks "Keep the same task" or "Change it" (A45). The timer keeps running while it's shown. Wording under "Change it": "Switching to something lighter can give your brain a breather, so you finish the day still feeling productive. Your call." (A46)
- Timer and day blocks are separate tools. The user can turn on the timer only, the day blocks only, or both.


## Late work

- Late work can be added to the day plan **as a choice**, if needed. It is never forced in.
- Late work is added to Catch Up mode (A36, A39).

## Rules carried from earlier decisions

- Nothing changes the plan without the user's consent; manual moves always win (A4).
- No guilt language, no red overdue warnings, no streaks (A5, A25).
- Break prompts ask, never force; the user can dismiss them (A4).

## Safeguards and engine rules (approved, A41)

- **The scheduling itself is plain logic, not Gemini.** It's predictable, free, and works offline. Gemini's job is reading the syllabus and breaking tasks into steps.
- **All-day and 10-hour days are risky for burnout** (report 4.8). So the app shows the total load before you accept 2 or more blocks, break prompts are on by default at 2 or more blocks, and a 2+ block day is never set two days in a row without asking.
- **Hours are the time budget, not a promise.** The plan leaves buffer inside the 5 or 10 hours, because everyone underestimates task length (planning fallacy, report 4.5).

## Open questions

1. ~~Who picks the day type?~~ Answered: the user picks study blocks (A42).
2. Does the user tap "looks good" to accept the day's plan, or does it just appear ready to go?
3. ~~What does "load" mean?~~ Answered (A43).
4. ~~Block count vs day length?~~ Answered (A47).

*Note:* since block presets are fully changeable (A44), someone whose energy peaks later can move the heavy work to a later block.
