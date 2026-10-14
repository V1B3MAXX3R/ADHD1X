# Changelog: Calendar (import a calendar, new and upcoming assignments)

Part of ADHD1X. Files: CalendarPage.tsx, ImportPanel.tsx, CalendarItemRow.tsx, icsParser.ts, calendarLogic.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Uses the shared clock
- Made by: Claude
- Changed: Coming up and New lists now use the shared clock, so they update at midnight without reloading.
- Why: Real-world clock request.
- Notes: None.

## 2026-10-13 - First version: import a calendar file
- Made by: Claude
- Changed: New Calendar page at /calendar and a Calendar link in the main navigation. Import a .ics file (Google Calendar, Canvas, Outlook, Apple Calendar) or paste its text. A review step shows what was found before anything is saved. "New assignments" lists newly imported assignments with Add and Hide buttons. "Coming up" shows the next 14 days. Assignments added from here become normal assignments (source "calendar") and join the Today study plan. Own .ics reader, no new package.
- Why: Christian asked for a separate section where calendars from Google Calendar, Canvas and similar can be imported to show new and upcoming assignments and help the study plan. Nothing is saved or added without a tap (A4). Calendar text never goes to Gemini.
- Notes: This is a snapshot import, not a live link. A live calendar link (feed URL) would need a server step to get around browser limits and needs a privacy decision first, so it is not built. Repeating events show only their first date. Events do not yet reduce the time available in the day plan; only added assignments affect it. Not yet logged in the decision log as a new decision. F3 (Canvas API) is still deferred.

