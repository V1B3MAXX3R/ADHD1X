# Changelog: Planning helpers (energy, long days, recovery, reading, done-list)

Part of ADHD1X. Files: planningLogic.ts, EnergyCheck.tsx, BurnoutShield.tsx, RecoveryGapsManager.tsx, ReadingTimeCalculator.tsx, MinimumViableSubmission.tsx, DefinitionOfDoneCard.tsx, PersonalPaceNote.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - School term bar and Term and breaks settings
- Made by: Claude
- Changed: TermBar.tsx: a short box on Today and Catch Up with the last day of the term (and days left), the mode, and today's break or the next break. TermSettingsPanel.tsx: last day of the term, mode (Regular, Midterms, Finals) and a list of breaks you can add and remove (name, first day, last day).
- Why: Christian asked for the term's last day to show in regular mode and Catch Up, a midterms mode and a finals mode, breaks, and for the Aggressive pace to use Morning, Evening and Night blocks shaped by how many hours he is willing to work.
- Notes: The last day falls back to the latest class end date when it is blank. A break whose last day is before its first day is refused with a plain message. Up to 20 breaks.

## 2026-10-13 - First version: eight small planning helpers
- Made by: Claude
- Changed: (1) Optional energy check on Today (A64): Low, Okay or Good gives a suggestion, applied only when you tap Use this; the answer is never saved. (2) Two-long-days question (A41): if you accepted a plan with 2 or more blocks yesterday and picked 2 or more today, Today asks once if you want one lighter block. (3) Recovery gaps (Lever L7): Settings > Planning lets you tag draining classes; Today then shows a quiet-time note for 10 to 30 minutes after they end. (4) Reading time from pages (A89) in the details of reading assignments; the pace is remembered. (5) Short on time? A 15-minute turn-in-something plan with a timer. (6) A "how to know you are done" list, using the Make it clear checklist when there is one. (7) A note with your real pace, shown after two finished tasks of that type have time logged (A90). (8) A date helper for the above.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: The recovery gap shows a notice on Today only; it does not move tasks in the plan engine yet. The pasted version started with a made-up sample class and had no weekdays; this one starts empty and has weekdays. The two-long-days check only counts yesterday if you accepted that plan, so tapping a block by accident does not trigger it. Two new settings were added (recoveryGaps, readingMinutesPerPage); older saved data loads fine.

