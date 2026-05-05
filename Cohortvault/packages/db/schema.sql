-- Target database schema for the post-hackathon upgrade path.
-- The current local submission build uses sqlite with the same core entities.

create extension if not exists vector;

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  owner_id uuid not null references users(id),
  secure_mode_default boolean not null default false,
  created_at timestamptz not null default now(),
  last_secure_run_at timestamptz
);

create table if not exists workspace_members (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null check (role in ('owner', 'builder', 'reviewer')),
  status text not null default 'active',
  invited_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  filename text not null,
  storage_path text not null,
  mime_type text not null,
  visibility text not null check (visibility in ('workspace', 'restricted')),
  uploaded_by uuid not null references users(id),
  status text not null default 'uploaded',
  chunk_count integer not null default 0,
  size_bytes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists document_chunks (
  id uuid primary key,
  document_id uuid not null references documents(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  embedding vector(1536)
);

create table if not exists runs (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid not null references users(id),
  prompt text not null,
  answer text,
  status text not null check (status in ('completed', 'denied')),
  output_mode text not null check (output_mode in ('summary_only', 'redacted', 'full')),
  selected_secret_id uuid,
  selected_secret_name text,
  denial_reason text,
  created_at timestamptz not null default now()
);

create table if not exists run_sources (
  id uuid primary key,
  run_id uuid not null references runs(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  document_name text not null,
  visibility text not null,
  snippet text not null,
  redacted boolean not null default true
);

create table if not exists secrets (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  provider text not null,
  scope text not null,
  encrypted_blob text not null,
  created_by uuid not null references users(id),
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists run_receipts (
  run_id uuid primary key references runs(id) on delete cascade,
  adapter_type text not null,
  runtime_id text not null,
  policy_hash text not null,
  sources_touched integer not null,
  secret_accessed boolean not null default false,
  receipt_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists audit_events (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid not null references users(id),
  actor_email text not null,
  event_type text not null,
  detail text not null,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key,
  job_type text not null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);
