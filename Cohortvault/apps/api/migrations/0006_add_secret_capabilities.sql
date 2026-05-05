create table if not exists secret_capabilities (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  secret_id text not null references secrets(id) on delete cascade,
  issued_to_user_id text not null references users(id),
  scope text not null,
  token_hash text not null unique,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_secret_capabilities_secret on secret_capabilities(secret_id, expires_at desc);
create index if not exists idx_secret_capabilities_workspace on secret_capabilities(workspace_id, expires_at desc);
