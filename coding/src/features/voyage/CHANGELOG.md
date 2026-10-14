# Changelog: Space voyage page and progress logic

Part of ADHD1X. Files: VoyagePage.tsx, voyage.ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Space UI overhaul: solar system map, planet badges, rewards, fun facts
- Made by: Claude (from Christian's Space UI script)
- Changed: Rebuilt the Voyage page from small parts: `components/SolarSystemMap.tsx` (Earth to Neptune route with a spacecraft), `components/MissionLog.tsx` (stop list with planet badges, finished-assignment log), `components/FunFactCard.tsx`. Added `funFacts.ts` (the 20 approved facts FF1 to FF20), `planets.ts` (colors and badge text per stop), `rewards.ts` (works out points and newly reached stop), and `RewardDialog.tsx` (the finish pop-up). Regular style keeps the plain finished list.
- Why: Christian's Space UI overhaul (A53, A54, A57, A67, A77).
- Notes: The map is decorative; the stop list gives the same information as text. The fun facts match research/evidence-report-proposals.md word for word. Reward pop-up shows only in Space style AND when "Small celebration" is on (A5, A24, A67).

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

