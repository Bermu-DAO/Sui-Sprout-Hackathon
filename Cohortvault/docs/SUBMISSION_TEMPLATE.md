# CohortVault Submission Template

Use this file as the base for your public repo, demo video, deck, and accelerator-fit materials.

## 1. Public Repo README Template

```md
# CohortVault

## What it is

CohortVault is a controlled AI collaboration workspace for research and hackathon teams. It lets teams upload sensitive materials, run AI-assisted workflows inside a role-aware execution boundary, and inspect signed receipt v1 records showing how outputs were produced.

## Why it matters

Teams regularly paste private decks, API keys, and internal notes into untrusted AI tools. CohortVault replaces that workflow with:

- workspace-scoped access control
- delegated secret usage
- secure execution mode
- signed receipt v1 records
- audit trails

## Research Basis

This project is inspired by:

- NDAI Agreements
- Conditional Recall
- Props
- Narrowing the Gap between TEE Threat Models and Deployment Strategies

## Demo Flow

1. Create workspace
2. Upload private docs
3. Invite teammate with limited permissions
4. Run Secure Run task
5. Show execution receipt
6. Revoke a secret and prove later access fails

## Features

- Workspace access control
- Private document ingestion
- Retrieval-augmented AI tasks
- Secure Run mode
- Secret brokerage
- Audit log
- Redacted output modes

## Tech Stack

- Next.js
- FastAPI
- Postgres + pgvector
- local file uploads for the current build
- OpenAI chat + embeddings
- Mock signed receipt adapter

## Architecture

See `docs/ARCHITECTURE.md`.

## Local Setup

```bash
cp .env.example .env
pnpm install
python -m pip install --user -e apps/api
pnpm migrate:api
pnpm dev:api
pnpm dev:worker
pnpm dev:web
```

## Limitations

This hackathon version uses a mock signed receipt adapter by default. It is TEE-ready at the architecture level, but it does not claim remote attestation or hardware-backed confidentiality on the current path.

## Team

- Name
- Role
- Contact
```

## 2. Encode or Devpost Submission Template

Copy, edit, and submit:

### Project Name

`CohortVault`

### Tagline

A controlled AI workspace for teams handling sensitive research, strategy, and credentials.

### Problem

Research and startup teams increasingly rely on AI, but existing tools are unsafe for confidential collaboration. Sensitive decks, transcripts, and API keys are routinely pasted into untrusted tools with no provenance, no access controls, and no way to verify how outputs were produced.

### Solution

CohortVault is a controlled AI collaboration workspace. Teams upload sensitive materials into a scoped workspace, run tasks in `Secure Run` mode, and receive useful outputs plus signed receipt v1 records. Secrets are delegated through a broker instead of being copied to users or browsers. Outputs can be redacted by role, reviewer reads re-apply redaction, and all activity is captured in an audit trail.

### Research Connection

Our project builds on ideas from:

- `NDAI Agreements`: safe disclosure and AI-mediated protected workflows
- `Conditional Recall`: delegated access without revealing raw credentials
- `Props`: privacy-preserving data access for ML workflows
- `Narrowing the Gap`: making deployment trust assumptions explicit in TEE-backed systems

### What We Built

- Workspace creation and role-based access control
- Document upload plus worker-driven retrieval with OpenAI embeddings and pgvector
- Secure Run mode with OpenAI chat and signed receipt v1 records
- Secret broker for delegated access to protected resources, with optional at-rest encryption for `secretValue`
- Audit log and redacted output modes

### Why This Matters

CohortVault turns research ideas into a usable product: a secure workspace for teams who want AI leverage without sacrificing confidentiality, provenance, or collaboration control.

### Tech Stack

- Next.js
- FastAPI
- Postgres + pgvector
- local file uploads for the current build
- OpenAI chat + embeddings
- Mock signed receipt adapter

### Future Work

- Real TEE remote attestation
- Client-side encryption
- Approval workflows for sensitive runs
- Reviewer portal for investors, mentors, and diligence workflows

## 3. Demo Video Script Template

Target length: `3 to 5 minutes`

### Opening: 0:00 to 0:20

`Teams use AI on sensitive materials every day, but current workflows are unsafe. CohortVault is a controlled AI workspace for handling research, credentials, and startup materials with role-aware access and signed receipt v1 records.`

### Problem: 0:20 to 0:45

Show:

- private deck
- transcript
- secret-backed workflow

Say:

`Today, people paste confidential data into general-purpose AI tools. There is no permission boundary, no secret delegation, and no verifiable log of how outputs were produced.`

### Product walkthrough: 0:45 to 2:20

Show:

1. create workspace
2. upload files
3. invite builder
4. run secure task
5. show output
6. open receipt card

Say:

`Here the owner uploads a private pitch deck and research notes. The builder can ask a question in Secure Run mode, but only receives a redacted output. The system logs the run and generates a signed receipt v1 showing the runtime, policy hash, source scope, and verification state used for that run.`

### Secret broker moment: 2:20 to 3:00

Show:

- active secret
- secure task using secret
- revoke secret
- repeat run fails

Say:

`Secrets are delegated, not copied. When the owner revokes access, the same workflow can no longer use that secret.`

### Research tie-in: 3:00 to 3:30

`This project is inspired by NDAI Agreements, Conditional Recall, Props, and recent work on narrowing the gap between TEE threat models and deployment realities.`

### Closing: 3:30 to end

`CohortVault is not just a demo. It is a credible product path for secure AI collaboration in labs, hackathons, accelerators, and early-stage startups.`

For a runnable narration and capture order, see `docs/DEMO_SCRIPT.md`. For screenshot filenames and captions, see `docs/SCREENSHOT_SHOTLIST.md`.

## 4. Slide Deck Template

Target length: `8 to 10 slides`

### Slide 1: Title

- CohortVault
- tagline
- team names

### Slide 2: Problem

- unsafe AI collaboration
- secrets are copied everywhere
- no provenance or trust boundary

### Slide 3: Why now

- research teams use AI
- confidential startup materials are common
- TEE and secure execution tooling are becoming practical

### Slide 4: Product

- workspace
- secure run
- secret delegation
- receipts and logs

### Slide 5: Research basis

- one line per paper
- what idea was applied

### Slide 6: Architecture

- high-level system diagram
- runtime modes

### Slide 7: Demo flow

- upload
- run
- receipt
- revoke

### Slide 8: Why we win

- technical depth
- real user pain
- clear product wedge
- accelerator fit

### Slide 9: Roadmap

- TEE backend
- reviewer portal
- enterprise or startup use cases

### Slide 10: Ask

- feedback
- pilot users
- accelerator interest

## 5. Accelerator Fit Video Template

Target length: `about 2 minutes`

### Prompt structure

**Who we are**  
We are a team building secure AI collaboration infrastructure for research and startup teams.

**Why this project**  
Teams already use AI on sensitive material, but current tooling makes confidentiality and trust far too weak. We chose CohortVault because this problem is immediate, painful, and productizable.

**Why us**  
We can build across product, systems, and security. This project sits at the intersection of AI tooling, privacy, and infrastructure, which matches our technical strengths.

**Why accelerator**  
The next step is turning the hackathon prototype into a real product with a stronger TEE backend, better policy control, and early pilot design partners.

## 6. Judging Checklist

Before submission, make sure your project clearly shows:

- **Technical depth**
  - Papers are not just cited, but implemented into product logic
- **Product viability**
  - Clear user and clear pain point
- **Progress made**
  - End-to-end flow actually works
- **Accelerator fit**
  - Plausible path to startup, infrastructure product, or protocol tooling

## 7. Final Packaging Checklist

- Public repo cleaned and documented
- `.env.example` present
- Demo video exported
- Slide deck finished
- Architecture diagram included
- README includes setup and limitations
- Submission text references specific papers
- One crisp screenshot of the receipt card
- Screenshot filenames and captions match `docs/SCREENSHOT_SHOTLIST.md`
