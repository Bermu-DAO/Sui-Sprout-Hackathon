# Human Tasks

## Product and Submission

- Record the final demo video with all three actor views: owner, builder, reviewer.
- Capture final screenshots for landing, documents, secure run, settings, audit, and reviewer artifact.
- Finalize the pitch narrative so the demo explicitly calls out: session switching, worker-based ingestion, secret revocation failure, and receipt persistence.
- Convert the current README and this repo state into the exact public submission copy required by Encode.

## Security and Infra

- Replace demo session cookies with a real auth provider if the project continues after the hackathon.
- Stand up a real Postgres + pgvector instance in the target environment and run `pnpm migrate:api`.
- On the current machine, `python -m app.migrate` against `localhost:5432` times out. Start the compose `postgres` service or point `COHORTVAULT_API_DATABASE_URL` at a reachable instance before validating the Postgres path.
- Neon validation now works against the remote instance. The repo also includes `python scripts/cleanup_generated_workspaces.py` for clearing old `research-guild-*` smoke-test workspaces from a shared branch.
- Replace local file storage with object storage.
- Move secret references into a real encrypted storage path or external vault.
- Decide whether a real TEE integration is feasible and, if yes, replace the mock signed receipt adapter with true TEE-backed evidence.
- Run one live API + worker pass against that Postgres instance and confirm migrations, ingestion, retrieval, and receipts all work on the Postgres path.

## Data and Retrieval

- Evaluate real embedding generation and pgvector retrieval quality on the actual demo corpus.
- Add document parsing hardening for PDFs, decks, and malformed files.
- Create a better demo dataset with clean, judge-friendly citations and redaction examples.
- Add retrieval quality checks so prompt wording changes do not break the demo path.

## Engineering

- Add automated tests around role permissions, session switching, worker ingestion, and revoke-deny behavior.
- Add a CI path that starts Postgres, runs migrations, and executes the smoke test against the Postgres backend.
- Tune connection-pool sizing for production traffic. The current pool removes the worst Neon latency penalty, but it is still a single-process pool with no request-level metrics.
- Add observability for worker failures and ingestion latency.
- Review the frontend for better loading states and clearer permission-denied messaging.
- Clean up any remaining documentation drift between `PRD.md`, `ARCHITECTURE.md`, and implemented behavior.
- Keep Postgres and pgvector provisioning healthy across local, CI, and deployment paths. SQLite is no longer supported.
