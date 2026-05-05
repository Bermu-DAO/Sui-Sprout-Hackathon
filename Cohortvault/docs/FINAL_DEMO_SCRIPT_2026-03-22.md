# CohortVault Final Demo Script

Target length: `4 to 5 minutes`

This version is optimized for judges.

## Demo Goal

The audience should leave remembering four things:

1. this is a real product workflow, not just a security concept
2. different roles see different outputs
3. the system persists signed receipt v1 records and audit history
4. revocation changes behavior in a visible way

## Pre-Demo Checklist

Before recording or presenting:

- Use the public deployed frontend URL
- Start from `/login`
- Ensure the seeded `team-atlas` workspace exists
- Ensure at least one indexed document already exists
- Ensure at least one secret is active
- Ensure `COHORTVAULT_API_OPENAI_API_KEY` is configured if you want a live run
- Keep one previously completed run available for the reviewer page

## Exact Judge Flow

### 0:00 to 0:20

On screen:

- open the landing page or go directly to `/login`

Say:

`CohortVault is a controlled AI workspace for teams using AI on sensitive research, strategy, and credentials. Instead of pasting private material into general-purpose tools, teams work inside a role-aware workspace with delegated secrets, signed receipt v1 records, and reviewer-safe outputs.`

### 0:20 to 0:45

On screen:

- open `/login`
- show `owner`, `builder`, and `reviewer`
- select `Atlas Lead`

Say:

`This demo uses three personas: owner, builder, and reviewer. The session model is simplified for the hackathon, but the permissions, persistence, and role checks are real.`

### 0:45 to 1:20

On screen:

- open `/workspaces/team-atlas`
- point to member count, run count, role badge, and latest receipt block

Say:

`The dashboard is the trust surface. It shows who has access, what has been run, and whether a signed receipt exists. The important point is that this is persistent application state, not a front-end mock.`

### 1:20 to 1:55

On screen:

- open `/workspaces/team-atlas/documents`
- show indexed documents

Say:

`Documents are uploaded into the workspace, then a worker extracts text, chunks it, generates embeddings, and stores the retrieval index in Postgres with pgvector. That makes the secure workflow grounded in workspace data rather than raw prompt text alone.`

### 1:55 to 2:25

On screen:

- open `/workspaces/team-atlas/settings`
- show members and secrets
- highlight one active secret

Say:

`Secrets are handled as delegated workspace references. The browser never gets the raw secret back. The owner can activate or revoke secret access, and that becomes part of the secure workflow state.`

### 2:25 to 2:50

On screen:

- switch to `Atlas Builder`
- open `/workspaces/team-atlas/secure-run`

Say:

`Now I switch to the builder role. Builders can execute Secure Run, but they cannot manage members or secrets. That separation is part of the product design, not just an API convention.`

### 2:50 to 3:25

On screen:

- submit a Secure Run in `redacted` mode
- optionally select an active delegated secret
- wait for the result

Suggested prompt:

`Summarize the strongest product wedge from the uploaded materials and keep the answer safe for a builder role.`

Say:

`Secure Run retrieves allowed workspace context, applies the selected output mode, uses the delegated secret path if needed, and persists a signed receipt v1 record plus audit events.`

### 3:25 to 3:55

On screen:

- point to the receipt panel
- show provider, execution class, policy hash, source count, and verification state

Say:

`This receipt is important because it makes the trust model explicit. In the current build this is application-level signed evidence, not hardware-backed attestation. We are deliberately separating signed receipt v1 from real TEE claims.`

### 3:55 to 4:20

On screen:

- open the reviewer artifact for that run
- switch to `Atlas Reviewer`
- reload or reopen the same artifact

Say:

`The reviewer view is not just a cached copy of the builder output. When this page loads, the backend re-applies clipping and source redaction for the current viewer. That means review is possible without broad raw-data exposure.`

### 4:20 to 4:50

On screen:

- switch back to `Atlas Lead`
- revoke the active secret in settings
- rerun the same secure flow or show denial path

Say:

`Now the owner revokes the secret. When the same flow is attempted again, the system denies it and records that denial. That proves secret revocation changes runtime behavior instead of only changing a label in the UI.`

### 4:50 to 5:10

On screen:

- open `/audit`
- point to run, secret, and document events

Say:

`This is the current trust story: role checks, retrieval, signed receipts, review-safe output filtering, secret revocation, and audit history all line up end to end. We are not claiming hardware-backed confidentiality yet. We are showing a credible TEE-ready product path with honest boundaries.`

## Best Phrases To Use

- `controlled AI workspace`
- `delegated secret access`
- `signed receipt v1`
- `reviewer reads re-apply redaction`
- `TEE-ready architecture with explicit trust boundaries`
- `application-level signed evidence, not remote attestation`

## Phrases To Avoid

- `fully private`
- `hardware-enforced confidentiality today`
- `remote attestation is live`
- `the model never sees the prompt`
- `cryptographic guarantee end to end`

## If Judges Interrupt Early

If you only get 2 minutes, show this shortened flow:

1. `/login`
2. `team-atlas`
3. `secure-run`
4. receipt card
5. reviewer artifact
6. revoked secret denial

## Final Closing Line

`CohortVault is not just a secure-AI demo. It is a product-shaped workflow that makes privacy, provenance, and reviewability usable today, while leaving a clean path to real TEE-backed execution next.`
