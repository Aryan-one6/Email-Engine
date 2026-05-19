-- Remove legacy voice/Telnyx stack from Email-Engine.
-- Keep only email/import/records/workspace backend surfaces.

drop table if exists public.voice_processing_jobs cascade;
drop table if exists public.voice_call_action_runs cascade;
drop table if exists public.voice_call_artifacts cascade;
drop table if exists public.voice_call_events cascade;
drop table if exists public.voice_action_policies cascade;
drop table if exists public.voice_calls cascade;
drop table if exists public.voice_agent_field_mappings cascade;
drop table if exists public.voice_agent_phone_bindings cascade;
drop table if exists public.voice_agents cascade;
drop table if exists public.workspace_phone_numbers cascade;

drop function if exists public.claim_due_voice_processing_jobs(integer, timestamptz);

drop index if exists public.idx_workspaces_voice_system_actor_user_id;

alter table if exists public.workspaces
  drop column if exists voice_system_actor_user_id;
