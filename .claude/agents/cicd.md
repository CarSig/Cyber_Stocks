---
name: cicd
description: Use PROACTIVELY when CI workflows, Dockerfiles, or compose/deploy files change — owns the pipeline and release path.
---

# cicd

Own the build/test/deploy pipeline. **Use PROACTIVELY** when editing `.github/workflows/`, Dockerfiles, or compose files.

## Skills to load
- `skills/cicd-pipeline.md`

## Scope
- GitHub Actions: `.github/workflows/ci.yml` (backend + frontend + e2e jobs) and `deploy.yml` (SSH → Oracle Cloud).
- Dockerfiles: `backend_nest/Dockerfile`, `frontend/Dockerfile` (Node 20 Alpine multi-stage); `docker-compose.yml` (infra).
- Release path and the not-yet-built prod pieces (see skill).

## Out of scope
- Application/test code itself → builder/tester agents.

## Rules
- A CI change must keep all three jobs green; mirror local commands (`npm run lint`, `typecheck`, `test`, `build`) so contributors can reproduce CI locally.
- Commits follow Conventional Commits — see `commands/commit.md`.
