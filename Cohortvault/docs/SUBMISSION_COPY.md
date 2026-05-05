# CohortVault Submission Copy

These are ready-to-paste submission blocks aligned to the current implementation.

## Tagline

`A controlled AI workspace for sensitive research, strategy, and credentials.`

## One-line summary

`CohortVault lets teams upload sensitive materials, run role-aware AI workflows, and inspect signed receipt v1 records plus audit history without overclaiming TEE guarantees.`

## Problem

`Teams already use AI on decks, transcripts, and research notes, but the default workflow is unsafe. Sensitive material gets pasted into general-purpose tools, API keys are shared in chat, and there is no reliable record of what the system touched or how a result was produced.`

## Solution

`CohortVault is a controlled AI workspace. Owners upload documents, manage member roles, and attach workspace-scoped secret references. Builders can run Secure Run workflows over indexed materials using OpenAI chat plus pgvector retrieval. Each run stores a signed receipt v1 record, source metadata, and audit events. When a reviewer opens a persisted run, the backend re-applies answer and source redaction for that viewer.`

## What is live in the repo

- `owner / builder / reviewer` demo session switching
- Workspace creation, invites, and role updates
- File upload, queued ingestion, worker processing, and pgvector retrieval
- Secure Run using OpenAI chat completions
- Signed receipt v1 records persisted per run
- Secret creation, revocation, and denial after revoke
- Reviewer artifact page with re-redacted sources
- Audit trail for uploads, runs, secret usage, and revocation

## Honest limitations

- `Secure Run` does not use a true TEE-backed model runtime yet
- Receipts are signed receipt v1 records from the mock adapter, not remote attestation evidence
- `secretValue` is only encrypted at rest when `COHORTVAULT_API_SECRET_ENCRYPTION_KEY` is configured
- The current build uses local file uploads, not object storage

## Research connection

`CohortVault is informed by NDAI Agreements, Conditional Recall, Props, and recent work on narrowing the gap between TEE threat models and deployment realities. We translated those ideas into product features such as delegated secret handling, reviewable execution records, and role-aware redaction.`

## Good phrases

- `TEE-ready architecture`
- `signed receipt v1`
- `role-aware redaction`
- `OpenAI chat plus pgvector retrieval on the current path`
- `optional encrypted-at-rest secret values`

## Avoid these phrases

- `remote attestation is already implemented`
- `hardware-backed confidentiality today`
- `cryptographic guarantee end to end`
- `the model never sees the prompt`
- `all secrets are encrypted at rest by default`
