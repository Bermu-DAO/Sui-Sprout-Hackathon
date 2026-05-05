create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  created_at timestamptz not null
);

create table if not exists workspaces (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null,
  owner_id text not null references users(id),
  secure_mode_default boolean not null default true,
  created_at timestamptz not null,
  last_secure_run_at timestamptz
);

create table if not exists workspace_members (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  user_id text not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'builder', 'reviewer')),
  status text not null,
  invited_by text not null references users(id),
  created_at timestamptz not null,
  unique(workspace_id, user_id)
);

create table if not exists documents (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  filename text not null,
  type text not null,
  mime_type text not null,
  visibility text not null check (visibility in ('workspace', 'restricted')),
  uploaded_by text not null references users(id),
  status text not null,
  created_at timestamptz not null,
  storage_path text not null,
  size_bytes integer not null default 0,
  chunk_count integer not null default 0
);

create table if not exists document_chunks (
  id text primary key,
  document_id text not null references documents(id) on delete cascade,
  workspace_id text not null references workspaces(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(32) not null
);

create table if not exists secrets (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  provider text not null,
  scope text not null,
  created_by text not null references users(id),
  created_at timestamptz not null,
  last_used_at timestamptz,
  revoked_at timestamptz
);

create table if not exists runs (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  actor_user_id text not null references users(id),
  prompt text not null,
  status text not null,
  output_mode text not null,
  created_at timestamptz not null,
  answer text,
  selected_secret_id text,
  selected_secret_name text,
  denial_reason text
);

create table if not exists run_sources (
  id text primary key,
  run_id text not null references runs(id) on delete cascade,
  document_id text not null references documents(id) on delete cascade,
  document_name text not null,
  visibility text not null,
  snippet text not null,
  redacted boolean not null default true
);

create table if not exists run_receipts (
  run_id text primary key references runs(id) on delete cascade,
  adapter_type text not null,
  runtime_id text not null,
  policy_hash text not null,
  sources_touched integer not null,
  secret_accessed boolean not null,
  signed_at timestamptz not null
);

create table if not exists audit_events (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  actor_user_id text not null references users(id),
  actor_email text not null,
  event_type text not null,
  detail text not null,
  created_at timestamptz not null
);

create table if not exists jobs (
  id text primary key,
  job_type text not null,
  workspace_id text not null references workspaces(id) on delete cascade,
  document_id text references documents(id) on delete cascade,
  payload_json jsonb not null,
  status text not null,
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null,
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_workspace_members_workspace on workspace_members(workspace_id);
create index if not exists idx_documents_workspace on documents(workspace_id);
create index if not exists idx_document_chunks_workspace on document_chunks(workspace_id);
create index if not exists idx_secrets_workspace on secrets(workspace_id);
create index if not exists idx_runs_workspace on runs(workspace_id);
create index if not exists idx_audit_events_workspace on audit_events(workspace_id, created_at desc);
create index if not exists idx_jobs_status on jobs(status, created_at asc);
create index if not exists idx_document_chunks_embedding on document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
