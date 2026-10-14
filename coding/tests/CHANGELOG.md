# Changelog: Tests (unit, fixtures, end-to-end)

Part of ADHD1X. Folders: unit/, fixtures/, e2e/ (plus ../playwright.config.ts and ../MANUAL_CHECKLIST.md)
Every change to the tests gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Tests for the class-by-class Catch Up
- Made by: Claude
- Changed: catchUpModel.test.ts rewritten for the new model (41 tests: 0s, grade now from Canvas or typed in, the C from the points, each class on its own, classes out of reach, one class at a time, due dates, paces set up from the due dates and the term, speed). catchUpPlan.test.ts: planning by due date (work due soon stays on time, a week-before start, one class at a time, leftover time, a daily amount) and the grade-now field. gradeBook.test.ts: grade now, letters, and the share of the grade. Browser tests updated for the new order and wording, plus the grade-now box, the per-class lines and the Show menu.
- Why: Christian saw about 200 for a C across all his classes and asked for the focus to be on each class (each needs a C or above), for each class's grade to be part of the settings and to shape the planner and the pace, and for the pace not to treat all the work as one big class. He also asked to keep the screen uncluttered, to put the pace after the assignment reasoning, and for the pace to set up its modes from due dates, time, the end of the semester and other factors. Before that, christian found that ticking several classes bundled all the work into one heap before one due date (Catch Up said everything was due by December 12). He asked for work to be sorted by due date before the pace comes in, for Catch Up to know a C does not need every assignment (read the points), and for a grading-standard setting for each class that he can type in, connecting assignments by hand if needed.
- Notes: 344 unit tests, 15 browser tests and 61 Python tests pass.

## 2026-10-14 - Cookie and robustness tests for the Canvas tool
- Made by: Claude
- Changed: 12 new Python tests: every way a browser shows the cookie, wider cookie characters with strict tokens, messages that never repeat the paste, the cookie-without-option hint, the 401 messages, the length line, stopping before any request on a bad paste, a failing syllabus request, an unreachable extra, odd data, error location, and progress lines.
- Why: Christian could not get the tool to take his browser cookie. It stopped with 'That does not look like a valid token or cookie value', which did not say what was wrong, and it stopped before contacting Canvas.
- Notes: Total now 316 unit tests, 15 browser tests and 61 Python tests.

## 2026-10-14 - Canvas version 2 tests
- Made by: Claude
- Changed: Python: 15 new tests (plain text from HTML, same-site links, the richer details, parts Canvas will not share, --grades-only, counts-only summary, no names or comments in the file, every request GET). TypeScript: gradeBook.test.ts (weights, rescaling, drop rules, C cutoff, weighted C goal and target math), canvasText.test.ts, version 2 import tests, and tests for real 0s, Canvas lock dates and redos. One new browser test imports a version 2 file and checks the From Canvas box, flags, the link, the locked row, the C box, no 'undefined' or 'NaN', and an accessibility scan.
- Why: Christian asked the Canvas tool to pull everything it safely can. Before this, the tool read only scores, so Catch Up could not match Canvas for weighted classes (ITIS-55 showed 28% in Canvas but 14% on points) and could not tell a missing 0 from a real one.
- Notes: Total now 316 unit tests, 15 browser tests and 49 Python tests.

## 2026-10-14 - No two-week fallback tests
- Made by: Claude
- Changed: Replaced the two fallback-to-14-days tests with ones for the soonest date and the rest of the term, and added tests for the hours a day a C would take.
- Why: Christian chose the automatic goal date and saw October 28, a date he could not reach. When no pace could reach a C, the page had quietly fallen back to the next two weeks and shown that as the date. He had asked for the two-week deadline to be removed.
- Notes: Total now 280 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - Dropdown groups, realistic C and import tests
- Made by: Claude
- Changed: New unit tests for assignment groups and plan choices, the realistic C rule and stretch selection, scaled time guesses, importing work not graded yet, and resizing default time guesses. Browser tests updated for the full dropdown and the import summary.
- Why: Christian asked for the late work dropdown to list every assignment, read from his assignments, and said Catch Up still told him he could not get a C. A local run on his Canvas file showed three causes: a C needing 70.6% was called impossible because the assumed score was 70%, Canvas work not graded yet (including missing work) was never imported, and every imported item got a full default time (a 1-point lab counted as 3 hours).
- Notes: Total now 278 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - Shared Catch Up model tests
- Made by: Claude
- Changed: 21 unit tests (catchUpModel.test.ts): 0s as late work, every pace against a goal date, suggested dates that really work, automatic dates per pace, nothing due yet, and a speed check on 600 assignments. Removed the pace advice and old deadline tests. Rewrote the browser test for paces against the goal date (disabled cards, the notice, Switch and Move buttons, C box and plan agreeing).
- Why: Christian found that 0s in his gradebook were not treated as late work, and that the paces and the Enough for a C box did not follow the goal date (for example, Chill was still offered for a goal date it could not meet). He asked for every part to work together and read from each other.
- Notes: Total now 269 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - Deadline and late work tests
- Made by: Claude
- Changed: 14 new unit tests (deadline.test.ts) for late work choices, study days, the manual and automatic deadline and saved defaults; the Catch Up browser test now covers the four late work choices, the late assignment list and not accepted, and the pace test covers the deadline radios and a picked date. The schema test now allows 100.
- Why: Christian asked for a personal catch-up deadline (a date he picks, or the nearest date the site finds that he can reach a C) in place of the fixed two weeks, and for late work to have its own section with four choices per class and a list of late assignments to pick from.
- Notes: Total now 260 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - C goal stretch and out-of-reach tests
- Made by: Claude
- Changed: Three new unit tests: zeros for work never handed in are ignored, a stretch C reports the percent needed, and an out-of-reach C reports the best case. Floor and cap tests now use 70% and 90%.
- Why: Christian pasted four classes where the C goal said the work left was not enough to reach it 'at about 50%' and told him nothing useful.
- Notes: Total now 246 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - C goal ignores far-off work
- Made by: Claude
- Changed: Added a unit test that a class is judged on graded work and the next 14 days only; replaced the last-day window test with one for looking further when asked.
- Why: Christian asked Catch Up not to factor in every assignment for the rest of the school year, and to work out what a C takes for each class.
- Notes: Still 243 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - C goal and pace advice tests
- Made by: Claude
- Changed: 17 unit tests (cGoal.test.ts) for the C goal and the pace advice, one browser test (advice, matching days, C-only Aggressive plan, accessibility scan), and the plan-limit test now uses enough work to pass 366 days.
- Why: Christian saw the pace cards and the study plan disagree (188 days against a plan cut off at 120, and 1.25 hours shown as 1.3), and asked for advice on a better pace when assignments are at risk, and for Aggressive to plan just enough work for a C and say how long that takes.
- Notes: Total now 243 unit tests, 14 browser tests and 34 Python tests.

## 2026-10-14 - Term, breaks, modes and Aggressive blocks tests
- Made by: Claude
- Changed: 21 unit tests (termPlan.test.ts) for the last day, breaks, midterms and finals ordering, Aggressive blocks and saved-data defaults, and one browser test that sets the last day, a mode and a break and plans the Aggressive pace in blocks with an accessibility scan. One older plan test now ignores the repeated rows that blocks create.
- Why: Christian asked for the term's last day to show in regular mode and Catch Up, a midterms mode and a finals mode, breaks, and for the Aggressive pace to use Morning, Evening and Night blocks shaped by how many hours he is willing to work.
- Notes: Total now 226 unit tests, 13 browser tests and 34 Python tests.

## 2026-10-14 - Catch Up tests
- Made by: Claude
- Changed: 29 unit tests (catchUpPlan.test.ts) for penalty math, what-if scores, class choice and the plan, and one browser test that ticks classes, sets penalties, tries what-ifs, resets, saves, and runs an accessibility scan.
- Why: Christian asked for Catch Up to have a late penalty option per class (waived, 10%, 50%), a reset button for mock grade changes, and the ability to combine several classes into one plan and study plan.
- Notes: Total now 205 unit tests, 12 browser tests and 34 Python tests.

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



