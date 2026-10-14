# Phase 5: Shared Coder Rules (draft of the future rules file)

**Version 1.1.1** (2026-10-10)

Status: **proposals approved by Christian 2026-10-11 (A115, A116).** Waiting on Christian's two open answers (test devices, quiz skip defaults) and the exact phrase in A2. Planning only. When Phase 6 opens, the text between the two lines below becomes `coding/RULES.md`. Three tiny pointer files then tell each AI tool to read it: `coding/CLAUDE.md` (for Claude), `coding/AGENTS.md` (for Codex) and `coding/GEMINI.md` (for Gemini). I believe those are the file names each tool looks for; check the tools' current docs when setting up (P01). One rules file means the three coders follow the same conventions (A16).

Coding was locked until Christian said the exact phrase in A2; `coding/` now holds the built MVP (one folder per part, each with its own CHANGELOG.md).

---

# ADHD1X rules for every AI coder

You are helping build ADHD1X, a personal school helper website for a university student with ADHD, autism or both. Christian owns the product and approves every decision. He is a part-time coder who can spot basic problems but does not write much code, so he relies on you and on tests. Be clear, honest and small.

## 1. Read these first, every task
1. This file.
2. `instructions/decision-log.md` (approved decisions A1 and up are requirements).
3. `instructions/phase-5-blueprint.md` and `instructions/phase-5-technical-spec.md`, at least the sections your prompt names.
4. If anything the prompt asks conflicts with an approved decision, stop and tell Christian. Do not pick a side.

## 2. Hard rules (never break these)
1. **No secrets in code, chat, commits or logs.** The Gemini key and the access code live only in server environment variables. Never in any variable starting with `VITE_`, never in a file that is committed. If you see one, stop and say so. Christian creates and enters keys himself; you never ask him to paste one in chat.
2. **Gemini is called only from the server.** The browser never sees a key.
3. **Fake data only.** Tests, examples and screenshots use made-up students, courses and syllabi. Never real grades, names or school documents.
4. **Nothing changes saved data without the user's tap** (A4). Gemini results are shown for review first. The plan never rearranges itself while the user is looking at it (A73).
5. **No guilt, streaks, shame or "come back" wording** (A5, A25). No red-only warnings. Never mention missed or overdue work in a pushy way.
6. **Plain words in the interface.** Never "symptoms", "disorder", "deficit" or "superpower" (A76). The app is not a diagnosis or medical tool (A6, A11). No medical, medication, supplement or diet advice anywhere (A71).
7. **Accessibility is part of "done".** WCAG 2.2 AA (A3). Keyboard works, visible focus, labels, contrast, 44 px targets, motion off respected, nothing relies on color alone. See blueprint section 9.
8. **AI text is plain text.** Never render Gemini output as HTML. Never use `dangerouslySetInnerHTML`.
9. **No age or birthday, ever** (A30). No diagnosis or health fields (A11).
10. **Grades and personal notes never go to Gemini** (A36).
11. **Never skip, delete or weaken a test to make it pass.** If a test is wrong, say why and fix it openly.
12. **Do not add a package** that is not on the approved list below without asking Christian first.
13. **Do not edit files outside your task.** Do not reformat unrelated code.

## 3. Language and tools
- TypeScript in strict mode. No `any` unless you explain why in a comment. Prefer small, plain functions over clever ones.
- React with Vite, Tailwind, React Router. State kept simple; the day plan and other logic live in pure TypeScript files with no React in them.
- Zod checks every value that comes from outside: Gemini answers, imported files, saved data.
- Approved packages (verify exact names and current versions at install time): `react`, `react-dom`, `react-router`, `vite`, `typescript`, `tailwindcss`, `zod`, `idb`, `@google/genai` (server only), `@vercel/node` (types), `vitest`, `@testing-library/react`, `@testing-library/user-event`, `playwright`, `@axe-core/playwright`, `eslint` with `typescript-eslint` and `eslint-plugin-jsx-a11y`, `prettier`. Anything else: ask first.

## 4. Where things go

```
coding/
  RULES.md  CLAUDE.md  AGENTS.md  GEMINI.md  CHANGELOG.md
  package.json  vite config  tsconfig  tailwind config  vercel.json
  src/
    app/          routes, shell, router
    features/     onboarding, courses, assignments, today, helpMeStart,
                  timer, voyage, settings, help
    components/   shared building blocks
    logic/        planEngine, quizRules, estimates, voyage (pure, no React)
    data/         database, schemas, migrations, export and import
    ai/           browser-side client for /api/ai (no keys)
    styles/       tokens and themes
  api/            server functions: ai/[preset]
  server/         presets, validation, safety checks
  tests/          unit, e2e, fixtures (fake syllabi)
```

## 5. How to work
1. **One small task at a time, on its own branch** named like `m3-onboarding`. GitHub is the source of truth (A108). Pull before you start. If two tools touch the same area, stop and tell Christian.
2. **Tests first** for anything in `logic/` and `data/`: write the tests from the spec, see them fail, then write the code.
3. **Ask when the spec is unclear.** Do not guess dates, numbers or behavior. A short question is cheaper than a wrong feature.
4. **Keep the code readable for a part-time coder.** Short files, clear names, a one-line comment where the reason is not obvious. No hidden magic.
5. **Run before you finish:** type check, lint, unit tests, the end-to-end tests for what you touched, the accessibility checks, and the secret scan. Report exactly what passed and what did not. Never say "should work."
6. **Changelog (A17).** In the same step as every change, add an entry to `coding/CHANGELOG.md`: date, what changed, why, and which tool made it (Claude, Codex, Gemini or Christian).
7. **Commits:** small, with a plain message in the form `area: what changed`. Never commit a secret, a real file from a student, or a build folder.
8. **Plain-words report at the end of every task.** Use this shape:
   - *What changed* (two or three sentences, no jargon).
   - *What to click to see it* (steps Christian can follow).
   - *What could still be wrong* (honest).
   - *Tests run and results.*

## 6. Who does what (A16)
- **Claude:** advanced work and debugging: the project setup, the data layer, the plan engine, the Gemini server, the timer logic, hardening, and reviews.
- **Codex:** lighter, well-specified work: screens, forms, styling, components, content files.
- **Gemini:** prompt work (system instructions, test sets, evaluation) and long repetitive parts.
- **Google AI Studio:** previews only, imported from GitHub, with fake data and no keys (A108, A110). Never edit the same code in AI Studio and VS Code at the same time.

## 7. Definition of done
A task is done only when: it meets the blueprint's acceptance checks for it, tests pass, accessibility checks pass for the screens it touches, the changelog entry exists, there is no secret anywhere, and Christian has done the "Christian check" in plain words and said it works.

## 8. If something goes wrong
- If you broke something, say so, say what, and fix it or revert it. Do not hide it.
- If a test fails and you cannot fix it, stop and report. Do not force it through.
- If you are about to do something hard to undo (delete data, rewrite history, change hosting, spend money), stop and ask.
