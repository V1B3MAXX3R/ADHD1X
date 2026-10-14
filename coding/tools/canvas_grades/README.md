# Canvas grades tool

A small Python program that reads **your own** grades and class details from Canvas and saves them to a file. You then
pick that file in ADHD1X (Catch Up, then **Bring in grades from Canvas**). The website never sees your Canvas login.

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
`--base-url https://other.instructure.com` for another school, `--session-cookie` (see below), and `--grades-only` to
leave out the syllabus, announcements, instructions and rubrics.

## What it does and does not do

| It does | It does not |
|---|---|
| Send **read-only (GET)** requests to one website over https | Change anything in Canvas |
| Keep your token in memory only | Save, log or print your token |
| Stop if Canvas redirects or links to any other website | Send your token to any other website |
| Read only **your own** things, and only what the app uses (list below) | Read your inbox, other students' work or posts, files, quiz questions or answers, feedback comments, or your profile |
| Turn Canvas text (instructions, syllabus, announcements) into plain text, cut to a set length | Keep any HTML, scripts or links from that text |
| Keep links back to Canvas only when they are https on the same Canvas site | Save emails, student IDs or anyone's name |
| Refuse to save inside a git project folder | Overwrite an existing file |

## What goes in the file (format version 2)

For each class:

- **Grades:** current grade, and the grade if nothing else is turned in (as Canvas works them out).
- **How it is graded:** whether categories are weighted, each category's weight and drop rules ("drop the lowest 2"),
  the letter scale (so a C uses the class's real cutoff), and the late policy (for example 10% off per day).
- **Module progress** (how many module steps are done), the **syllabus** (plain text, up to 20,000 characters), and
  **announcements from the last 30 days** (title, date and plain text, up to 15; no author names).

For each assignment:

- Name, your own due date (with any extension Canvas gave you), points, score and state.
- Category, lock date (after which Canvas no longer takes it), when you turned it in, whether Canvas marks it missing
  or late, points taken off for lateness, attempts used and allowed, whether a redo was asked for, and a link back to
  it in Canvas.
- Instructions (plain text, up to 4,000 characters) and the rubric rows (up to 30).

Some schools do not show students the letter scale, the late policy or announcements. Those parts are skipped, the run
goes on, and the tool lists what was skipped. It prints only counts, never grades or text.

## The safety rules, and why

- **The token is typed into a hidden prompt.** There is no `--token` option, because anything typed on the command line is
  kept in shell history and visible in the process list. You may set `CANVAS_ACCESS_TOKEN` in the environment instead, but
  a prompt each time is safer: nothing is left on disk.
- **One website, https only.** Python's built-in web code would copy your login header to wherever a redirect points. This
  tool blocks that, and also refuses a "next page" link that points anywhere but the Canvas address.
- **Read-only.** Only GET requests are ever made. The tests check every request.
- **Only what the app uses.** Each extra part has a reason in the app: weights and drop rules make the grade math match
  Canvas, the letter scale sets the C cutoff, the late policy and lock dates say what late work can still count, and
  instructions fill in empty assignment details. Use `--grades-only` for the smallest file.
- **Text is untrusted.** Canvas text is written by people, so it is stripped to plain words here, and the app shows it as
  plain text only. It is never sent to Gemini unless you tap a Gemini button on an assignment yourself.
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

**Getting the value (Chrome or Edge):** open Canvas and make sure you are logged in. Press F12, open **Application**,
then **Cookies**, then your Canvas site. Click the row named `canvas_session`. The **Value** shows at the bottom of the
panel (or double-click the Value cell). Copy that text. Pasting the whole row, `canvas_session=...`, or a whole
Cookie header all work too.

**Pasting:** the prompt is hidden, so nothing shows as you paste. In Windows terminals, **right-click** to paste (Ctrl+V
does not always work for a hidden prompt), then press Enter. The tool then prints how many characters it received, which
is a quick way to see whether the paste was cut off. It never prints the value.

**It stops with a message about the value:** the message says what is wrong (too few characters, a space, a tab, a curly
quote), and nothing was sent to Canvas. **"Canvas did not accept that cookie":** the cookie has most likely expired.
Canvas logs you out after a while, so copy a fresh value from a page you have just loaded.

Be aware: the cookie **is your login** until it expires or you log out, so treat it like a password. Log out of Canvas in
the browser afterwards, which also stops the cookie from working. Using it may be against your school's computer-use
rules, so check them. This path is less safe than a token and I could not test it against your real Canvas.

## If something goes wrong

- *"Canvas did not accept that token"* or *"...that cookie"*: it is wrong, expired or deleted. Make or copy a new one.
- *"That does not look like a valid cookie value"*: the message says why. Copy only the value, and right-click to paste.
- *"Something unexpected went wrong (... in a function, line N)"*: nothing was saved. Tell the project owner that line, which holds no private data.
- *"Canvas said no to that request"* for one course: that course hides its grades. The others still work.
- *"slow down"*: Canvas limits requests. Wait a few minutes.
- *"inside a git project"*: choose a folder outside the project with `--out`, for example Downloads.
- Nothing prompts, or the token shows as you type: use a normal terminal, not a notebook or a plain output panel.

## Honest limits

The tool was written from Canvas's published API and tested against a **pretend Canvas**, not your real one. If your
school's Canvas answers differently, it stops with a plain message and saves nothing. Grades Canvas hides, or has not
posted yet, are not included. Catch Up follows the weights and drop rules the file brings in. Canvas picks which scores
to drop in a slightly more careful way than Catch Up does, so a class with drop rules can differ from Canvas by a little.

## Tests

```
python -B -m unittest discover -s coding/tools/canvas_grades -v
```

They also run as part of `npm run check` (in `coding/`).
