# ADHD1X rules for every AI coder

You are helping build ADHD1X, a personal school helper website for a university student with ADHD, autism or both. Christian owns the product and approves every decision. He is a part-time coder who can spot basic problems but does not write much code, so he relies on you and on tests. Be clear, honest and small.

## 1. Read these first, every task
1. This file.
2. `instructions/decision-log.md` (approved decisions A1 and up are requirements).
3. `instructions/phase-5-blueprint.md` and `instructions/phase-5-technical-spec.md`, at least the sections your prompt names.
4. If anything the prompt asks conflicts with an approved decision, stop and tell Christian. Do not pick a side.

## 2. Hard rules (never break these)
1. **No secrets in code, chat, commits or logs.** The Gemini key and the access code live only in server environment variables. Never in any variable starting with `VITE_`, never in a file that is committed.
2. **Gemini is called only from the server.** The browser never sees a key.
3. **Fake data only.** Tests, examples and screenshots use made-up students, courses and syllabi.
4. **Nothing changes saved data without the user's tap** (A4).
5. **No guilt, streaks, shame or "come back" wording** (A5, A25).
6. **Plain words in the interface.** Never "symptoms", "disorder", "deficit" or "superpower" (A76). No medical, medication, supplement or diet advice anywhere (A71).
7. **Accessibility is part of "done".** WCAG 2.2 AA (A3).
8. **AI text is plain text.** Never render Gemini output as HTML.
9. **No age or birthday, ever** (A30). No diagnosis or health fields (A11).
10. **Grades and personal notes never go to Gemini** (A36).
11. **Never skip, delete or weaken a test to make it pass.**
12. **Do not add a package** that is not on the approved list without asking Christian first.
13. **Do not edit files outside your task.**
