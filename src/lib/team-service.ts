import type { AppSession as Session } from './supabaseClient';
import type { WorkspaceRole } from './types';
import { getSupabaseClient } from './supabaseClient';

export interface WorkspaceTeamMember {
  user_id: string;
  role: WorkspaceRole;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

export interface WorkspaceTeamInvite {
  id: string;
  invited_email: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
}

export interface WorkspaceInviteEmailDelivery {
  status: 'sent' | 'failed';
  provider: 'workspace_sender' | 'appwrite_auth' | 'none';
  message?: string;
}

export interface WorkspaceInviteResponse {
  invite: WorkspaceTeamInvite;
  invite_link?: string | null;
  reused_existing?: boolean;
  email_delivery?: WorkspaceInviteEmailDelivery;
}

export interface WorkspaceTeamResponse {
  members: WorkspaceTeamMember[];
  invites: WorkspaceTeamInvite[];
}

function getAuthHeaders(session: Session) {
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function invoke<TResponse>(name: string, session: Session, body?: unknown) {
  const client = getSupabaseClient();

  if (name === 'workspace-team-get') {
    const payload = body as { workspace_id: string };
    const [memberResult, inviteResult] = await Promise.all([
      client.from('workspace_members').select('*').eq('workspace_id', payload.workspace_id).order('created_at', { ascending: true }),
      client.from('workspace_member_invites').select('*').eq('workspace_id', payload.workspace_id).order('created_at', { ascending: false }),
    ]);
    if (memberResult.error || inviteResult.error) throw new Error(memberResult.error?.message || inviteResult.error?.message || 'Unable to load workspace team.');
    const members = await Promise.all((Array.isArray(memberResult.data) ? memberResult.data : []).map(async (member) => {
      const profile = await client.from('profiles').select('full_name').eq('id', member.user_id).maybeSingle();
      return {
        user_id: String(member.user_id),
        role: (member.role ?? 'agent') as WorkspaceRole,
        full_name: profile.data?.full_name ?? (member.user_id === session.user.id ? session.user.name : null),
        email: member.user_id === session.user.id ? session.user.email : null,
        created_at: String(member.created_at ?? new Date().toISOString()),
      } satisfies WorkspaceTeamMember;
    }));
    return { members, invites: (Array.isArray(inviteResult.data) ? inviteResult.data : []) as WorkspaceTeamInvite[] } as TResponse;
  }

  if (name === 'workspace-team-invite') {
    const payload = body as { workspace_id: string; invited_email: string; role?: WorkspaceRole; resend_existing?: boolean };
    const invitedEmail = payload.invited_email.trim().toLowerCase();
    const existing = await client.from('workspace_member_invites').select('*').eq('workspace_id', payload.workspace_id).eq('invited_email', invitedEmail).eq('status', 'pending').limit(1).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data && !payload.resend_existing) {
      return {
        invite: existing.data,
        reused_existing: true,
        invite_link: typeof window !== 'undefined' ? `${window.location.origin}/signup?invite=1&email=${encodeURIComponent(invitedEmail)}` : null,
        email_delivery: { status: 'failed', provider: 'none', message: 'Invite email is not configured. Share the invite link manually.' },
      } as TResponse;
    }
    const inviteResult = existing.data
      ? await client.from('workspace_member_invites').update({ updated_at: new Date().toISOString() }).eq('id', existing.data.id).select().single()
      : await client.from('workspace_member_invites').insert({ id: crypto.randomUUID(), workspace_id: payload.workspace_id, invited_email: invitedEmail, role: payload.role ?? 'agent', status: 'pending', invited_by: session.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (inviteResult.error || !inviteResult.data) throw new Error(inviteResult.error?.message || 'Unable to create workspace invite.');
    return {
      invite: inviteResult.data,
      reused_existing: Boolean(existing.data),
      invite_link: typeof window !== 'undefined' ? `${window.location.origin}/signup?invite=1&email=${encodeURIComponent(invitedEmail)}` : null,
      email_delivery: { status: 'failed', provider: 'none', message: 'Invite email is not configured. Share the invite link manually.' },
    } as TResponse;
  }

  if (name === 'workspace-team-remove') {
    const payload = body as { workspace_id: string; user_id?: string; invite_id?: string };
    const result = payload.invite_id
      ? await client.from('workspace_member_invites').update({ status: 'revoked', revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', payload.invite_id)
      : await client.from('workspace_members').delete().eq('workspace_id', payload.workspace_id).eq('user_id', payload.user_id);
    if (result.error) throw new Error(result.error.message);
    return { success: true, target: payload.invite_id ? 'invite' : 'member' } as TResponse;
  }

  const { data, error } = await client.functions.invoke<TResponse>(name, {
    body: body as Record<string, unknown> | undefined,
    headers: getAuthHeaders(session),
  });

  if (error) {
    throw new Error(error.message || 'Request failed.');
  }

  return data as TResponse;
}

export async function getWorkspaceTeam(session: Session, workspaceId: string) {
  return invoke<WorkspaceTeamResponse>('workspace-team-get', session, {
    workspace_id: workspaceId,
  });
}

export async function inviteWorkspaceAgent(
  session: Session,
  workspaceId: string,
  invitedEmail: string,
  options?: { resendExisting?: boolean },
) {
  return invoke<WorkspaceInviteResponse>('workspace-team-invite', session, {
    workspace_id: workspaceId,
    invited_email: invitedEmail,
    role: 'agent',
    resend_existing: options?.resendExisting ?? false,
  });
}

export async function removeWorkspaceMember(session: Session, workspaceId: string, userId: string) {
  return invoke<{ success: boolean; target: 'member' | 'invite' }>('workspace-team-remove', session, {
    workspace_id: workspaceId,
    user_id: userId,
  });
}

export async function revokeWorkspaceInvite(session: Session, workspaceId: string, inviteId: string) {
  return invoke<{ success: boolean; target: 'member' | 'invite' }>('workspace-team-remove', session, {
    workspace_id: workspaceId,
    invite_id: inviteId,
  });
}
