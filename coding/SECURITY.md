# Security notes

ADHD1X is a personal app. Most of your data never leaves your computer, so most of the protection is about keeping it
that way and keeping a few secrets out of the wrong places.

## What is protected, and how

| Thing | Where it lives | How it is protected |
|---|---|---|
| Courses, assignments, grades, notes | In this browser only (IndexedDB) | Never sent anywhere. Never in a Gemini request (a test checks scores are left out). |
| Gemini key and access code | In `coding/.env` on your computer (or the host's settings page when deployed) | Server only. Never in browser code, and `.env` is git-ignored. |
| The Gemini endpoint | `/api/ai/*` | Needs your access code. Wrong guesses are limited (8 per address, 60 overall, per 15 minutes). Codes shorter than 16 characters are treated as "not set up". Compared in constant time. Requests from other websites are refused. Rate limited, size limited, 20-second time limit. |
| What Gemini returns | Shown as plain text | Checked against a strict shape, scanned for medical advice, and never run as code. |
| Canvas login (token or cookie) | Your head, then a hidden prompt | The Python tool never saves, prints or sends it anywhere but the one Canvas address. See `tools/canvas_grades/README.md`. |
| Your grades file | Your Downloads folder | The tool refuses to save inside the project. `.gitignore` blocks it. Delete it after importing. |
| The website itself | Headers in `vercel.json` | A strict Content Security Policy (no inline scripts or styles, no outside sites), HTTPS only (HSTS), no framing, no sniffing, no referrer, no camera, mic or location. `npm run build` then `npm run preview` serves the same headers locally. |

Tests that guard this: `tests/unit/security.test.ts` (headers, ignored files, no dangerous code patterns, no outside
requests), `tests/unit/geminiServer.test.ts` (the endpoint), `tools/canvas_grades/test_canvas_grades.py` (the tool).
`npm run check:secrets` scans the code and the built site for keys.

## Your checklist

**Do**
- Make `ACCESS_CODE` long and random. This makes one:
  `python -c "import secrets; print(secrets.token_urlsafe(24))"`
- Keep keys only in `coding/.env` (local) or the host's environment settings (deployed).
- Use two-factor sign-in on GitHub and on your Google account (the Gemini key lives there).
- Log out of Canvas after using a session cookie. That kills the cookie.
- Delete grade files, calendar files and backups you no longer need.
- Run `npm run check` before committing, and `npm run check:audit` now and then.

**Don't**
- Paste a key, token, cookie, access code or calendar feed link into chat, a file in the project, or a screenshot.
  Treat the Canvas calendar feed link like a password: anyone who has it can read your calendar.
- Commit `.env`, exports (`adhd1x-export-*.json`), grade files or `.ics` files. They are git-ignored; do not force them in.
- Run `npm run dev -- --host` on public Wi-Fi. By default the dev server only answers this computer.

**If a secret leaks**
1. Gemini key: make a new one in Google AI Studio and delete the old one. Update `.env`.
2. Access code: pick a new one in `.env` and save it again in Settings, Privacy.
3. Canvas token: delete it in Canvas, Settings, Approved Integrations. Cookie: log out of Canvas.
4. If it was committed to git, rotating it (steps above) is what matters. Deleting the file later does not remove it from history.

## Things to know

- **Your project folder is inside your school OneDrive.** Anything in it, including `coding/.env`, is copied to that cloud
  account, which the school's administrators can reach. Keys are safe from the internet but not private from the school.
  If that matters, keep real keys out of the folder (for example, set them only on the host when you deploy).
- **Browser data is not encrypted.** Anyone who can use your computer account and browser profile can read it. Use a
  Windows password and lock the screen. Use Settings, Privacy, Delete my data before lending the computer.
- **Gemini free tier.** Google may use what you send to improve its products and people may read it. Only text you tap to
  send goes there. Leave out names and anything private.
- **Rate limits are per server instance.** On a serverless host several copies may run, so the long random access code is
  the real protection. The limits just make guessing slower.

## Known remaining warnings

`npm audit` on the production dependencies reports **0** issues. The remaining warnings are in development tools
(Vite, Vitest, Tailwind and what they use). They only matter while you run `npm run dev` or the tests on your own
computer, and they have no fix without a major upgrade of those tools. Planned: upgrade the toolchain in one step and
re-run every test. Until then: keep the dev server on localhost, and do not run Vitest's browser UI.

## Before you put it on the internet

1. Set `GEMINI_API_KEY` and `ACCESS_CODE` in the host's environment settings, not in the repo.
2. Open the live site and check the headers (for example at securityheaders.com).
3. Open the browser console on every page and confirm there are no "Content Security Policy" messages.
4. Consider spending limits on the Gemini key, and a different key from your local one.
