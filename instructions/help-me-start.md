# Help Me Start (draft v1)

**Version 1.1.1** (2026-10-10)

Status: approved by Christian 2026-10-10 (flow was T19). Logged in [decision-log.md](decision-log.md). Planning only, no code.

## The job

Get from "I know I should do this" to actually doing it, in under a minute, with zero decisions if the user wants zero decisions. Christian's biggest struggle is procrastination (A31); starting tasks is half the MVP (A32).

## Draft flow

| Step | What the user sees | Why (evidence) |
|---|---|---|
| 1. Entry | One big "Help me start" button on the home screen, and a small one on every task | Fewer decisions; setup and choice are top complaints (report 4.10) |
| 2. Pick the task | The app pre-selects the top task from today's plan (A40, A48). One tap to accept, or "something else" | Removes the "what do I even do first" block |
| 2b. How big? (A49) | One question: "Bite-sized pieces, split in half, or the full thing?" | The only question asked; keeps the user in control without a pile of settings |
| 2c. Assignment details (A50) | If details are missing: a text box, plus an upload box for PDFs and docs (file types and size limits set in Phase 4). Extracted details shown for review before saving | Gemini needs the real instructions to give a good first move |
| 3. One tiny first move | Gemini (preset action, A26) gives **one** concrete first move that takes about 2 minutes, e.g. "Open the assignment page and read just the first paragraph." The next 2 to 4 steps are hidden under "show more" | Task chunking has indirect support; too many steps add load (report 5) |
| 4. When | "Start now" is the default. If the assignment already has all its details, a "Start later" button sits in the bottom corner (A51) | Implementation intentions ("when X, I will Y") are among the best-supported techniques, d about .65 in general populations (Gollwitzer & Sheeran 2006; verify before any app copy uses it, A69) |
| 5. Starter timer | 2-minute timer by default (2, 5, or custom). Stopping early is fine, no penalty | Flexible timer (feature H). No research claim attached; the feature stands on its own (A23, A69) |
| 6. After the timer | Three choices: "Keep going", "Next step", "Done for now" | Momentum without pressure (A5, A25) |
| Stuck path (A58, A59) | "Still stuck?" offers tips and tricks for this kind of assignment, or switching to another task (tasks are never fixed). On switching, one gentle line shows once, varied per assignment, e.g. "If we finish this now, we don't have to worry about it anymore." | Gives a way out instead of a dead end |

## Assignment info on hover (A52)

Hovering over an assignment for 2 seconds shows all its information on desktop. It stays open while the pointer is over it and closes with Esc. On phones and for keyboard users, a dedicated Assignments page shows every assignment; tapping or selecting one opens its full information (A55).

## Rules

- Only the task title, course, and major (A38) go to Gemini. No personal notes or grades (A36). Brain dumps go to Gemini only when the user taps "Sort my brain dump," with a reminder to leave out personal details (A94).
- If Gemini is unavailable, the app uses saved template first moves by task type (e.g. essay: "Open a blank doc and type the title"). Help me start always works.
- Tone: short, kind, no guilt. Ending early says something like "You started. Nice." never "You only did 2 minutes."
- Nothing gets added to the calendar or plan without the user's tap (A4).

## Questions for Christian

1. ~~Stuck: smaller step or switch?~~ Answered (A58, A59).
2. ~~Start later?~~ Answered (A51).
3. Should first moves be generated fresh every time, or saved and reused for similar tasks (faster, fewer Gemini calls)?
