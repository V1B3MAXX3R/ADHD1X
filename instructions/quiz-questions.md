# Personalization Quiz (draft v1)

**Version 1.1.1** (2026-10-10)

Status: format approved by Christian 2026-10-10 (A78: yes/no questions, tiers of 5, 10, 15 and 20). The question set (was T42) was approved by Christian the same day. Planning only, no code (A2).

## What this quiz is, and isn't

- **It personalizes the website. It is not an assessment.** No question asks about symptoms, diagnosis, health, medication, age, or anything personal. Every question is about schoolwork, time, or how you want the app to look and act (A7, A11).
- **Every answer is yes or no**, and every answer changes at least one setting (T15 rule). Each setting shows a small "why is this on?" note and can be changed anytime.
- **Skipping is fine.** A skipped question counts as No (A117), so the app works with zero answers. The "If skipped" column shows the result: every row is No.
- **Screener check (A72):** questions are worded as "would you like" or "does this help you," never "how often do you struggle with." None match items on the ASRS-6 (adult ADHD screener) or AQ-10 (autism screener). See the check at the bottom.
- **Where the questions come from:** the [ADHD and autism evidence report](https://claude.ai/code/artifact/93d76cd1-8565-4d79-8d36-42327f50c6a5), mainly its findings on planning and starting (executive function), sensory differences, change and predictability, clear instructions, and burnout.

## The tiers

| Tier | Questions | What you get |
|---|---|---|
| **Basic** | 1 to 5 | Enough for the core experience: day plan, Help me start, look and feel, timer, interface style (A28, A32) |
| **Standard** | 1 to 10 | Adds study times, reminders, home screen, deadline spacing, breaks |
| **Detailed** | 1 to 15 | Adds the new helpers: heads-up, Make it clear, professor emails, tone, celebrations |
| **Full** | 1 to 21 | Fully curated: every lever and feature tuned |

After question 5, the app says something like "That's enough to set things up. Keep going now, or finish later anytime." The same choice shows after 10 and 15.

## Basic: questions 1 to 5

| # | Question | Yes sets | No sets | If skipped | Links |
|---|---|---|---|---|---|
| 1 | Would you like the app to plan your school day for you? | Automatic day plan is the home view; you tap to accept or edit it | Plain to-do list; day plan stays available in the menu | No | A32, A4 |
| 2 | Do big assignments feel easier when they're broken into small steps? | Help me start defaults to "bite-sized pieces"; Gemini breakdowns give 3 to 5 steps | Defaults to "split in half"; breakdowns give 1 to 2 steps | No | A49, L4 |
| 3 | Do you prefer a calm, simple screen over a colorful, busy one? | Low theme, fewer cards on screen | Normal theme | No | A35, L1 |
| 4 | Would a short 2-minute timer help you get started on schoolwork? | Starter timer shows on every Help me start | Timer off by default; still one tap away | No | L6, A44 |
| 5 | Would you like the space theme, with a spaceship voyage, Hyperdrive and fun facts? | Space mode | Regular mode | No | A57, A53, A67 |

## Standard: questions 6 to 10

| # | Question | Yes sets | No sets | If skipped | Links |
|---|---|---|---|---|---|
| 6 | Is morning usually your best time for hard schoolwork? | Heavy work goes in the Morning block | Heavy work moves to the Evening block | No | A42, A43, A44 |
| 7 | Would you like reminders before assignments are due? | Reminders on (wording set by question 14) | No push reminders; an in-app due list only | No | L5 |
| 8 | Would you like your home screen to show just one task at a time? | Home is a single "do this next" card | Home shows today's short list | No | L2 |
| 9 | Would it help if the app scheduled work a few days before each due date? | Plan places work 2 to 3 days early, with buffer | Plan places work closer to due dates (24-hour rule still applies, A48) | No | A41, A48 |
| 10 | Would you like break reminders during long study sessions? | Break prompts on for every plan | Break prompts only on 2+ block days (the safety minimum, A41) | No | A41, A47 |

## Detailed: questions 11 to 15

| # | Question | Yes sets | No sets | If skipped | Links |
|---|---|---|---|---|---|
| 11 | Would you like a heads-up 5 minutes before a study block ends? | Heads-up on | Off | No | A63 |
| 12 | Do numbered steps help you more than long paragraphs of instructions? | "Make it clear" button shows on every assignment | "Make it clear" stays in the assignment menu | No | A60 |
| 13 | Would you like help writing emails to your professors? | "Message my professor" button shows on assignments | Stays in the assignment menu | No | A61 |
| 14 | Do you prefer short, direct messages over friendly, encouraging ones? | Short, plain wording everywhere | Warm, encouraging wording | No | L9 |
| 15 | Would you like a small celebration when you finish an assignment? | Celebrations on (in Space mode, the ship moves) | Celebrations off; progress still saved quietly | No | A24, L10 |

## Full: questions 16 to 21

| # | Question | Yes sets | No sets | If skipped | Links |
|---|---|---|---|---|---|
| 16 | When you stop working, would you like to leave yourself a quick note about where you left off? | "Where was I?" note box shows when you stop | Note box hidden; still in the task menu | No | A62 |
| 17 | Would you like the app to ask about your energy when it builds your plan? | Optional energy check on plan screen | Off | No | A64 |
| 18 | Would you like animations and moving effects turned off? | Motion off | Motion on (always respects your device's reduce-motion setting) | No | A74, WCAG 2.3.3 |
| 19 | Do you like seeing the exact minutes count down on a timer? | Number countdown | Shrinking bar, with an option to hide it fully | No | A75 |
| 20 | Should classes in your major get extra priority when deadlines are close? | Major courses weighted higher in the day plan | All courses weighted only by due date and points | No | A38 |
| 21 | When you're stuck, would you like tips for getting started to pop up? | Tips appear in the stuck path automatically | Tips only when you tap "Still stuck?" | No | A58, T10, A66 |

## Kept out on purpose

- Anything about diagnosis, symptoms, medication, health, mood, age, birthday, grades or other personal details (A11, A30, A36).
- Frequency questions like "How often do you put things off?" They read like screeners (A72). Procrastination is handled through what the app does about it (questions 2, 4, 9, 16, 21), not by asking you to rate yourself.
- Questions that don't change a setting (T15 rule).

## Screener check (A72)

| Screener | Topics it asks about | Overlap with this quiz |
|---|---|---|
| ASRS-6 (adult ADHD) | How often you have trouble finishing details, getting organized, remembering appointments, delaying tasks that need thought, fidgeting, feeling driven | None. Questions 2, 4 and 9 touch starting and planning, but ask what you'd like the app to do, not how often you struggle |
| AQ-10 (autism) | Noticing small sounds and details, reading intentions, social chit-chat, imagining characters, collecting information | None. Questions 3, 12 and 18 touch sensory and instruction preferences, framed as app settings |

## Open for Christian

1. ~~Morning question or Space mode in the Basic five?~~ Answered 2026-10-10: Space mode is question 5, morning moves to 6.
2. ~~Defaults: are the "if skipped" choices what you'd want as a brand-new user?~~ Answered 2026-10-11 (A117): a skipped question counts as No, for every question. Question 1 is flagged: see A117.
