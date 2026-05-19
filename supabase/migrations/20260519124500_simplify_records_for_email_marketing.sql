begin;

-- Disable dynamic CRM fields for the records entity so the product stays lead-focused.
update public.custom_field_definitions
set
  is_active = false,
  is_required = false,
  updated_at = timezone('utc', now())
where entity_type = 'record'
  and coalesce(is_system, false) = false;

-- Remove pipeline-driven workflow data from leads.
update public.records
set
  pipeline_id = null,
  stage_id = null,
  priority = null,
  updated_at = timezone('utc', now())
where record_type = 'lead';

delete from public.pipelines
where entity_type = 'record';

-- Normalize legacy CRM statuses into email-marketing lead statuses.
update public.records
set status = case
  when status in ('open', 'qualified') then 'new'
  when status = 'nurturing' then 'email_sent'
  when status = 'closed' then 'not_interested'
  else status
end
where status in ('open', 'qualified', 'nurturing', 'closed');

alter table public.records
drop constraint if exists records_status_check;

alter table public.records
add constraint records_status_check
check (
  status is null
  or status in ('new', 'email_sent', 'mobile_contacted', 'replied', 'interested', 'not_interested')
);

create or replace function public.sync_record_status_from_stage()
returns trigger
language plpgsql
as $$
declare
  stage_closed boolean;
begin
  if new.stage_id is null then
    if new.status is null or btrim(new.status) = '' then
      new.status = 'new';
    elsif new.status = 'open' then
      new.status = 'new';
    elsif new.status = 'closed' then
      new.status = 'not_interested';
    end if;

    return new;
  end if;

  select ps.is_closed
  into stage_closed
  from public.pipeline_stages ps
  where ps.id = new.stage_id
    and ps.workspace_id = new.workspace_id
  limit 1;

  if coalesce(stage_closed, false) then
    if new.status is null or btrim(new.status) = '' or new.status in ('open', 'closed') then
      new.status = 'not_interested';
    end if;
  elsif new.status is null or btrim(new.status) = '' or new.status in ('open', 'closed') then
    new.status = 'new';
  end if;

  return new;
end;
$$;

create or replace function public.sync_records_for_stage_closure()
returns trigger
language plpgsql
as $$
begin
  if old.is_closed is distinct from new.is_closed then
    update public.records r
    set status = case
      when new.is_closed then 'not_interested'
      when r.status = 'not_interested' then 'new'
      else r.status
    end
    where r.workspace_id = new.workspace_id
      and r.stage_id = new.id;
  end if;

  return new;
end;
$$;

commit;
