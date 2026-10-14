# Changelog: Today page and the day-plan engine

Part of ADHD1X. Files: TodayPage.tsx, planEngine.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Catch Up bar speaks class by class
- Made by: Claude
- Changed: The bar says how many classes are not on track at your pace, or the day every class is caught up (today, when it is today).
- Why: Christian saw about 200 for a C across all his classes and asked for the focus to be on each class (each needs a C or above), for each class's grade to be part of the settings and to shape the planner and the pace, and for the pace not to treat all the work as one big class. He also asked to keep the screen uncluttered, to put the pace after the assignment reasoning, and for the pace to set up its modes from due dates, time, the end of the semester and other factors.
- Notes: It reads the same model as the Catch Up page.

## 2026-10-14 - Catch Up bar uses the due-date plan
- Made by: Claude
- Changed: The bar says the day past-due work is caught up at your pace, that nothing needed is past due, or that the pace does not keep up.
- Why: Christian found that ticking several classes bundled all the work into one heap before one due date (Catch Up said everything was due by December 12). He asked for work to be sorted by due date before the pace comes in, for Catch Up to know a C does not need every assignment (read the points), and for a grading-standard setting for each class that he can type in, connecting assignments by hand if needed.
- Notes: It reads the same model as the Catch Up page.

## 2026-10-14 - Catch Up bar reads the shared Catch Up model
- Made by: Claude
- Changed: The bar now says when the chosen pace reaches a C, or that it cannot by your goal date, using the same model as the Catch Up page.
- Why: Christian found that 0s in his gradebook were not treated as late work, and that the paces and the Enough for a C box did not follow the goal date (for example, Chill was still offered for a goal date it could not meet). He asked for every part to work together and read from each other.
- Notes: Before, it counted days for all work in the next two weeks, which could disagree with the page.

## 2026-10-14 - School term bar on Today; Catch Up bar uses your term and hours
- Made by: Claude
- Changed: Today shows the school term bar above the Catch Up bar in both views. The Catch Up bar's 'about N days' now uses the term's last day and your Aggressive hours.
- Why: Christian asked for the term's last day to show in regular mode and Catch Up, a midterms mode and a finals mode, breaks, and for the Aggressive pace to use Morning, Evening and Night blocks shaped by how many hours he is willing to work.
- Notes: The term bar is always shown, because the last day is useful in regular mode too. It is one short box.

## 2026-10-13 - Energy check, long-day question, quiet time, one-tap start
- Made by: Claude
- Changed: Added the optional energy check, the two-long-days question, the quiet-time note after a recovery gap, and the zero-decision start button. See the planning and focus changelogs.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Nothing on Today changes by itself; each helper acts only when tapped.

## 2026-10-13 - Planning helpers
- Made by: Claude
- Changed: A closed Planning helpers section (Uses Gemini) above the study blocks.
- Why: Gemini features request.
- Notes: Hidden while AI Mode is off.

## 2026-10-13 - Where you left off
- Made by: Claude
- Changed: Added the Where you left off card (up to 3 tasks with notes, each with Pick it back up and Clear note).
- Why: A62.
- Notes: The card disappears when there are no notes.

## 2026-10-13 - Catch Up bar and earlier work
- Made by: Claude
- Changed: Added CatchUpBar.tsx (shown only when Catch Up is on). When Catch Up is on, unfinished work from earlier dates is added to the plan.
- Why: A39, A40.
- Notes: Nothing is shown about Catch Up while it is off.

## 2026-10-13 - Plan uses the real time
- Made by: Claude
- Changed: The plan now starts from the real time instead of a fixed 9:00 am, so blocks that already passed are skipped and the current block is shortened. The plan is made when the page opens and only changes when you tap "Update my plan" (a note appears when the block changes, an hour passes or the date changes), so nothing rearranges by itself (A73). Added a "Right now" line (current block and time left, or the next block). Due text is now "due today at 5:00 pm", "due tomorrow", and so on. After 8 pm the "show a plan anyway" button plans full-length blocks (new `afterHoursConfirmed` option in `planEngine.ts`). Saved plan state from a previous day is ignored.
- Why: Real-world clock request.
- Notes: Plan engine behavior is unchanged unless `afterHoursConfirmed` is set. All existing plan tests pass.

## 2026-10-13 - Test Case 3 fixed
- Made by: Claude
- Changed: Test Morning window set to 07:00 to 12:00 to match the spec. Engine unchanged.
- Why: See the main changelog.
- Notes: All plan-engine tests pass.

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






