alter table documents add column if not exists last_error text;

alter table jobs add column if not exists next_retry_at timestamptz;
alter table jobs add column if not exists last_duration_ms integer;

update jobs
set next_retry_at = coalesce(next_retry_at, created_at)
where next_retry_at is null;

create index if not exists idx_jobs_available
  on jobs(status, next_retry_at, created_at);
