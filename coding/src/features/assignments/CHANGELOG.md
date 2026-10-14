# Changelog: Assignments list

Part of ADHD1X. Files: AssignmentsPage.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Due wording from the clock
- Made by: Claude
- Changed: Each assignment shows when it is due in plain words (for example due tomorrow at 11:59 pm) next to the date.
- Why: Real-world clock request.
- Notes: Neutral wording, no 'overdue'.

## 2026-10-13 - Finish uses the reward flow
- Made by: Claude
- Changed: "Mark finished" now goes through the shared finish step so the reward can show.
- Why: Part of the Space UI overhaul.
- Notes: Marking it back to to-do works as before.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).


