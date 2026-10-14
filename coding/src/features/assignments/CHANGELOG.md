# Changelog: Assignments list

Part of ADHD1X. Files: AssignmentsPage.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Canvas details on an assignment
- Made by: Claude
- Changed: The details view shows what Canvas says (missing, turned in and when, late, points taken off, redo, open or closed date, attempts) and an Open in Canvas link with the site name. Instructions keep their line breaks.
- Why: Christian asked the Canvas tool to pull everything it safely can. Before this, the tool read only scores, so Catch Up could not match Canvas for weighted classes (ITIS-55 showed 28% in Canvas but 14% on points) and could not tell a missing 0 from a real one.
- Notes: The link is shown only for https addresses and opens in the same tab.

## 2026-10-13 - More tools in assignment details
- Made by: Claude
- Changed: Details now show the reading-time calculator (reading tasks), your pace note, a how-to-know-you-are-done list and the 15-minute turn-in plan.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: All built in; none use Gemini.

## 2026-10-13 - Gemini tools and brain dump
- Made by: Claude
- Changed: The details panel has the Gemini tools and the saved checklist. A closed Sort my brain dump section sits above the list.
- Why: Gemini features request.
- Notes: None.

## 2026-10-13 - Note in details
- Made by: Claude
- Changed: The details panel has a Where was I? field to write, change or clear the note.
- Why: A62.
- Notes: None.

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




