# Changelog: Server-only Gemini rules and safety checks

Part of ADHD1X. Files: presets.ts, safety.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - 15 Gemini presets
- Made by: Claude (from Gemini's files)
- Changed: presets.ts now holds the output checks for all 15 presets and which model each uses (A111). New promptBuilders.ts builds each prompt, puts typed text in as quoted values, and keeps only named fields from task and course lists. New devApiPlugin.ts serves the endpoint during npm run dev, using the same handler Vercel runs, with keys read only on the server.
- Why: Gemini features request. Replaces the pasted dev-api-server.mjs, which could not run TypeScript.
- Notes: Output is checked against the preset's shape and scanned for medical advice (A71).

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

