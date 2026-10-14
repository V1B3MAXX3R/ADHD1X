# Changelog: Shared pieces used by many parts: app shell (components/), saved data and schemas (data/), Gemini client (ai/), time estimates (logic/), colors and styles (styles/)

Part of ADHD1X. Files: components/AppShell.tsx, data/database.ts, data/schemas.ts, ai/client.ts, logic/estimates.ts, styles/tokens.css
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).
