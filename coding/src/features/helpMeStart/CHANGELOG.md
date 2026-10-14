# Changelog: Help me start (first move helper) and built-in templates and tips

Part of ADHD1X. Files: HelpMeStartPage.tsx, templates.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Ramp-in, calm mode and 15-minute plan
- Made by: Claude
- Changed: Step 5 has the optional ramp-in. The Still stuck panel has calm mode and the 15-minute turn-in plan.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: All optional.

## 2026-10-13 - Gemini helpers and routines
- Made by: Claude
- Changed: Step 4 shows your saved routines for the task type and the step breaker and practice questions. A saved starter move for the task type in general (such as from the major personalizer) is used when there is none for the course.
- Why: Gemini features request.
- Notes: Course-specific saved moves still win.

## 2026-10-13 - Session goal and left-off note
- Made by: Claude
- Changed: Step 1 shows the saved note for the task; step 5 has the optional session goal box.
- Why: A62, A91.
- Notes: The note and goal are never added to what is sent to Gemini.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).


