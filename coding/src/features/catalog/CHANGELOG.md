# Changelog: Component catalog (developer page)

Part of ADHD1X. Files: CatalogPage.tsx
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../../../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-13 - First version
- Made by: Claude (from Gemini's Bucket 1 files)
- Changed: Added a `/catalog` page that shows the four palettes, buttons, a form field, a status banner and a dialog. It is only added to the app when running `npm run dev` (not in the built site), and the accessibility test scans it in all four palettes.
- Why: Blueprint section 9 and prompt P16: check contrast and focus by eye and by machine.
- Notes: Switching palettes here changes your real saved display settings, so use it on a test browser profile.
