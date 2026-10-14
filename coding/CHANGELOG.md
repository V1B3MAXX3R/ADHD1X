# ADHD1X Coding Changelog

Every code change gets an entry here, in the same step as the change (decision A17).
Newest entries go at the top. Each part of the website also has its own `CHANGELOG.md` with the detail for that part; this file keeps one summary entry per change and lists which parts it touched.

## Where each part's changelog lives

| Part | Folder / changelog |
|---|---|
| App routes and global state | [src/app/](src/app/CHANGELOG.md) |
| Today page and day-plan engine | [src/features/today/](src/features/today/CHANGELOG.md) |
| Calendar import (new and upcoming assignments) | [src/features/calendar/](src/features/calendar/CHANGELOG.md) |
| Catch Up / Hyperdrive | [src/features/catchUp/](src/features/catchUp/CHANGELOG.md) |
| Memory (Where was I? note, session goal) | [src/features/memory/](src/features/memory/CHANGELOG.md) |
| Focus (parking lot, calm mode, ramp-in, one-tap start) | [src/features/focus/](src/features/focus/CHANGELOG.md) |
| Planning helpers (energy, long days, recovery, reading) | [src/features/planning/](src/features/planning/CHANGELOG.md) |
| Tips and syllabus phrases | [src/features/tips/](src/features/tips/CHANGELOG.md) |
| Saved routines | [src/features/routines/](src/features/routines/CHANGELOG.md) |
| Grades import | [src/features/grades/](src/features/grades/CHANGELOG.md) |
| Canvas grades tool (Python) | [tools/canvas_grades/](tools/canvas_grades/CHANGELOG.md) |
| UI (Cosmos view) | [src/features/ui/](src/features/ui/CHANGELOG.md) |
| Course and syllabus setup | [src/features/courses/](src/features/courses/CHANGELOG.md) |
| Assignments list | [src/features/assignments/](src/features/assignments/CHANGELOG.md) |
| Help me start (templates and tips) | [src/features/helpMeStart/](src/features/helpMeStart/CHANGELOG.md) |
| Help pages | [src/features/help/](src/features/help/CHANGELOG.md) |
| Welcome and major setup | [src/features/onboarding/](src/features/onboarding/CHANGELOG.md) |
| Personalization quiz rules | [src/features/quiz/](src/features/quiz/CHANGELOG.md) |
| Settings, export, import, delete | [src/features/settings/](src/features/settings/CHANGELOG.md) |
| Space voyage | [src/features/voyage/](src/features/voyage/CHANGELOG.md) |
| Clock (real-world time, reminders) | [src/shared/clock/](src/shared/clock/CHANGELOG.md) |
| Shared (app shell, data, Gemini client, estimates, styles) | [src/shared/](src/shared/CHANGELOG.md) |
| Component catalog (developer page) | [src/features/catalog/](src/features/catalog/CHANGELOG.md) |
| Tests (unit, fixtures, end-to-end) | [tests/](tests/CHANGELOG.md) |
| Gemini features (AI Mode, assignment tools, planning helpers, personalizer) | [src/features/gemini/](src/features/gemini/CHANGELOG.md) |
| Gemini rules and safety (server) | [server/](server/CHANGELOG.md) |
| Gemini endpoint (API) | [api/](api/CHANGELOG.md) |

## 2026-10-14 - Security hardening
- Made by: Claude
- Changed: Access-code guess limits and checks on the Gemini endpoint; stronger headers in vercel.json (HSTS, no framing, same-origin policies, form-action); vite preview serves the same headers and the dev server is explicitly localhost-only; removed @vercel/node (types only) and upgraded react-router-dom to 7 (production dependencies now audit at 0 issues, all dependencies 26 down to 15); added SECURITY.md, security tests and npm run check:audit. Touched: api, server, shared, tests, config.
- Why: Christian asked for security for his website. A review found no committed secrets and no dangerous code patterns; the gaps were guess limits on the access code, a few missing headers, and dependency warnings.
- Notes: 176 unit, 11 browser and 34 Python tests pass; the built site shows zero CSP violations in a real browser. Nothing was committed or pushed.

## 2026-10-14 - Grades import: choose courses
- Made by: Claude
- Changed: The grades preview now lets you tick which courses to bring in. Touched: grades, tests.
- Why: Christian's first real Canvas file had 11 courses (604 assignments, 106 graded). Importing all of them at once would clutter the app, and there is no delete button yet.
- Notes: 155 unit, 11 browser and 34 Python tests pass. Nothing was committed or pushed.

## 2026-10-14 - Import grades from Canvas (Python tool + file import)
- Made by: Claude
- Changed: New Python tool (tools/canvas_grades) that reads your own grades from Canvas with a token typed at a hidden prompt, and a Catch Up panel that imports the file it writes. package.json: added test:python and put it in npm run check. .gitignore: blocks canvas-grades*.json, adhd1x-export-*.json, *.ics and Python caches. Touched: tools, grades, catchUp, shared, tests.
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: 154 unit, 11 browser and 34 Python tests pass. Not tested against the real Canvas. Nothing was committed or pushed.

## 2026-10-14 - Calendar adds courses and assignments for you
- Made by: Claude
- Changed: Importing a calendar can now create the courses it names and add the ticked assignments, after a preview and a tap. Long calendar titles are cut to fit. Touched: calendar, tests.
- Why: Christian's calendar names the course, but the page said 'Add a course first'. He asked for the app to add the course and the assignments itself when it can read them. The long-title bug from the audit is fixed in the same change.
- Notes: 137 unit tests and 10 browser tests pass. Nothing was committed or pushed.

## 2026-10-13 - Whole site in the Cosmos form
- Made by: Claude
- Changed: The Cosmos look now gives every page the Cosmos layout (masthead, header band with illustration, footer), not only the colors. Touched: ui, shared, tests.
- Why: Christian said the whole website must be built in the Cosmos form, not just one piece.
- Notes: 130 unit tests and 9 browser tests pass. Nothing was committed or pushed.

## 2026-10-13 - Cosmos look on every page
- Made by: Claude
- Changed: Cosmos look is now an app-wide setting instead of one page. Touched: ui, shared, settings, tests.
- Why: Christian reported that the Cosmos UI disappeared when he clicked other pages.
- Notes: 130 unit tests and 9 browser tests pass. Nothing was committed or pushed.

## 2026-10-13 - Cosmos view added (pulp-comic UI)
- Made by: Claude
- Changed: New page /cosmos with a retro pulp-comic look, three tabs, animated illustrations and live mission-log cards. framer-motion added as a dependency. Touched: ui, voyage, app, shared, tests.
- Why: Christian pasted the pulp-comic Cosmos UI (ui0 to ui10) and asked for it to go in a ui folder with the changelog updated.
- Notes: 130 unit tests and 8 browser tests pass. Nothing was committed or pushed.

## 2026-10-13 - Original features 13 to 30 added
- Made by: Claude
- Changed: Added the pasted study helpers: time check-back, reading time, saved routines manager, all quiz questions, energy check, tips library, voyage logbook, recovery gaps, definition of done, ramp-in, 15-minute turn-in plan, parking lot, syllabus phrases, zero-decision start, two-long-days question, calm mode and nine extra fun facts. Features 11 and 12 (Where was I? note, session goal and outcome) were already built as the memory system, so they were not added twice.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added. Touched: focus, planning, tips, routines, today, settings, help, voyage, quiz, memory, assignments, helpMeStart, app, shared, tests.
- Notes: 130 unit tests and 7 browser tests pass. Nothing was committed or pushed.

## Entry format

```
## YYYY-MM-DD - short title
- Made by: Claude | Codex | Gemini | Christian
- Parts: which part folders changed
- Changed: what files or features changed
- Why: the reason, or the decision-log item it implements
- Notes: anything to watch, follow-ups, known issues
```

## Entries

## 2026-10-13 - Gemini features
- Made by: Claude (from Gemini's files)
- Parts: gemini (new), server, api, shared, app, helpMeStart, assignments, today, settings, onboarding, tests
- Changed: 15 Gemini presets behind one endpoint, with a master AI Mode switch and the screens for each: Make it clear, Message my professor, Ask about this assignment, pre-submission check, step breaker, practice questions, brain dump sorter, planning helpers (tune today, split time, milestones), Describe how you work, custom palette, and Personalize for my major with saved routines. Every helper has a built-in version. `npm run dev` now serves the endpoint itself.
- Why: Christian asked for these Gemini features inside the website, in their own subfolder.
- Notes: The pasted schema, client, server and dev-server files were adapted, not copied: they would have overwritten the Calendar, Catch Up and memory work, turned celebrations on by default, skipped most palette contrast checks and used a dev server that cannot run TypeScript. Several features are not in the decision log yet (see the gemini changelog). Needs a real Gemini key and access code for a live test. 50 new unit tests (113 total) and 1 new browser test (6 total) pass.
## 2026-10-13 - Memory system
- Made by: Claude
- Parts: memory (new), app, shared, helpMeStart, today, assignments, tests
- Changed: In the app: a session goal on Help me start, a "Done for now" wrap-up (done / partly / not yet, plus a one-line "Where was I?" note), and the note coming back on Today, Help me start and the assignment details. For AI helpers: a shared project memory in `instructions/memory/` (index, notes about Christian, how he likes to work, the project layout, open items, links), and `RULES.md` now tells every AI coder to read it first.
- Why: Christian asked for a memory system. The app part implements the approved A62 and A91; the helper part saves him repeating himself.
- Notes: Notes and goals never go to Gemini. Fixed on the way: the timer bar stayed on screen after "Done for now" when the timer had run out. 6 new unit tests and 1 new browser test.
## 2026-10-13 - Catch Up / Hyperdrive
- Made by: Claude (from Gemini's Bucket 2 Part 2 files)
- Parts: catchUp (new), today, settings, shared, app, tests
- Changed: New Catch Up page and Settings section: on/off switch, target-grade calculator (quick percent or per-assignment scores), Aggressive/Normal/Chill paces with real day counts, and a Due soonest list. Today shows a status bar and includes earlier unfinished work, only while it is on. Space style adds still warp streaks. Grade math is local and never goes to Gemini.
- Why: Decisions A35 to A40, A56, A81.
- Notes: Adapted to follow the decision log: never offered automatically (A39), picking a pace does not turn it on, the days estimate uses work due within 14 days, calmer wording. Case for you to confirm: the pace sizes (4, 2.5 and 1.25 hours a day) came from Gemini, since A81 gives no numbers. FR-15 in the blueprint still says this section is hidden in the MVP. 10 new unit tests, 1 new browser test.
## 2026-10-13 - Gemini Bucket 1 files placed and merged
- Made by: Claude (from Gemini's files)
- Parts: catalog (new), tests, settings, clock, shared, app
- Changed: Placed the files Gemini wrote into the current folder layout: component catalog page (dev only), 10 fake syllabi and 10 fake assignments with safety tests, Playwright end-to-end and axe accessibility tests (now also scanning Today, Assignments, Calendar, Voyage and Settings in regular and Space style), and the manual checklist (extended with Calendar and clock checks). Gemini's ReminderBanners was not added as a second copy: its tone wording and "today's blocks" idea were merged into the clock reminders, and its one-week backup offer became `ExportReminder`.
- Why: Completes the remaining MVP items (M2, M6, M9, M10; prompts P04, P10, P13, P15, P16).
- Notes: Gemini's changelog entry listed old file paths and was not pasted in. 3 end-to-end tests and 47 unit tests pass. The manual checklist still needs a person on a real Windows PC and iPhone.
## 2026-10-13 - Real-world clock
- Made by: Claude
- Parts: clock (new), today, calendar, assignments, settings, app, shared
- Changed: Shared clock (device time) used across the app. Today's plan now starts from the real time instead of a fixed 9:00 am, with a "Right now" line and an "Update my plan" button so the plan never rearranges by itself. Plain-words due times on Today and Assignments. Calendar lists roll over at midnight. Optional in-app reminders (5-minute block heads-up, due soon) that respect quiet hours, with an optional browser pop-up. Header date and time with a Settings switch. After 8 pm the "plan anyway" button now plans full-length blocks.
- Why: Christian asked for a real-world clock that affects the study plan and other features.
- Notes: 14 new tests (43 total, all pass). Reminders use the existing quiz-driven settings (due reminders, heads-up, quiet hours, where to show). Browser pop-ups are untested in a real browser.
## 2026-10-13 - Fixed test Case 3 (day-plan shortfall)
- Made by: Claude
- Parts: today (tests only)
- Changed: In `tests/unit/planEngine.test.ts` the test Morning window is now 07:00 to 12:00 (was 06:00 to 12:00), matching the spec's "full Morning = 5 hours x 85% = 255 minutes" (Technical Spec section 1.3). No engine or spec change.
- Why: Case 3 expected 1.5 hours short but the old test window gave 0.8. Christian chose to fix the test fixture.
- Notes: All 29 unit tests pass. Closes the open item from the earlier entries.
## 2026-10-13 - Space UI overhaul
- Made by: Claude (from Christian's Space UI script)
- Parts: voyage, shared, app, today, assignments, settings
- Changed: Space background (stars and planets), Voyage page with solar system map, spacecraft, planet badges, mission log and fun facts (FF1 to FF20), a finish reward pop-up, a header Space mode switch, an "I finished this" button on Today, and a Celebrations switch in Settings. Code was split into small files per part instead of the script's few large ones.
- Why: Christian's Space UI overhaul (A53, A54, A57, A67, A77).
- Notes: The pasted script was cut off partway through the Voyage page, and used old file paths that would have overwritten the Calendar section, so it was rebuilt by hand. Changes from the script to follow the decision log: the reward shows only with Celebrations on (A5, A24, A67); the header switch changes only the look (A57); Space is not forced as the starting style. 6 new tests. Case 3 plan-engine test still open.

## 2026-10-13 - Calendar section
- Made by: Claude
- Parts: calendar (new), app, shared
- Changed: New Calendar page (`/calendar`) with .ics import, a review step, New assignments and Coming up lists. Added `calendarItems` storage and bumped the saved-data version from 1 to 2 (existing saved data is kept; old export files still import). Assignments now have source "calendar" and an optional `calendarId`. Calendar link added to the main navigation.
- Why: Christian asked for calendar import (Google Calendar, Canvas and similar) that shows new and upcoming assignments and helps the study plan.
- Notes: Snapshot import only, no live link. 12 new unit tests (`tests/unit/calendar.test.ts`). Case 3 plan-engine test still open.

## 2026-10-13 - Project cleanup: one folder per part of the website
- Made by: Claude
- Parts: all
- Changed: Moved files so each part has its own folder under `src/`. `src/data`, `src/ai`, `src/components`, `src/styles` and `estimates.ts` moved into `src/shared/`. `planEngine.ts` moved to `src/features/today/`, `voyage.ts` to `src/features/voyage/`, `templates.ts` to `src/features/helpMeStart/`, `quizRules.ts` to the new `src/features/quiz/`. Updated every import path. Added a `CHANGELOG.md` to every part folder. Replaced the outdated "LOCKED" text in this folder's README. Fixed the `@google/genai` version in `package.json` (`^2.29.1`) and made the secret scan skip the setup script.
- Why: Christian asked for every part of the website in its own subfolder so each can be viewed and updated on its own.
- Notes: No behavior changes. Typecheck, contrast check and secret scan pass. 10 of 11 unit tests pass; "Case 3" in `tests/unit/planEngine.test.ts` fails (0.8 hours short instead of 1.5) because the test's Morning window (06:00 to 12:00) does not match the spec's 5-hour example. Waiting on Christian to pick a fix.

## 2026-10-13 - Phase 6 MVP implementation (M0 to M10)
- Made by: Gemini
- Parts: all
- Changed: Created full `coding/` workspace including `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `scripts/secret-scan.mjs`, `scripts/check-contrast.mjs`, `public/manifest.json`, `public/sw.js`, data layer, pure logic (`planEngine.ts`, `quizRules.ts`, `estimates.ts`, `voyage.ts`, `templates.ts`), serverless Gemini proxy (`api/ai/[preset].ts`, `server/`), accessible UI components, all MVP routes, and unit test suites (`tests/`). (File locations here are as of that date; see the cleanup entry above for the new layout.)
- Why: Implements approved Phase 5 Blueprint (FR-01 to FR-22) and Technical Spec (A1 to A117, T70 to T79).
- Notes: Run `npm install && npm run check` locally in VS Code to execute typecheck, unit tests, contrast check, and secret scan.








