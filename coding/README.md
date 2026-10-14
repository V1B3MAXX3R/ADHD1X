# coding/

**Version 1.1.1** (2026-10-10)

Source code, unit tests, software architecture files for the ADHD1X website. Phase 6 (implementation) has been unlocked and the MVP is built.

## Layout

| Folder | What it holds |
|---|---|
| `src/app/` | App routes and global state |
| `src/features/` | One folder per part of the website: `today`, `courses`, `assignments`, `calendar`, `catalog` (dev only), `catchUp`, `memory`, `gemini`, `helpMeStart`, `help`, `onboarding`, `quiz`, `settings`, `voyage` |
| `src/shared/` | Pieces used by many parts: `components` (app shell), `data` (saved data and schemas), `ai` (Gemini client), `logic` (time estimates), `styles` |
| `server/`, `api/` | Server-only Gemini rules and the serverless endpoint |
| `tests/` | `unit/` (npm run test:unit), `e2e/` browser and accessibility tests (npm run test:e2e), `fixtures/` fake data |
| `MANUAL_CHECKLIST.md` | Checks that need a person on a real computer and phone |
| `scripts/` | Contrast check and secret scan |

## Run it

```
npm install
npm run dev      # open http://localhost:5173/
npm run check    # typecheck, contrast, secret scan, unit tests
```

Copy `.env.example` to `.env` and fill in `GEMINI_API_KEY` and `ACCESS_CODE` for the Gemini features, then restart `npm run dev`. The dev server serves the Gemini endpoint itself. In the app, enter the same ACCESS_CODE under Settings, Privacy. Never commit `.env`.

## Changelog

The main changelog is [CHANGELOG.md](CHANGELOG.md), and every part folder has its own `CHANGELOG.md`. Every code change gets an entry (decision A17).





