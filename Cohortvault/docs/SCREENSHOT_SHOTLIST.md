# CohortVault Screenshot Shotlist

Use these filenames and captions for submission assets. Save images under `docs/screenshots/` so the repo has predictable references even before final screenshots are captured.

## Required screenshots

### `docs/screenshots/01-login-personas.png`

- Screen: `/login`
- Show: owner, builder, reviewer persona cards
- Caption: `Demo persona switching for owner, builder, and reviewer`

### `docs/screenshots/02-workspace-dashboard.png`

- Screen: `/workspaces/[workspaceId]`
- Show: trust status, latest receipt summary, recent runs
- Caption: `Workspace dashboard with receipts, run history, and current access posture`

### `docs/screenshots/03-documents-indexed.png`

- Screen: `/workspaces/[workspaceId]/documents`
- Show: at least one indexed document and one management action
- Caption: `Queued ingestion plus indexed document corpus`

### `docs/screenshots/04-secure-run-result.png`

- Screen: `/workspaces/[workspaceId]/secure-run`
- Show: answer, sources, and signed receipt v1
- Caption: `Secure Run with OpenAI-backed retrieval, output filtering, and signed receipt v1`

### `docs/screenshots/05-reviewer-artifact.png`

- Screen: `/workspaces/[workspaceId]/review/[runId]`
- Show: receipt plus re-redacted sources
- Caption: `Reviewer view re-applies redaction for the current viewer`

### `docs/screenshots/06-secret-revoked.png`

- Screen: `/workspaces/[workspaceId]/settings` or `/secure-run`
- Show: revoked secret and failed rerun
- Caption: `Secret revocation blocks future Secure Run calls`

### `docs/screenshots/07-audit-log.png`

- Screen: `/workspaces/[workspaceId]/audit`
- Show: upload, run, secret usage, revoke events
- Caption: `Audit trail for uploads, runs, secret usage, and revocation`

## Optional screenshots

### `docs/screenshots/08-receipt-card-closeup.png`

- Close crop of the receipt block
- Caption: `Signed receipt v1 with adapter label, policy hash, source scope, and verification state`

### `docs/screenshots/09-settings-secret-form.png`

- Show optional secret value field and note about server-side encryption key
- Caption: `Secret metadata form with optional encrypted-at-rest secret value`

## Capture rules

- Prefer seeded or obviously fake demo data
- Do not show real keys, production hostnames, or personal email inboxes
- Do not use captions that imply TEE attestation is already live
- If the encryption key is not configured, avoid screenshots that imply secret values are definitely encrypted
