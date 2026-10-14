# Phase 3: UX and Personalization (deliverable)

**Version 1.1.1** (2026-10-10)

Status: **approved by Christian 2026-10-10** with two additions: a Display section and a Notifications section in Settings (A99 to A103). Logged in [decision-log.md](decision-log.md). Planning only: these are screen descriptions, not code (A2).

Inputs: Concept A and the MVP list ([phase-2-concept.md](phase-2-concept.md), A96, A97), the approved quiz ([quiz-questions.md](quiz-questions.md)), [help-me-start.md](help-me-start.md), [day-plan-logic.md](day-plan-logic.md), [personalization-levers.md](personalization-levers.md), and the evidence reports.

Design rules carried in from earlier decisions: nothing changes without a tap (A4); no guilt, streaks or commitment (A5, A25); predictable layout (A73); plain words (A76); not a diagnosis tool (A6, A11); WCAG 2.2 AA (A3). Scope here is the MVP only (A97). Enhancement features get a place on the screens but are not designed in detail.

---

## 1. The user journey

### First visit (about 5 minutes, all skippable except the 18+ box)

| Step | What happens | Decisions |
|---|---|---|
| 1 | Disclaimer screen (final wording in A21). One button: Continue | A20, A21 |
| 2 | "I'm 18 or older" checkbox. Required. Nothing else stored about age | A30 |
| 3 | Quiz, first 5 questions, one per screen, big Yes and No buttons plus Skip. Ends with "That's enough to set things up. Keep going now, or finish later anytime" | A28, A78, A85 |
| 4 | Pick your major (free text, optional) | A38 |
| 5 | Add your courses: for each, upload a syllabus or add assignments by hand. Gemini reads the syllabus; you review everything it found before anything is saved | A37, A50 |
| 6 | Pick today's study blocks. Presets shown (Morning, Evening, Night), all adjustable | A42 |
| 7 | Today's plan appears. Tap "Looks good" or edit | A32, A4 |

A new user can finish steps 1 and 2 and land on an empty Today screen. The quiz, major and courses are all optional, and the app works with defaults.

### A normal day (returning)

1. Open the app. **Today** shows the plan already built. No setup (A32).
2. If blocks haven't been picked yet, one question: "Which parts of your day are you studying?"
3. Tap **Help me start** on the top task (or on any task).
4. Answer one question (bite-sized, half, or full), see one tiny first move, tap Start. Starter timer runs.
5. Timer ends: Keep going, Next step, or Done for now.
6. Finishing an assignment moves the spaceship (Space mode) and offers the next task.
7. Close the tab whenever. Nothing is waiting, nothing is lost (A25).

### Coming back after weeks away

Open the app to today's plan. No backlog banner, no "you missed" language, no red items. Overdue work appears only if the user chooses to add it, or in Catch Up when they switch it on themselves (A39).

### Account and sign-in

Undecided until Phase 4 (Q5). The UX needs only two things from that decision: sign-in must pass WCAG 3.3.8 (no puzzle or memory test as the only way in), and the user can leave without losing their data.

---

## 2. Navigation

One fixed navigation bar that never moves or changes order (A73). Left rail on desktop, bottom bar on phones. Four items:

| Item | Space mode label | What's in it |
|---|---|---|
| **Today** | Today | The day plan, timer, Help me start. Home |
| **Assignments** | Assignments | All assignments and courses; add a course or syllabus; the Not now list |
| **Progress** | Voyage | Spaceship and logbook (Space mode); a plain list of finished work (Regular). Hideable (A54) |
| **Settings** | Settings | Look and feel, sensory, timer, blocks, reminders, quiz answers, privacy, about |

A **Help** link sits in the same corner of every page (WCAG 3.2.6). It opens a small panel with Tips (Enhancement), Campus support (A65), and "How ADHD1X works." Catch Up / Hyperdrive appears as a switch inside Today only when the user has turned it on in Settings.

If the user hides Progress, the bar has three items. Nothing else moves.

---

## 3. Screens (text wireframes)

Conventions: `[Button]`, `(toggle)`, `{info}`. Every screen has a heading as its first element, works at 320 px wide, and reads in a sensible order for screen readers.

### S1 to S3: Disclaimer, age box, quiz

```
Before we start
{Final disclaimer text, A21}
[Continue]

-------------------------------
(  ) I'm 18 or older   (required)
[Continue]   (disabled until checked, with a text reason, not just grayed)

-------------------------------
Question 3 of 5            [Skip]
Do you prefer a calm, simple screen
over a colorful, busy one?
[Yes]  [No]
{small note: you can change this anytime in Settings}
[Back]
```
After question 5: `[Keep going]` `[Set up now with these]`. The same choice shows after 10 and 15.

### S4: Add a course (syllabus review)

```
Add a course
Course name: [______]      (asked once, never again: WCAG 3.3.7)
[Upload syllabus (PDF or document)]   or   [Add assignments by hand]
{File types and size limit shown here; values set in Phase 4}
{Note: Gemini reads the syllabus. See "Privacy" for what is sent.}

After upload, "Here's what we found. Check it before we save":
  Quiz 1      due Oct 14   20 pts   5% of grade   [Edit] [Remove]
  Essay 1     due Oct 28   100 pts  15% of grade  [Edit] [Remove]
[Save these]  [Cancel]
```
Nothing is saved until Save. If Gemini finds nothing, the screen says so and offers manual entry (A4, A37).

### S5: Today

```
Today, Thursday Oct 10                 [Edit plan]
Study blocks: Morning, Evening  [Change]
Today's load: about 4 hours, with breaks   (shown before accepting 2+ blocks, A41)

Morning (6 am to 12 pm)
  1. Essay 1 outline        ~1h    due in 18 days   [Help me start]
  2. Quiz 1 review          ~30m   due tomorrow *   [Help me start]
Evening (12 to 5 pm)
  3. Reading, Ch. 4         ~40m   [Help me start]
{Done around 3:40 pm}      {"Enough time" line, only if something won't fit}

[Looks good]   (only before the plan is accepted)
Each task: [Not now]  [Details]
```
`*` = due within 24 hours jumps the line (A48) and shows "due tomorrow" in words, not red.
If the user chose the one-thing home view (quiz Q8), this screen shows only the top task as a large card with a small "See full plan" link.
Heads-up (A63) appears as a small banner, never a pop-up that steals focus.

### S6: Help me start

One step per screen; Back always works.

```
1. What first?   (pre-selected: Essay 1 outline)   [Pick something else]
2. How big?      ( ) Bite-sized pieces  ( ) Split in half  ( ) The full thing
3. Details       {if missing:} [text box] [Upload]  -> shown for review before saving
4. Your first move (about 2 minutes):
      "Open the assignment page and read just the first paragraph."
      [Show more steps]   [Give me a different one]   {Gemini label}
5. When?         [Start now]      [Start later]   (only if all details are in)
6. Optional: What will you do this session? [__________]  (A91)
```
Then the timer (S7). A **Still stuck?** link is on steps 4 and 7 and opens: Tips for this kind of task, or Switch task (with the one gentle line, shown once, A59).

### S7: Timer (a slim bar that stays at the bottom of Today)

```
Essay 1 outline          [ 1:42 ]  or  [=====>    ]  or  (hidden)
[Pause]  [Keep going]  [Next step]  [Done for now]
{After: "Done, partly, or not yet?" if a session goal was set}
{After: optional "How long did that take?" [__ min] [Skip]}  (A90)
```
Display style (number, bar, hidden) comes from quiz Q19 and is changed under Settings > Display (A75). The bar never covers the focused item (WCAG 2.4.11). No sound unless the user turned sounds on.

### S8: Block-change pop-up (A45)

```
Your Morning block just ended.
You're still working on: Quiz 1 review   (timer keeps running)
[Keep the same task]   [Change it]
{Under Change it: "Switching to something lighter can give your brain a
 breather, so you finish the day still feeling productive. Your call."}
```

### S9: Assignments and detail

```
Assignments            [Add a course]
Filter: All courses v      Show: Upcoming v
Not now (2)   [Open]
  Essay 1      Eng 101   due Oct 28   100 pts   [Details]
  Quiz 1       Eng 101   due Oct 11   20 pts    [Details]
```
`[Details]` opens a panel with every field, the instructions, and buttons: Help me start, Make it clear, Message my professor, Not now (the last two as Enhancements). On desktop the same panel also opens after a 2-second hover, stays open while the pointer is over it, and closes with Esc (A52). Keyboard focus and tap open it too.

### S10: Progress / Voyage

Space mode: a simple panel showing the ship's position on the current route, the planet reached, and a logbook list of past voyages. Hide button at the top. No daily goals, no timers, nothing that can be missed (A54). At semester end: "Your ship is home. Ready when you are." Regular mode: a plain list "Finished this semester" with counts.
Fun facts (Space mode only, A67) show as one dismissible line after finishing a task or while a Gemini action loads.

### S11: Settings

Nine sections in a fixed order. Display and Notifications are their own sections (Christian, Phase 3 gate).

| Section | Contents |
|---|---|
| **Display** | Every way the app can look, in one place: Space or Regular; theme (Low, Normal); text size; spacing; motion on/off; dim mode; "fewer things on screen"; **Today view** (full list or one task card); **timer display** (number, shrinking bar, or hidden) |
| **Notifications** | See the table below |
| Planning | Study blocks and times; day length; deadline spacing; energy check on/off |
| Timer | Starter length (2, 5, custom); sound at the end on/off |
| Help and tone | Tone (warm or short); tips pop up when stuck; celebrations |
| My answers | The quiz answers with "why is this on?" notes; continue the quiz; reset all |
| Catch Up | Switch on or off; target grade; pace (Aggressive, Normal, Chill) (Enhancement) |
| Privacy | What goes to Gemini, what stays on this device; delete my data |
| About | Disclaimer text; not a medical tool |

**Notifications section**

| Setting | Options | Default | Comes from |
|---|---|---|---|
| Due-date reminders | On or off; how many days ahead (1, 2, 3) | On, 2 days (quiz Q7: No turns it off) | Quiz Q7 |
| Heads-up before a study block ends | On or off | On (quiz Q11: No turns it off) | A63 |
| Break reminders | On for every plan, or only on 2+ block days | Only 2+ blocks (the safety minimum, A41) | Quiz Q10 |
| Where they show | In the app only, or also as browser notifications. The browser permission is asked for only when the user turns browser notifications on | In the app only | A74 |
| Batching | Send one summary instead of separate pings; user picks the time | Off | A74 |
| Quiet hours | Off, or a start and end time | 8 pm to 6 am, matching the planning window (A42) | A42 |
| Sounds | On or off | Off | A74 |
| Wording | Follows the tone setting (warm or short) | Warm | Quiz Q14 |

Every notification can be dismissed and never needs an answer. The page states the promise in one line: "ADHD1X never sends guilt, streak or 'come back' messages." No notification ever mentions missed work or being behind (A5, A25). A "Turn all notifications off" button sits at the top.

Every setting that came from the quiz shows a small line "On because you said yes to: Calm, simple screen" with a one-tap undo.

### S12: Campus support (in Help)

A plain page: most colleges have a disability or accessibility services office; students can ask what's available without a diagnosis; examples of common accommodations (extra time, quiet testing room, note-taking help); a reminder that ADHD1X can't diagnose or give medical advice. No advice about treatment (A65, A71).

---

## 4. Which interactions use AI

| Interaction | Uses Gemini? | Sent to Gemini | Never sent |
|---|---|---|---|
| Syllabus reading | Yes, with review before saving | The uploaded syllabus text | Grades or scores |
| Help me start first move | Yes (reused for similar tasks, A83) | Task title, course name, major, assignment details the user typed or uploaded | Personal notes, grades |
| Make it clear, Message my professor (Enhancements) | Yes | Assignment details | Grades, personal details |
| Sort my brain dump | Yes, only on tap, with a reminder not to include personal details (A94) | What the user typed | Anything else |
| Day plan, Enough time? check, finish time, block re-sort, reading time | **No, plain logic** | n/a | n/a |
| Catch Up grade math | **No, plain logic** | n/a | n/a |
| Quiz settings | **No, rule table** | n/a | n/a |

Each Gemini button carries a small "Uses Gemini" label.

---

## 5. Gemini disclosure placement

1. **Before first use:** the first time any Gemini button is pressed, a short notice explains in plain words that the text on this screen will be sent to Google's Gemini service, that the app is on the free tier where Google may use prompts to improve its products and people may review them (A15), and to leave out personal details. One button: Continue. A second button: Not now. After that, shown again only in Privacy.
2. **On every AI button:** the "Uses Gemini" label.
3. **In Settings > Privacy:** the full list of what is and isn't sent (section 4), and a note that actual grades never leave the device (A36).
4. **In the disclaimer (A21):** unchanged. The notice does not claim data is never stored or never used for training, because the free tier terms don't support that claim.

---

## 6. Visual direction, checked against accessibility

| Area | Direction | Accessibility check |
|---|---|---|
| Space (Normal) theme | Dark navy background, soft star dots, muted purple and teal accents. Stars are static by default | Text 4.5:1 against background, large text and icons 3:1 (WCAG 1.4.3, 1.4.11). No flashing (2.3.1). Any moving background can be paused (2.2.2) and stops when motion is off or the device asks for reduced motion |
| Low theme | Flat, warm neutral background, one accent color, no background art, fewer shapes | Same contrast rules; this is the default when quiz Q3 is Yes |
| Regular mode | Same layouts with plain names and no space art | Layout and focus order identical to Space mode |
| Type | One clean sans-serif, 16 px minimum body text, 1.5 line height, left-aligned, short lines | Text resizes to 200% without losing content (1.4.4, 1.4.10) |
| Touch and click targets | At least 44 px square for main buttons (the minimum the standard needs is 24 px, 2.5.8) | |
| Color | Never the only signal; due-soon uses words and an icon, never red alone | 1.4.1 |
| Dragging | Any drag-to-reorder also has Move up / Move down buttons | 2.5.7 |
| Focus | Visible focus ring on everything; sticky timer and banners never cover it | 2.4.7, 2.4.11 |
| Hover content | Dismissible, hoverable, persistent (A52) | 1.4.13 |
| Forms | Each question asked once; errors in words next to the field | 3.3.7, 3.3.1 |
| Language | Plain, short, no "symptoms", "disorder", "deficit" (A76); "tasks," "plan," "help" | |
| Testing | Keyboard-only, screen reader, 200% zoom, reduced-motion and phone-width passes before any release; automated checks alone are not enough (A3) | |

---

## 7. Settings data the system must store (for Phase 4)

User profile: major (optional), 18+ confirmed (yes/no only), quiz answers (yes/no per question, with timestamp), Space or Regular, theme, text size, motion, sounds, batching, tone, tips-when-stuck, celebrations, timer length and display, study block times and picks, deadline spacing, break and heads-up toggles, energy check toggle, Catch Up on/off with target grade and pace, voyage hidden/shown, Gemini notice acknowledged.

Courses and assignments: course name, assignment name, due date, points, percent of grade, details text, uploaded file (or only extracted text), estimate, status, Not now flag, saved first moves, notes ("Where was I?").

Progress: voyage state, logbook, time check-back minutes (used only for estimates).

Not stored: birthday or age, diagnosis, medication, health information (A11, A30). Actual scores are stored only on the user's device or account and never sent to Gemini (A36). Where "the user's device or account" ends is decided in Q5 and Phase 4.

---

## 8. Decisions made at the gate (2026-10-10)

1. Navigation: four items plus Help. Approved.
2. Today layout: full list by default, one card if chosen. Approved.
3. Timer: slim bar at the bottom of Today. Approved.
4. Display styles (themes, Today view, timer display) get their own Settings section. Added.
5. Notifications get their own Settings section. Added.

## Carries forward to Phase 4

- **Screens:** S1 to S12 (section 3), with the Display and Notifications settings sections.
- **Which interactions call AI:** section 4. Everything else is plain logic or the rule table.
- **Data to store:** section 7, plus the notification settings above.
- **Open for Phase 4:** accounts (Q5), framework, database and hosting (Q10), upload limits (A50), whether browser notifications need a service worker, and the paid-tier question (Q16).
