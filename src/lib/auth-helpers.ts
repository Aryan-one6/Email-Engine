import type { AppSession as Session, AppUser as User } from './supabaseClient';
import type {
  CompleteSignupPayload,
  CompleteSignupResponse,
  WorkspaceLookupResponse,
  WorkspaceSummary,
} from './types';
import { getSupabaseClient } from './supabaseClient';

const WORKSPACE_CACHE_TTL_MS = 5 * 60 * 1000;

interface WorkspaceCacheEntry {
  fetchedAt: number;
  promise?: Promise<WorkspaceSummary | null>;
  workspace: WorkspaceSummary | null;
}

const workspaceCache = new Map<string, WorkspaceCacheEntry>();

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getRowId(row: Record<string, unknown> | null | undefined, label: string) {
  const id = normalizeString(row?.id) || normalizeString(row?.$id);
  if (!id) throw new Error(`${label} was created without an Appwrite row ID.`);
  return id;
}

function isWorkspaceCacheFresh(entry: WorkspaceCacheEntry | undefined) {
  if (!entry) {
    return false;
  }

  return Date.now() - entry.fetchedAt < WORKSPACE_CACHE_TTL_MS;
}

export function getCachedUserWorkspace(userId: string) {
  return workspaceCache.get(userId)?.workspace;
}

export function clearCachedUserWorkspace(userId?: string) {
  if (userId) {
    workspaceCache.delete(userId);
    return;
  }

  workspaceCache.clear();
}

export function primeUserWorkspaceCache(userId: string, workspace: WorkspaceSummary | null) {
  workspaceCache.set(userId, {
    workspace,
    fetchedAt: Date.now(),
  });
}

export function getPendingSignupPayloadFromUser(user: Pick<User, 'user_metadata'> | { user_metadata?: Record<string, unknown> | null } | null | undefined) {
  const metadata = user?.user_metadata ?? {};
  const fullName = normalizeString(metadata.full_name) || normalizeString(metadata.name);
  const workspaceName = normalizeString(metadata.pending_workspace_name);
  const workspaceSlug = normalizeString(metadata.pending_workspace_slug).toLowerCase();

  if (!fullName || !workspaceName || !workspaceSlug) {
    return null;
  }

  return {
    full_name: fullName,
    workspace_name: workspaceName,
    workspace_slug: workspaceSlug,
  } satisfies CompleteSignupPayload;
}

export async function clearPendingSignupMetadata() {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return;
  }

  const metadata = {
    ...(user.user_metadata ?? {}),
    pending_workspace_name: null,
    pending_workspace_slug: null,
    pending_crm_type: null,
  };

  await client.auth.updateUser({
    data: metadata,
  });
}

export async function completeSignup(payload: CompleteSignupPayload, session: Session) {
  const client = getSupabaseClient();
  const normalizedName = payload.workspace_name.trim();
  const normalizedSlug = payload.workspace_slug.trim().toLowerCase();
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  if (payload.full_name.trim().length < 2) throw new Error('Full name must be at least 2 characters.');
  if (normalizedName.length < 2) throw new Error('Workspace name must be at least 2 characters.');
  if (!slugPattern.test(normalizedSlug)) throw new Error('Workspace slug must contain lowercase letters, numbers, and hyphens only.');

  const existingWorkspaceResult = await client
    .from('workspaces')
    .select('*')
    .eq('owner_id', session.user.id)
    .limit(1)
    .maybeSingle();
  if (existingWorkspaceResult.error) throw new Error(existingWorkspaceResult.error.message);

  let workspace = existingWorkspaceResult.data as Record<string, unknown> | null;
  if (!workspace) {
    const slugResult = await client.from('workspaces').select('id').eq('slug', normalizedSlug).limit(1).maybeSingle();
    if (slugResult.error) throw new Error(slugResult.error.message);
    if (slugResult.data) throw new Error('Workspace slug is already in use.');

    const profileResult = await client
      .from('profiles')
      .upsert({ id: session.user.id, full_name: payload.full_name.trim(), updated_at: new Date().toISOString() })
      .eq('id', session.user.id)
      .select()
      .single();
    if (profileResult.error) throw new Error(profileResult.error.message);

    const workspaceResult = await client
      .from('workspaces')
      .insert({
        id: crypto.randomUUID(),
        name: normalizedName,
        slug: normalizedSlug,
        crm_type: 'real-estate',
        owner_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (workspaceResult.error || !workspaceResult.data) {
      throw new Error(workspaceResult.error?.message || 'Unable to create workspace.');
    }
    workspace = workspaceResult.data as Record<string, unknown>;
  }

  const workspaceId = getRowId(workspace, 'Workspace');

  const membershipResult = await client
    .from('workspace_members')
    .upsert({
      workspace_id: workspaceId,
      user_id: session.user.id,
      role: 'owner',
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
    .eq('user_id', session.user.id)
    .select()
    .single();
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const normalizedWorkspace: WorkspaceSummary = {
    id: workspaceId,
    name: String(workspace.name),
    slug: String(workspace.slug),
    crmType: (workspace.crm_type as WorkspaceSummary['crmType']) ?? 'real-estate',
    ownerId: String(workspace.owner_id),
    role: 'owner',
  };
  primeUserWorkspaceCache(session.user.id, normalizedWorkspace);
  return normalizedWorkspace satisfies CompleteSignupResponse['workspace'];
}

export async function acceptWorkspaceInvite(session: Session) {
  const client = getSupabaseClient();
  const inviteResult = await client
    .from('workspace_member_invites')
    .select('*')
    .eq('invited_email', session.user.email.trim().toLowerCase())
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (inviteResult.error) throw new Error(inviteResult.error.message);
  if (!inviteResult.data) throw new Error('No pending workspace invite was found for this account.');

  const invite = inviteResult.data as Record<string, unknown>;
  const workspaceResult = await client.from('workspaces').select('*').eq('id', invite.workspace_id).single();
  if (workspaceResult.error || !workspaceResult.data) throw new Error('Invited workspace could not be resolved.');

  const membershipResult = await client
    .from('workspace_members')
    .upsert({ workspace_id: invite.workspace_id, user_id: session.user.id, role: invite.role ?? 'agent' })
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', session.user.id)
    .select()
    .single();
  if (membershipResult.error) throw new Error(membershipResult.error.message);

  const acceptedAt = new Date().toISOString();
  const updateResult = await client
    .from('workspace_member_invites')
    .update({ status: 'accepted', accepted_by: session.user.id, accepted_at: acceptedAt, updated_at: acceptedAt })
    .eq('id', invite.id);
  if (updateResult.error) throw new Error(updateResult.error.message);

  const workspaceRow = workspaceResult.data as Record<string, unknown>;
  const workspace: WorkspaceSummary = {
    id: String(workspaceRow.id),
    name: String(workspaceRow.name),
    slug: String(workspaceRow.slug),
    crmType: (workspaceRow.crm_type as WorkspaceSummary['crmType']) ?? 'real-estate',
    ownerId: String(workspaceRow.owner_id),
    role: (invite.role as WorkspaceSummary['role']) ?? 'agent',
  };
  primeUserWorkspaceCache(session.user.id, workspace);
  return workspace satisfies WorkspaceLookupResponse['workspace'];
}

export async function completePendingSignupIfAvailable(
  session: Session,
  user: { user_metadata?: Record<string, unknown> | null } | null | undefined = session.user,
) {
  const payload = getPendingSignupPayloadFromUser(user);

  if (!payload) {
    return null;
  }

  const workspace = await completeSignup(payload, session);

  try {
    await clearPendingSignupMetadata();
  } catch {
    // Metadata cleanup is best-effort and should not block access.
  }

  return workspace;
}

export async function fetchUserWorkspace(session: Session) {
  const cacheKey = session.user.id;
  const cachedEntry = workspaceCache.get(cacheKey);

  if (cachedEntry?.promise) {
    return cachedEntry.promise;
  }

  if (isWorkspaceCacheFresh(cachedEntry)) {
    return cachedEntry!.workspace;
  }

  const client = getSupabaseClient();
  const request = client
    .from('workspace_members')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
    .then(async ({ data: membership, error }) => {
      if (error) throw new Error(error.message || 'Unable to load your workspace.');
      if (!membership) {
        primeUserWorkspaceCache(cacheKey, null);
        return null;
      }

      const membershipWorkspaceId = normalizeString((membership as Record<string, unknown>).workspace_id);
      if (!membershipWorkspaceId) {
        throw new Error('Workspace membership is missing its workspace ID.');
      }

      const workspaceResult = await client.from('workspaces').select('*').eq('id', membershipWorkspaceId).single();
      if (workspaceResult.error) throw new Error(workspaceResult.error.message || 'Unable to load your workspace.');
      if (!workspaceResult.data) return null;

      const row = workspaceResult.data as Record<string, unknown>;
      const workspace: WorkspaceSummary = {
        id: getRowId(row, 'Workspace'),
        name: String(row.name),
        slug: String(row.slug),
        crmType: (row.crm_type as WorkspaceSummary['crmType']) ?? 'real-estate',
        ownerId: String(row.owner_id),
        role: (membership.role as WorkspaceSummary['role']) ?? 'agent',
      };
      primeUserWorkspaceCache(cacheKey, workspace);
      return workspace;
    })
    .catch((error) => {
      workspaceCache.delete(cacheKey);
      throw error;
    });

  workspaceCache.set(cacheKey, {
    workspace: cachedEntry?.workspace ?? null,
    fetchedAt: cachedEntry?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}
