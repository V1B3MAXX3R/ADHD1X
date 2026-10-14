# Changelog: Clock (real-world time for the whole app)

Part of ADHD1X. Files: ClockContext.tsx, ClockDisplay.tsx, ClockNotices.tsx, clockLogic.ts, notices.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Tone and today's blocks in reminders
- Made by: Claude (from Gemini's ReminderBanners)
- Changed: Reminders now follow the Tone setting (warm or short wording) and the 5-minute heads-up uses the blocks you chose for today.
- Why: Gemini's separate ReminderBanners duplicated these reminders, so the useful parts were merged here instead of keeping two copies.
- Notes: Gemini's version parsed due dates in a way that could be off by a day; the clock version avoids that.

## 2026-10-13 - First version: a real clock the whole app uses
- Made by: Claude
- Changed: One shared clock (device time) that updates on the minute and again when the tab comes back into view. Header shows the date and time (can be turned off in Settings, Display). Time rules in `clockLogic.ts`: which block it is, time left in a block, "due today / tomorrow / Friday" wording, quiet hours. `notices.ts` and `ClockNotices.tsx` give optional in-app reminders: a 5-minute heads-up before a study block ends and a due-soon list, both off unless chosen, silent in quiet hours, dismissible, and an optional browser pop-up once per notice if "browser" is chosen and allowed.
- Why: Christian asked for a real-world clock that affects the study plan and other features. Before this, the Today plan assumed 9:00 am no matter the real time.
- Notes: Browser pop-ups are not tested in a real browser yet. The clock display is not read out by screen readers on purpose.

