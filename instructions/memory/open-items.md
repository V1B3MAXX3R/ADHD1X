---
name: open-items
description: Things still waiting on Christian or still untested
metadata:
  type: project
---

Last updated 2026-10-13. Remove an item when it is settled.

- **Catch Up pace sizes** (Aggressive 4 h, Normal 2.5 h, Chill 1.25 h a day) came from Gemini. Decision A81 gives no numbers. Needs his OK.
- **Blueprint FR-15** still says the Catch Up settings section is hidden in the MVP, but it is now shown. Update the blueprint if he agrees.
- **Browser pop-up reminders** are not tested in a real browser. See `coding/MANUAL_CHECKLIST.md` item 9.
- **Manual checklist** (`coding/MANUAL_CHECKLIST.md`, 10 checks) still needs a person on a real Windows PC and iPhone.
- **Gemini key and fake syllabi:** the 10 fake syllabi are not yet run through Gemini. Needs a real key.
- **Decision log:** the Calendar import, the clock and the memory features are not yet written into the decision log as decisions. F3 (Canvas API) is still deferred.
- **AI Studio:** should the app move to the repo root so AI Studio can import it? See [[no-ai-studio-sync]].
- **Gemini features not in the decision log:** planning helpers, website and palette personalizer, step breaker, practice questions, pre-flight check and the AI Mode switch were added on request. Log them if Christian agrees. AI Mode is on by default.
- **Real Gemini key:** the 15 presets are tested with a pretend Gemini only. Run checklist item 12 with a real key and access code.
- **Original features 13 to 30** were added on request (2026-10-13) but are not in the decision log yet: recovery gaps (L7), calm mode, parking lot, zero-decision start, ramp-in, 15-minute turn-in plan, done-list, tips library, syllabus phrase guide, logbook UI. Log them if Christian agrees.
- **Nine extra fun facts (FF21 to FF29)** are not on the approved list of 20 (A34, A77). Their sources need checking before they count as approved. FF30 was left out (the source does not support the claim).
- **Recovery gaps** only show a quiet-time note on Today. They do not move tasks in the plan engine yet.
- **Cosmos view (/cosmos)** was added on request and is not in the decision log. It uses fixed paper-and-ink colors, so custom palettes and Dim mode do not recolor it. Decide whether it becomes the Space-style home, stays a side page, or gets palette support.
- **Audit findings (2026-10-14)** still open: assignments cannot be edited or deleted, and a name over 120 characters typed by hand or read from a syllabus still makes a backup that cannot be imported (calendar titles are fixed). Also: Settings values over the limit crash silently, Progress cannot be un-hidden, the 320 px menu overlaps, and several settings have no control. The full audit report is in the 2026-10-14 chat.
- **Canvas grades tool** (tools/canvas_grades) was built on request and is not in the decision log. F3 (Canvas API) was deferred, so log this as a decision if Christian agrees. It has NOT been run against the real Chaffey Canvas. First real run needs his token at the hidden prompt (never in chat or files). The session-cookie option is the least certain path.
- **Security (2026-10-14):** production dependencies audit clean; 15 warnings remain in dev tools (Vite 5, Vitest 2, Tailwind 3 and what they use), needing a planned major upgrade. The project folder is in the school OneDrive, so `coding/.env` syncs there. The Canvas calendar feed link was pasted into chat earlier, so treat it as exposed (Canvas may not let a student reset it; Chaffey Canvas support can say). See coding/SECURITY.md.
