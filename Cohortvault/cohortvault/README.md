# CohortVault

CohortVault is a privacy-preserving research collaboration workspace for the Shape Rotator hackathon. The current branch is a runnable submission build, not just a blueprint.

## What Works Now

The main product path is live under `/workspaces/[workspaceId]/*` and the current implementation covers:

1. Cookie-backed demo session switching between `owner`, `builder`, and `reviewer`
2. Persistent Postgres storage for `workspaces`, `documents`, `runs`, `receipts`, `secrets`, `audit_events`, and `jobs`
3. File upload to local storage plus queued ingestion jobs
4. Worker-driven chunking and indexing into persistent `document_chunks` with deterministic embeddings
5. Secure Run with pgvector-backed retrieval, output filtering, receipt persistence, and secret revocation failure
6. Member invite and role update actions
7. Document delete and reindex actions
8. Reviewer artifact page by `runId`
9. Postgres connection pooling plus workspace cleanup support for repeatable remote smoke tests

## Honest MVP Boundaries

- Auth is still a demo session cookie, not Supabase or Clerk
- Retrieval uses local deterministic embeddings for demo quality, not a hosted embedding model
- Sqlite remains in the repo only as a smoke-test fallback for environments without Postgres
- Secrets are references in persistent storage, not a real KMS-backed vault
- Attestation is still a signed runtime receipt, not hardware-backed evidence
- Real Postgres runtime is exercised against Neon, but remote latency is still materially higher than local sqlite

## Submission Architecture

```mermaid
flowchart LR
    Browser["Next.js web app"] --> API["FastAPI API"]
    Browser --> Session["Session cookie / actor switch"]
    API --> Postgres["Postgres + pgvector"]
    API --> Uploads["Local file storage"]
    API --> Jobs["jobs table"]
    Worker["Python worker"] --> Jobs
    Worker --> Uploads
    Worker --> Postgres
    API --> Model["Mock secure-run service"]
    Model --> Postgres
```

For a standalone diagram file, see [ARCHITECTURE_DIAGRAM.md](C:\Users\28119\Desktop\cc\cohortvault\docs\ARCHITECTURE_DIAGRAM.md).

## Repo Layout

```text
cohortvault/
  apps/
    web/
    api/
    worker/
  packages/
    ui/
    config/
    db/
    types/
    prompts/
  infra/
    docker/
    terraform/
  scripts/
    cleanup_generated_workspaces.py
    seed_demo_data.py
    generate_attestation_mock.py
    smoke_test.py
  docs/
    PRD.md
    ARCHITECTURE.md
    PAGES.md
    SUBMISSION_TEMPLATE.md
    ARCHITECTURE_DIAGRAM.md
    HUMAN_TASKS.md
  .env.example
  README.md
```

## Local Setup

### Prerequisites

- Node.js 22+
- pnpm 10+
- Python 3.11+
- Postgres 16+ with `pgvector`, or the provided docker compose stack

### Install

```bash
pnpm install
python -m pip install --user -e apps/api
```

### Configure

The repo now reads local env files from both the repo root and `apps/api/` for convenience. Keep the API pointed at your Postgres instance:

```bash
COHORTVAULT_API_DATABASE_BACKEND=postgres
COHORTVAULT_API_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cohortvault
COHORTVAULT_API_DATABASE_POOL_MIN_SIZE=1
COHORTVAULT_API_DATABASE_POOL_MAX_SIZE=6
```

### Run migrations

```bash
pnpm migrate:api
```

### Start the stack

Run these in separate terminals:

```bash
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

### Docker option

```bash
docker compose -f infra/docker/compose.yml up
```

### Open the app

- `http://localhost:3000/login`
- `http://localhost:3000/workspaces`
- `http://localhost:3000/workspaces/team-atlas`

### Demo flow

1. Go to `/login` and switch between `owner`, `builder`, and `reviewer`
2. As `owner`, create or open a workspace
3. Upload a document from `/workspaces/[workspaceId]/documents`
4. Keep the worker running so the queued ingestion job completes
5. Add or revoke secrets from `/workspaces/[workspaceId]/settings`
6. Run Secure Run from `/workspaces/[workspaceId]/secure-run`
7. Inspect the receipt and review artifact
8. Revoke a secret and run again to show the denial path

## Smoke Test

Run the cross-platform smoke test:

```bash
python scripts/smoke_test.py
```

The smoke test falls back to `sqlite` only when no database backend is set. If `COHORTVAULT_API_DATABASE_BACKEND=postgres` is present, it runs against the real Postgres instance and cleans up its generated workspace at the end.

If you need to remove older generated workspaces from a shared Postgres branch:

```bash
pnpm cleanup:demo
```

This covers:

- workspace creation
- member invite
- secret creation and revocation
- document upload
- worker ingestion
- reindex
- actor switch
- secure run success
- secure run denial after revoke
- audit retrieval
- document delete

## Current Product Routes

```text
/
/login
/onboarding
/workspaces
/workspaces/[workspaceId]
/workspaces/[workspaceId]/documents
/workspaces/[workspaceId]/secure-run
/workspaces/[workspaceId]/audit
/workspaces/[workspaceId]/settings
/workspaces/[workspaceId]/review/[runId]
```

## Read Next

- [PRD](C:\Users\28119\Desktop\cc\cohortvault\docs\PRD.md)
- [Architecture](C:\Users\28119\Desktop\cc\cohortvault\docs\ARCHITECTURE.md)
- [Pages](C:\Users\28119\Desktop\cc\cohortvault\docs\PAGES.md)
- [Submission Template](C:\Users\28119\Desktop\cc\cohortvault\docs\SUBMISSION_TEMPLATE.md)
- [Human Tasks](C:\Users\28119\Desktop\cc\cohortvault\docs\HUMAN_TASKS.md)
