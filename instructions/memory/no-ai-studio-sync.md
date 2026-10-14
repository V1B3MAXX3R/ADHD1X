---
name: no-ai-studio-sync
description: Google AI Studio sync overwrote the repo once; never sync it back
metadata:
  type: feedback
---

On 2026-10-13 Google AI Studio synced to the GitHub repo and its commit (b2d743c) deleted the clock, space background, Catch Up and test files, and added a duplicate copy of the app at the repo root. It happened because AI Studio expects the app at the top of the repo, but this project keeps it in `coding/`.

**Why:** a two-way sync lets a tool silently delete finished work.

**How to apply:**
- GitHub is the source of truth. If Christian wants AI Studio to see the latest code, he imports from GitHub into a fresh AI Studio project. He never uses its commit, sync or push option on this repo.
- If AI Studio writes something useful, he copies it to you. You check it and place it in the right folder yourself.
- Recovery that worked: `git merge -s ours origin/main` then a normal push. It keeps the local files and keeps the other commit in history.
- Open question: whether to move the app to the repo root (see [[open-items]]).
