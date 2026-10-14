---
name: adapt-pasted-code
description: How to handle AI-written code and scripts Christian pastes in
metadata:
  type: feedback
---

Christian often pastes code that another AI (usually Gemini) wrote. He has said you may remove or replace code you judge unnecessary, change it to fit the site, and make PowerShell decisions yourself.

**Why:** pasted code usually uses old file paths, may be cut off, and sometimes breaks an approved decision. Running it blindly once would have overwritten finished work.

**How to apply:**
- Do not run a pasted setup script. Check the paths, the length (pastes get cut off), and what it would overwrite.
- Read the decision log items it touches. Where the code breaks a decision (for example an offer that should never appear automatically, A39), follow the decision and say what you changed and why.
- Split big files into small ones in the right part folder. Merge duplicates instead of keeping two copies.
- Verify with the checks and, for anything visible, with the browser tests. Tell him what you could not test.
