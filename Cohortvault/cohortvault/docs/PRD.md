# CohortVault PRD

## 1. Product Summary

**Product name:** CohortVault

**Category:** Privacy-preserving AI collaboration workspace

**Hackathon framing:** A secure workspace for research and hackathon teams to use AI on sensitive materials without leaking raw inputs, credentials, or decision history.

**Primary promise:** Teams can collaborate with AI on private content inside a controlled execution boundary with role-based access, delegated secrets, and verifiable logs.

## 2. Problem

Research-heavy teams need AI help, but current workflows are unsafe:

- Team members paste private material into uncontrolled tools
- API keys and cloud credentials are shared through chat
- There is no proof of how an agent used a document
- Sensitive context is overexposed to teammates who only need outputs
- Compliance, trust, and provenance are nearly nonexistent

For Shape Rotator specifically, teams may work with:

- Private pitch drafts
- Research notes and annotated papers
- Internal strategy docs
- Shared API keys
- Meeting transcripts
- Early-stage startup plans

## 3. Target Users

### Primary user

Small technical teams working on research-driven products during hackathons, accelerators, or labs.

### Secondary user

Research leads and founders who want AI leverage without giving every teammate access to all underlying material.

### Tertiary user

Judges, mentors, or investors who need evidence of process integrity without viewing confidential raw data.

## 4. User Personas

### Persona A: Team Lead

- Owns the workspace
- Uploads private materials
- Sets access rules
- Wants usable outputs, not security theater

### Persona B: Builder

- Needs summaries, action items, and implementation plans
- Does not need access to the full raw corpus
- Wants quick answers with clear provenance

### Persona C: Reviewer

- Needs confidence that the system respects privacy boundaries
- Wants auditability and evidence of secure execution

## 5. Product Goals

### Hackathon goals

- Deliver a convincing end-to-end secure AI workflow
- Demonstrate clear technical depth tied to TEE and privacy ideas
- Show a product that could continue into an accelerator

### Product goals

- Reduce unsafe sharing of sensitive files and secrets
- Make agent usage reviewable and permissioned
- Separate raw access from output access
- Make secure AI collaboration feel easier than unsafe alternatives

## 6. Non-goals for MVP

- Building a custom foundation model
- Full enterprise DLP
- Multi-region production deployment
- Perfect cryptographic privacy guarantees for every component
- End-user billing and payments

## 7. Core Value Propositions

1. **Private by default**  
   Documents and secrets stay scoped to a workspace and permission model.

2. **Delegated, not duplicated**  
   Teammates and agents get time-bounded capabilities instead of copied secrets.

3. **Attested execution story**  
   The run shows where it executed, what policy applied, and what resources were used.

4. **Useful outputs without overexposure**  
   Builders can get summaries and recommendations without seeing all raw source content.

5. **Auditability for trust**  
   Every run creates a receipt: who ran it, what it touched, and what it produced.

## 8. MVP Scope

### In scope

- Email or magic-link login
- Workspace creation
- Role-based access control
- File upload
- Document indexing
- AI chat with retrieval
- Secure Run mode
- Execution receipt / attestation card
- Audit log
- Secret delegation for one or two demo integrations
- Output redaction controls

### Stretch scope

- Real TEE remote attestation
- Policy DSL
- Multi-workspace search
- Judge/reviewer share links
- Encrypted client-side upload
- Approval workflow for sensitive runs

## 9. User Stories

### Workspace and access

- As a team lead, I can create a workspace for my project.
- As a team lead, I can invite teammates and assign roles.
- As a builder, I can see only the documents and tools I am allowed to use.

### Knowledge ingestion

- As a team lead, I can upload PDFs, markdown notes, and slide decks.
- As a user, I can ask questions against uploaded materials.

### Secure execution

- As a user, I can request an AI task in Secure Run mode.
- As a user, I can see whether the run used a protected policy.
- As a reviewer, I can inspect a receipt showing runtime identity, inputs used, and policies applied.

### Secret delegation

- As a team lead, I can attach a secret or external tool token to a workspace.
- As a user, I can run a task that uses that secret without ever seeing the raw key.
- As a team lead, I can revoke the secret and invalidate future runs.

### Output control

- As a team lead, I can decide whether a role sees raw citations, redacted snippets, or summary-only results.

## 10. Functional Requirements

### FR1: Authentication

- Users can sign in and sign out
- Sessions expire safely
- Invitations are workspace-scoped

### FR2: Workspace management

- Create workspace
- Edit workspace metadata
- Invite/remove members
- Assign roles

### FR3: Document management

- Upload files
- View file metadata
- Delete files
- Trigger ingestion

### FR4: Retrieval and AI

- Ask questions over workspace data
- Cite source documents
- Show confidence or provenance metadata

### FR5: Secure Run mode

- User can choose `Standard` or `Secure Run`
- Secure Run returns a signed execution receipt
- UI shows policy status and environment metadata

### FR6: Secret delegation

- Team lead stores encrypted secret reference
- Agent may use secret through a broker
- Secret usage is logged

### FR7: Audit log

- Log uploads
- Log membership changes
- Log queries and runs
- Log secret access events
- Log revocations

### FR8: Role-based output filtering

- Owner sees raw citations
- Builder sees redacted snippets or summary-only mode
- Reviewer sees receipts and selected outputs only

## 11. Non-functional Requirements

- P95 AI response under 15s for a normal query in demo mode
- Upload and indexing feedback within 30s for small PDFs
- Every secure run produces a durable receipt
- Secrets never appear in frontend responses or browser logs
- Files and outputs are workspace-isolated

## 12. Trust Model

For the hackathon, CohortVault should make explicit trust claims:

- We trust the server to enforce policy in MVP mode
- We improve trust with signed runtime manifests and execution receipts
- We optionally replace the execution environment with a real TEE provider in stretch mode
- We do not claim perfect confidentiality if the operator is fully malicious unless real TEE support is enabled

## 13. Success Metrics

### Hackathon metrics

- Demo completes end-to-end without manual patching
- Judges understand the user and security story in under 90 seconds
- Public repo includes clear setup and architecture docs
- Submission shows one concrete secure workflow, not just UI mocks

### Product metrics

- Time to first useful answer under 5 minutes after workspace creation
- Fewer than 3 clicks from dashboard to secure run
- Full provenance visible for 100 percent of secure runs

## 14. Risks

- Real TEE integration may be too heavy for hackathon timing
- Over-scoping into enterprise security may dilute the demo
- RAG quality may be poor if ingestion is weak
- Secret handling can become dangerous if implemented casually

## 15. Mitigations

- Build a clean MVP that works without real TEE
- Use an explicit `TEE-ready` architecture, not a fake claim
- Keep ingestion limited to PDF and markdown
- Use server-side secret brokerage instead of exposing any provider key

## 16. Demo Scenario

### Scenario name

`Private pitch and research review`

### Flow

1. Create workspace `Team Atlas`
2. Upload:
   - one research paper summary
   - one private pitch deck
   - one transcript
3. Invite a builder with limited permissions
4. Ask:
   - `Summarize the strongest product wedge from the uploaded materials`
5. Run:
   - `Generate investor risk memo using Secure Run`
6. Show:
   - execution receipt
   - policy used
   - documents accessed
   - redacted output for builder role
7. Revoke secret
8. Re-run secure workflow and show denial

## 17. MVP Prioritization

### Must-have

- Auth
- Workspace
- Upload
- Retrieval
- Secure Run
- Audit log
- Secret broker

### Nice-to-have

- Reviewer portal
- Granular output redaction modes
- Live attestation verification UI

### Cut if needed

- Realtime collaboration
- Advanced analytics
- Multi-agent orchestration
