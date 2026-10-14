# Changelog: Canvas grades tool (Python)

Part of ADHD1X. Files: canvas_grades.py, test_canvas_grades.py, README.md
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Cookie pasting is forgiving, and every message says what is wrong
- Made by: Claude
- Changed: (1) A cookie can now be pasted as the bare value, canvas_session=value, a whole Cookie header, the row copied from the browser's cookie table, or text with a terminal's paste markers around it. Cookies may use every character the cookie standard allows (before, a ':' or '*' in the value was refused); tokens stay strict. (2) A refused paste now says why, in words, without repeating it: how many characters it had, or which kinds of characters are not allowed (a space, a tab, a curly quote). An empty paste says to right-click to paste. A cookie pasted without --session-cookie says to use that option. A rejected cookie says it has probably expired and to copy a fresh one; a rejected token says to try --session-cookie if a cookie was pasted. (3) After the paste, it prints how many characters it received (never the value), and 'Reading class N of M...' while it works. (4) The first request to Canvas is the plain one again, the same that worked before version 2. The syllabus and module progress are fetched per class as optional extras, so Canvas refusing them cannot stop the grades. (5) Extras that fail, time out or return odd data are left out and listed, and never stop the run. An unexpected error now says where it happened (function and line), never what it contained.
- Why: Christian could not get the tool to take his browser cookie. It stopped with 'That does not look like a valid token or cookie value', which did not say what was wrong, and it stopped before contacting Canvas.
- Notes: 61 tests (was 49), all against a pretend Canvas. Not yet run against the real one.

## 2026-10-14 - Version 2: everything safe that the app uses
- Made by: Claude
- Changed: The tool now also reads, read-only and for your own account: category weights and drop rules, the class letter scale, the late policy, final grade (ungraded as 0), module progress, the syllabus, announcements from the last 30 days, and for each assignment its category, lock date, link back to Canvas, missing/late flags, submitted time, points taken off, attempts, redo requests, instructions and rubric. Canvas text is turned into plain text and cut to set lengths. Parts Canvas does not show students are skipped and listed, and the run goes on. New --grades-only option. Prints counts only. Output format version 2 (the app still reads version 1).
- Why: Christian asked the Canvas tool to pull everything it safely can. Before this, the tool read only scores, so Catch Up could not match Canvas for weighted classes (ITIS-55 showed 28% in Canvas but 14% on points) and could not tell a missing 0 from a real one.
- Notes: Never reads the inbox, other students' work or posts, files, quiz questions or answers, feedback comments, or the profile; no names or IDs go in the file. Links are kept only when https on the same Canvas site. Error responses are now closed after use. 49 tests (was 34), all against a pretend Canvas; not yet run against the real one.

## 2026-10-14 - First version
- Made by: Claude
- Changed: A standard-library Python program that reads your own grades from Canvas (read-only) and saves a small JSON file. Login: a hidden prompt for a Canvas access token (or the CANVAS_ACCESS_TOKEN variable), or with --session-cookie a canvas_session cookie. It talks to one https host only, blocks redirects and next-page links to any other host, never prints or saves the login, saves only grade fields, never overwrites a file, and refuses to save inside a git project. 34 tests use a pretend Canvas.
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: NOT tested against the real Chaffey Canvas (no login was available). Endpoints and fields follow Canvas's published API: /api/v1/courses with total_scores, and /api/v1/courses/:id/assignments with the student's own submission. The cookie path is the least certain. There is deliberately no command-line option for the token.

