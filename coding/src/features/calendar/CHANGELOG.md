# Changelog: Calendar (import a calendar, new and upcoming assignments)

Part of ADHD1X. Files: CalendarPage.tsx, ImportPanel.tsx, CalendarItemRow.tsx, icsParser.ts, calendarLogic.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Courses and assignments added from the calendar
- Made by: Claude
- Changed: (1) The import preview has a checkbox, on by default: Also add the ticked assignments to my assignments. It lists what will happen first (how many assignments, which new courses, which name no course) and the Save button says it too. On Save, the courses named in the calendar are created (an existing course is reused when the name matches) and the assignments are added. Events are never added, and anything you hid or already added is skipped. (2) Items already imported earlier: each row now offers Create course X and add this when the calendar names a course you do not have, and the New assignments section has an Add all N to my assignments button. (3) Assignment names from the calendar are cut to 120 characters, so a long title no longer makes a backup that cannot be imported again. New files: useCalendarAdd.ts. calendarLogic.ts has planCalendarAdd, which works out the plan without changing anything.
- Why: Christian's calendar names the course, but the page said 'Add a course first'. He asked for the app to add the course and the assignments itself when it can read them. The long-title bug from the audit is fixed in the same change.
- Notes: Nothing is saved until Save or an Add button is tapped (A4). An assignment that names no course is not guessed: it stays in the list with the course picker. Course names are used exactly as the calendar writes them (Canvas puts the course in square brackets after the title). Fixes audit finding H1 for calendar-made assignments only; a name typed by hand or read from a syllabus can still be over 120 characters.

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

