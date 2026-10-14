# ADHD1X manual accessibility and device checklist (Blueprint section 9.2)

Run these checks on your Windows computer (Chrome plus NVDA or Narrator) and your iPhone (Safari plus VoiceOver) before deploying (A117, P16). Automated checks cannot do these for you.

- [ ] **1. Keyboard only (Windows Chrome).** Ignore the mouse. Press `Tab` through `/welcome`, `/today`, `/start/:id`, `/assignments`, `/calendar`, `/voyage` and `/settings/display`. Confirm:
  - The "Skip to main content" link is the first stop.
  - Every button and input shows the 3px focus ring.
  - Nothing is covered by the bottom timer bar.
  - `Escape` closes the Help dialog, the finish pop-up and the Assignment Details panel.
- [ ] **2. Screen reader (iPhone VoiceOver and Windows NVDA).** Open Today, Help me start and Settings. Confirm headings read in order, buttons say what they do, and the timer only announces Start, Pause and Finished (never every second). The date and time at the top should not announce itself.
- [ ] **3. 200% zoom and 320px width.** Set Chrome zoom to 200% and narrow the window to 320px. Confirm no text is cut off and there is no sideways scrolling on the main screens, including Calendar and Voyage.
- [ ] **4. Reduced motion.** In Settings, Display, tick "Turn animations and motion off". Confirm movement stops right away.
- [ ] **5. Four palettes at 150% text.** Open `/catalog` (only available with `npm run dev`), set Text size to 150% in Settings, and view all four palettes (Space, Low light, Low dim, Standard). Check the Space background and the Voyage map in the Space palette.
- [ ] **6. One thumb (iPhone Safari).** Tap through the bottom bar (Today, Assignments, Calendar, Voyage, Settings) with one thumb. Add a course and finish a task.
- [ ] **7. Offline.** Turn off Wi-Fi, then choose "Get my first move" in Help me start. Confirm a calm notice appears and a built-in starter step loads without a crash.
- [ ] **8. Calendar import.** On Calendar, pick a real `.ics` file from Google Calendar or Canvas. Confirm the review list appears before anything is saved, "Add to my assignments" works, and the new assignment shows on Today.
- [ ] **9. Clock and reminders.** In Settings, turn on due reminders and the 5-minute heads-up. Confirm reminders appear, can be dismissed, and stay quiet during your quiet hours. Choose "browser" notifications, allow them, and confirm a pop-up appears once.
- [ ] **10. Catch Up / Hyperdrive.** In Settings, open Catch Up and switch it on. Confirm Today shows the status bar and earlier unfinished work, the gold streaks appear in Space style and do not move, the pace cards read clearly with a screen reader, and switching it off removes everything. Confirm it was never offered before you turned it on.
- [ ] **11. Memory.** Start a task from Help me start with a session goal, choose Done for now, pick Partly, and write a note. Confirm the dialog is easy to use with a keyboard and a screen reader (focus lands in the note box, Escape stops without saving), the note shows on Today and in Help me start next time, and Clear note removes it.
- [ ] **12. Gemini with a real key.** Put a real key and an access code in `.env`, restart `npm run dev`, and enter the access code under Settings, Privacy. Try each helper once with made-up data: syllabus reader, first move, Make it clear, Message my professor (check both tone buttons and that nothing is sent for you), Ask about this assignment (ask something the instructions do not say), brain dump, the three planning helpers, Describe how you work, and a custom palette. Confirm every result is shown for review first, and that turning AI Mode off makes all of them stop with a calm message.

