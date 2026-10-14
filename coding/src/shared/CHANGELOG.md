# Changelog: Shared pieces used by many parts: app shell (components/), saved data and schemas (data/), Gemini client (ai/), time estimates (logic/), colors and styles (styles/)

Part of ADHD1X. Files: components/AppShell.tsx, data/database.ts, data/schemas.ts, ai/client.ts, logic/estimates.ts, styles/tokens.css
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

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


