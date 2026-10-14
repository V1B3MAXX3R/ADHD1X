# Changelog: Shared pieces used by many parts: app shell (components/), saved data and schemas (data/), Gemini client (ai/), time estimates (logic/), colors and styles (styles/)

Part of ADHD1X. Files: components/AppShell.tsx, data/database.ts, data/schemas.ts, ai/client.ts, logic/estimates.ts, styles/tokens.css
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

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







