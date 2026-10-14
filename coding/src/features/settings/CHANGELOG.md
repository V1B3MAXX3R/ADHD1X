# Changelog: Settings page, export, import and delete

Part of ADHD1X. Files: SettingsPage.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Celebrations switch
- Made by: Claude
- Changed: Added "Small celebration when I finish an assignment" to Settings, Display, with the usual "on because you said yes" note.
- Why: The setting existed (quiz question 15) but had no switch; A67 says fun facts can be turned off.
- Notes: Off by default (A5).

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

