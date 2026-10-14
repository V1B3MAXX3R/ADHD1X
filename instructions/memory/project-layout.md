---
name: project-layout
description: Where things live, the commands to run, and what has been built
metadata:
  type: project
---

**Folders:** `research/`, `instructions/` (decision log, blueprint, spec, this memory), `artifacts/` (version and doc map), and `coding/` (the app).

**Inside `coding/`:** `src/app` (routes, shared state), `src/features/<part>` (one folder per part: today, courses, assignments, calendar, voyage, catchUp, memory, gemini (all Gemini screens), focus (parking lot, calm mode, ramp-in, one-tap start), planning (energy check, long days, recovery gaps, reading time, done-list), tips (tips library, syllabus phrases), routines, quiz, onboarding, settings, help, helpMeStart, catalog), `src/shared` (components, data, ai, clock, space, logic, styles), `server/` and `api/` (Gemini, server only), `tests/` (unit, e2e, fixtures).

**Gemini:** the browser calls `src/shared/ai/client.ts`, which calls `api/ai/[preset].ts` (prompts in `server/promptBuilders.ts`). `npm run dev` serves that endpoint through `server/devApiPlugin.ts`; keys come from `.env` and stay on the server.

**Commands (run in `coding/`):** `npm run dev` (http://localhost:5173), `npm run check` (typecheck, contrast, secret scan, unit tests), `npm run test:e2e` (browser and accessibility tests; first time `npx playwright install chromium`), `npm run build`.

**Habit:** every change gets an entry in `coding/CHANGELOG.md` and in the changelog of each part folder it touched (A17). Saved-data version is 2 (IndexedDB). Older saved data keeps working because new fields have defaults.

**Built so far:** onboarding and quiz, courses and syllabus reading, day plan on the real clock, Help me start, timer with session goal and "Where was I?" note, assignments, calendar (.ics) import, voyage with space visuals and optional rewards, Catch Up / Hyperdrive, reminders, backup reminder, settings, export and import, and the study helpers from the original feature files 13 to 30 (parking lot, calm mode, energy check, recovery gaps, tips library, logbook and more).

**Why this note exists:** the layout was reorganized on 2026-10-13, so old file paths in older documents and in AI-written code are out of date.

**How to apply:** check a path exists before using it. Put new code in the matching part folder.

