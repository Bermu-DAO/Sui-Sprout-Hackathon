# CohortVault Pages and Interaction Design

## 1. Product Surface

The hackathon UI should look like a real product, not a dashboard collage. The experience should communicate:

- privacy
- control
- provenance
- usefulness

## 2. Sitemap

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

## 3. Page-by-Page Breakdown

## 3.1 Landing Page `/`

### Goal

Explain the product in one screen and convert into workspace creation.

### Sections

- Hero
- Core promise
- How Secure Run works
- Trust and runtime receipt section
- Demo screenshots
- CTA

### Primary CTA

`Create Secure Workspace`

### Supporting CTA

`Watch 90s Demo`

### UI notes

- Use a serious, research-lab style visual language
- Show a receipt card mock in the hero
- Avoid generic AI gradients

## 3.2 Login `/login`

### Goal

Fast entry to product.

### Components

- Demo persona switch for `owner`, `builder`, and `reviewer`
- Invite acceptance can stay out of scope for the submission build
- Short trust note

## 3.3 Onboarding `/onboarding`

### Goal

Get users to first workspace quickly.

### Steps

1. Workspace name
2. Team use case
3. Default privacy mode
4. Invite teammates

### Output

User lands inside dashboard with checklist.

## 3.4 Workspace Dashboard `/workspaces/[workspaceId]`

### Goal

Command center for the project.

### Modules

- Workspace header
- Trust status card
- Document count
- Recent runs
- Audit summary
- Teammates
- Quick actions

### Quick actions

- Upload documents
- Run Securely
- Invite teammate
- Add secret

### Important component

`Trust Status Card`

It should show:

- runtime mode
- adapter type
- last secure run status
- receipt availability status

## 3.5 Documents Page `/documents`

### Goal

Manage private corpus.

### Components

- Upload dropzone
- Document table
- Ingestion status pills
- Permission labels
- Source preview drawer

### Actions

- Upload
- Re-index
- Delete
- Mark as restricted

## 3.6 Secure Run Page `/secure-run`

### Goal

This is the flagship page. It should feel like the product.

### Layout

- Left: task composer
- Center: output panel
- Right: provenance and receipt panel

### Task composer fields

- Task prompt
- Output mode: full / redacted / summary only
- Optional secret selector

### Output panel states

- Empty state
- Running state
- Success state
- Denied state

### Receipt panel

- Runtime identity
- Policy hash
- Data sources touched
- Secret access yes/no
- Signed receipt v1 label plus verification state

This page is what the judges should remember.

## 3.7 Audit Page `/audit`

### Goal

Make trust visible.

### Components

- Event timeline
- Filters by actor, event type, document, secret
- Receipt links
- Export button

### Sample event types

- document.uploaded
- member.invited
- run.started
- run.completed
- secret.used
- secret.revoked

## 3.8 Settings Page `/settings`

### Goal

Manage permissions and secrets.

### Sections

- Members and roles
- Secrets
- Workspace policies
- Danger zone

### Secrets block

Each secret row should show:

- provider
- scope
- created by
- last used
- revoke button

## 3.9 Reviewer Page `/review/[runId]`

### Goal

Show a shareable trust artifact to judges or mentors.

### Content

- Problem asked
- Output summary
- Receipt metadata
- Sources used
- Redaction notice
- No raw secret exposure

This page helps the project feel like a real diligence tool.

## 4. Key User Flows

## 4.1 First-time owner flow

1. Land on homepage
2. Login
3. Create workspace
4. Upload documents
5. Add one secret
6. Invite teammate
7. Run secure task

## 4.2 Builder flow

1. Accept invite
2. Open workspace
3. Ask question in secure mode
4. Receive redacted answer
5. Open receipt details

## 4.3 Reviewer flow

1. Open shared review link
2. Inspect result and receipt
3. Understand that process is controlled even without seeing raw inputs

## 5. Component Inventory

## Core components

- `WorkspaceHeader`
- `TrustStatusCard`
- `UploadDropzone`
- `DocumentTable`
- `SecureRunComposer`
- `RunOutputPanel`
- `ReceiptCard`
- `AuditTimeline`
- `SecretList`
- `MemberRoleMatrix`

## 6. Permission Visibility Matrix

```text
Feature                     Owner   Builder   Reviewer
Create workspace            yes     no        no
Upload document             yes     optional  no
See restricted raw doc      yes     no        no
Run secure workflow         yes     yes       no
See full source citations   yes     no        no
See redacted output         yes     yes       yes
Manage secrets              yes     no        no
View audit logs             yes     yes       limited
View receipts               yes     yes       yes
```

## 7. Empty States

These are important for the demo:

- No workspace yet
- No documents yet
- No secure runs yet
- Secret revoked
- Receipt unavailable

Each should guide the user to the next action.

## 8. Demo-Optimized Data Fixtures

To make the UI feel complete:

- Seed one owner account
- Seed one builder account
- Seed one reviewer account
- Seed four documents
- Seed one active secret
- Seed one revoked secret
- Seed two past runs

## 9. Visual Direction

### Tone

- serious
- research-forward
- secure but usable

### Visual cues

- cream or stone background instead of flat white
- dark ink typography
- restrained blue/green for trust states
- receipts feel like artifacts, not toasts

### Avoid

- neon cyberpunk security cliches
- generic chatbot layout
- over-animated glassmorphism
