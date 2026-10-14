# Phase 4: AI Integration and Technical Architecture

**Version 1.1.1** (2026-10-10)

**Status:** Approved by Christian 2026-10-10 (A112). Deliverable: [phase-4-ai-architecture.md](../phase-4-ai-architecture.md).

## Goal
Decide where Gemini actually helps, where plain app logic is better, and what the stack and data model look like.

## Work
- For each AI feature: why AI, inputs, outputs, hallucination risk, structured output, user approval step, latency, cost, privacy, fallback
- Server-side Gemini calls so API keys never reach the browser
- Keep three things separate: Gemini inside the site, Google AI Studio as a prototyping tool, production hosting
- Evaluate candidate stack (React, Next.js, TypeScript, Tailwind, Firebase, Google Cloud) without assuming any
- Auth, sessions, database, file uploads (syllabus PDFs), calendar integration
- Privacy and security (section 10): minimization, encryption, deletion, export, consent, retention
- Rule: AI suggestions never change saved data without user approval

## Inputs
Phase 3 spec, decision log, master prompt sections 5, 10, 11.

## Deliverable
AI systems architecture and technical feasibility plan.

## Gate
Explicit approval.

## Carries forward to Phase 5
Stack: TypeScript, React with Vite, small Node server for the Gemini key, Tailwind, on-device IndexedDB, Zod, Vercel Hobby for now (A109). Working rule: VS Code and GitHub are the source of truth, AI Studio is for previews (A108). No accounts in the MVP, free Gemini tier with fake data, reminders only while open, access code, throwaway AI Studio preview (A110). Five Gemini jobs, Lite and Flash split, 10 MB uploads (A111). Data model, security plan and open technical risks are sections 6, 9 and 10 of the deliverable. Still open for Phase 5: Q11 (shared rules for three AI coders), Q15 (release), Q3 remainder.
