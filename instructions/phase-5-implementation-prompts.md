# Phase 5: Implementation Prompts (written, not run)

**Version 1.1.1** (2026-10-10)

Status: **proposals approved by Christian 2026-10-11 (A115, A116).** Waiting on Christian's two open answers (test devices, quiz skip defaults) and the exact phrase in A2. These prompts are **not run** and **not usable yet**. The code lock (A2) holds until Christian says: "I approve the final blueprint. Begin implementation." Part 3 of the blueprint ([phase-5-blueprint.md](phase-5-blueprint.md)).

## How to use these in Phase 6

1. Go in order, P01 to P17. Do not start a prompt until the one before it is closed with all its checks (blueprint section 10).
2. Each prompt names the tool that should run it (A16). Paste the prompt text into that tool inside VS Code. The code lives in the GitHub repo and VS Code is the source of truth (A108).
3. Every prompt starts with the **common header** below. Paste the header and then the prompt.
4. When a prompt finishes, the coder gives a plain-words report. Christian does the "Christian check" and says whether it works. Then the milestone's checks run.
5. If anything in a prompt conflicts with the decision log, the coder stops and asks.

### Common header (put this before every prompt)

> You are building ADHD1X. First read `coding/RULES.md`, `instructions/decision-log.md`, and the blueprint sections named below. Follow the rules in RULES.md exactly: no secrets anywhere, fake data only, nothing changes saved data without the user's tap, no guilt wording, plain words, accessibility is part of done, no new packages without asking, one small task on its own branch, tests first for logic, a changelog entry in `coding/CHANGELOG.md` in the same step as every change, and a plain-words report at the end (what changed, what to click, what could still be wrong, tests run). If the spec is unclear or conflicts with a decision, stop and ask. Do not guess.

---

## M0: Project set up

### P01. Set up the project (Tool: Claude)
- **Read:** RULES.md, technical spec section 3.6 and 4, blueprint sections 6.7 and 10.
- **Do:** create the project in `coding/`: Vite, React, TypeScript strict, Tailwind, React Router, Vitest, Testing Library, Playwright with axe, ESLint with the accessibility plugin, Prettier. Create the folder layout in RULES.md, the three pointer files (CLAUDE.md, AGENTS.md, GEMINI.md) that tell each tool to read RULES.md (check each tool's current docs for the right file name), `CHANGELOG.md`, `.gitignore` (must ignore every env file and build output), an `.env.example` listing the variable names with no values (`GEMINI_API_KEY`, `ACCESS_CODE`, `GEMINI_MODEL_LITE`, `GEMINI_MODEL_FLASH`), and a secret-scan step that fails if a key or access code pattern is found in the repo or the built files. Add scripts: type check, lint, unit tests, e2e tests, accessibility tests, secret scan, and one `check` script that runs them all.
- **Do not:** write any feature, add other packages, or create any real key.
- **Done when:** an empty app loads with a heading, `check` passes, the secret scan passes and fails correctly on a fake planted key (then remove it), and the changelog has its first entry.
- **Christian check:** run the start script, see the empty page, run `check`, and see it pass.

---

## M1: Data layer

### P02. Storage, schemas, export and import (Tool: Claude)
- **Read:** technical spec section 2 (all), blueprint FR-20.
- **Do (tests first):** write Zod schemas for every store in section 2 and the settings record in 2.1; an IndexedDB layer (using `idb`) with typed read and write functions; a `schemaVersion` and a migration runner with one example migration test; defaults for every setting; export to the JSON shape in 2.3 (without the access code); replace-only import with validation, summary and rejection of newer versions; delete-everything. Unit tests for each, including a round trip (export, delete, import) and a corrupted file.
- **Do not:** store anything outside section 2. No age, birthday, health or diagnosis fields. No access code in exports.
- **Done when:** all unit tests pass and the round trip restores everything except the access code.
- **Christian check:** none visible yet. The coder explains the stored fields in plain words.

---

## M2: App shell and design system

### P03. Tokens, themes, app shell (Tool: Codex)
- **Read:** blueprint sections 3, 5 (AppShell, NavBar, HelpLink), 6 (all), 9.1.
- **Do:** build the four palettes from section 6.2 as CSS variables, with Tailwind reading them; the root attributes (`data-theme`, `data-style`, `data-dim`, `data-motion`, `data-spacing`) driven by settings; text size scaling; focus ring; the shell (skip link, landmarks, fixed nav as a left rail or bottom bar, Help link in the same corner); the routes in section 3 with placeholder pages; page title and focus-to-heading on each route change; motion off and `prefers-reduced-motion` respected.
- **Do not:** add features, art, or any color not in the table.
- **Done when:** every route loads in all four palettes at 320 px and 200 percent zoom, nav never reorders, route changes move focus to the heading, and the page title changes.
- **Christian check:** click through the placeholder pages with the mouse and with Tab; switch palettes (temporary dev switch).

### P04. Base components, catalog and accessibility harness (Tool: Codex builds, Claude reviews)
- **Read:** blueprint section 5 (all), 9, 10.
- **Do:** build the shared components in section 5 (buttons, form controls with visible labels and linked errors, FileUpload, Dialog, Banner, QuizQuestion, WhyOnNote, EmptyState and the rest that are not feature-specific). Add a development-only catalog page showing every component in every palette. Add the automated accessibility test that opens every route and the catalog in all four palettes with axe, and the contrast script that checks the real token pairs.
- **Claude reviews:** keyboard behavior, focus return after dialogs, announcements, target sizes.
- **Done when:** component tests and the accessibility test pass, the contrast script passes for all four palettes, and the review has no open problems.
- **Christian check:** open the catalog, Tab through it, zoom to 200 percent.

---

## M3: Onboarding

### P05. Disclaimer, age box, quiz and major (Tool: Codex, Claude reviews the rule table)
- **Read:** blueprint FR-01 to FR-03, [phase-3-ux.md](phase-3-ux.md) S1 to S3, [quiz-questions.md](quiz-questions.md), [personalization-levers.md](personalization-levers.md), decisions A20, A21, A28, A30, A78, A80, A85.
- **Do:** build S1 (the exact A21 text), S2 (disabled button with a text reason), S3 (questions 1 to 5, one per screen, Yes, No, Skip, Back, "Question 3 of 5"), the "That's enough" screen, and the major field. Build the quiz rule table as a pure logic file with unit tests: each answer (yes, no, skipped) maps to the settings in the quiz file. Store answers. Show "On because you said yes to: ..." with Undo wherever a quiz setting appears. A setting changed by hand is never overwritten by a later quiz answer. Support questions 6 to 21 in the table's structure but do not build their screens.
- **Do not:** store age or birthday; add any question not in the quiz file.
- **Done when:** all five questions can be skipped and the app still works; each answer sets exactly what the quiz file says; Undo restores the default; accessibility checks pass.
- **Christian check:** go through first-visit steps 1 to 4 three times: skip everything, answer all yes, answer all no.

---

## M4: Courses and assignments

### P06. Courses, assignments, details and Not now (Tool: Codex)
- **Read:** blueprint FR-04, FR-09, FR-14, [phase-3-ux.md](phase-3-ux.md) S9, technical spec 2 and 1.2 step 2 (default estimates), decisions A52, A55, A88.
- **Do:** add-a-course form (name asked once), assignment form with type, due date, points, percent of grade, details and estimate (default by type, labeled), edit and remove, the Assignments page with filters and the Not now list, the Details panel opening by Details button, tap, keyboard focus and a 2-second desktop hover (dismissible with Esc, stays open while the pointer is over it, does not vanish on its own).
- **Do not:** add Gemini. Do not guess due dates.
- **Done when:** the hover panel passes the three hover rules (dismiss, hover, persist); Not now removes a task from every list that feeds the plan and one tap restores it; accessibility checks pass.
- **Christian check:** add two courses and five assignments by hand, move one to Not now and back, use the hover panel with mouse and keyboard.

---

## M5: Day plan engine and Today

### P07. The day plan engine (Tool: Claude)
- **Read:** technical spec section 1 (all), [day-plan-logic.md](day-plan-logic.md), decisions A40 to A48, A86, A87.
- **Do (tests first):** turn the 7 test cases in section 1.3 into automated tests and add more: Night block rules, a running (pinned) task, manual moves over capacity, a task that continues across blocks, break placement, due-within-24-hours with and without a time, overdue and done and Not now tasks excluded, deterministic output. Watch them fail. Then write the engine as one pure function in `logic/planEngine` that follows steps 1 to 13 exactly. Keep every number (15 percent buffer, lead window, share limits, 60 and 10 minute breaks, score weights) as named constants in one file.
- **Do not:** read the clock, touch the database, call the network, or use Gemini inside the engine.
- **Done when:** all tests pass, the engine handles 200 assignments in under 100 ms, and the plain-words report lists every constant and where to change it.
- **Christian check:** the coder shows the 7 cases as a readable table of input and plan; Christian says whether each plan "feels right".

### P08. The Today screen (Tool: Codex)
- **Read:** blueprint FR-06 to FR-08, FR-09, [phase-3-ux.md](phase-3-ux.md) S5, technical spec 1.1.
- **Do:** pick-blocks screen, Today with blocks, items, break markers, load, "Done around", the Enough time? line, "Looks good", Not now and Move up, Move down buttons on each item, the one-card view when chosen, the `needsBlocks` and after-8-pm questions. The plan is rebuilt from the engine on open and after any change, and shows the saved version first so it appears instantly.
- **Do not:** reorder anything while the user is looking, or use red as the only signal.
- **Done when:** Today shows the engine's plan for sample data, "Add a block" only proposes, and accessibility checks pass.
- **Christian check:** open Today with your sample assignments, change blocks, move items with buttons, accept the plan.

---

## M6: Gemini server and syllabus reader

### P09. Gemini server, access code and preset framework (Tool: Claude)
- **Read:** technical spec section 3 (all) and 4, blueprint FR-19 and FR-21, decisions A8, A14, A15, A36, A71, A110, A111.
- **Do (tests first):** the `/api/ai/{preset}` function with the contract in 3.2: access code check in constant time, size limits, 20-second timeout, error reasons, no body logging, no storage. A preset framework where each preset is one file (model key, system instruction, request builder, JSON schema for Gemini, Zod validator, fallback name). Model names read from environment settings only. Register the `syllabus` and `firstMove` presets with the validation rules in 3.3. The output safety scan. A best-effort rate limit. Security headers and the Content Security Policy in vercel.json. Tests use a fake Gemini (a stub); no real key and no network in tests.
- **Do not:** put any key in code, logs, tests or the browser bundle. Do not enable tools, search or function calling for Gemini.
- **Done when:** requests without the code fail; oversized and invalid requests fail with the right reason; invalid Gemini output becomes `invalid_output`; the secret scan passes on the built browser files.
- **Christian check:** Christian creates the dev key and access code himself in his local env file (the coder explains how, without seeing them), starts the server, and the coder shows a stubbed call working and a wrong code failing.

### P10. Prompt work and the fake test set (Tool: Gemini, then Claude reviews)
- **Read:** technical spec 3.3 and the shared system instruction rules, blueprint section 10 (prompt evaluation set), decisions A71, A76.
- **Do:** write the system instruction for each registered preset following the six shared rules; create the fake test set (at least 10 fake syllabi and 10 fake assignments, including the cases listed in blueprint section 10, with hand-written expected results); write an evaluation script that runs the presets against the set and reports valid shape, invented dates, medical advice, step counts and, for review, tone. Save fixtures in `tests/fixtures`. Run it only against fake data.
- **Claude reviews:** the instructions for loopholes, the expected results for mistakes, and the safety scan against the nursing-style cases.
- **Done when:** the evaluation runs, results are saved as a readable report, and the report recommends Lite or Flash for the syllabus reader.
- **Christian check:** read the report's summary table; decide Lite or Flash for `syllabus` (a one-setting change, A111).

### P11. Syllabus upload and review screen (Tool: Codex)
- **Read:** blueprint FR-05 and FR-19, [phase-3-ux.md](phase-3-ux.md) S4 and section 5, technical spec 3.2 to 3.4.
- **Do:** the Gemini notice dialog (first use only; "Not now" cancels the request), the "Uses Gemini" label, file chooser showing type and size limit, the paste-text option, the loading state, the review table (editable rows, missing values shown in words, Save and Cancel), all failure messages with the by-hand and paste options on the same screen, and the 4 MB limit message (T72). The uploaded file is never stored.
- **Do not:** save anything before Save; guess a missing value.
- **Done when:** with a stubbed server every state works: success, nothing found, too large, wrong type, timeout, rate limited, offline. Accessibility checks pass for each state.
- **Christian check:** with the stubbed server, walk through each state with a fake syllabus.

---

## M7: Help me start and timer

### P12. Help me start (Tool: Codex, Claude reviews)
- **Read:** blueprint FR-10, FR-11, [phase-3-ux.md](phase-3-ux.md) S6, [help-me-start.md](help-me-start.md), technical spec 3.3 (`firstMove`) and 3.4, decisions A49 to A51, A58, A59, A82, A83.
- **Do:** the six steps, one per screen, Back always works. Pre-selected top task. The one size question. Details box and upload (reviewed before saving). The first move card with Show more steps and Give me a different one, saved and reused per A83. The template first moves by task type (a content file; write at least three per type, plain and kind). Start now and Start later. Still stuck: Tips (a short built-in list, "try this and see if it works for you") or Switch task with the one-time gentle line (varied by assignment, worded without guilt).
- **Do not:** send anything beyond title, course, task type, major, size choice and details text to Gemini. No guilt language.
- **Done when:** with the stub and with the stub failing, Help me start always produces a first move; the switch line shows once; accessibility checks pass.
- **Christian check:** run Help me start on three different assignments, once with Gemini off.

### P13. Timer, block-change prompt, heads-up and breaks (Tool: Claude)
- **Read:** blueprint FR-12, FR-13, [phase-3-ux.md](phase-3-ux.md) S7 and S8, technical spec 1.2 steps 9 and 11, decisions A44 to A46, A63, A75.
- **Do (tests first):** timer state that survives a reload; starter length (2, 5, custom); Pause, Keep going, Next step, Done for now; display as a number, a shrinking bar or hidden; screen reader announcements only for start, pause and end; kind wording on early stop; the block-change prompt when a running timer passes a block end (timer keeps running, nothing switches unless the user taps Change it, A46 wording); the heads-up banner; break markers wired to the engine's `pinned` input. The bar never covers the focused item.
- **Done when:** timer logic tests pass including a block change mid-timer and a reload mid-timer; accessibility checks pass.
- **Christian check:** run a 2-minute timer, let a block end during it, try all three display styles.

---

## M8: Style, voyage and settings

### P14. Space and Regular style, voyage, settings, notifications (Tool: Codex)
- **Read:** blueprint FR-15 to FR-17, FR-22, [phase-3-ux.md](phase-3-ux.md) S10 and S11 (Settings and the Notifications table), technical spec 2.1, 2.2 and 5, decisions A53, A54, A57, A74, A104.
- **Do:** the Space and Regular style switch (names and art only); the small ship and seven stops as inline SVG; the Voyage panel (position, stop reached, text line, hide button); the voyage points logic as a pure file with unit tests (never goes backward); the Regular finished list; all Settings sections in the fixed order with each setting saving immediately (Catch Up hidden); in-app due-soon list, heads-up and banners; optional browser notifications through a tiny service worker that only shows notifications (permission asked only after the user turns it on), plus a small web app manifest and a short "Add to Home Screen" how-to line next to the setting, because on iPhone notification permission probably needs the site on the Home Screen (iOS 16.4 or later; unverified, test on Christian's iPhone and report what happens); quiet hours, batching, sounds off, "Turn all notifications off", and the line "ADHD1X never sends guilt, streak or 'come back' messages."
- **Do not:** add fun facts, the logbook screen, Catch Up, or push notifications.
- **Done when:** every setting survives a reload; switching style changes no layout order; motion off stops all animation; accessibility checks pass in all four palettes.
- **Christian check:** change every setting, reload, check it stuck; try browser notifications on your computer and your phone and tell the coder what happened.

---

## M9: Help, privacy and data tools

### P15. Help panel, campus support, privacy, data tools (Tool: Codex)
- **Read:** blueprint FR-18, FR-19, FR-20, [phase-3-ux.md](phase-3-ux.md) S12 and section 5, technical spec 2.3, decisions A65, A71, A76, A102.
- **Do:** the Help link panel (Tips, Campus support, How ADHD1X works), the Campus support page (plain info that colleges offer disability services, examples of common accommodations, no treatment advice), the Privacy page (what goes to Gemini, what stays on the device, the free-tier warning in plain words, never claiming data is never stored or never used for training), the access code field, Export, Import with summary and confirm, Delete with Export offered first, and the once-only export prompt about a week after first use.
- **Done when:** export, delete and import restore everything except the access code; the privacy text matches blueprint section 8; accessibility checks pass.
- **Christian check:** export, delete everything, import, confirm nothing is missing.

---

## M10: Hardening and release candidate

### P16. Hardening and full checks (Tool: Claude)
- **Read:** blueprint sections 9, 10, 12, technical spec 4 and 6.
- **Do:** run the full end-to-end suite and fix failures; run axe on every route and state in all four palettes; verify headers and the Content Security Policy in a real build; run a dependency audit and report each finding; check the built browser files for secrets; measure the performance targets in technical spec 6; test offline; write the manual test script from blueprint 9.2 as a checklist file for Christian.
- **Done when:** everything passes or each failure is explained, and the checklist exists.
- **Christian check:** run the manual passes in 9.2 and write down what you find.

### P17. Deploy, and an optional AI Studio preview (Tool: Christian with Claude guiding)
- **Read:** blueprint section 12 (dependencies), decisions A108 to A110.
- **Do:** Christian creates the Vercel project from the GitHub repo, enters the production key and access code in Vercel's settings himself (never in chat), and deploys. Claude checks the live site: headers, a wrong access code failing, a right one working, and the secret scan on the live files. **Optional:** in Google AI Studio's Build mode, import the repo from GitHub as a throwaway preview, with fake data and no keys, unpublish when done (A110). Remember Vercel Hobby is for personal use only, so hosting moves before any release (Q15).
- **Done when:** the live site works end to end with fake data, and Christian says it feels right.
