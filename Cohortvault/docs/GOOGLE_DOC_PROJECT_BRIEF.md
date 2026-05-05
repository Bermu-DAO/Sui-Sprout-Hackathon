# CohortVault Project Brief

## Project Name

CohortVault

## Tagline

A controlled AI workspace for sensitive research, strategy, and credentials.

## Project Overview

CohortVault is a role-aware AI collaboration workspace designed for teams working with sensitive materials. Instead of pasting confidential documents and credentials into general-purpose AI tools, users work inside a controlled environment with delegated secrets, signed receipt records, and reviewable audit history.

The product is built around three personas:

- Owner: manages members, documents, and delegated secrets
- Builder: runs secure workflows over indexed workspace data
- Reviewer: inspects outputs, receipts, and audit trails with viewer-safe redaction

## What the Product Does

- Supports role-aware access control across owner, builder, and reviewer personas
- Lets teams upload and index workspace documents
- Runs Secure Run workflows over grounded workspace context
- Uses delegated server-side secrets so the browser never receives raw secret values
- Produces signed receipt v1 records for workflow execution
- Preserves audit history across uploads, runs, secret usage, and revocation
- Re-applies redaction for reviewer-safe artifact inspection

## Technical Stack

- Next.js frontend
- FastAPI backend
- Python worker
- Postgres with pgvector
- OpenAI chat and embeddings

## Trust Model

CohortVault is TEE-ready, but the current deployed version does not claim full hardware-backed enclave execution. The current receipt system provides application-level signed evidence and durable execution metadata. This makes the current build honest, inspectable, and ready for future integration with real TEE-backed execution.

## Why This Matters

AI workflows increasingly touch private research, internal strategy, investor materials, and credentials. Most current workflows are unsafe by default. CohortVault turns privacy and security ideas into a usable product workflow that people can actually inspect, test, and reason about.

## Public Demo Links

### Login Page

https://cohortvault-an-sus-projects.vercel.app/login

### Live Demo Workspace Index

https://cohortvault-an-sus-projects.vercel.app/workspaces

### Demo Workspace

https://cohortvault-an-sus-projects.vercel.app/workspaces/team-atlas

## Demo Instructions

1. Open the login page.
2. Choose one of the three personas: Atlas Lead, Atlas Builder, or Atlas Reviewer.
3. Open the workspace index or go directly to the Team Atlas workspace.
4. Review documents, secure runs, receipts, and audit history.

## Code Repository

https://github.com/SU-AN-coder/Cohortvault

## Recommended Short Description

CohortVault is a controlled AI workspace for sensitive documents, delegated secrets, and reviewable secure workflows. Teams can manage role-based access, run grounded AI tasks, and inspect signed receipt records plus audit trails without exposing raw secrets to the browser.
