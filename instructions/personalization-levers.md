# Personalization Levers (draft, tentative)

**Version 1.1.1** (2026-10-10)

Status: approved by Christian 2026-10-10 (was T15). Logged in [decision-log.md](decision-log.md).

## The rule that makes this work

**Every quiz question must move at least one lever. If a question changes nothing, we cut it.**

The quiz answers feed a simple, visible rule table (if you answered X, the app sets Y). No AI guessing. That keeps it predictable, free (no Gemini calls), private, and easy to change. Every setting the quiz picks shows a small "why is this on?" note and can be changed by hand.

## What the app can actually change

| # | Lever | What it changes | Example quiz signal | Example result |
|---|---|---|---|---|
| L1 | Look and feel | Theme (galaxy or low-stimulation), motion on/off, text size, spacing, how much is on screen | "How should the interface feel?" | "Calm and minimal" sets low-stimulation theme, no animation, fewer cards |
| L2 | Home screen | What you see first: one next step, a short list, or a day/week view | "What kind of planning works for you?" | "Minimal planning" makes the home screen a single "do this next" card |
| L3 | Feature visibility | Which features are on and shown in the menu; the rest stay hidden until wanted | "What do you want help with?" | "Starting tasks" puts Help me start and the 2-minute timer up front; hides the goal planner until asked |
| L4 | Gemini preset behavior | How many steps a breakdown has, how detailed, how the wording sounds | "When overwhelmed, what helps?" | "Show me one next step" gives 1 step; "Break everything down" gives 3 to 5 |
| L5 | Reminders | How many, when, and how they're worded; or none at all | "How do you feel about reminders?" (new question) | "They stress me out" means no push reminders, only an in-app list |
| L6 | Focus timer defaults | Starting length (2, 5, 15, 25 min), whether breaks are suggested | "How long can you usually focus once started?" (new) | "Hard to start" sets a 2-minute starter by default |
| L7 | Planning buffers | Whether the planner suggests gaps before and after draining events | "Do some classes or places wear you out?" (new) | Yes means a gentle "add a 15-min recovery gap?" after tagged events |
| L8 | Tips shown first | Which tips from the tips library (T10) surface first | Primary challenges | "Avoiding overwhelm" surfaces overwhelm tips first |
| L9 | Tone | Gentle and encouraging vs short and direct | "How do you like to be talked to?" (new) | "Just tell me" gives short, plain messages |
| L10 | Award style (A24) | What the goal-reached celebration looks like, or none | "Do you like little celebrations?" (new) | "No thanks" turns celebrations off |

## Things to keep in mind

- **Not everything has to be personalized.** Good defaults beat 20 settings. Levers L1 to L4 probably carry most of the value.
- **Personalization must never feel like a diagnosis.** The app reacts to stated preferences, never to inferred conditions (A7, A11).
- **Age is not a lever.** Christian rejected age-based personalization (A30); sign-up only asks for an 18+ checkbox.
- **No deadline doesn't mean no scope.** Each lever is something to build and test. Starting with 4 levers and adding more later is still the stronger move.

## Questions for Christian

1. Which of these levers matter most to you as the test user?
2. Any lever missing that you've wished an app would adjust for you?
