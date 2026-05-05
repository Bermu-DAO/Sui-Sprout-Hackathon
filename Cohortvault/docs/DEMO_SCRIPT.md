# CohortVault Demo Script

Use this script for the `3 to 5 minute` hackathon demo. It matches the current repository state and avoids overclaiming.

## Demo goal

Show one complete workflow:

1. owner sets up the workspace
2. builder runs Secure Run
3. receipt and audit trail are visible
4. reviewer opens the persisted run and sees re-redacted output
5. secret revocation blocks the next run

## Setup before recording

- Keep `pnpm dev:web`, `pnpm dev:api`, and `pnpm dev:worker` running
- Use a reachable Postgres instance
- If `COHORTVAULT_API_OPENAI_API_KEY` is not configured, say that the demo is using the smoke-test stubbed model path for local recording
- If `COHORTVAULT_API_SECRET_ENCRYPTION_KEY` is not configured, do not type a real secret value into the form

## Suggested recording order

### 0:00 to 0:20

Show the landing page and seeded workspace.

Say:

`CohortVault is a controlled AI workspace for teams working with sensitive research, strategy, and credentials. The current build uses OpenAI chat plus embeddings, Postgres plus pgvector retrieval, and signed receipt v1 records from a mock adapter rather than real TEE attestation.`

### 0:20 to 0:45

Open `/login` and switch personas.

Say:

`The demo uses three personas: owner, builder, and reviewer. This is a submission-safe demo session model, but the permissions and persisted data are real.`

### 0:45 to 1:30

Open the workspace dashboard and then `/documents`.

Upload one markdown file or show an already indexed file.

Say:

`The owner uploads files, the API stores metadata and a queued job, and the worker extracts text, chunks it, generates embeddings, and writes the retrieval index into Postgres.`

### 1:30 to 2:20

Open `/settings`.

Invite a teammate or show existing members. Add a secret reference. If the encryption key is configured, mention that the optional secret value is encrypted at rest.

Say:

`Secrets are stored as workspace-scoped references. If the server encryption key is configured, the optional secret value is encrypted at rest. The browser never receives the raw value back.`

### 2:20 to 3:00

Switch to `builder`. Open `/secure-run`.

Run a prompt in `redacted` mode with an active secret selected.

Say:

`Secure Run retrieves indexed workspace context, applies the requested output mode, calls OpenAI on the current path, persists a signed receipt v1 record, and records audit events.`

### 3:00 to 3:35

Open the reviewer artifact page for the run.

Say:

`The reviewer does not just read a cached full answer. When this page loads, the backend re-applies answer and source redaction for the current viewer. Full-mode outputs remain fully visible only to the run creator or a workspace owner.`

### 3:35 to 4:10

Switch back to `owner`. Revoke the secret in `/settings`.

Run the same workflow again from `/secure-run`.

Say:

`Revocation is enforced server-side. Once the owner revokes a secret, later Secure Run requests that depend on it fail and the denial is recorded.`

### 4:10 to 4:40

Open `/audit`.

Say:

`This is the trust story for the current build: role checks, retrieval, signed receipts, secret revocation, and audit history all line up. We are not claiming hardware-backed confidentiality yet. We are showing a credible product path and a TEE-ready architecture with honest boundaries.`

## Phrases to use

- `signed receipt v1`
- `TEE-ready architecture`
- `reviewer reads re-apply redaction`
- `OpenAI chat plus embeddings on the current path`
- `optional at-rest encryption when the server key is configured`

## Phrases to avoid

- `remote attestation is live`
- `hardware-enforced privacy`
- `cryptographic confidentiality guarantee`
- `the model never sees the prompt`
- `all secrets are always encrypted` 
