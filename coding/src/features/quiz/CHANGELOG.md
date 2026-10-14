# Changelog: Personalization quiz rules

Part of ADHD1X. Files: quizRules.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Panel with all questions
- Made by: Claude
- Changed: A panel listing all questions by group (Basic, Standard, Detailed, Full), with Yes, No and Skip for each.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: The app has 17 questions (ids 12, 13, 16 and 17 are not in the quiz rules), not the 21 the pasted file said.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).
