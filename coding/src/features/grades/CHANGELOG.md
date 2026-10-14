# Changelog: Grades import

Part of ADHD1X. Files: gradesFile.ts, GradesImportPanel.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - One quick save, and this term's work ticked by default
- Made by: Claude
- Changed: GradesImportPanel saves everything in one step (upsertMany). By default it ticks work that is graded or due within the last 180 days.
- Why: Saving Christian's grades file one assignment at a time took about 26 seconds, with the screen redrawing after each one, and looked like it had lost data.
- Notes: Nothing about what is saved changed, only how fast.

## 2026-10-14 - Reads version 2 grades files: how classes are graded, and assignment details
- Made by: Claude
- Changed: gradesFile.ts reads version 2 (and still version 1). Importing now saves on each class how Canvas grades it (weights, drop rules, letter scale, late policy, grades, module progress, syllabus, announcements), and on each assignment what Canvas says (category, lock date, link, missing, late, submitted time, attempts, redo). Empty instructions are filled from Canvas (yours are never replaced). Work Canvas shows as turned in is marked finished, including work turned in but not graded yet (before, that was added as to do). Due dates of Canvas or calendar work move when Canvas changed them (an extension). A class is found again by its Canvas id even if you renamed it. Classes with dated work that counts now start ticked in the preview. New CanvasClassInfo.tsx (the From Canvas box) and canvasText.ts.
- Why: Christian asked the Canvas tool to pull everything it safely can. Before this, the tool read only scores, so Catch Up could not match Canvas for weighted classes (ITIS-55 showed 28% in Canvas but 14% on points) and could not tell a missing 0 from a real one.
- Notes: Links are checked twice (on import, and again before showing) and open in the same tab, as the security rules require. All Canvas text is shown as plain text. Nothing here is sent to Gemini (A36); a test checks the Canvas details stay out of Gemini requests.

## 2026-10-14 - Import brings in work not graded yet, and sizes time guesses by points
- Made by: Claude
- Changed: With the 'Also add Canvas work' box on (it starts on), work Canvas has not graded yet, including missing work, is added as to do when it has a due date. Time guesses for Canvas work are scaled by its points against the class's usual item (between a quarter and double of the type's time, at least 10 minutes). On a re-import, a time guess you never changed is resized; one you set yourself is kept.
- Why: Christian asked for the late work dropdown to list every assignment, read from his assignments, and said Catch Up still told him he could not get a C. A local run on his Canvas file showed three causes: a C needing 70.6% was called impossible because the assumed score was 70%, Canvas work not graded yet (including missing work) was never imported, and every imported item got a full default time (a 1-point lab counted as 3 hours).
- Notes: Re-import your Canvas file once to bring in the missing work and the new time guesses. Work with no due date in Canvas is still left out and counted in the summary.

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

