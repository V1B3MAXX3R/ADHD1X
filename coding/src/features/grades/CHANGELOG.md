# Changelog: Grades import

Part of ADHD1X. Files: gradesFile.ts, GradesImportPanel.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Choose which courses to bring in
- Made by: Claude
- Changed: The preview lists every course in the file with a tick box, its Canvas grade, and how many assignments are graded and not graded yet. Courses with graded work start ticked; the rest start unticked. Save grades does nothing for unticked courses. planGradeImport takes an optional set of course ids.
- Why: Christian's first real Canvas file had 11 courses (604 assignments, 106 graded). Importing all of them at once would clutter the app, and there is no delete button yet.
- Notes: Checked on the real file (counts only, no names or scores were read out): it loads in the app, 5 courses have graded work, and a default import adds 106 graded assignments.

## 2026-10-14 - First version: bring in grades from the Canvas tool
- Made by: Claude
- Changed: Catch Up has a Bring in grades from Canvas section. You pick the file the Python tool wrote. It checks the file, shows each course's Canvas grade and what would change, and only saves on Save grades. Matching: by the Canvas id the calendar import saved, otherwise same course, name and day. Matched assignments get their points and score; your own status is never changed. A checkbox (on by default) also adds graded work you do not have yet, as finished, creating the course if needed, so past work is part of the grade math. Excused work, work not counted in the grade, and work with no points are skipped. Work not graded yet is left to the calendar import.
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: Nothing here touches the network. Grades stay on this device and are never sent to Gemini (A36); a test checks scores are left out of Gemini requests. Added assignments count toward Progress because they are finished work. New assignment source value: canvas.

