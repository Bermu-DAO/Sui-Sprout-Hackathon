# CohortVault Final Submission Copy

This version is written for a Shape Rotator submission page, demo page, or public project description.

## Project Name

`CohortVault`

## Tagline

`A controlled AI workspace for sensitive research, strategy, and credentials.`

## 1-Sentence Summary

`CohortVault gives teams a role-aware AI workspace where they can work on sensitive documents, use delegated secrets without exposing them to the browser, and inspect signed receipt v1 records plus audit history for every secure workflow.`

## 50-Word Summary

`CohortVault turns secure-AI research ideas into a usable product. Teams upload sensitive materials into a shared workspace, run Secure Run workflows with role-aware output controls, delegate secrets instead of copying them into prompts, and verify what happened through signed receipt v1 records and reviewer-safe audit trails.`

## Problem

`Research teams, startup teams, and hackathon builders already use AI on private pitch decks, diligence memos, strategy docs, and API-backed workflows. The default workflow is unsafe: sensitive documents are pasted into general-purpose tools, secrets are shared informally, and there is no durable record of what data was touched or how an answer was produced.`

## Solution

`CohortVault is a controlled AI collaboration workspace. Owners upload documents, manage roles, and attach workspace-scoped secret references. Builders can run Secure Run workflows over indexed workspace data. Reviewers can inspect persisted outputs, receipts, and audit trails without seeing raw sensitive material. Every run records receipt metadata, source scope, and audit events, and reviewer reads re-apply redaction for the current viewer.`

## What We Built

- `owner / builder / reviewer` demo personas with real role enforcement
- Workspace creation, invites, and role updates
- File upload with queued ingestion jobs
- Worker-driven chunking and pgvector indexing
- Secure Run over indexed workspace data
- Delegated secret references with revocation and denial after revoke
- Signed receipt v1 records with verification logic and explicit provider metadata
- Reviewer artifact pages that re-redact persisted answers and sources for the current viewer
- Audit history across uploads, runs, secret usage, and secret revocation

## Research Connection

`CohortVault is informed by NDAI Agreements, Conditional Recall, Props, and recent work on narrowing the gap between TEE threat models and deployment realities.`

`We translated those ideas into product behavior rather than only citing them:`

- `Conditional Recall` inspired delegated access patterns where secret use can be granted, consumed, and later revoked without exposing the raw secret to the browser.
- `Props` informed the idea of controlled access to sensitive data, where users get useful outputs without broad raw-data exposure.
- `Narrowing the Gap` shaped our trust model: the product distinguishes between application-level signed receipts and true hardware-backed attestation instead of collapsing them into one misleading security claim.
- `NDAI Agreements` influenced the controlled-disclosure framing: different actors should see different outputs, and review should be possible without revealing everything.

## Why This Matters

`We think the important step for this hackathon is not just proving that privacy infrastructure can exist, but showing how it becomes a product people can actually use. CohortVault turns abstract trust-boundary ideas into a workflow judges can interact with immediately: upload, run, inspect the receipt, switch viewer, and prove that revocation changes system behavior.`

## Technical Depth

`This is not a static UI prototype. The current branch includes a persistent FastAPI backend, Postgres plus pgvector retrieval, worker-based ingestion, signed receipt generation and verification, role-aware clipping of persisted artifacts, and end-to-end tests covering permissions, receipts, secret revocation, and worker processing.`

## Why It Fits Shape Rotator

- It turns privacy and TEE-adjacent research into a usable workflow instead of a diagram
- It makes trust assumptions explicit instead of hiding them
- It demonstrates a complete secure collaboration loop, not just a single model call
- It has a credible path from hackathon prototype to accelerator-stage product

## Honest Limitations

- The current `Secure Run` path is `TEE-ready`, not truly TEE-backed
- Receipts are signed receipt v1 records from a mock adapter, not SGX/Nitro/dstack remote attestation evidence
- The current build uses local file uploads, not object storage
- `secretValue` encryption at rest is optional and only active when the server encryption key is configured
- The current main path still calls OpenAI directly unless a future TEE-backed execution runtime is integrated

## What The Current Receipt Proves

- The receipt payload was produced by the application and has not been tampered with after signing
- The payload binds runtime metadata, provider metadata, policy hash, and source scope into a durable record
- The viewer can distinguish a lightweight signed runtime from a TEE-ready stub instead of being misled into assuming hardware attestation

## What It Does Not Prove Yet

- It does not prove enclave execution
- It does not prove remote attestation
- It does not prove hardware-backed confidentiality

## Demo Flow

1. Sign in as `owner`
2. Open the seeded workspace
3. Show documents, members, and secrets
4. Switch to `builder`
5. Run Secure Run in `redacted` mode
6. Open the signed receipt and persisted review artifact
7. Switch to `reviewer` and show re-redaction
8. Switch back to `owner`, revoke the secret, and show the next run failing

## Tech Stack

- Next.js
- FastAPI
- Python worker
- Postgres + pgvector
- OpenAI chat + embeddings
- Signed receipt v1 adapter abstraction

## Future Work

- Real TEE-backed execution and attestation verification
- Shared object storage for production deployments
- Policy engine and approval workflows
- Stronger secret brokerage and KMS integration
- Reviewer portal for diligence and investor workflows

## Closing Paragraph

`CohortVault is our attempt to turn secure-AI research into a product judges can reason about, not just a concept they can admire. The current build already shows role-aware execution, delegated secrets, signed receipts, reviewer-safe outputs, and auditability end to end. The next step is to connect the same product surface to a real TEE-backed runtime.`
