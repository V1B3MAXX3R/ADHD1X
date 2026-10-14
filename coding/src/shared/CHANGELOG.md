# Changelog: Shared pieces used by many parts: app shell (components/), saved data and schemas (data/), Gemini client (ai/), time estimates (logic/), colors and styles (styles/)

Part of ADHD1X. Files: components/AppShell.tsx, data/database.ts, data/schemas.ts, ai/client.ts, logic/estimates.ts, styles/tokens.css
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - A grade now you can type in for each class
- Made by: Claude
- Changed: Course gained gradeNowPercent (optional, 0 to 150): your grade now in that class, used in place of Canvas's number.
- Why: Christian saw about 200 for a C across all his classes and asked for the focus to be on each class (each needs a C or above), for each class's grade to be part of the settings and to shape the planner and the pace, and for the pace not to treat all the work as one big class. He also asked to keep the screen uncluttered, to put the pace after the assignment reasoning, and for the pace to set up its modes from due dates, time, the end of the semester and other factors.
- Notes: Optional, so older saved data and backups still load. Stays on this device and is never sent to Gemini (A36).

## 2026-10-14 - Grading setup for each class, and saving many at once
- Made by: Claude
- Changed: schemas.ts gained GradeCategorySchema and CourseGradingSchema (letter cutoffs, weighted or by points, categories with weight, words, Canvas category and drop lowest, a default category), Course.grading, and Assignment.categoryId (an assignment connected to a category by hand). database.ts gained saveCoursesAndAssignments, which saves many classes and assignments in one transaction.
- Why: Christian found that ticking several classes bundled all the work into one heap before one due date (Catch Up said everything was due by December 12). He asked for work to be sorted by due date before the pace comes in, for Catch Up to know a C does not need every assignment (read the points), and for a grading-standard setting for each class that he can type in, connecting assignments by hand if needed. Saving Christian's grades file one assignment at a time took about 26 seconds, with the screen redrawing after each one, and looked like it had lost data.
- Notes: All optional with limits on every field, so older saved data still loads.

## 2026-10-14 - Canvas details in saved data
- Made by: Claude
- Changed: Course gained an optional canvas object (Canvas course id, grades, weighted, categories with weights and drop rules, letter scale, late policy, module progress, syllabus, announcements, parts not shared). Assignment gained an optional canvas object (category, lock date, link, missing, late, submitted time, attempts, redo, points taken off).
- Why: Christian asked the Canvas tool to pull everything it safely can. Before this, the tool read only scores, so Catch Up could not match Canvas for weighted classes (ITIS-55 showed 28% in Canvas but 14% on points) and could not tell a missing 0 from a real one.
- Notes: Both are optional with limits on every field, so older saved data and backups still load, and odd numbers from a file are dropped, not saved.

## 2026-10-14 - Redo choices and scaled time guesses
- Made by: Claude
- Changed: catchUp.planAddedIds (work you turned in and chose to redo). estimates.ts gained scaledEstimate.
- Why: Christian asked for the late work dropdown to list every assignment, read from his assignments, and said Catch Up still told him he could not get a C. A local run on his Canvas file showed three causes: a C needing 70.6% was called impossible because the assumed score was 70%, Canvas work not graded yet (including missing work) was never imported, and every imported item got a full default time (a 1-point lab counted as 3 hours).
- Notes: Has a default, so older saved data still loads.

## 2026-10-14 - Deadline, skipped late work and 'not accepted' in saved data
- Made by: Claude
- Changed: catchUp gained deadlineMode (auto or manual), deadline (a date) and lateSkippedIds (up to 3000). A class's latePenaltyPercent can now also be 100, meaning late work is not accepted.
- Why: Christian asked for a personal catch-up deadline (a date he picks, or the nearest date the site finds that he can reach a C) in place of the fixed two weeks, and for late work to have its own section with four choices per class and a list of late assignments to pick from.
- Notes: All new fields have defaults, so older saved data and backups still load.

## 2026-10-14 - Term, breaks and Aggressive hours in saved data
- Made by: Claude
- Changed: Settings gained term (lastDay, mode), schoolBreaks (up to 20 with a name, first day and last day) and catchUp.aggressiveHours (Morning, Evening, Night, 0 to 6 hours).
- Why: Christian asked for the term's last day to show in regular mode and Catch Up, a midterms mode and a finals mode, breaks, and for the Aggressive pace to use Morning, Evening and Night blocks shaped by how many hours he is willing to work.
- Notes: All three have defaults, so older saved data and backups still load.

## 2026-10-14 - Class late penalty and class choice in saved data
- Made by: Claude
- Changed: Course has an optional latePenaltyPercent (0, 10 or 50). Catch Up settings have selectedCourseIds.
- Why: Christian asked for Catch Up to have a late penalty option per class (waived, 10%, 50%), a reset button for mock grade changes, and the ability to combine several classes into one plan and study plan.
- Notes: Both are optional with defaults, so older saved data and backups still load.

## 2026-10-14 - react-router-dom 7
- Made by: Claude
- Changed: Upgraded react-router-dom from 6 to 7.18, which clears the two audit warnings in the code that ships to the browser. No app code changed.
- Why: Christian asked for security for his website. A review found no committed secrets and no dangerous code patterns; the gaps were guess limits on the access code, a few missing headers, and dependency warnings.
- Notes: All unit, Python and browser tests pass. The two React Router future-flag console warnings are gone.

## 2026-10-14 - Assignment source canvas
- Made by: Claude
- Changed: The assignment source can now be canvas (alongside syllabus, manual and calendar).
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: Older data loads unchanged.

## 2026-10-13 - AppShell has a Cosmos frame
- Made by: Claude
- Changed: AppShell now draws a different frame (top masthead, page header band, footer) when the Cosmos look is on, and takes a noHero option.
- Why: Christian said the whole website must be built in the Cosmos form, not just one piece.
- Notes: The normal look is unchanged.

## 2026-10-13 - cosmosLook setting
- Made by: Claude
- Changed: New setting cosmosLook (default off), a data-look attribute on the page, an app-root class on the shell, and the cosmos palette in the contrast check.
- Why: Christian reported that the Cosmos UI disappeared when he clicked other pages.
- Notes: Saved-data version stays 2.

## 2026-10-13 - AppShell wide option
- Made by: Claude
- Changed: AppShell takes an optional wide prop (content area max-w-6xl instead of max-w-3xl).
- Why: Christian pasted the pulp-comic Cosmos UI (ui0 to ui10) and asked for it to go in a ui folder with the changelog updated.
- Notes: Only the Cosmos view uses it.

## 2026-10-13 - Two new settings and a logbook save function
- Made by: Claude
- Changed: Settings: recoveryGaps and readingMinutesPerPage (with defaults, so old saved data still loads). Database: saveLogbookEntry.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Saved-data version stays 2; only fields with defaults were added.

## 2026-10-13 - Gemini client and custom palette
- Made by: Claude
- Changed: ai/client.ts has one callAiPreset for all presets and does nothing at all when AI Mode is off. New saved fields: aiModeEnabled, customPalette, savedRoutines, and a checklist on assignments (older saved data still loads).
- Why: Gemini features request.
- Notes: Saved-data version unchanged. A saved palette that fails the contrast checks is never applied.

## 2026-10-13 - Session wrap-up in the timer bar
- Made by: Claude
- Changed: Done for now opens the wrap-up dialog; Keep going extends the same session. Note max 280 and goal max 200 characters in the saved-data rules; added getSession.
- Why: A62, A91.
- Notes: Saved-data version unchanged.

## 2026-10-13 - Hyperdrive streaks and earned points
- Made by: Claude
- Changed: Space background shows still gold warp streaks when Catch Up is on (space/HyperdriveStreaks.tsx). New saved fields: catchUp settings and an optional earnedPoints on assignments (older saved data still loads).
- Why: Catch Up request (A35, A56, A74).
- Notes: Streaks do not move.

## 2026-10-13 - Backup reminder in the shell
- Made by: Claude
- Changed: App shell shows the one-time backup reminder next to the clock reminders.
- Why: See settings changelog.
- Notes: Menu order unchanged.

## 2026-10-13 - Clock folder and header
- Made by: Claude
- Changed: New clock/ folder (see its own changelog). App shell shows the date and time and the optional reminders. New showClock setting.
- Why: Real-world clock request.
- Notes: Menu order unchanged.

## 2026-10-13 - Space UI overhaul: background and header switch
- Made by: Claude (from Christian's Space UI script)
- Changed: New `space/` folder (`SpaceBackground.tsx`, `Starfield.tsx`, `BackgroundPlanets.tsx`): a still starfield and planets behind the page in Space style, hidden in the Low theme. App shell now shows it, has a "Space mode: on/off" button in the header (changes only the look, A57), and shows the reward pop-up. Emoji in the menu are hidden from screen readers.
- Why: Christian's Space UI overhaul (A57, A35).
- Notes: Nothing moves or flashes. Menu order is unchanged (A73, A100).

## 2026-10-13 - Calendar section
- Made by: Claude
- Changed: Added the CalendarItem type, saved-data version 2 with a calendarItems store, and a Calendar link in the app shell.
- Why: Calendar import feature; see [calendar changelog](../features/calendar/CHANGELOG.md).
- Notes: Saved-data version is now 2; existing data is kept.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).







