# Changelog: Today page and the day-plan engine

Part of ADHD1X. Files: TodayPage.tsx, planEngine.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - "I finished this" button
- Made by: Claude
- Changed: Each planned item on Today now has an "I finished this" button that marks it finished (and shows the reward when it is turned on).
- Why: Part of the Space UI overhaul; before this, assignments could only be finished from the Assignments page.
- Notes: None.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

