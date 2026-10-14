---
name: git-only-when-asked
description: Commit and push are separate requests; do neither unless asked
metadata:
  type: feedback
---

Christian says "commit" when he wants a local commit and "push" (or "commit and push") when he wants it on GitHub. He asked for them one step at a time, often after reviewing the work.

**Why:** pushing publishes the work, and once a bad sync happened (see [[no-ai-studio-sync]]) he needed full control over what is on GitHub.

**How to apply:**
- Finish the work, run the checks, and then stop and offer: "Say commit and push when you want this on GitHub."
- If he says only "commit", commit and do not push. Then say it is not on GitHub yet.
- Never force-push. If GitHub has diverged, look first, and prefer a merge that keeps his files.
- End commit messages with the attribution line the tool gives you.
