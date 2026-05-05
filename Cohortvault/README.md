# CohortVault

CohortVault is a full-stack workspace for running AI workflows over sensitive documents with explicit access control, delegated secret usage, signed execution receipts, and review-safe artifacts.

Originally built as a hackathon submission, the current repository is a runnable monorepo with a real Next.js frontend, FastAPI backend, Postgres persistence, and a polling worker for ingestion.

## Current Status

The main product path lives under `/workspaces/[workspaceId]/*`.

Verified on `2026-03-23`:

- `pnpm --filter @cohortvault/web build` passed
- `python -m pytest apps/api/tests -v` passed with `24 passed in 10m 05s`
- `python scripts/smoke_test.py` passed end to end in `80.22s`
- smoke test used patched LLM calls because `COHORTVAULT_API_OPENAI_API_KEY` was not configured in the environment

## Product Overview

What works today:

- demo session switching between `owner`, `builder`, and `reviewer`
- persistent Postgres storage for workspaces, documents, runs, receipts, secrets, audit events, and jobs
- file upload to local storage plus queued ingestion jobs
- worker-driven chunking and indexing into `document_chunks`
- Secure Run with retrieval, output modes, receipt generation, and secret revocation enforcement
- member invite and role update actions
- reviewer artifact pages with viewer-specific re-redaction
- signed receipt verification and source-scope persistence
- cleanup and repeatable smoke-test support for generated demo workspaces

The strongest end-to-end demo path is:

1. sign in as `owner`
2. upload or open documents
3. issue and use a delegated secret
4. run Secure Run as `builder`
5. inspect the receipt and persisted artifact
6. switch to `reviewer` and confirm the artifact is re-redacted
7. revoke the secret and show the next dependent run is denied

## Architecture

```mermaid
flowchart LR
    Browser["Next.js web app"] --> API["FastAPI API"]
    Browser --> Session["Demo session cookie"]
    API --> Postgres["Postgres + pgvector"]
    API --> Uploads["Local file storage"]
    API --> Jobs["jobs table"]
    API --> LLM["OpenAI chat + embeddings"]
    Worker["Python worker"] --> Jobs
    Worker --> Uploads
    Worker --> Postgres
```

## What It Proves Today

- the persisted receipt payload was produced by the application and can be signature-verified
- runtime metadata, provider metadata, source scope, and policy hash are bound into the stored receipt
- access control, retrieval, audit logging, and viewer-side redaction are wired together end to end
- delegated secret usage can be granted, consumed, revoked, and later denied

## Current Boundaries

- auth is still demo-session based, not a full user identity system
- uploads default to local disk storage; object storage is not implemented yet
- live Secure Run responses require `COHORTVAULT_API_OPENAI_API_KEY`
- receipt generation is application-level signed evidence, not hardware-backed attestation
- `tee-provider stub` is a TEE-ready adapter slot, not a real SGX/Nitro/dstack integration

In short: the project is `TEE-ready`, not `TEE-backed`.

## Repository Layout

```text
cohortvault/
  apps/
    web/       Next.js frontend
    api/       FastAPI service
    worker/    polling ingestion worker
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
    DEMO_SCRIPT.md
    SCREENSHOT_SHOTLIST.md
    SUBMISSION_TEMPLATE.md
    SUBMISSION_COPY.md
```

## Local Setup

### Prerequisites

- Node.js `22+`
- pnpm `10+`
- Python `3.11+`
- Postgres `16+` with `pgvector`, or the provided Docker stack

### Install

```bash
pnpm install
python -m pip install --user -e apps/api
```

### Configure

Start from [`.env.example`](./.env.example) and set at least:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
COHORTVAULT_API_WEB_ORIGIN=http://localhost:3000
COHORTVAULT_API_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cohortvault
COHORTVAULT_API_OPENAI_API_KEY=
COHORTVAULT_API_ATTESTATION_ADAPTER=mock-signed-receipt-v1
COHORTVAULT_API_RECEIPT_RUNTIME_ID=cv-runtime-dev-01
COHORTVAULT_API_RECEIPT_SIGNING_KEY=cohortvault-dev-receipt-signing-key
COHORTVAULT_API_CAPABILITY_SIGNING_KEY=cohortvault-dev-capability-key
COHORTVAULT_API_SECRET_ENCRYPTION_KEY=
```

Notes:

- without `COHORTVAULT_API_OPENAI_API_KEY`, local smoke tests still run, but live chat and embedding calls are patched or unavailable depending on the path
- without `COHORTVAULT_API_SECRET_ENCRYPTION_KEY`, secrets can still exist as references, but raw secret values cannot be safely stored
- for production you should also override session, capability, and receipt signing keys, and set `COHORTVAULT_API_COOKIE_SECURE=true`

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

Then open:

- `http://localhost:3000/login`
- `http://localhost:3000/workspaces`
- `http://localhost:3000/workspaces/team-atlas`

## Docker

You can also run the local stack with Docker:

```bash
docker compose -f infra/docker/compose.yml up
```

The compose setup:

- starts Postgres with `pgvector`
- waits for Postgres health before migrating the API
- exposes the web app on `3000`
- exposes the API on `8000`
- runs the worker against the same database

## Testing

### Web build

```bash
pnpm --filter @cohortvault/web build
```

### API tests

```bash
python -m pytest apps/api/tests -v
```

Coverage includes:

- role permissions
- builder and reviewer restrictions
- signed receipt generation and verification
- TEE stub receipt shape
- secret revocation and expiry behavior
- worker job processing and retry logic

### End-to-end smoke test

```bash
python scripts/smoke_test.py
```

The smoke test exercises:

- session switching
- workspace creation
- member invite
- secret creation and revocation
- document upload
- ingestion and reindex
- Secure Run success
- receipt retrieval
- denial after revoke
- reviewer restrictions
- audit retrieval
- document deletion
- workspace cleanup

## Deployment

For a public demo, the supported deployment shape is:

- `apps/web` on Vercel
- `apps/api` on a long-running Python host such as Render or Railway
- `Postgres + pgvector` on Neon
- `apps/worker` as a second long-running service

Important production notes:

- `Vercel only` is not enough for the current repo
- the frontend defaults to `/backend` in production
- `apps/web/next.config.ts` rewrites `/backend/*` to `COHORTVAULT_API_PROXY_TARGET`
- this avoids cross-origin cookie issues for the demo-session flow

See [README-DEPLOY.md](./README-DEPLOY.md) for the full public deployment guide.

## Current Routes

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

## Useful Commands

```bash
pnpm dev
pnpm dev:web
pnpm dev:api
pnpm dev:worker
pnpm build
pnpm cleanup:demo
python -m pytest apps/api/tests -v
python scripts/smoke_test.py
```

## Read Next

- [Product Requirements](./docs/PRD.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Architecture Diagram](./docs/ARCHITECTURE_DIAGRAM.md)
- [Pages](./docs/PAGES.md)
- [Demo Script](./docs/DEMO_SCRIPT.md)
- [Screenshot Shotlist](./docs/SCREENSHOT_SHOTLIST.md)
- [Submission Template](./docs/SUBMISSION_TEMPLATE.md)
- [Submission Copy](./docs/SUBMISSION_COPY.md)
- [Human Tasks](./docs/HUMAN_TASKS.md)
