# Changelog: UI (Cosmos view)

Part of ADHD1X. Files: PulpSpaceShell.tsx, types.ts, halftone.css, components/{SectorTabs, HeroTypography, VectorStage, StarMask, ContentGrid, Footer}.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - Whole-site layout in the Cosmos look
- Made by: Claude
- Changed: With the Cosmos look on, every page now uses the Cosmos structure, not just the colors: a black status strip, a masthead with the ADHD1X name and the same five menu items across the top, a page header band (label, the page title as a big headline, one plain sentence, and a small illustration that follows the pointer), the page content in ink-outlined cards, and the black footer. New: CosmosHero.tsx, CosmosFooter.tsx, pageInfo.ts; VectorStage has a compact size; AppShell draws the Cosmos frame itself; the Cosmos page skips the duplicate header and footer.
- Why: Christian said the whole website must be built in the Cosmos form, not just one piece.
- Notes: The menu items and their order are unchanged (A73, A100); in this look the menu sits across the top instead of on the left or bottom, and always in the same place. The timer bar, clock, notices, reward pop-up and help dialog work the same. The page title is still the one level-1 heading. The look stays off until switched on. All 8 test pages pass the accessibility scan with it on.

## 2026-10-13 - Cosmos look on every page
- Made by: Claude
- Changed: The Cosmos look is now a setting (Settings > Display > Cosmos look on every page, or the Use this look on every page button on the Cosmos page). When on, every screen uses the paper-and-ink colors, monospace type, square ink-outlined cards and halftone background (cosmosLook.css). The old page only styled /cosmos itself, so the look vanished on other pages.
- Why: Christian reported that the Cosmos UI disappeared when he clicked other pages.
- Notes: It is off until the person switches it on (A4: nothing is saved without a tap). It replaces the Theme and Dim colors while on; a custom palette from the personalizer still wins. The Space starfield is hidden while it is on. Eight pages pass the accessibility scan with the look on, and the palette was added to the contrast check.

## 2026-10-13 - First version: the Cosmos view
- Made by: Claude
- Changed: A new page at /cosmos: a 1950s pulp-comic look at the voyage, Hyperdrive and starter timer, with three tabs (Planets, Deep space, Exploration), animated illustrations that follow the pointer slightly (framer-motion), mission-log cards made from your real assignments (with Start and I finished this buttons), and a fun fact in Space style. Reach it from the Voyage page (Space style) or by typing /cosmos.
- Why: Christian pasted the pulp-comic Cosmos UI (ui0 to ui10) and asked for it to go in a ui folder with the changelog updated.
- Notes: Changed from the pasted code: (1) It sits inside the normal page shell (AppShell, now with a wide option), so the menu, timer bar, clock and reward pop-up keep working. The pasted App.tsx would have replaced the whole file, dropped the clock, made /cosmos the home page and skipped the age check; the existing App.tsx was kept, / still goes to Today (A73), and /cosmos only needs the age check like other pages. (2) Its own menu with page links was removed because the app's menu is fixed (A73, A100); it keeps the three tabs (now with arrow-key support) and the AI Mode switch. (3) Rule numbers, version numbers, "verified" labels and made-up readouts (gravity, velocity) were removed or replaced with real numbers; the claims in the sample logs were checked against the plan engine (24-hour rule, 15% free time). (4) Gray text darkened to #5A5856 so it passes the 4.5:1 contrast rule; the page passes the accessibility scan in both styles. (5) Animation stops when the app's Motion setting is off or the system asks for reduced motion; the footer button is one Pause animations switch. (6) The fun fact shows in Space style only (A67, A77), and the extra study facts are in the normal pool instead of a second picker. (7) The headline is a level-2 heading (the page shell has the level-1), the nested main landmark was removed, and unused styles and picture data were dropped. Known limit: the page uses its own fixed paper-and-ink colors, so a custom palette and Dim mode do not recolor it.

