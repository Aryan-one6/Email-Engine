alter table public.records
  add column if not exists external_source text,
  add column if not exists external_key text;

create unique index if not exists idx_records_workspace_external_unique
on public.records(workspace_id, external_source, external_key)
where external_source is not null and external_key is not null;

create index if not exists idx_records_workspace_external_lookup
on public.records(workspace_id, external_source, external_key);
