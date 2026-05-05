# CohortVault Public Demo Deployment

This guide is for a public demo that other people can open in a browser.

The supported deployment shape for the current repo is:

- `apps/web` on Vercel
- `apps/api` on a long-running Python host such as Render or Railway
- `Postgres + pgvector` on Neon
- `apps/worker` on the same Python host as an optional second service

`Vercel only` is not enough for this repo because:

- the API is FastAPI, not a Next route handler
- the worker is a long-running polling process
- uploaded files are currently stored on local disk, not object storage

## 1. What you can demo

### Quick public demo

Use this if you mainly need a working public URL fast.

It supports:

- public access to the UI
- demo persona login
- seeded `Team Atlas` workspace
- workspace, audit, settings, and review pages

It does not fully support:

- fresh document upload followed by ingestion
- reliable reindexing across separate API and worker hosts

### Full public demo

Use this if you want to demo uploads and ingestion too.

It needs:

- the API deployed as a persistent service
- the worker deployed as a second persistent service
- shared storage, or both services on the same host with the same disk

The current codebase does not implement object storage yet, so the easiest path is:

- run API and worker on the same provider
- mount the same persistent disk path for uploads

## 2. Prerequisites

You need:

- a GitHub repo containing this project
- a Vercel account
- a Neon account
- a Render or Railway account
- an OpenAI API key if you want fresh Secure Run responses

## 3. Important behavior before you deploy

### Demo login is required

This app does not use email/password auth yet.

Viewers must:

1. open `/login`
2. choose a demo persona
3. then open the workspace

The seed data already creates:

- `Atlas Lead` as `owner`
- `Atlas Builder` as `builder`
- `Atlas Reviewer` as `reviewer`

The default seeded workspace is:

- `team-atlas`

### Do not point the browser directly at the backend

For public demo login to work reliably, the browser should stay on the Vercel domain and let Next proxy API calls to the backend.

This repo is already prepared for that:

- production web requests default to `/backend`
- `apps/web/next.config.ts` rewrites `/backend/*` to your real backend host when `COHORTVAULT_API_PROXY_TARGET` is set

Because of that, on Vercel:

- set `COHORTVAULT_API_PROXY_TARGET`
- do not set `NEXT_PUBLIC_API_BASE_URL` unless you intentionally want cross-origin requests

## 4. Step A: Create the database in Neon

1. Create a new Neon project.
2. Copy the Postgres connection string.
3. Keep SSL enabled.
4. Save the connection string for the backend environment variables.

Example shape:

```bash
postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require
```

## 5. Step B: Deploy the API

This guide uses Render because the setup is straightforward for a public demo.

### Create the API service

1. Open Render.
2. Create `New +` -> `Web Service`.
3. Connect your GitHub repo.
4. Use these settings:

```text
Name: cohortvault-api
Environment: Python
Branch: your demo branch
Root Directory: .
Build Command: pip install -e apps/api
Start Command: python -m app.migrate && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Add API environment variables

Add these in the Render dashboard:

```bash
COHORTVAULT_API_DATABASE_URL=your_neon_connection_string
COHORTVAULT_API_WEB_ORIGIN=https://your-vercel-domain.vercel.app
COHORTVAULT_API_COOKIE_SECURE=true
COHORTVAULT_API_SESSION_SIGNING_KEY=replace-with-a-random-long-secret
COHORTVAULT_API_CAPABILITY_SIGNING_KEY=replace-with-a-random-long-secret
COHORTVAULT_API_RECEIPT_SIGNING_KEY=replace-with-a-random-long-secret
COHORTVAULT_API_DATABASE_POOL_MIN_SIZE=1
COHORTVAULT_API_DATABASE_POOL_MAX_SIZE=6
COHORTVAULT_API_WORKER_POLL_INTERVAL_SECONDS=2
```

Optional but recommended:

```bash
COHORTVAULT_API_OPENAI_API_KEY=your_openai_key
COHORTVAULT_API_SECRET_ENCRYPTION_KEY=replace-with-a-random-long-secret
COHORTVAULT_API_ATTESTATION_ADAPTER=mock-signed-receipt-v1
COHORTVAULT_API_RECEIPT_RUNTIME_ID=cv-runtime-prod-demo-01
```

### Verify the API

After Render finishes deploying, open:

```text
https://your-api-host/health
```

Expected response shape:

```json
{"status":"ok","service":"CohortVault API"}
```

## 6. Step C: Deploy the worker

Skip this step if you only need the seeded demo content.

### Create the worker service

1. In Render, create `New +` -> `Background Worker`.
2. Connect the same repo.
3. Use these settings:

```text
Name: cohortvault-worker
Environment: Python
Branch: your demo branch
Root Directory: .
Build Command: pip install -e apps/api
Start Command: cd apps/worker && python -m worker.main
```

### Add worker environment variables

Use the same values as the API for:

```bash
COHORTVAULT_API_DATABASE_URL=your_neon_connection_string
COHORTVAULT_API_WORKER_POLL_INTERVAL_SECONDS=2
COHORTVAULT_API_OPENAI_API_KEY=your_openai_key
```

Important:

- if API and worker do not share the same upload disk, new uploads may fail to ingest
- for a public demo, seeded content is the safest path unless you also solve shared storage

## 7. Step D: Deploy the web app to Vercel

The Vercel project should point at `apps/web`.

This repo includes a Vercel config file at:

- `apps/web/vercel.json`

### Import the repo into Vercel

1. Open Vercel.
2. Click `Add New...` -> `Project`.
3. Import your GitHub repo.
4. In project settings, set:

```text
Framework Preset: Next.js
Root Directory: apps/web
```

If Vercel asks for install/build commands, leave the defaults unless it fails.

### Add Vercel environment variables

Set only this required variable first:

```bash
COHORTVAULT_API_PROXY_TARGET=https://your-api-host
```

Do not set this for the public demo path:

```bash
NEXT_PUBLIC_API_BASE_URL
```

If you set `NEXT_PUBLIC_API_BASE_URL` to a different origin, demo login cookies may not behave the way you expect.

### Deploy

Click `Deploy`.

After deployment, note your public frontend URL:

```text
https://your-project.vercel.app
```

## 8. Step E: Link the frontend and backend correctly

After the first Vercel deployment, update the API host settings if needed.

Make sure:

- `COHORTVAULT_API_WEB_ORIGIN` on the API exactly matches your Vercel URL
- `COHORTVAULT_API_PROXY_TARGET` on Vercel exactly matches your API URL

If either side is wrong, persona switching may fail.

After changing either value:

1. redeploy the API if you changed API env vars
2. redeploy the Vercel project if you changed Vercel env vars

## 9. Public demo URL flow

Give viewers this order:

1. `https://your-project.vercel.app/login`
2. click `Use this actor` on one persona
3. open `https://your-project.vercel.app/workspaces`
4. open `https://your-project.vercel.app/workspaces/team-atlas`

Recommended first-time viewer path:

1. sign in as `Atlas Lead`
2. open `Team Atlas`
3. inspect documents, settings, and audit
4. switch to `Atlas Builder`
5. run Secure Run if OpenAI is configured
6. switch to `Atlas Reviewer`
7. open the review page and audit trail

## 10. What to test after deployment

### Minimum test

1. Open `/login`.
2. Confirm the three personas appear.
3. Click `Use this actor`.
4. Open `/workspaces`.
5. Confirm `Team Atlas` is visible.
6. Open `/workspaces/team-atlas`.

### Secure Run test

Only do this if `COHORTVAULT_API_OPENAI_API_KEY` is configured.

1. Sign in as `Atlas Lead` or `Atlas Builder`.
2. Open `/workspaces/team-atlas/secure-run`.
3. Submit a prompt.
4. Confirm a receipt appears.

### Reviewer test

1. Sign in as `Atlas Reviewer`.
2. Open `/workspaces/team-atlas/audit`.
3. Open an existing review artifact page if one is listed.

## 11. Common failures

### The page loads but clicking persona login does nothing

Check:

- Vercel is using `apps/web` as `Root Directory`
- `COHORTVAULT_API_PROXY_TARGET` is set on Vercel
- `COHORTVAULT_API_WEB_ORIGIN` matches the Vercel URL on the API
- you did not set `NEXT_PUBLIC_API_BASE_URL` to another origin

### `/workspaces` says you must sign in

That means the session cookie was not accepted or was not returned on the next request.

Check:

- the login request is going through the Vercel site, not directly to the backend
- `COHORTVAULT_API_COOKIE_SECURE=true` in production
- the API origin and frontend origin are configured correctly

### Secure Run fails

Check:

- `COHORTVAULT_API_OPENAI_API_KEY` is set
- your OpenAI key has quota
- your API host can reach OpenAI

### Upload succeeds but indexing never finishes

Check:

- the worker is deployed and running
- the worker uses the same database as the API
- the worker can read the uploaded file path

With the current codebase, uploads are stored on local disk. If API and worker do not share the same disk, ingestion can fail.

## 12. Recommended demo mode for now

For the least risky public demo:

1. Deploy Neon
2. Deploy API
3. Deploy web to Vercel
4. Skip uploads during the demo
5. Use the seeded `Team Atlas` workspace
6. Configure OpenAI only if you need live Secure Run generation

This gives you a stable public URL quickly without depending on shared file storage.
