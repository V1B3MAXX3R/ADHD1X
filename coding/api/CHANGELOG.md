# Changelog: Serverless Gemini endpoint

Part of ADHD1X. Files: ai/[preset].ts
Every change to this part gets an entry here, and one line in the main [coding/CHANGELOG.md](../CHANGELOG.md) (decision A17). Newest entries at the top.

## 2026-10-14 - Access code hardening
- Made by: Claude
- Changed: The Gemini endpoint now: limits wrong access-code guesses (8 per address and 60 overall per 15 minutes, then 429 until the window ends); treats an ACCESS_CODE shorter than 16 characters, or missing, as not set up (401, nothing let through); compares codes as fixed-length hashes so timing and length reveal nothing; refuses a code header over 256 characters; refuses requests whose Origin is another website (403); and answers a body that is not a JSON object with 400. The rate-limit key is now a hash of the code, not the code.
- Why: Christian asked for security for his website. A review found no committed secrets and no dangerous code patterns; the gaps were guess limits on the access code, a few missing headers, and dependency warnings.
- Notes: Limits live in server memory per instance, so a long random code is the real protection (see SECURITY.md). Request and response types are in server/apiTypes.ts, replacing the @vercel/node import.

## 2026-10-13 - One handler for 15 presets
- Made by: Claude (from Gemini's files)
- Changed: [preset].ts handles every preset through promptBuilders, with the access code check, a 25-per-minute limit, size limits and a real 20 second timeout (the old one never actually stopped the request).
- Why: Gemini features request.
- Notes: Syllabus and first move behave as before.

## 2026-10-13 - Reorganized into its own folder
- Made by: Claude
- Changed: Moved into this folder as part of the project cleanup. Import paths updated. No behavior changes.
- Why: One folder per part of the website so each part can be viewed and updated on its own.
- Notes: Typecheck passes. Unit tests unchanged (10 of 11 pass; Case 3 in the day-plan tests is a known open item).

