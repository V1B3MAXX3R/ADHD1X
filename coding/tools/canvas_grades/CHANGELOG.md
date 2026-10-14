# Changelog: Canvas grades tool (Python)

Part of ADHD1X. Files: canvas_grades.py, test_canvas_grades.py, README.md
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - First version
- Made by: Claude
- Changed: A standard-library Python program that reads your own grades from Canvas (read-only) and saves a small JSON file. Login: a hidden prompt for a Canvas access token (or the CANVAS_ACCESS_TOKEN variable), or with --session-cookie a canvas_session cookie. It talks to one https host only, blocks redirects and next-page links to any other host, never prints or saves the login, saves only grade fields, never overwrites a file, and refuses to save inside a git project. 34 tests use a pretend Canvas.
- Why: Christian asked to import his grades from Canvas with a secure pathway, preferably in Python. Decision F3 (Canvas API) was deferred, so this was built as a separate local tool plus a file import, not a website feature that talks to Canvas.
- Notes: NOT tested against the real Chaffey Canvas (no login was available). Endpoints and fields follow Canvas's published API: /api/v1/courses with total_scores, and /api/v1/courses/:id/assignments with the student's own submission. The cookie path is the least certain. There is deliberately no command-line option for the token.

