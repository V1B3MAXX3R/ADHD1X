# Changelog: Tests (unit, fixtures, end-to-end)

Part of ADHD1X. Folders: unit/, fixtures/, e2e/ (plus ../playwright.config.ts and ../MANUAL_CHECKLIST.md)
Every change to the tests gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

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



