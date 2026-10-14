# Changelog: Catch Up / Hyperdrive

Part of ADHD1X. Files: CatchUpPage.tsx, catchUp.ts, useCatchUp.ts, components/ (ModeSwitch, GradeCalculator, PacePicker, DueSoonestQueue)
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - First version
- Made by: Claude (from Gemini's Bucket 2 Part 2 files)
- Changed: New page at `/catch-up` ("Hyperdrive" in Space style, "Catch-up mode" in Regular style, A56). It has the on/off switch, a target-grade calculator (quick Canvas percent, or points from each assignment), three paces with the real number of days each takes (A81), and a Due soonest list that includes unfinished work from earlier dates (A39, A40). All grade math is plain code in `catchUp.ts` and never goes to Gemini (A36).
- Why: Christian's Catch Up / Hyperdrive request; decisions A35 to A40, A56, A81.
- Notes: Changes from the pasted code, to follow the decision log: (1) it is never offered. Today shows the Catch Up bar only after the person has switched it on (A39). (2) Picking a pace does not switch the mode on. (3) The days estimate looks only at work due within 14 days or earlier, so far-off assignments do not inflate it. (4) The score field can also set the points a task is out of, instead of silently setting 100. (5) Calmer wording: no warnings or "behind". A unit test checks that no grade or Catch Up setting can appear in any Gemini request code.
