# Changelog: Tests (unit, fixtures, end-to-end)

Part of ADHD1X. Folders: unit/, fixtures/, e2e/ (plus ../playwright.config.ts and ../MANUAL_CHECKLIST.md)
Every change to the tests gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

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

