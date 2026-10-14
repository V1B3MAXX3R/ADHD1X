# Changelog: Settings page, export, import and delete

Part of ADHD1X. Files: SettingsPage.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Cosmos look switch
- Made by: Claude
- Changed: Display has a Cosmos look on every page checkbox.
- Why: Christian reported that the Cosmos UI disappeared when he clicked other pages.
- Notes: See the ui changelog.

## 2026-10-13 - Calm mode, recovery gaps, routines and all quiz questions
- Made by: Claude
- Changed: Display: calm mode switch. Planning: recovery gaps. Help and tone: saved routines. My answers: all quiz questions in four groups.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Answers use the existing quiz rules, so a Yes or No still updates the matching setting unless you changed that setting yourself.

## 2026-10-13 - AI Mode and personalizer
- Made by: Claude
- Changed: Privacy has the AI Mode switch and the AI rules. Display has Describe how you work and the custom palette.
- Why: Gemini features request.
- Notes: None.

## 2026-10-13 - Catch Up section
- Made by: Claude
- Changed: New Catch Up section (between My answers and Privacy) with the current state and a link to the calculator and switch.
- Why: Catch Up request. The blueprint (FR-15) said this section stays hidden in the MVP; it is now shown because Christian asked for the feature.
- Notes: Update FR-15 in the blueprint if you want the document to match.

## 2026-10-13 - Backup reminder
- Made by: Claude (from Gemini's Bucket 1 files)
- Changed: Added ExportReminder.tsx: about a week after first use, one calm offer to save a backup file (Save a backup / Not now). Shown once.
- Why: FR-20 and T76: data lives only on this device.
- Notes: Uses the shared clock for the 7-day check.

## 2026-10-13 - Show the clock
- Made by: Claude
- Changed: Settings, Display has a switch to show or hide the date and time at the top of the page (on by default).
- Why: Real-world clock request.
- Notes: New saved setting showClock; older saved data gets the default.

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





