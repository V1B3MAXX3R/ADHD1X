# Phase 5: Development Blueprint (master)

**Version 1.1.1** (2026-10-10)

Status: **proposals approved by Christian 2026-10-11 (A115, A116).** This blueprint was used to build the MVP in [../coding/](../coding/) (2026-10-13). Two answers were still open when it was written (test devices, quiz skip defaults).

The blueprint has four parts:

| Part | File | What it holds |
|---|---|---|
| 1. Master blueprint (this file) | phase-5-blueprint.md | What to build, pages, flows, components, design system, accessibility, testing, milestones, risks, unresolved decisions |
| 2. Technical spec | [phase-5-technical-spec.md](phase-5-technical-spec.md) | Day plan engine rules and test cases, data model, Gemini server contract, security |
| 3. Implementation prompts | [phase-5-implementation-prompts.md](phase-5-implementation-prompts.md) | The ordered prompts for the AI coders. Written, not run |
| 4. Shared coder rules | [phase-5-coder-rules.md](phase-5-coder-rules.md) | The one rules file all three AI coders will read (answers Q11) |

Only approved decisions (A1 to A113) are treated as requirements. Where I had to fill a gap, it is marked **(T##)** and listed in section 12 for Christian to approve or change. Numbers I picked (minutes, days, sizes) are starting values to test, not research findings.

Inputs: [phase-1](phases/01-research.md) to [phase-4](phase-4-ai-architecture.md) deliverables, [phase-2-concept.md](phase-2-concept.md), [phase-3-ux.md](phase-3-ux.md), [quiz-questions.md](quiz-questions.md), [day-plan-logic.md](day-plan-logic.md), [help-me-start.md](help-me-start.md), [personalization-levers.md](personalization-levers.md), and [decision-log.md](decision-log.md).

---

## 1. What we are building

ADHD1X is a personal, web-based school helper for a university student who finds it hard to start and plan schoolwork (A31, A32). It is the **School Day Copilot** (A96): it builds today's plan automatically, and when you are stuck it gets you started with one tiny first move.

- **Success after one semester:** grades improve and assignments are turned in on time more often (A33).
- **Not** a diagnosis, therapy or medical tool (A6, A11). No streaks, guilt, commitment or missable events (A5, A25).
- **Audience now:** Christian, as the test user (A12). Future release is undecided (A9, Q15). Any release is US-only and 18+ (A18).
- **Where it lives:** a website. Data stays on the user's device (A110). Gemini is used for a few preset actions only (A26, A111).

---

## 2. Product requirements: the MVP

Each requirement has a number to refer to, the decisions behind it, and checks that a person or a test can run. "Done" for any requirement also means the accessibility checks in section 9 pass.

| # | Requirement | From | Acceptance checks |
|---|---|---|---|
| FR-01 | **Disclaimer and age box.** Disclaimer screen with the final wording, then an "I'm 18 or older" checkbox that must be checked to go on. Nothing about age is stored except `true` | A20, A21, A30 | Continue is disabled with a text reason until the box is checked. The disclaimer text matches A21 exactly. No birthday or age field exists anywhere |
| FR-02 | **Basic quiz (questions 1 to 5).** One question per screen, big Yes and No, Skip, Back. After question 5, "That's enough to set things up. Keep going now, or finish later anytime." Answers go through a visible rule table to settings. Each setting shows "On because you said yes to: ..." with a one-tap undo | A28, A78, A80, A85 | All 5 questions can be skipped and the app still works with defaults. Each answer changes the setting listed in [quiz-questions.md](quiz-questions.md). Undo restores the default. Changing a setting by hand is never overwritten by later quiz answers. A skipped question counts as No (A117), including question 1: with question 1 skipped or No, Today shows a plain list of upcoming assignments by due date, with a "Show my day plan" button, instead of the plan as home. Questions 6 to 21 are not built in the MVP, but the rule table and storage support them |
| FR-03 | **Major.** Optional free-text major | A38 | Can be skipped. Used only for plan weighting and in the first-move request |
| FR-04 | **Courses and manual assignments.** Add a course (name asked once) and add assignments by hand with name, type, due date, points, percent of grade, details, estimate | A32, A50 | A course name is never asked twice. Editing and removing work. Default estimate appears by type and is labeled as a default. Due dates are checked as real dates |
| FR-05 | **Syllabus upload and review.** Upload a PDF or text file (or paste text). Gemini reads it. A review screen lists everything found, each row editable or removable. Nothing is saved until Save | A37, A50, A111, T72 | Files over the size limit are refused with a plain message and the paste option. Missing values stay blank, never guessed. If nothing is found, the screen says so and offers manual entry. Cancel saves nothing. The uploaded file is not kept |
| FR-06 | **Study blocks.** Pick Morning, Evening and/or Night for today. Presets are adjustable. After 8 pm the app asks first | A42, A47 | If no blocks are picked, the Today screen asks once: "Which parts of your day are you studying?" Block times can be changed. 1, 2 and 3 blocks give short, long and all-day load |
| FR-07 | **Today and the day plan.** The plan is already built when the app opens. "Looks good" accepts it. Edit by moving tasks, Not now, or changing blocks. Plan rules are in [technical spec](phase-5-technical-spec.md) section 1 | A32, A40 to A48, T71 | All 7 engine test cases pass. Same input gives the same plan. Manual moves always win. Due-within-24-hours tasks jump the line and say "due tomorrow" in words. Moving tasks works with buttons as well as drag (WCAG 2.5.7). The one-card home view works when chosen |
| FR-08 | **Load, finish time and Enough time?** Total load shown before accepting a 2+ block plan. "Done around 3:40 pm." One calm line if work will not fit | A41, A86, A87 | The load number includes breaks. Finish time updates as the plan changes. The Enough-time line appears only on a real shortfall, uses no red alone, and its "Add a block" button only proposes (the user confirms) |
| FR-09 | **Not now list.** Move a task off today's plan without deleting it; it waits in a list and can come back | A88 | Not now tasks never appear in the plan. One tap puts one back |
| FR-10 | **Help me start.** Pre-selected task, one question (bite-sized, split in half, full), details if missing, one tiny first move with a "Give me a different one" button, hidden extra steps under "Show more", Start now or Start later | A49 to A51, A82, A83 | One step per screen and Back always works. If Gemini fails, a saved template first move appears. First moves are saved and reused; the "different one" button asks again. Start later shows only when all details are in. Only title, course, major, size choice and details text go to Gemini |
| FR-11 | **Stuck path.** "Still stuck?" offers Tips for this kind of task, or Switch task. Switching shows one gentle line, once | A58, A59 | The line shows once per switch and the switch button is just as easy to press. In the MVP the Tips option opens a short built-in list marked "try this and see"; the full evidence-labeled library is an Enhancement |
| FR-12 | **Timer.** A slim bar at the bottom of Today. Starter length 2 minutes by default (2, 5, or custom). Pause, Keep going, Next step, Done for now. Display is a number, a shrinking bar, or hidden. No sound unless turned on | A44, A75, A82 | The bar never covers the focused item (WCAG 2.4.11). Stopping early shows kind wording, never "you only did 2 minutes." Timer works without block mode and the other way around |
| FR-13 | **Block-change prompt, heads-up and breaks.** If a timer runs when a block ends, a prompt asks "Keep the same task" or "Change it". A heads-up banner five minutes before a block ends. Break markers in the plan | A41, A45, A46, A63 | The timer keeps running while the prompt is open. Nothing switches unless the user picks Change it. The heads-up is a banner that never steals focus. Break markers can be dismissed |
| FR-14 | **Assignments page and details.** List with filters; Not now count; a Details panel with every field and a Help me start button. On desktop, hovering for 2 seconds also opens it | A52, A55 | Hover content can be dismissed with Esc, stays open while the pointer is over it, and does not disappear on its own (WCAG 1.4.13). Keyboard focus and tap open the same panel |
| FR-15 | **Settings.** Nine sections in a fixed order: Display, Notifications, Planning, Timer, Help and tone, My answers, Catch Up (hidden in the MVP), Privacy, About | A99 to A104 | Every setting listed in [phase-3-ux.md](phase-3-ux.md) section 3 (S11) works and survives a reload. Catch Up section is not shown until the Enhancement exists |
| FR-16 | **Space or Regular style and a small spaceship.** Presentation only. Voyage panel shows position, stop reached and a plain text line. Can be hidden. Regular style shows a plain finished list | A53, A54, A57, T74 | Switching style changes names and art only, never layout order or features. Progress never goes backward. Works with motion off. Hiding Progress leaves a 3-item nav and nothing else moves |
| FR-17 | **Sensory controls.** Low theme, motion off, sounds off, dim mode, text size, spacing, fewer things on screen. Respects the device's reduce-motion setting | A35, A74 | Motion off removes all animation, including star backgrounds. All themes pass the contrast checks in section 6.2 |
| FR-18 | **Help and campus support.** A Help link in the same place on every page opens Tips, Campus support and How ADHD1X works | A65, A76, WCAG 3.2.6 | Present on every screen in the same spot. Campus support has no treatment advice |
| FR-19 | **Gemini disclosure.** One-time notice before first AI use; a "Uses Gemini" label on every AI button; the full list under Settings, Privacy | A102 | Pressing any AI button the first time shows the notice. "Not now" cancels the request. The text never claims data is never stored or never used for training |
| FR-20 | **Export, import, delete.** Export all data to one file; import by replacing; delete everything | A110, T76 | Export then delete then import restores everything except the access code. An invalid or newer file is rejected with a plain message. Delete offers Export first |
| FR-21 | **Access code and server.** The Gemini key stays on the server. The app sends a personal access code with each AI request | A8, A14, A110 | A request without the right code gets nothing back. No secret appears in the browser files, the repo, or logs (checked by a scan) |
| FR-22 | **In-app reminders and optional browser notifications.** Due-soon list and banners; browser notifications only when turned on and permitted; quiet hours, batching, sounds off | A104, A110, T77 | No notification ever mentions missed work or being behind. "Turn all notifications off" works. Permission is requested only after the user turns browser notifications on |

### Left out of the MVP on purpose

These have a reserved place in the data and screens but are not built until the MVP works for Christian (A97): Sort my brain dump, Make it clear, Message my professor and tone buttons, "Where was I?" note, session goal line, time check-back, reading time from pages, saved routines, energy check, Catch Up / Hyperdrive, the full tips library with evidence badges, fun facts, the logbook screen, quiz questions 6 to 21, and Ask about this assignment (Future). Also out: accounts, push notifications after the tab closes, Canvas, peer rooms, free chat (F1 to F3).

---

## 3. Page structure

One page application (React with a router). Browser history works, so Back does what people expect. On every route change: the page title is updated (WCAG 2.4.2) and keyboard focus moves to the page heading.

| Route | Screen | Notes |
|---|---|---|
| `/welcome` | S1 disclaimer, S2 age box, S3 quiz (one step per screen) | Shown only until step 2 is done |
| `/setup/major` | Major | Optional |
| `/setup/courses` | S4 add a course and syllabus review | Also reachable from Assignments |
| `/setup/blocks` | Pick study blocks | Also appears inline on Today |
| `/today` | S5 Today, S7 timer bar, S8 block-change prompt | Home. Redirects to `/welcome` if the age box is not done |
| `/start/:assignmentId` | S6 Help me start | One step per screen |
| `/assignments` | S9 list | Filters, Not now |
| `/assignments/:id` | Assignment details | Same content as the hover panel |
| `/voyage` | S10 Progress or Voyage | Hidden from nav if the user hides it |
| `/settings/:section` | S11 nine sections | Default section: Display |
| `/help` | Help panel as a page | Tips, Campus support, How it works |
| `/help/campus-support` | S12 | Plain page |
| `/privacy` | Settings, Privacy detail | What goes to Gemini and what does not |
| `/not-found` | Friendly "can't find that page" | Link home |

Navigation is one fixed bar that never changes order: a left rail on desktop and a bottom bar on phones, with Today, Assignments, Progress or Voyage, and Settings. The Help link is in the same corner of every page (A73, A100).

---

## 4. User flows

**First visit:** `/welcome` S1 (Continue), S2 (check the box, Continue), S3 (up to five questions, each skippable) then "That's enough": [Set up now] or [Keep going] (the MVP builds only the first) then major, then Add a course (upload or by hand, review, Save), then pick blocks, then Today with the plan and "Looks good."

**Normal day:** open the app, Today shows the saved plan (built without a network), tap Help me start on the top task, answer one question, see one first move, Start, timer runs, then Keep going, Next step or Done for now. Closing the tab loses nothing (A25).

**After weeks away:** the app opens to today's plan. No backlog, no "you missed" wording, no red items. Overdue work enters only if the user chooses it (A39, A40).

**Syllabus review:** Upload, loading state (with a fun fact line in Space mode only after fun facts exist; not in the MVP), Gemini notice on first use, results table with Edit and Remove on each row, Save or Cancel. On failure: the message and the by-hand or paste options appear on the same screen (technical spec 3.4).

**Switch task (stuck path):** Still stuck, then Tips or Switch task. Switching shows the one line once and the switch button is equally easy.

**Block change:** a running timer at the block end shows the prompt. "Change it" shows the A46 wording. Unstarted tasks re-sort into the new block.

**Export, import, delete:** Settings, Privacy has Export, Import and Delete. Import requires confirming a replace. Delete offers Export first.

**When things go wrong:** offline: everything works except Gemini buttons, which show their fallbacks. Rate limited or slow: the same fallback with one calm line. Data storage unavailable (private browsing may block it): a plain message that data cannot be saved on this browser, with a way to keep using the app for this session only.

---

## 5. Component specs

Components are described here, not coded. Every interactive component works by keyboard, has a visible focus ring, has an accessible name, and has a minimum 44 px target. A built-in component catalog page (development only) shows every component in every theme.

| Component | What it does | States and accessibility notes |
|---|---|---|
| AppShell | Page frame: nav, Help link, main area, banner area, timer bar | Landmarks: header, nav, main. Skip link as the first focusable item |
| NavBar | The fixed four items | Current page marked with `aria-current`. Never reorders (A73) |
| HelpLink and HelpPanel | Same place on every page; opens Tips, Campus support, How it works | Panel is a dialog with Esc to close and focus returned to the link |
| Button, IconButton | Primary, secondary, quiet | Disabled buttons always have a text reason nearby, not just gray (S2) |
| Toggle, RadioGroup, Checkbox, TextField, NumberField, TimeField | Form controls | Labels always visible. Errors in words next to the field and linked with `aria-describedby` (WCAG 3.3.1). No placeholder-only labels |
| FileUpload | Choose a file or drop one; shows type and size limit before choosing | Works without drag. Shows file name and a Remove button |
| Dialog | Modal for the Gemini notice, delete, import confirm, block-change prompt | Traps focus, Esc closes, returns focus, never the only way to see important info |
| Banner | Non-modal notice (heads-up, due soon) | Uses `role="status"`, never steals focus, dismissible, never covers the focused control |
| QuizQuestion | One yes/no question with Skip and Back | Question 3 of 5 shown in words. Answer buttons are a radio-style pair with large targets |
| WhyOnNote | "On because you said yes to: ..." with Undo | Link-style button; Undo restores the default |
| CourseForm | Course name and the two choices (upload or by hand) | Asks for the name once (WCAG 3.3.7) |
| SyllabusReviewTable | Editable list of what Gemini found | Real table markup with row headers on small screens as stacked cards. Missing fields highlighted with words ("No due date found") |
| AssignmentForm | All assignment fields | Date inputs accept typing. Estimate shows its source ("default" or "yours") |
| AssignmentRow and DetailsPanel | List row and the panel that opens on Details, tap, focus or 2-second hover | Disclosure pattern with `aria-expanded`. Hover content: dismissible, hoverable, persistent (WCAG 1.4.13) |
| PlanList and BlockSection | Today's blocks with their items | Each block is a labeled region. Items are a list. "Move up" and "Move down" buttons on every item |
| PlanItem | Title, estimate, due text, Help me start, Not now, Details | Due-soon uses words and an icon, never color alone |
| BreakMarker | "Break, 10 min (optional)" | Dismissible |
| LoadSummary, FinishTime, EnoughTimeNote | Total load, "Done around", the calm shortfall line | Plain text, no red alone |
| HelpMeStartFlow | The six steps of S6 | One step per screen. Progress shown in words. Back always works |
| FirstMoveCard | The move plus Show more steps and Give me a different one | The Gemini label sits on the button that calls it |
| GeminiLabel and GeminiNoticeDialog | "Uses Gemini" tag; the one-time notice | Text label, not an icon alone |
| TimerBar | Slim bottom bar with display styles | Number, shrinking bar or hidden. Does not announce every second to screen readers; announces start, pause and end only |
| BlockChangePrompt | Keep or Change | A dialog-like banner that does not stop the timer |
| VoyagePanel and ShipGraphic | Position, stop, text line | Graphic is decorative (`aria-hidden`); progress is also stated in text. Motion off means no animation |
| SpaceBackground | Static star pattern | Decorative only. Fully off in Regular style, with motion off, or when the device asks for reduced motion |
| SettingsSection | A titled group of settings in the fixed order | Each setting saves immediately with a confirmation in words |
| ExportImport and DeleteDataDialog | Data tools | Import shows a summary before the replace confirmation |
| AccessCodeField | Where the access code is entered once | Paste works; password managers work; no character-by-character boxes (WCAG 3.3.8) |
| EmptyState | A friendly message when a list is empty | Always offers the next step |

---

## 6. Design system

### 6.1 Principles
Predictable (A73), calm, plain words (A76), one thing at a time, no flashing, no color-only signals, fewer shapes on the Low theme, nothing rearranges unless the user does it.

### 6.2 Themes and palettes (T73, tentative)

A35 gives three themes: Low (low stimulation), Normal (galaxy), and Catch Up (an Enhancement). A57 says Space or Regular style is separate from the theme. That leaves one gap I had to fill: what does "Normal" look like in Regular style, where there is no space? **Proposal:** four palettes, chosen by theme and dim mode.

| Palette | Used when | Background | Surface | Text | Muted text | Accent | Text on accent | Focus ring | Due soon | Border |
|---|---|---|---|---|---|---|---|---|---|---|
| Low (light) | Theme Low | #F6F3EE | #FFFFFF | #26231F | #5A554D | #2F6168 | #FFFFFF | #1B4FA3 | #8A4B08 | #8C857A |
| Low (dim) | Theme Low with dim on | #1E1D1B | #2A2825 | #EDE8E0 | #BDB6AB | #7FB8BF | #1E1D1B | #8DB8FF | #F0B36A | #8F887C |
| Space | Theme Normal with Space style | #0F1430 | #1A2147 | #EEF0FA | #B8BEDD | #5FD0C4 | #0F1430 | #FFD66B | #FFB454 | #8A93C4 |
| Standard (light) | Theme Normal with Regular style | #FFFFFF | #F3F5F9 | #1B1F2A | #4B5565 | #1F5FBF | #FFFFFF | #B54708 | #8A4B08 | #7A8394 |

I computed the contrast ratios for these on 2026-10-10. Required: 4.5 to 1 for text (WCAG 1.4.3) and 3 to 1 for icons, borders and focus rings (1.4.11).
- Lowest text ratio in any palette: 5.58 (accent text on a surface, Standard). Body text on background: 13.8 to 16.5.
- Lowest non-text ratio: 3.30 (border on background, Low light). Focus rings: 4.97 or higher.

These are checked against the specific color pairs listed. Phase 6 repeats the check with a script on the real tokens and with a manual look, because real screens use more pairings than I listed.

### 6.3 Type, spacing, shape
- System font stack only (`system-ui` family), no downloaded fonts: faster, private, familiar.
- Body 1rem (16 px), line height 1.5, left aligned, lines up to about 65 characters. Heading steps: 1.25, 1.563, 1.953 times the body size.
- Text size setting scales the root size: 100, 115, 130, 150 percent. Everything uses `rem`, so zoom to 200 percent works without losing content (WCAG 1.4.4, 1.4.10).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48 px. The Roomy setting multiplies gaps by 1.25.
- Targets at least 44 by 44 px for main controls (the standard needs 24, WCAG 2.5.8). Corner radius 8 px. Focus ring: 3 px solid focus color with a 2 px offset, visible on every interactive element.
- Breakpoints: design for 320 px first, then 600 and 1024. Nav is a bottom bar below 600 and a left rail from 1024; in between either works but never both.

### 6.4 Motion and sound
Default: only small, short transitions. Everything stops when motion is off or the device asks for reduced motion (`prefers-reduced-motion`). No flashing or content that blinks more than three times a second. Sounds are off by default.

### 6.5 Words
Plain and short. Never "symptoms", "disorder", "deficit" or "superpower" (A76). Warm or short tone from the setting. Dates and times in words where it helps ("due tomorrow", "Fri Oct 30"). The product name appears as ADHD1X.

### 6.6 Space layer assets (made in Phase 6)
One simple spaceship, seven stop icons (Moon, Mars, Asteroid Belt, Jupiter, Saturn, Uranus, Neptune), one static star pattern. All drawn as inline SVG so they scale and follow the theme colors. "Small and simple, not fancy" (A53).

### 6.7 How themes are applied
The app sets attributes on the root element (`data-theme`, `data-style`, `data-dim`, `data-motion`, `data-spacing`). The styling reads color and size tokens from CSS variables. Tailwind is configured to use those variables, so one set of components serves all palettes.

---

## 7. AI workflows

Summary only. Full detail is in [phase-5-technical-spec.md](phase-5-technical-spec.md) section 3 and [phase-4-ai-architecture.md](phase-4-ai-architecture.md).

| Workflow | When | Model | Fallback |
|---|---|---|---|
| Syllabus reader (MVP) | User uploads or pastes a syllabus | Lite model (can flip to Flash after testing) | Add by hand or paste |
| First move (MVP) | Help me start step 4 | Lite model | Saved template by task type |
| Make it clear, Professor email, Brain dump (Enhancements) | On tap | Lite, Flash, Flash | Show original or a template |

Rules for all: structured output checked by Zod, no tools for Gemini, results reviewed before saving (A4), plain-text rendering only, free tier with fake or non-sensitive data until paid (A15, A110), grades and notes never sent (A36).

---

## 8. Data, accounts and security

Summary. Full detail is in the technical spec sections 2 to 4.

- No accounts in the MVP. Data lives in IndexedDB on the device, with Export, Import and Delete (A110).
- Gemini key and access code live only in server environment variables, never in browser code, the repo, chat, or logs (A8, A14).
- A personal access code protects the Gemini endpoint from strangers.
- Content Security Policy, no third-party scripts, AI text always shown as plain text.
- Free tier means Google may use prompts and people may review them, so test data is fake or non-sensitive (A15).

---

## 9. Accessibility acceptance criteria

Target: **WCAG 2.2 AA minimum**, with manual and assistive-technology testing (A3). Automated checks catch only part of the problems, so they never count as done by themselves.

### 9.1 Rules that apply to every screen

| Area | Requirement | WCAG | How it is checked |
|---|---|---|---|
| Structure | One `h1` first in `main`; logical heading order; landmarks; skip link | 1.3.1, 2.4.1, 2.4.6 | Automated plus screen reader |
| Page title | Changes on every route | 2.4.2 | Automated test per route |
| Focus | Visible ring; order follows reading order; nothing covered by the timer bar or banners; focus moves to the heading on route change; modal focus trap and return | 2.4.3, 2.4.7, 2.4.11 | Keyboard-only pass |
| Keyboard | Everything works without a mouse; no keyboard traps | 2.1.1, 2.1.2 | Keyboard-only pass |
| Contrast | 4.5 to 1 text, 3 to 1 for non-text, in all four palettes | 1.4.3, 1.4.11 | Script on tokens plus manual |
| Resize and reflow | 200 percent zoom and 320 px width without losing content or horizontal scrolling | 1.4.4, 1.4.10 | Manual at 200 percent and on a phone |
| Text spacing | Works when the user increases spacing | 1.4.12 | Manual with a spacing tool |
| Color | Never the only signal | 1.4.1 | Manual review |
| Targets | 44 px for main controls; 24 px minimum anywhere | 2.5.8 | Automated plus manual |
| Dragging | Every drag has Move up and Move down buttons | 2.5.7 | Keyboard-only pass |
| Hover and focus content | Dismissible, hoverable, persistent | 1.4.13 | Manual |
| Motion | No flashing; moving content can be paused; motion off respected | 2.2.2, 2.3.1, 2.3.3 | Manual plus automated flag check |
| Forms | Visible labels; errors in words; nothing asked twice; autocomplete where it applies | 3.3.1, 3.3.2, 3.3.7, 1.3.5 | Manual |
| Consistent help | Help link in the same place on every page | 3.2.6 | Automated per route |
| Consistent navigation | Same order everywhere | 3.2.3 | Automated per route |
| Authentication | Access code field allows paste and password managers; no puzzle or typing code characters one by one | 3.3.8 | Manual with a password manager |
| Language | `lang` set; plain words | 3.1.1 | Automated |
| Status messages | Saves, errors, loading and Gemini results announced without moving focus | 4.1.3 | Screen reader pass |
| Timer | Announces start, pause and end, not every second | 4.1.3 | Screen reader pass |

### 9.2 Manual test script (Christian runs it, with the AI coder explaining each step in plain words)

Before any release, and at the end of each milestone for the screens it touched:

1. **Keyboard only.** Unplug or ignore the mouse. Tab through every screen of the first-visit flow and a normal day. Check: you can reach and use everything, the focus ring is always visible, nothing is hidden behind the timer bar, Esc closes things, and focus does not get stuck.
2. **Screen reader.** Use VoiceOver on your iPhone with Safari first. Then on Windows with Chrome, use NVDA (free to download), and Narrator (built into Windows) as a second check. Listen to: Today, Help me start, the syllabus review, Settings. Check: headings make sense, buttons say what they do, errors and loading are announced, the timer is not chatty.
3. **Zoom.** Set the browser to 200 percent and a phone width of 320 px. Check: nothing is cut off and nothing needs sideways scrolling.
4. **Reduced motion and motion off.** Turn on the device's reduce-motion setting, then the app's. Check: nothing moves.
5. **Themes.** Look at every screen in all four palettes and at text size 150 percent.
6. **Phone.** Do the daily flow with one thumb on a real phone.
7. **Fail on purpose.** Turn off Wi-Fi and press a Gemini button. Check: a calm message, a working fallback, and nothing lost.

Each pass writes a short result to `coding/CHANGELOG.md` (A17) and any problem becomes a fix before the milestone is closed.

### 9.3 Definition of done for any screen
It works with the keyboard, passes the automated checks, passes the pass in section 9.2 that matches it, shows correctly at 320 px and 200 percent zoom in all four palettes, uses plain words, and has a changelog entry.

---

## 10. Testing strategy

Christian is a part-time coder who can spot basic issues (Q4), and three AI coders will write most of the code (A16). So tests are the safety net: they say plainly when something breaks, and they are written first for the risky logic.

| Layer | What it covers | Tool |
|---|---|---|
| Unit tests | Day plan engine (the 7 cases and more), quiz rule table, Zod schemas, storage migrations, export and import, estimate defaults, voyage points | Vitest |
| Component tests | Components render, can be used by label and role, keyboard works | Testing Library with Vitest |
| End to end | First visit, daily flow, Help me start, syllabus review (Gemini mocked), block-change prompt, export then delete then import, offline | Playwright |
| Automated accessibility | Every route and every main state, in all four palettes | axe-core inside Playwright |
| Contrast script | Checks the real token pairs for all palettes | Small script run in tests |
| Secret scan | No keys or access codes in the repo or the built browser files | Scanner run before commit and before deploy |
| Prompt evaluation | Gemini presets against a fake test set | Script plus human review of results |
| Manual passes | Section 9.2 | Christian |

**Prompt evaluation set (fake data only, A15):** at least 10 fake syllabi, including a clean one, a messy table, one with no dates, one with dates missing the year, one with percents adding to over 100, one scanned image with no text layer, one in a Word file, one with instructions hidden inside it ("ignore your rules and..."), one for a nursing course with medical words in it, and a very long one. Expected results are written by hand before running. For first moves: 10 fake assignments of different types and each size choice. Measures: valid shape, no invented dates, no medical advice, step counts right, and a human read of tone. The Lite versus Flash choice for the syllabus reader is decided by this set (A111).

**Rules:**
- Test data is always fake or non-sensitive (A15). Real syllabi are not used until the paid tier or until Christian accepts the free-tier terms for that file.
- Write the test first for the plan engine and the rule table. Do not write the engine until its tests exist and fail.
- A milestone is closed only when: tests pass, automated accessibility passes, the matching manual pass is done, the changelog is updated, and Christian has done the "Christian check" for it (a short list of what to click and see, written in plain words by the coder).
- No test is skipped or removed to get a green result.

---

## 11. Milestones

Milestones are an order, not a schedule. Each one ends in something Christian can open and click. Prompt numbers refer to [phase-5-implementation-prompts.md](phase-5-implementation-prompts.md).

| # | Milestone | Done when | Prompts |
|---|---|---|---|
| M0 | Project set up | Repo, TypeScript, React, Vite, Tailwind, test tools, shared rules file, changelog, secret scan, empty app loads | P01 |
| M1 | Data layer | IndexedDB stores, Zod schemas, migrations, export, import, delete, all unit-tested | P02 |
| M2 | App shell and design system | Palettes, themes, nav, Help link, base components, component catalog, accessibility test harness, route focus handling | P03, P04 |
| M3 | Onboarding | S1 to S3, quiz rule table for questions 1 to 5, major, Why-on notes | P05 |
| M4 | Courses and assignments | Add course, manual assignments, Assignments page, details panel and hover, Not now | P06 |
| M5 | Day plan engine and Today | Engine passes all test cases, Today screen, blocks, load, finish time, Enough time? | P07, P08 |
| M6 | Gemini server and syllabus reader | Server with access code, validation, fallbacks, prompt work and fake test set, Gemini notice, syllabus review screen | P09, P10, P11 |
| M7 | Help me start and timer | S6, first move preset, template fallback, saved first moves, stuck path, timer, block-change prompt, heads-up, breaks | P12, P13 |
| M8 | Style, voyage and settings | Space and Regular style, ship and stops, all nine settings sections, in-app notifications and optional browser notifications (on iPhone these probably need Add to Home Screen) | P14 |
| M9 | Help, privacy and data tools | Help panel, campus support, privacy page, export and delete screens | P15 |
| M10 | Hardening and release candidate | Full accessibility passes, security headers, dependency audit, performance checks, offline check, deploy to Vercel, optional AI Studio preview | P16, P17 |

**Order reasoning:** logic and storage first (cheap to test, everything depends on them), then the look, then the screens that use them, then Gemini (the part with the most unknowns and the only network part), then Help me start (which needs both Gemini and the timer), then polish.

---

## 12. Risks, dependencies and unresolved decisions

### 12.1 Risks

| Risk | Why it matters | What reduces it |
|---|---|---|
| Plan numbers (shares, lead window, capacity) feel wrong in real use | The plan is half the MVP (A32) | They are tentative, tested with real use by Christian, and set in one place so they are easy to change |
| Syllabus reading mistakes | Wrong dates cost real grades | Review screen, test set of fake syllabi, Flash fallback setting, blanks over guesses |
| Free-tier request limits unknown | Could throttle first moves or syllabus reads | Reuse saved first moves, Gemini only on tap, fallbacks everywhere. Christian can still look up the limits in his AI Studio account |
| Free-tier data terms | Google may use and review prompts | Fake data, disclosure, paid tier before anyone else uses it (A110) |
| Upload limit on the free host (4.5 MB per request) | Conflicts with the approved 10 MB | T72 below |
| Data lives in one browser | Clearing it loses everything | Export, a once-only prompt after a week, Import |
| AI-written code hard to review for a part-time coder | Bugs and style drift across three tools | One rules file, small tasks, tests first, plain-words explanations, changelog (A17) |
| Three coders overwrite each other | Merge conflicts | Branch per task, one task at a time per file area, GitHub as the source of truth (A108) |
| Vercel Hobby is for personal use only | Cannot be used if released | Move hosting before any release (Q15) |
| Free tiers change | Limits in this plan may shift | Recheck at the start of Phase 6 |
| Designing for one brain (D2) | Christian's needs may not be everyone's | Personal project for now (A9). Interviews before any release |
| Browser notification behavior differs by device | Optional feature might not work on a phone | Test on real devices; in-app reminders are the default (T77) |
| Scope growth | Enhancement features creeping in | The "Left out of the MVP" list in section 2; changes go through the decision log |

### 12.2 Dependencies

- Tools: a recent Node LTS, VS Code, Git, and a private GitHub repository (A108).
- Accounts Christian makes himself: GitHub, Vercel (free Hobby), Google AI Studio for the Gemini key (A14). No key is ever pasted into chat.
- Test devices: the computer and phone Christian actually uses, plus the screen reader he has.
- AI coders per A16: Claude for advanced work and debugging, Codex for light work, Gemini for prompt work and long repetitive parts. Which role each prompt uses is in the prompt file.
- Content still to be written during the build: template first moves by task type, the short built-in Tips list, the "How ADHD1X works" page, the Campus support text, and the Gemini notice wording (all checked against A34, A71, A76).

### 12.3 Unresolved decisions

T70 to T79 below were approved on 2026-10-11 (A115); the table keeps them for reference. T72 became a 4 MB cap. Still open are the rows marked Open.

| # | What | My recommendation |
|---|---|---|
| T70 | One shared rules file and the repo layout (answers Q11) | Approve [phase-5-coder-rules.md](phase-5-coder-rules.md) |
| T71 | Plan engine numbers: size classes, default estimates, daily share, lead window, 85 percent capacity, score, break rule | Approve as starting values and adjust after real use |
| T72 | Upload cap of 4 MB while hosted on Vercel Hobby (platform limit is 4.5 MB per request), instead of 10 MB | Approve. Syllabi are usually small, and paste is the backup |
| T73 | Four palettes and the type, spacing and size rules (including what Normal theme looks like in Regular style) | Approve |
| T74 | Voyage: seven stops, points by assignment type, stops never lost | Approve |
| T75 | Gemini server contract: endpoint, error reasons, Zod checks, output safety scan, best-effort rate limit | Approve |
| T76 | Data model, export file and replace-only import | Approve |
| T77 | Browser notifications through a tiny service worker, in-app by default, verify on Christian's devices | Approve |
| T78 | Test strategy, performance targets and the definition of done | Approve |
| T79 | Build milestones M0 to M10 and the implementation prompt set P01 to P17 | Approve |
| Answered | Test devices: Christian's iPhone (VoiceOver and Safari) and a Windows computer with Google Chrome. Screen readers: VoiceOver on the iPhone, NVDA (free) on Windows, with Narrator (built into Windows) as a second check | None |
| Answered | Quiz skip defaults: a skipped question counts as No (A117). Question 1 as No makes the day plan not the home view, which weakens the core MVP for a new user who skips everything | Christian: no exception for now; revisit after real testing |
| Open | Q3 remainder: what to do if free-plan usage limits are hit | Plan: fallbacks keep the app working; Christian decides on paid then |
| Open | Q15 release, Q16 paid tier timing | Stay as decided in A110; revisit before anyone else uses it |
| Open | Site address and name for the live version | Decide before the first deploy |

---

## 13. Carries forward to Phase 6

Phase 6 starts only when Christian says the exact phrase in A2. It will follow the prompts in order, M0 to M10, with the rules in the coder rules file. Nothing in `coding/` changes before then.
