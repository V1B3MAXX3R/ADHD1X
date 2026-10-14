# Changelog: Memory ("Where was I?" note and session goal)

Part of ADHD1X. Files: SessionWrapUp.tsx, LeftOffNote.tsx, LeftOffList.tsx, sessionMemory.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Minutes box in the Done for now dialog
- Made by: Claude
- Changed: Added an optional minutes box. The minutes go on the saved session and add to the task's time logged.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Only used to improve estimates (A90). Never shown as a score.

## 2026-10-13 - First version: the app remembers where you left off
- Made by: Claude
- Changed: Two optional memory aids from the decision log. (1) Session goal (A91): on Help me start, step 5, you can type what you will do this session; when you choose "Done for now" it asks "Done, partly, or not yet?". (2) "Where was I?" note (A62): the same dialog asks for one line for next time. The note comes back on Today ("Where you left off"), on Help me start for that task, and in the assignment details, where it can be edited or cleared. The note is stored on the assignment and the goal and outcome on the saved session. Nothing is counted, scored or tracked, and there is nothing to keep up (A5, A25).
- Why: Christian asked for a memory system. A62 and A91 were already approved in the decision log as Enhancements.
- Notes: Notes and goals stay on this device and are never sent to Gemini; unit tests check the Gemini request code cannot include them. `Keep going` now continues the same session instead of starting a new one. The timer bar now disappears after "Done for now" even when the timer had run out (it used to stay). Notes are limited to 280 characters and goals to 200.
