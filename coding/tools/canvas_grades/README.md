# Canvas grades tool

A small Python program that reads **your own** grades from Canvas and saves them to a file. You then pick that file in
ADHD1X (Catch Up, then **Bring in grades from Canvas**). The website never sees your Canvas login.

Only the Python standard library is used. There is nothing to install.

## Quick start

1. In Canvas: **Account, Settings, Approved Integrations, New Access Token.** Name it `ADHD1X`, set it to expire soon
   (tomorrow is fine), and copy the token. Canvas shows it only once.
2. In a normal terminal (PowerShell or the VS Code terminal) in the project folder:

   ```
   python coding\tools\canvas_grades\canvas_grades.py
   ```

3. Paste the token when it asks. Nothing shows on screen as you paste. That is normal.
4. The file `canvas-grades-<date>.json` is saved in your **Downloads** folder.
5. In ADHD1X open **Catch Up**, choose the file under **Bring in grades from Canvas**, read the preview, then **Save grades**.
6. Delete the file. In Canvas, delete the token (Settings, Approved Integrations).

Options: `--out <path>` to choose where the file goes, `--include-concluded` to include finished courses,
`--base-url https://other.instructure.com` for another school, `--session-cookie` (see below).

## What it does and does not do

| It does | It does not |
|---|---|
| Send **read-only (GET)** requests to one website over https | Change anything in Canvas |
| Keep your token in memory only | Save, log or print your token |
| Stop if Canvas redirects or links to any other website | Send your token to any other website |
| Save only grade fields: course name and code, term, current grade, and for each assignment its name, due date, points, score and state | Save emails, student IDs, comments or rubrics |
| Refuse to save inside a git project folder | Overwrite an existing file |

## The safety rules, and why

- **The token is typed into a hidden prompt.** There is no `--token` option, because anything typed on the command line is
  kept in shell history and visible in the process list. You may set `CANVAS_ACCESS_TOKEN` in the environment instead, but
  a prompt each time is safer: nothing is left on disk.
- **One website, https only.** Python's built-in web code would copy your login header to wherever a redirect points. This
  tool blocks that, and also refuses a "next page" link that points anywhere but the Canvas address.
- **Read-only.** Only GET requests are ever made.
- **A scoped, short-lived token** can be deleted in one click and only lets whoever has it read what you can read. A copied
  browser cookie is as powerful as being logged in as you.
- **Grades stay private.** The file is only read by your browser from your own disk. Grades are never sent to Gemini
  (decision A36), and the app's tests check that scores are left out of every Gemini request.
- **The file is sensitive.** It goes to Downloads, never into the project. `.gitignore` also blocks `canvas-grades*.json`.

## Using a session cookie instead (only if you cannot make a token)

Some schools turn off new access tokens. Then you can use the login cookie your browser already has:

```
python coding\tools\canvas_grades\canvas_grades.py --session-cookie
```

It asks for the value of the cookie named `canvas_session` (in the browser: developer tools, Application or Storage, Cookies).
Paste only that value. The tool sends only that one cookie.

Be aware: the cookie **is your login** until it expires or you log out, so treat it like a password. Log out of Canvas in
the browser afterwards, which also stops the cookie from working. Using it may be against your school's computer-use
rules, so check them. This path is less safe than a token and I could not test it against your real Canvas.

## If something goes wrong

- *"Canvas did not accept that login"*: the token is wrong, expired or deleted. Make a new one.
- *"Canvas said no to that request"* for one course: that course hides its grades. The others still work.
- *"slow down"*: Canvas limits requests. Wait a few minutes.
- *"inside a git project"*: choose a folder outside the project with `--out`, for example Downloads.
- Nothing prompts, or the token shows as you type: use a normal terminal, not a notebook or a plain output panel.

## Honest limits

The tool was written from Canvas's published API and tested against a **pretend Canvas**, not your real one. If your
school's Canvas answers differently, it stops with a plain message and saves nothing. Grades Canvas hides, or has not
posted yet, are not included. Weighted grading groups are not worked out here: Catch Up uses points.

## Tests

```
python -B -m unittest discover -s coding/tools/canvas_grades -v
```

They also run as part of `npm run check` (in `coding/`).
