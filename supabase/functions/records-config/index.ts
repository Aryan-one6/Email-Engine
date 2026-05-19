import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getWorkspaceCrmConfig } from '../_shared/records.ts';
import { authenticateRequest, ensureWorkspaceMembership } from '../_shared/server.ts';

const DEFAULT_RECORD_SOURCES = [
  { name: 'Manual', source_type: 'manual' },
  { name: 'CSV Import', source_type: 'import' },
  { name: 'Website Form', source_type: 'web' },
  { name: 'Referral', source_type: 'referral' },
];

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authContext = await authenticateRequest(request);

    if (authContext instanceof Response) {
      return authContext;
    }

    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const workspaceId = typeof payload.workspace_id === 'string' ? payload.workspace_id : '';

    if (!workspaceId) {
      return jsonResponse({ error: 'workspace_id is required.' }, 400);
    }

    await ensureWorkspaceMembership(authContext.serviceClient, workspaceId, authContext.user.id);
    const sourcesCountResult = await authContext.serviceClient
      .from('record_sources')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (sourcesCountResult.error) {
      return jsonResponse({ error: sourcesCountResult.error.message }, 400);
    }

    if ((sourcesCountResult.count ?? 0) === 0) {
      const { error: seedSourcesError } = await authContext.serviceClient
        .from('record_sources')
        .insert(
          DEFAULT_RECORD_SOURCES.map((source) => ({
            workspace_id: workspaceId,
            name: source.name,
            source_type: source.source_type,
            is_active: true,
          })),
        );

      if (seedSourcesError) {
        return jsonResponse({ error: seedSourcesError.message }, 400);
      }
    }

    const config = await getWorkspaceCrmConfig(authContext.serviceClient, workspaceId);
    return jsonResponse(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse({ error: message }, 500);
  }
});
