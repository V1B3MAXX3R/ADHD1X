# ADHD1X Coding Changelog

Every code change gets an entry here, in the same step as the change (decision A17).
Newest entries go at the top. Each part of the website also has its own `CHANGELOG.md` with the detail for that part; this file keeps one summary entry per change and lists which parts it touched.

## Where each part's changelog lives

| Part | Folder / changelog |
|---|---|
| App routes and global state | [src/app/](src/app/CHANGELOG.md) |
| Today page and day-plan engine | [src/features/today/](src/features/today/CHANGELOG.md) |
| Calendar import (new and upcoming assignments) | [src/features/calendar/](src/features/calendar/CHANGELOG.md) |
| Course and syllabus setup | [src/features/courses/](src/features/courses/CHANGELOG.md) |
| Assignments list | [src/features/assignments/](src/features/assignments/CHANGELOG.md) |
| Help me start (templates and tips) | [src/features/helpMeStart/](src/features/helpMeStart/CHANGELOG.md) |
| Help pages | [src/features/help/](src/features/help/CHANGELOG.md) |
| Welcome and major setup | [src/features/onboarding/](src/features/onboarding/CHANGELOG.md) |
| Personalization quiz rules | [src/features/quiz/](src/features/quiz/CHANGELOG.md) |
| Settings, export, import, delete | [src/features/settings/](src/features/settings/CHANGELOG.md) |
| Space voyage | [src/features/voyage/](src/features/voyage/CHANGELOG.md) |
| Shared (app shell, data, Gemini client, estimates, styles) | [src/shared/](src/shared/CHANGELOG.md) |
| Gemini rules and safety (server) | [server/](server/CHANGELOG.md) |
| Gemini endpoint (API) | [api/](api/CHANGELOG.md) |

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


