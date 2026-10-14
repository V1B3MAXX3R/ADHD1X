# Changelog: App (routes and sign-in gating)

Part of ADHD1X. Files: App.tsx, AppContext.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Save many classes and assignments at once
- Made by: Claude
- Changed: AppContext gained upsertMany(courses, assignments): one save and one screen update.
- Why: Saving Christian's grades file one assignment at a time took about 26 seconds, with the screen redrawing after each one, and looked like it had lost data.
- Notes: A 306-item file now saves in under half a second.

## 2026-10-13 - Route /cosmos
- Made by: Claude
- Changed: Added the /cosmos route (behind the age check).
- Why: Christian pasted the pulp-comic Cosmos UI (ui0 to ui10) and asked for it to go in a ui folder with the changelog updated.
- Notes: / still goes to Today.

## 2026-10-13 - finishSession can save minutes
- Made by: Claude
- Changed: finishSession now accepts minutes and adds them to the task's time logged.
- Why: Christian pasted 20 original feature files (11 to 30) and asked for them to be added.
- Notes: Only when the person taps Save and stop.

## 2026-10-13 - Palette and AI Mode
- Made by: Claude
- Changed: A saved custom palette is applied on load. The Gemini first-use notice is skipped when AI Mode is off, since nothing is sent.
- Why: Gemini features request.
- Notes: None.

## 2026-10-13 - Session memory in the timer
- Made by: Claude
- Changed: startTimer takes an optional goal and saves a session; new extendTimer (Keep going) and finishSession (saves outcome and note); stopTimer now also clears the finished task so the timer bar hides.
- Why: A62, A91 (see memory changelog).
- Notes: Older timers saved in the browser session still load.

## 2026-10-13 - Catch Up route
- Made by: Claude
- Changed: Added /catch-up.
- Why: Catch Up request.
- Notes: Behind the 18+ gate like the other pages.

## 2026-10-13 - Catalog route (dev only)
- Made by: Claude
- Changed: Added /catalog, only when running npm run dev. Added vite-env.d.ts so TypeScript knows about import.meta.env.
- Why: Component catalog for accessibility checks.
- Notes: Not in the built site.

## 2026-10-13 - Clock provider
- Made by: Claude
- Changed: The app is wrapped in the shared clock. Helpers for today's date and the current block now come from the clock rules.
- Why: Real-world clock request.
- Notes: Event handlers still read the time directly; screens use the clock so they update.

## 2026-10-13 - Space UI overhaul: finish with reward
- Made by: Claude
- Changed: Added `completeAssignmentWithReward` and the reward state to the shared app state.
- Why: Powers the finish pop-up (see voyage changelog).
- Notes: Pop-up needs Space style and the Celebrations setting.

## 2026-10-13 - Calendar section
- Made by: Claude
- Changed: Added the /calendar route and calendar items to the shared app state.
- Why: Calendar import feature; see [calendar changelog](../features/calendar/CHANGELOG.md).
- Notes: Saved-data version is now 2; existing data is kept.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).







