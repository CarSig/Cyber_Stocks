---
name: commit
description: Create a Conventional Commit after running the relevant checks.
---

# /commit

Stage and commit the current work as a clean Conventional Commit.

## Steps
1. **Inspect**: `git status` + `git diff` to see what's changing. Group unrelated changes into separate commits.
2. **Run checks for the touched package(s)** before committing:
   - Frontend: `cd frontend && npm run lint && npm run typecheck && npm test`
   - Backend: `cd backend_nest && npm test`
   - Fix failures before proceeding — don't commit red.
3. **Branch guard**: if on `master`, create a feature branch first (don't commit directly to `master`).
4. **Message** — Conventional Commits:
   ```
   <type>(<scope>): <imperative summary>
   ```
   - Types: `feat`, `fix`, `test`, `chore`, `refactor` (matches this repo's history).
   - Scope = feature/module, e.g. `feat(simulations):`, `feat(context):`, `chore(frontend):`. Scope optional but preferred.
   - Subject ≤ ~72 chars, imperative ("add", not "added"). Body only if it adds real context.
5. **Commit**: `git add <paths>` (be deliberate, avoid `git add -A` if unrelated files are dirty) → `git commit`.

## Rules
- **Do not** add a `Co-Authored-By` / Claude attribution unless the user explicitly asks.
- Don't push unless asked. Never `--no-verify` or skip hooks.
- Keep docs/tests in the same commit as the code they describe (per the repo's working rules).
