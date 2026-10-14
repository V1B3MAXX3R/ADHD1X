# Changelog: App (routes and sign-in gating)

Part of ADHD1X. Files: App.tsx, AppContext.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../CHANGELOG.md) (decision A17). Newest entries at the top.

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





