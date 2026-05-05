# CohortVault Architecture Diagram

```mermaid
flowchart LR
    U["User browser"] --> W["Next.js web"]
    W --> S["Session cookie"]
    W --> A["FastAPI API"]
    A --> DB["Postgres + pgvector"]
    A --> FS["local uploads/"]
    A --> J["jobs table"]
    J --> Q["worker loop"]
    Q --> FS
    Q --> DB
    A --> R["Secure Run service"]
    R --> DB
    R --> Receipts["run_receipts"]
    R --> Audit["audit_events"]
```

## Submission Notes

- The default implementation now targets Postgres with pgvector for persistence and retrieval.
- The ingestion boundary now matches the architecture docs more closely: API writes documents and queue entries, worker performs extraction and indexing.
- Session switching is cookie-backed, so owner/builder/reviewer views are no longer all the same backend user.
- The repo still keeps sqlite as a smoke-test fallback for machines without a live Postgres service.
- The remaining upgrade path is local uploads -> object storage, demo auth -> real auth, signed receipt -> real TEE adapter.
