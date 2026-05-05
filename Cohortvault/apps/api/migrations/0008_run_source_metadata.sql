alter table run_sources add column if not exists source_rank integer;
alter table run_sources add column if not exists chunk_index integer;
alter table run_sources add column if not exists distance double precision;

create index if not exists idx_run_sources_run_rank
  on run_sources(run_id, source_rank);
