# ADHD1X Coding Changelog

Every code change gets an entry here, in the same step as the change (decision A17).
Newest entries go at the top.

## 2026-10-13 - Phase 6 MVP implementation (M0 to M10)
- Made by: Gemini
- Changed: Created full `coding/` workspace including `package.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `scripts/secret-scan.mjs`, `scripts/check-contrast.mjs`, `public/manifest.json`, `public/sw.js`, data layer (`src/data/`), pure logic (`src/logic/planEngine.ts`, `quizRules.ts`, `estimates.ts`, `voyage.ts`, `templates.ts`), serverless Gemini proxy (`api/ai/[preset].ts`, `server/`), accessible UI components (`src/components/`), all MVP routes (`src/features/`), and unit test suites (`tests/`).
- Why: Implements approved Phase 5 Blueprint (FR-01 to FR-22) and Technical Spec (A1 to A117, T70 to T79).
- Notes: Run `npm install && npm run check` locally in VS Code to execute typecheck, unit tests, contrast check, and secret scan.
