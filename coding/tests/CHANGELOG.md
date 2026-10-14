# Changelog: Tests (unit, fixtures, end-to-end)

Part of ADHD1X. Folders: unit/, fixtures/, e2e/ (plus ../playwright.config.ts and ../MANUAL_CHECKLIST.md)
Every change to the tests gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Security tests
- Made by: Claude
- Changed: 6 more endpoint tests (weak code, one-address lockout and recovery, overall lockout, oversized header, cross-site requests, bad JSON) and security.test.ts (15 tests): headers in vercel.json, git-ignored secrets and data files, no secrets in browser code, no dangerous code patterns, no outside requests, and the Python tool keeps its rules.
- Why: Christian asked for security for his website. A review found no committed secrets and no dangerous code patterns; the gaps were guess limits on the access code, a few missing headers, and dependency warnings.
- Notes: Total now 176 unit tests, 11 browser tests and 34 Python tests. The production build was also walked in a real browser with the real headers: zero Content Security Policy violations.

## 2026-10-14 - Course choice tests
- Made by: Claude
- Changed: One unit test for picking courses and a browser check that the tick box controls Save.
- Why: Christian's first real Canvas file had 11 courses (604 assignments, 106 graded). Importing all of them at once would clutter the app, and there is no delete button yet.
- Notes: Total now 155 unit tests, 11 browser tests and 34 Python tests.

## 2026-10-14 - Grades import tests
- Made by: Claude
- Changed: 17 unit tests (gradesImport.test.ts) including a check through the real Catch Up math, run in four time zones, and one browser test with an accessibility scan. The Python tool has 34 tests of its own.
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: Total now 154 unit tests, 11 browser tests and 34 Python tests.

## 2026-10-14 - Calendar auto-add tests
- Made by: Claude
- Changed: 7 new unit tests (calendarAdd.test.ts) and one browser test: import with no courses, check the preview, save, check the courses and assignments, and re-import a backup of them.
- Why: Christian's calendar names the course, but the page said 'Add a course first'. He asked for the app to add the course and the assignments itself when it can read them. The long-title bug from the audit is fixed in the same change.
- Notes: Total now 137 unit tests and 10 browser tests.

## 2026-10-13 - Cosmos frame check
- Made by: Claude
- Changed: The Cosmos look test also checks each page has the page header band and the footer.
- Why: Christian said the whole website must be built in the Cosmos form, not just one piece.
- Notes: Still 9 browser tests.

## 2026-10-13 - Cosmos look test
- Made by: Claude
- Changed: A browser test switches the look on, visits 8 pages with an accessibility scan on each, and switches it off.
- Why: Christian reported that the Cosmos UI disappeared when he clicked other pages.
- Notes: Total now 130 unit tests and 9 browser tests.

## 2026-10-13 - Cosmos tests
- Made by: Claude
- Changed: Added /cosmos to the accessibility scan (both styles) and a browser test for the keyboard tabs, Pause animations and the Space-only fun fact.
- Why: Christian pasted the pulp-comic Cosmos UI (ui0 to ui10) and asked for it to go in a ui folder with the changelog updated.
- Notes: Total now 130 unit tests and 8 browser tests.

## 2026-10-13 - Tests for the study helpers
- Made by: Claude
- Changed: 17 new unit tests (studyHelpers.test.ts) and one new browser test with accessibility scans covering the details tools, parking lot, minutes box, Today helpers, settings tools, logbook and Help.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Total now 130 unit tests and 7 browser tests.

## 2026-10-13 - Gemini tests
- Made by: Claude
- Changed: unit/geminiServer.test.ts (access code, rate limit, all 15 presets good and bad replies, medical advice refused, prompts keep scores and notes out), unit/geminiClient.test.ts (palette contrast, built-in helpers, AI Mode off sends nothing). Browser tests scan the Gemini screens, run the built-in flows and check the AI Mode switch.
- Why: A36, A71, A3, A4.
- Notes: A pretend Gemini is used; no real key was available.

## 2026-10-13 - Memory tests
- Made by: Claude
- Changed: unit/sessionMemory.test.ts (note cleaning, list, minutes, limits, saved session, nothing sent to Gemini). A browser test runs the whole flow: goal, Done for now, note, it returns on Today and Help me start, clear it, and scans the dialog for accessibility problems.
- Why: A62, A91, A36.
- Notes: 63 unit tests and 5 browser tests pass.

## 2026-10-13 - Catch Up tests
- Made by: Claude
- Changed: unit/catchUp.test.ts (grade math, paces, earlier work, off by default, no grades in Gemini request code). The browser tests also scan /catch-up and check that Catch Up is never offered on Today.
- Why: A36, A39, A40, A81.
- Notes: 57 unit tests and 4 browser tests pass.

## 2026-10-13 - Prompt evaluation set, end-to-end and accessibility tests, manual checklist
- Made by: Claude (from Gemini's Bucket 1 files)
- Changed: Added 10 fake syllabi and 10 fake assignments (`fixtures/fakeSyllabi.ts`) with `unit/promptEval.test.ts` (medical-advice scan, nursing words allowed, built-in first moves are safe). Added Playwright end-to-end tests (`e2e/app.spec.ts`): the first-visit flow, and axe-core WCAG 2.2 AA scans of the catalog in all four palettes and of Today, Assignments, Calendar, Voyage and Settings in regular and Space style. Added `MANUAL_CHECKLIST.md` (9 checks that need a person) with Calendar and clock checks added.
- Why: Blueprint section 9 and 10, prompts P10 and P16.
- Notes: Run unit tests with `npm run test:unit` and the browser tests with `npm run test:e2e` (first time: `npx playwright install chromium`). The fixtures are not yet fed to Gemini; that needs a real key and is a manual check.



