# Changelog: Serverless Gemini endpoint

Part of ADHD1X. Files: ai/[preset].ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - One handler for 15 presets
- Made by: Claude (from Gemini's files)
- Changed: [preset].ts handles every preset through promptBuilders, with the access code check, a 25-per-minute limit, size limits and a real 20 second timeout (the old one never actually stopped the request).
- Why: Gemini features request.
- Notes: Syllabus and first move behave as before.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

