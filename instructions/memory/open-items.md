---
name: open-items
description: Things still waiting on Christian or still untested
metadata:
  type: project
---

Last updated 2026-10-14. Remove an item when it is settled.

- **Catch Up pace sizes**: Chill 1.25 h a day going up to 2 h, Normal 2.5 h going up to 3.5 h when the work needs it, Aggressive his own hours (4 h by default). The base sizes came from Gemini, the ranges from Claude. Decision A81 gives no numbers. Needs his OK.
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
- **Catch Up additions (2026-10-14)** are not in the decision log: per-class late penalty (waived, 10%, 50%), choosing several classes for one plan, and what-if scores with reset. Late penalties only reduce the points you can still earn; they never change graded scores. The plan puts due-soonest work first and does not yet use study blocks or free time.
- **Term features (2026-10-14)** are not in the decision log: term last day, midterms/finals mode, school breaks, and Aggressive hours in Morning/Evening/Night blocks. Midterms and finals mode only reorders the Catch Up plan (exams first); it does not change Today's plan or add exam-study tasks. Breaks only affect the Catch Up plan, not Today's plan engine.
- **Enough for a C (2026-10-14)** is not in the decision log. Each class's C cutoff comes from his Grading setup, then Canvas's letter scale, then 70%, and the math follows category weights when they are known. Every pace plans just enough for a C by default.
- **Catch-up deadline and Late work (2026-10-14)** are not in the decision log. Late assignments start in the plan (opt out, not opt in); this follows the earlier rule that Catch Up includes earlier-date work (A39, A40). 'Late work not accepted' is stored as latePenaltyPercent 100.
- **Catch Up model (2026-10-14)**: catchUpModel.ts is the single source for Catch Up and the Today bar. A past-due 0 counts as late work. Paces are judged against the goal date; all paces plan just enough for a C by default. Not in the decision log.
- **Realistic C (2026-10-14)**: a C needing up to 90% on remaining work counts as possible (REALISTIC_MAX_PERCENT). Canvas import now adds ungraded and missing work as to do, and scales time guesses by points. Grade math follows category weights when a version 2 file or his own Grading setup has them.
- **Canvas tool v2 (2026-10-14)**: reads weights, drop rules, letter scale, late policy, lock dates, missing/late flags, instructions, rubrics, syllabus, announcements and links; never inbox, other students, files, quiz content, comments or profile. Not yet run against the real Canvas. Drop rules are approximated (Canvas optimizes which to drop). Source files in this repo have no byte-order mark; CHANGELOG.md files do.
- **Due dates first and Grading (2026-10-14)** are not in the decision log: a grading setup for each class (cutoffs, points or weights, drop rules, connecting assignments by hand), the By due date section, and leaving out work due more than 180 days ago.
- **Catch Up class by class (2026-10-14)** is not in the decision log: each class's grade now (typed in, else Canvas's) is where its C math starts; when Canvas's grade differs from the scores, the gap is kept for the graded share, which is an estimate when the class's weights are unknown. His real file is version 1 (no weights), so re-running the Canvas tool and re-importing would make it exact. Past-due work is planned one class at a time, the class closest to caught up first; a class whose C is out of reach gets the time left over and never blocks a pace. The goal date moved into Your pace.
