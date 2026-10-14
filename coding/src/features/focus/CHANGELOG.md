# Changelog: Focus (during a work session)

Part of ADHD1X. Files: ParkingLot.tsx, RampInRitual.tsx, SensoryQuickSwitch.tsx, ZeroDecisionStart.tsx, timeCheck.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - First version: parking lot, ramp-in, calm mode, one-tap start
- Made by: Claude
- Changed: (1) Parking lot: a "Park a thought" button in the timer bar saves a one-line thought (up to 50, on this device only) so you can stay on task. (2) Ramp-in: an optional 60-second three-step checklist on Help me start, step 5. (3) Calm mode: one tap sets Low theme, Dim, no motion, bar timer, no sounds; "Put my settings back" undoes it. It is on Settings > Display and in the "Still stuck?" panel (A74). (4) Zero-decision start: on Today, one button starts the starter timer on the top task and shows its first move. (5) Time check-back: the Done for now dialog has an optional minutes box (A90).
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Pasted code was changed to fit: the parking lot lives in the timer bar and is cleared by Delete all my data (that clears local storage); calm mode can be undone; the zero-decision start hides itself while a timer is running; the time check-back is a box in the existing Done for now dialog, not a separate screen. Rule numbers and emoji were removed from the screen text. Minutes are saved only when you tap Save and stop.

