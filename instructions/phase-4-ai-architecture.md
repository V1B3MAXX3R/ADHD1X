# Phase 4: AI Integration and Technical Architecture (deliverable)

**Version 1.1.1** (2026-10-10). Status: **approved by Christian 2026-10-10** (A108 to A112). Planning only: no code, no keys, no accounts created (A2).

Inputs: the approved UX spec ([phase-3-ux.md](phase-3-ux.md)), Concept A and the MVP list ([phase-2-concept.md](phase-2-concept.md)), and decisions A1 to A106.

Facts below were checked on 2026-10-10 against the pages linked in section 11. Third-party pages (hosting and Firebase and Supabase limits) are marked; check the official pages again before building, because free tiers change.

---

## 1. The short version

1. **Gemini does five jobs, and everything else is plain code.** Gemini reads syllabi and writes first moves, with email drafts, "make it clear" and brain-dump sorting coming later. The day plan, time checks, grade math, quiz rules and notifications never touch Gemini (A41, A36).
2. **The app keeps your data on your own device for the MVP (no accounts).** A small server piece exists only to hold the Gemini key and pass requests along. No database, no sign-in, nothing to pause or bill.
3. **Stack (decided, A109):** TypeScript, React with Vite, a small Node server for the Gemini key, Tailwind, hosted on Vercel's free Hobby plan for now. Section 4 still says Next.js in its tables; read that as React with Vite plus Node.
4. **Free tier stays for now** (A15), with fake or non-sensitive data. Google's terms for the free tier let it use and human-review what you send. Paid tier is needed before anyone else uses the app.
5. **Three honest limits to decide on:** reminders only work while the app is open (section 7), data lives in one browser unless you export it (section 6), and a public AI endpoint needs protection from strangers (section 8).

---

## 2. Where AI helps, and where it doesn't

| Feature | AI or plain logic | Why |
|---|---|---|
| Day plan, block re-sort, deadline tie-breaker (A40 to A48) | **Plain logic** | Predictable, free, works offline (A41) |
| Enough time? check, finish time, reading time (A86, A87, A89) | **Plain logic** | Arithmetic on estimates |
| Catch Up grade math and paces (A36, A81) | **Plain logic** | Grades never go to Gemini (A36) |
| Quiz to settings (A80, A85) | **Rule table** | Visible and changeable; no guessing |
| Notifications, breaks, heads-up | **Plain logic** | Timers and rules |
| Tips library, fun facts, campus page | **Written content** | Evidence-labeled by people (A66, A77) |
| **Read a syllabus** | **Gemini** | Messy PDFs and tables are what language models are good at |
| **Help me start: first move and steps** | **Gemini** | Needs understanding of the specific assignment |
| Make it clear (A60), Message my professor and tone buttons (A61, A92), Sort my brain dump (A94) | **Gemini** (Enhancements) | Rewriting and sorting text |
| Ask about this assignment (A84) | Gemini (Future) | Not in the MVP |

### Separate three things that people often mix up

| Thing | What it is here |
|---|---|
| **Gemini API inside the site** | The server piece calls Gemini with a key kept on the server (A8, A14) |
| **Google AI Studio** | A workbench for testing prompts with fake data and for getting the key (A13). Not part of the running app |
| **Production hosting** | Where the app and the server piece live (section 4) |

---

## 3. The Gemini workflows

Rules for every workflow:

- The server asks for **structured JSON** that matches a schema, then **validates it again in our own code**. The Gemini docs say valid JSON is not the same as correct values, and large or deeply nested schemas can be rejected, so schemas stay small.
- Nothing Gemini returns is saved until the user taps (A4). Syllabus results are shown for review first (A37).
- Gemini gets **no tools**: no function calling, no search, no ability to change anything. Its output is data shown on screen as plain text, never run and never inserted as HTML.
- Uploaded syllabi and assignment text are untrusted. They can contain instructions aimed at the AI ("ignore your rules"). Because Gemini has no tools and its output is only shown for review, the worst case is a bad suggestion the user sees and ignores.
- A system instruction keeps answers on school tasks and never gives medical, medication, supplement or diet advice (A71). Output that mentions those topics is replaced with the one-line pointer to a clinician or campus health service.
- Every call has a timeout and a fallback so the app never dead-ends.

| Workflow | Why AI | Sends | Returns (schema) | Main risk | User step | Fallback |
|---|---|---|---|---|---|---|
| **1. Syllabus reader** (MVP) | Messy layouts | The syllabus file or its text | List of: assignment name, due date, points, percent of grade; course dates | Wrong or missing dates and weights | Review screen S4: edit, remove, then Save | Add assignments by hand |
| **2. First move** (MVP) | Needs the assignment's context | Task title, course name, major, details the user typed or uploaded | One first move (about 2 minutes) plus 2 to 4 hidden steps | Vague, wrong or too big a step | "Give me a different one"; nothing is saved without Start | Saved template first moves by task type |
| **3. Make it clear** (Enhancement) | Reformat instructions | Assignment instructions | Checklist: hand in, format, length, due date, grading | Invented requirements | Review before saving | Show the original text |
| **4. Professor email** (Enhancement) | Drafting | Assignment name, course, the user's one-line request | Subject and body | Wrong tone or facts | User edits and sends it themselves | Short email template |
| **5. Sort my brain dump** (Enhancement) | Sorting free text | What the user typed, only on tap (A94) | List of tasks with guessed course | Misread items | User picks which to add | Plain list left as typed |

### Model choice

The free tier currently lists several Gemini models, including Flash and Flash-Lite versions and a Pro model, alongside preview models ([pricing page](https://ai.google.dev/pricing)). Names change often, so:

- The model name lives in **one config setting**, never scattered through the code.
- **Decided (A111):** a **Flash-Lite model** for the planning-style presets (syllabus reader, first move, Make it clear) and a **Flash model** for professor email and brain dump sort. Prefer non-preview models. Phase 5 tests the syllabus reader on fake syllabi, and the model is one setting, so it can flip to Flash if Lite misses dates or weights.
- Free-tier request limits are not published on the docs page; they are shown **per model in your AI Studio account** and are counted per project ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)). Christian should look at the numbers for the chosen models before Phase 5.
- The design assumes limits can be tight: first moves are saved and reused (A83), calls happen only on a tap, and a rate-limit error shows the fallback with a calm line, never an error screen.

### Cost and speed

- Cost on the free tier: $0. Documents count about 258 tokens per page ([document docs](https://ai.google.dev/gemini-api/docs/document-processing)), so a 20-page syllabus is roughly 5,000 tokens of input.
- Speed has not been measured. Phase 5 tests will set a target. Design rule: show a loading state immediately, and show one fun fact in Space mode (A67) while waiting. After 20 seconds, stop waiting and show the fallback.

---

## 4. Stack proposal

No stack is assumed. Three were compared against what Christian told us: part-time coder who can spot bad code but writes little (Q4), TypeScript (A29), three AI coders (A16), free, personal project (A9).

| | **1. Next.js on Vercel, data on device** (proposed) | 2. Next.js plus Firebase | 3. Next.js plus Supabase |
|---|---|---|---|
| Sign-in and cloud data | None in the MVP | Firebase Auth and Firestore | Supabase Auth and Postgres |
| Server piece for the Gemini key | Vercel server routes | Needs Cloud Functions, which need the paid Blaze plan, or Vercel routes beside Firebase | Supabase Edge Functions or Vercel routes |
| Free-tier fit | Hobby plan: 100 GB transfer, 1M function invocations a month. **Personal and non-commercial use only** | Spark: 50,000 monthly users, 1 GiB data, daily read and write caps. Hitting a limit shuts the product off for the month. Linking a billing account upgrades the project to Blaze automatically | Free projects **pause after a week of inactivity**: your data is kept but the app is offline until restored |
| Fits "leave for weeks, nothing lost" (A25) | Yes | Yes | **No**, unless upgraded to the paid plan |
| Complexity for a part-time coder | Lowest | Medium | Medium |
| Privacy | Least data on any server | Personal data on Google servers | Personal data on Supabase servers |
| Release path (Q15) | Move hosting before release; Vercel Hobby forbids commercial use | Works | Works |

Sources for the limits: [hosting comparison](https://flaviocopes.com/hosting-free-tiers.md) (September 2026), [Firebase summary](https://agentdeals.dev/vendor/firebase), [Supabase summary](https://automationatlas.io/answers/supabase-free-tier-limits-2026/). The last two are third-party; verify on official pages before building.

### Proposed pieces

| Piece | Choice | Why |
|---|---|---|
| Language | TypeScript (A29) | Already decided |
| Framework | Next.js (App Router) with React | The most documented stack, so AI coders and Christian's review have the most examples to lean on. Hosts the server routes too |
| Styling | Tailwind CSS with design tokens for themes | Easy to build Low, Normal and Regular modes from one set of tokens. Accessibility still has to be tested; the tool doesn't give it |
| On-device data | IndexedDB through a small wrapper | Holds courses, assignments, settings. Survives closing the tab |
| Validation | A schema library (such as Zod) | One schema checks Gemini output, saved data and imports |
| Hosting | Vercel Hobby, free | Matches A9. Switch to Cloudflare Pages or paid Vercel before any wider release |
| Tests | Vitest for plan logic, Playwright for flows, axe and keyboard checks for accessibility | The day plan is plain logic, so it can be tested without AI. Chromium is available for Playwright |
| Prompts | Stored as files in `coding/prompts/` with fake-data tests | So prompt changes are reviewed like code (A17) |

If Christian wants cloud accounts later, option 2's data half (Firebase Auth and Firestore on the free Spark plan, no billing account linked) can be added without redoing the app, because the server routes already run on Vercel.

---

## 5. Accounts, sign-in and where data lives (Q5)

**Proposal for the MVP: no accounts.** The app opens straight to the 18+ checkbox (A30). Everything the user enters stays on their device.

| | No accounts, data on device (proposed) | Accounts with cloud data |
|---|---|---|
| Fits privacy goals | Best: nothing personal on a server | More to protect and delete |
| Fits A25 (leave and return) | Yes, if the browser keeps the data | Yes |
| Works across devices | No | Yes |
| Risk | Clearing browser data erases everything | Account lockout, breaches, cost |
| Cost and effort | Lowest | Auth, database, rules, deletion flow |

**Mitigation for the risk:** Settings gets **Export my data** and **Import** (one JSON file), and a gentle prompt after the first week, once, to export. This matches the "Delete my data" button already planned in Settings > Privacy.

**If accounts are added later:** WCAG 3.3.8 forbids making login depend on memorizing or typing a code unless an alternative exists. Allowed approaches include password managers with pasteable fields, email sign-in links, device sign-in such as passkeys and a security key, and "sign in with" a provider ([W3C explanation](https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html)). No puzzle or character-by-character code boxes that reject pasting.

---

## 6. Data model

All fields live on the device in the MVP. Stored data is versioned so future updates can upgrade old saves.

| Entity | Main fields | Notes |
|---|---|---|
| Profile and settings | major (optional), 18+ confirmed (yes/no), Space or Regular, theme, text size, spacing, motion, sounds, tone, Today view, timer length and display, notification settings (A104), voyage hidden or shown, Gemini notice acknowledged | No birthday, age, diagnosis or health data (A11, A30) |
| Quiz answers | question id, yes or no or skipped, timestamp | Source of the "On because you said yes to..." notes |
| Course | name, end date, grade weights | Weights from the syllabus after review |
| Assignment | course, name, due date, points, percent of grade, details text, type, estimate, status, Not now flag, notes ("Where was I?") | Uploaded files are not kept; only the reviewed extracted text (section 8) |
| Study day | date, blocks picked, accepted plan, task order | Rebuilt from rules; manual moves recorded |
| Work session | assignment, start, planned length, actual minutes (optional), session goal and result (optional) | Actual minutes only improve estimates, never shown as a score (A90) |
| First-move cache | task type and course, first move, steps | Reuse per A83 |
| Voyage and logbook | route position, planets reached, past semesters | Moves forward only (A54) |
| Catch Up (Enhancement) | target grade, pace, entered scores | Entered scores never leave the device (A36) |

---

## 7. Notifications: an honest limit

The approved settings (A104) include reminders and browser notifications. A website can show notifications while it is open in a tab. Reminders that arrive **after the tab is closed** need a push service: a server that sends messages and a user account or device registration to send them to. That conflicts with the no-accounts MVP.

| Option | What works | Cost |
|---|---|---|
| **A. MVP (proposed):** in-app reminders and browser notifications while the app is open | Due-soon list and banners when you open the app, heads-up and break prompts during a session | None |
| B. Later: push notifications when closed | Real reminders | Needs accounts or device registration, a push server, and a way to send them; belongs with the cloud-account step |

Under A, the Today screen is the reminder: opening the app shows what is due soon, with no guilt wording (A5). This should be said plainly in the Notifications settings so no one expects a closed-tab ping.

---

## 8. Uploads (A50)

| Decision | Proposal |
|---|---|
| Types | PDF (read visually, so tables and charts work). Plain text and Markdown. Word files are converted to text on the server first, because Gemini treats most non-PDF documents as plain text only ([document docs](https://ai.google.dev/gemini-api/docs/document-processing)) |
| Size | Our limit is lower than Gemini's (50 MB or 1,000 pages): proposal **10 MB and 40 pages**. A syllabus is rarely larger. Confirm with Christian's real syllabi |
| Handling | The server receives the file, passes it to Gemini inline, and discards it. **It is not saved** on our side. The Files API is not used, because it keeps uploaded files for 48 hours |
| What is kept | Only the extracted fields after the user reviews and saves (A37) |
| Warning on screen | "Gemini reads this file. On the free tier, Google may use it and people may review it. Leave out anything personal" |
| School materials | Some schools or professors restrict sharing course materials. Worth checking your school's rules before uploading; this report did not check any policy |

---

## 9. Privacy and security plan

### What Google's free-tier terms say (verified on the [terms page](https://ai.google.dev/terms), updated 2026-04-28)

- Google uses what you submit and the responses to improve its products, and human reviewers may read, annotate and process them, with the data disconnected from your account and key.
- "Do not submit sensitive, confidential, or personal information to the Unpaid Services."
- Paid services are not used to improve products, but Google logs prompts and responses for a limited time for abuse and legal reasons.
- You must be 18 or older. In the EEA, Switzerland and the UK, only paid services may be used. ADHD1X is US-only and 18+ (A18), which matches.
- Consequence for the app's copy: it may not claim data is never stored or never used for training (the plan already avoids this).

### Controls

| Risk | Control |
|---|---|
| Key exposed | Key only in a server environment variable, in a git-ignored local file for development and in Vercel's settings for production. Never in browser code, never in a variable the browser can read, never committed (A8, A14). Separate keys for development and production so one can be revoked alone |
| Strangers using the AI endpoint and burning the free quota | With no accounts, anyone who finds the site's address could call the endpoint. Proposal: the app requires a **personal access code** (a secret stored in an environment variable and entered once on the device) before any Gemini call, plus request size limits and a per-device rate limit. Exact method is confirmed at build time; hosting protections on the free plan change |
| Prompt injection in syllabi | Section 3: no tools, structured output, review before saving, text rendered as plain text |
| Cross-site scripting | No HTML from Gemini; a strict content security policy; framework escaping |
| Personal data to Gemini | Only the fields in the table in the UX spec (section 4 of [phase-3-ux.md](phase-3-ux.md)). Grades and notes never sent |
| Server logging | The server does not log request bodies or file contents |
| Deletion | Delete my data clears the device. Nothing personal is stored on our server. Anything Google already received under the free terms cannot be deleted by us |
| Dependencies | Lock files, update checks, and a short list of approved libraries; AI coders may not add packages without being asked (Phase 5 rule, Q11) |
| Accessibility regressions | Automated checks run on every change; manual keyboard, screen reader and zoom passes before any release (A3) |

### Paid tier (Q16)

Proposal: **stay on the free tier while Christian is the only user and uses fake or non-sensitive data** (A15). Switch to the paid API tier before anyone else uses the app, before real personal data goes through it, or if Christian is not comfortable with Google reviewers possibly reading his syllabi. A consumer Gemini subscription is not the same as the paid API tier (A15, from memory; verify when billing is set up). Setting up billing is a Christian-only step; it needs his explicit OK.

**Google AI Pro (Christian has it):** per [Google's plans page](https://ai.google.dev/gemini-api/docs/google-ai-plans), Pro raises limits only inside the AI Studio website (Playground and Build). It does not raise the limits of the API key the app uses, and API use is billed separately. The page says nothing about data-use terms for Pro, so keep using fake data for tests.

---

## 10. Open technical risks

| Risk | Why it matters | When we learn more |
|---|---|---|
| Free-tier request limits unknown | Could throttle the syllabus reader on busy days | Christian checks AI Studio before Phase 5 |
| Syllabus reading accuracy | Wrong dates are costly | Phase 5 test set of fake syllabi; review screen is the safety net |
| Data lives in one browser | Losing it would hurt trust | Export and import in the MVP; accounts later |
| Reminders only while open | Some users expect real push reminders | Decide at the notifications step (section 7) |
| Vercel Hobby is personal-only | Must move before any release | Q15 |
| Free tiers change | Limits and rules above may shift | Re-check at the start of Phase 6 |
| Weak-coder review load | Many AI-written changes to review | Phase 5: small tasks, changelog (A17), tests that fail loudly |

---

## 11. Sources checked

- Gemini API pricing and free-tier model list: https://ai.google.dev/pricing
- Gemini API additional terms (updated 2026-04-28): https://ai.google.dev/terms
- Document understanding (PDF limits, Files API, other file types): https://ai.google.dev/gemini-api/docs/document-processing
- Structured output: https://ai.google.dev/gemini-api/docs/json-mode
- Rate limits: https://ai.google.dev/gemini-api/docs/rate-limits
- WCAG 2.2 accessible authentication (W3C): https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
- Hosting free tiers (third party, checked September 2026): https://flaviocopes.com/hosting-free-tiers.md
- Firebase free tier (third party): https://agentdeals.dev/vendor/firebase
- Supabase free tier (third party, May 2026): https://automationatlas.io/answers/supabase-free-tier-limits-2026/

---

## 12. Decisions for Christian at the gate

1. **Data and accounts (Q5):** no accounts in the MVP, data on your device, with export and import. OK? (Recommended.)
2. **Stack (Q10):** TypeScript, Next.js, Tailwind, Vercel Hobby. OK?
3. **Free tier (Q16):** stay free for now, with fake or non-sensitive data, and switch to paid before anyone else uses it. OK?
4. **Reminders:** MVP reminders work while the app is open; push when closed comes later with accounts. OK?
5. **Access code** to keep strangers off the AI endpoint. OK?
6. **Uploads:** 10 MB and 40 pages, PDF and text files, discarded after reading. Do your real syllabi fit?
7. **Look at your AI Studio limits** for the models above and tell me the numbers, so Phase 5 can plan around them.

## 13. Prototype the UI in Google AI Studio (Christian's ask, T68)

Christian wants to use AI Studio to deploy and test the UI. That fits the three-way split in section 2: AI Studio is the workbench, and the real app and hosting come later. Checked 2026-10-10 on [Google's deploying page](https://ai.google.dev/gemini-api/docs/aistudio-deploying) and the [Starter tier explainer](https://cloud.google.com/blog/topics/developers-practitioners/the-starter-tier-for-google-ai-studio-explained).

**What it does:** Build mode makes an app from a description, and Publish gives it a live Cloud Run link. On the Starter tier no Google Cloud project or billing is needed, up to two apps per account, one instance, no time limit.

**Catches:**
- Starter is not available to Google Workspace accounts, including school accounts, or accounts that ever had a paid Cloud billing account. Use a personal Google account.
- Quotas apply (the explainer lists a Firestore daily read cap of 50,000, for example). If one runs out, the database pauses until about midnight Pacific.
- Starter has its own separate terms. I could not find how it handles data use or review, so treat everything typed into a prototype as visible to Google.
- Neither page says how a published app's Gemini key is handled or whether the link is public. Treat the link as public until proven otherwise.
- Build mode writes code. That bumps into the code lock (A2).

**Proposed guardrails:**
1. Throwaway UI prototype only. It tests screens S1 to S12, themes, Space or Regular mode and the Display settings. It is not the real app.
2. Fake data only, no real syllabi, grades or personal details (A15, A36).
3. No keys in the prompt or the app, and nothing from the prototype goes into `coding/` or git. The real app is still built in Phase 6.
4. Claude writes the prompt file for AI Studio from the approved UX spec. A prompt is instructions, not code. Findings from testing become proposals in the decision log, and Christian approves them before the spec changes.
5. Unpublish the prototype when done.

Needs Christian's explicit OK, because the lock only opens on his exact phrase.

**Workflow Christian proposed: code in VS Code, then bring it into AI Studio.** Google's [Build mode page](https://ai.google.dev/gemini-api/docs/aistudio-build-mode) says Build can import a repo through "Import from GitHub" and sync both ways (push from AI Studio, pull local changes). That page names **React** with a **Node.js** server as the default and does not mention Next.js or Vite. A [community write-up](https://dev.to/lenabrooks/google-ai-studio-build-can-now-import-github-repos-what-that-means-for-existing-apps-cj8) says imports get converted to AI Studio's runtime and leaves open whether private repos work and which frameworks are supported. Unverified, so treat it as a question until tested.

**Decided (A108):** VS Code with a GitHub repo is the source of truth. AI Studio is for previews and deploys only, and the same code is never edited in both places at once. TypeScript stays.

**What this means for the stack (T60):** Next.js may not import cleanly. The safer pick is **React with Vite plus a small Node server for the Gemini key**, which matches what AI Studio documents. Everything else in section 4 stays. Proposed change to T60, to be confirmed at the gate. A test with a tiny fake repo waits until Phase 6 opens, since it needs code.

## Carries forward to Phase 5

Chosen stack, data model (section 6), AI workflow list (section 3), security plan (section 9), open technical risks (section 10), and the shared coding rules question for three AI coders (Q11).
