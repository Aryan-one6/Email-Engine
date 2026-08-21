import type { AppSession as Session } from './supabaseClient';
import type { CRMType, WorkspaceRole } from './types';
import { getSupabaseClient } from './supabaseClient';

export type EmailSenderProvider = 'google' | 'microsoft' | 'smtp';

export interface AccountProfile {
  id: string;
  email: string | null;
  full_name: string | null;
}

export interface AccountWorkspace {
  id: string;
  name: string;
  slug: string;
  crm_type: CRMType;
  role: WorkspaceRole;
  can_manage: boolean;
}

export interface WorkspaceEmailSender {
  id: string;
  provider: EmailSenderProvider;
  sender_email: string;
  sender_name: string | null;
  status: 'pending' | 'connected' | 'failed' | 'disabled';
  is_default: boolean;
  is_active: boolean;
  health_status: 'unknown' | 'healthy' | 'degraded' | 'failed';
  last_health_error: string | null;
  connected_at: string | null;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_username: string | null;
  smtp_use_tls: boolean | null;
}

export interface WorkspaceEmailAutomation {
  workspace_id: string;
  is_enabled: boolean;
  timezone: string;
  stop_on_reply: boolean;
}

export interface WorkspaceEmailSequenceStep {
  id: string;
  workspace_id: string;
  step_order: number;
  delay_hours: number;
  subject_template: string;
  body_template: string;
  is_active: boolean;
}

export interface AccountSettingsResponse {
  profile: AccountProfile;
  workspace: AccountWorkspace;
  senders: WorkspaceEmailSender[];
  automation: WorkspaceEmailAutomation;
  sequence_steps: WorkspaceEmailSequenceStep[];
  tokens: string[];
}

export interface AccountSettingsUpdatePayload {
  workspace_id: string;
  profile?: {
    full_name?: string;
  };
  workspace?: {
    name?: string;
    slug?: string;
    crm_type?: CRMType;
  };
  sender?: {
    id?: string;
    provider?: EmailSenderProvider;
    sender_email?: string;
    sender_name?: string | null;
    is_active?: boolean;
    is_default?: boolean;
    smtp?: {
      host?: string;
      port?: number;
      username?: string;
      password?: string;
      use_tls?: boolean;
    };
  };
  automation?: {
    is_enabled?: boolean;
    timezone?: string;
  };
  sequence_steps?: Array<{
    step_order: number;
    delay_hours: number;
    subject_template: string;
    body_template: string;
    is_active?: boolean;
  }>;
}

interface OAuthStartResponse {
  authorize_url: string;
  state: string;
  expires_at: string;
  provider: EmailSenderProvider;
}

function getAuthHeaders(session: Session) {
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function directAccountSettings(name: string, session: Session, body: unknown) {
  if (name !== 'account-settings-get' && name !== 'account-settings-update') return null;
  const client = getSupabaseClient();
  const payload = (body ?? {}) as AccountSettingsUpdatePayload & { workspace_id: string };
  const workspaceId = payload.workspace_id;
  if (!workspaceId) throw new Error('workspace_id is required.');
  const now = new Date().toISOString();

  if (name === 'account-settings-update') {
    if (payload.profile?.full_name !== undefined) {
      const result = await client.from('profiles').upsert({ id: session.user.id, full_name: payload.profile.full_name, updated_at: now }).eq('id', session.user.id);
      if (result.error) throw new Error(result.error.message);
    }
    if (payload.workspace) {
      const result = await client.from('workspaces').update({ ...payload.workspace, updated_at: now }).eq('id', workspaceId);
      if (result.error) throw new Error(result.error.message);
    }
    if (payload.automation) {
      const result = await client.from('workspace_email_automation_settings').upsert({ workspace_id: workspaceId, ...payload.automation, updated_by: session.user.id, updated_at: now }).eq('workspace_id', workspaceId);
      if (result.error) throw new Error(result.error.message);
    }
    if (payload.sender) {
      const senderPayload = { ...payload.sender, workspace_id: workspaceId, updated_by: session.user.id, updated_at: now } as Record<string, unknown>;
      delete senderPayload.id;
      delete senderPayload.smtp;
      const result = payload.sender.id
        ? await client.from('workspace_email_senders').update(senderPayload).eq('id', payload.sender.id)
        : await client.from('workspace_email_senders').insert({ id: crypto.randomUUID(), ...senderPayload, provider: payload.sender.provider ?? 'smtp', sender_email: payload.sender.sender_email ?? session.user.email, status: 'pending', health_status: 'unknown' });
      if (result.error) throw new Error(result.error.message);
    }
    if (payload.sequence_steps) {
      const existing = await client.from('workspace_email_sequence_steps').select('id').eq('workspace_id', workspaceId).limit(100);
      if (existing.error) throw new Error(existing.error.message);
      for (const step of Array.isArray(existing.data) ? existing.data : []) {
        const removed = await client.from('workspace_email_sequence_steps').delete().eq('id', step.id);
        if (removed.error) throw new Error(removed.error.message);
      }
      for (const step of payload.sequence_steps) {
        const result = await client.from('workspace_email_sequence_steps').insert({ id: crypto.randomUUID(), workspace_id: workspaceId, ...step, created_by: session.user.id, updated_by: session.user.id, created_at: now, updated_at: now });
        if (result.error) throw new Error(result.error.message);
      }
    }
  }

  const [profile, workspace, senders, automation, sequenceSteps] = await Promise.all([
    client.from('profiles').select('*').eq('id', session.user.id).maybeSingle(),
    client.from('workspaces').select('*').eq('id', workspaceId).single(),
    client.from('workspace_email_senders').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    client.from('workspace_email_automation_settings').select('*').eq('workspace_id', workspaceId).maybeSingle(),
    client.from('workspace_email_sequence_steps').select('*').eq('workspace_id', workspaceId).order('step_order', { ascending: true }),
  ]);
  const firstError = [profile, workspace, senders, automation, sequenceSteps].find((result) => result.error)?.error;
  if (firstError) throw new Error(firstError.message);
  if (!workspace.data) throw new Error('Workspace record could not be found for this membership. Please sign out and sign in again.');
  const workspaceRow = workspace.data as Record<string, unknown>;
  return {
    profile: { id: session.user.id, email: session.user.email, full_name: profile.data?.full_name ?? session.user.name },
    workspace: { id: workspaceId, name: String(workspaceRow.name), slug: String(workspaceRow.slug), crm_type: workspaceRow.crm_type as CRMType, role: 'owner', can_manage: true },
    senders: senders.data ?? [],
    automation: automation.data ?? { workspace_id: workspaceId, is_enabled: false, timezone: 'UTC', stop_on_reply: false },
    sequence_steps: sequenceSteps.data ?? [],
    tokens: [],
  } satisfies AccountSettingsResponse;
}

async function invoke<TResponse>(name: string, session: Session, body?: unknown) {
  const direct = await directAccountSettings(name, session, body);
  if (direct) return direct as TResponse;
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke<TResponse>(name, {
    body: body as Record<string, unknown> | undefined,
    headers: getAuthHeaders(session),
  });

  if (error) {
    throw new Error(error.message || 'Request failed.');
  }

  return data as TResponse;
}

export async function getAccountSettings(session: Session, workspaceId: string) {
  return invoke<AccountSettingsResponse>('account-settings-get', session, {
    workspace_id: workspaceId,
  });
}

export async function updateAccountSettings(session: Session, payload: AccountSettingsUpdatePayload) {
  return invoke<AccountSettingsResponse>('account-settings-update', session, payload);
}

export async function startEmailOAuth(
  session: Session,
  payload: {
    workspace_id: string;
    provider: 'google' | 'microsoft';
    return_path?: string;
  },
) {
  return invoke<OAuthStartResponse>('email-oauth-start', session, payload);
}
