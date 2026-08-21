import type { AppSession as Session } from './supabaseClient';
import { getSupabaseClient } from './supabaseClient';
import type {
  CustomFieldDefinitionInput,
  CustomFieldDefinition,
  CrmWorkspaceConfig,
  ImportAnalyzeInput,
  ImportAnalyzeResult,
  ImportIntelligenceConfigResult,
  ImportIntelligenceConfigSaveInput,
  ImportMappingApproveInput,
  ImportMappingApproveResult,
  ImportJobInput,
  ImportJobResult,
  ImportProfileSaveInput,
  RecordDetailResponse,
  RecordListPageResult,
  RecordListQuery,
  RecordNote,
  RecordSaveInput,
  RecordSummary,
  RecordTask,
  WorkspaceAssignee,
} from './crm-types';
import {
  filterLegacyRecordFields,
  isLegacyCustomTarget,
  isLegacyRecordFieldKey,
  isLegacyRequiredTargetLabel,
} from './legacy-record-fields';

const CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;
const RECORDS_CACHE_TTL_MS = 30 * 1000;
const RECORD_DETAIL_CACHE_TTL_MS = 30 * 1000;

interface CacheEntry<T> {
  data?: T;
  fetchedAt: number;
  promise?: Promise<T>;
}

const configCache = new Map<string, CacheEntry<CrmWorkspaceConfig>>();
const recordsCache = new Map<string, CacheEntry<RecordListPageResult>>();
const recordDetailCache = new Map<string, CacheEntry<RecordDetailResponse>>();

function getAuthHeaders(session: Session) {
  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

function extractFunctionErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.error === 'string' && record.error.trim()) {
    return record.error.trim();
  }

  if (typeof record.message === 'string' && record.message.trim()) {
    return record.message.trim();
  }

  if (typeof record.msg === 'string' && record.msg.trim()) {
    return record.msg.trim();
  }

  if (record.error && typeof record.error === 'object') {
    const nested = record.error as Record<string, unknown>;

    if (typeof nested.message === 'string' && nested.message.trim()) {
      return nested.message.trim();
    }
  }

  return null;
}

async function resolveInvokeErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : 'Request failed.';
  const context = (error as { context?: unknown })?.context;

  if (!context || typeof context !== 'object') {
    return fallback;
  }

  const responseLike = context as {
    status?: number;
    statusText?: string;
    clone?: () => { json?: () => Promise<unknown>; text?: () => Promise<string> };
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  };

  const status = typeof responseLike.status === 'number' ? responseLike.status : null;
  const statusText = typeof responseLike.statusText === 'string' && responseLike.statusText.trim()
    ? responseLike.statusText.trim()
    : null;

  let details: string | null = null;

  try {
    const reader = typeof responseLike.clone === 'function' ? responseLike.clone() : responseLike;

    if (typeof reader.json === 'function') {
      const payload = await reader.json();
      details = extractFunctionErrorMessage(payload);
    }

    if (!details && typeof reader.text === 'function') {
      const rawText = (await reader.text()).trim();

      if (rawText) {
        details = rawText;
      }
    }
  } catch {
    // Fall back to default message.
  }

  const statusPrefix = status
    ? `Edge function failed (${status}${statusText ? ` ${statusText}` : ''})`
    : 'Edge function failed';

  if (details) {
    return `${statusPrefix}: ${details}`;
  }

  return fallback || statusPrefix;
}

type DirectInvokeResult = { handled: true; data: unknown } | null;

function newRecordId() {
  return crypto.randomUUID();
}

function asRow(value: unknown) {
  return (value && typeof value === 'object' ? value : {}) as Record<string, any>;
}

function rowId(row: Record<string, any>) {
  return String(row.id ?? row.$id ?? '');
}

async function listRows(table: string, workspaceId: string) {
  const result = await getSupabaseClient().from(table).select('*').eq('workspace_id', workspaceId).limit(500);
  if (result.error) throw new Error(result.error.message);
  return (Array.isArray(result.data) ? result.data : []).map(asRow);
}

function defaultConfig(pipelines: Record<string, any>[], sources: Record<string, any>[], customFields: Record<string, any>[], assignees: Record<string, any>[]): CrmWorkspaceConfig {
  return {
    pipelines: pipelines.map((pipeline) => ({
      id: rowId(pipeline),
      name: String(pipeline.name ?? 'Leads'),
      is_default: Boolean(pipeline.is_default),
      stages: [],
    })),
    sources: sources.map((source) => ({
      id: rowId(source),
      name: String(source.name ?? ''),
      source_type: source.source_type ?? null,
      is_active: source.is_active !== false,
    })),
    customFields: customFields.map((field) => ({
      id: rowId(field),
      field_key: String(field.field_key ?? ''),
      label: String(field.label ?? field.field_key ?? ''),
      field_type: field.field_type as CustomFieldDefinition['field_type'],
      is_required: Boolean(field.is_required),
      is_active: field.is_active !== false,
      is_system: Boolean(field.is_system),
      options: Array.isArray(field.options) ? field.options : null,
      placeholder: field.placeholder ?? null,
      help_text: field.help_text ?? null,
      validation_rules: (field.validation_rules ?? {}) as Record<string, unknown>,
      default_value: field.default_value ?? null,
      position: Number(field.position ?? 0),
    })),
    assignees: assignees.map((member) => ({
      userId: String(member.user_id),
      role: (member.role ?? 'agent') as WorkspaceAssignee['role'],
      fullName: member.full_name ?? null,
    })),
  };
}

async function directCrmInvoke(name: string, session: Session, body: unknown): Promise<DirectInvokeResult> {
  const payload = asRow(body);
  const workspaceId = typeof payload.workspace_id === 'string' ? payload.workspace_id : '';
  const db = getSupabaseClient();

  if (!['records-config', 'records-custom-fields-list', 'records-custom-fields-update', 'records-list', 'record-get', 'record-create', 'record-update', 'record-move-stage', 'record-add-note', 'record-create-task', 'records-delete'].includes(name)) {
    return null;
  }
  if (!workspaceId) throw new Error('workspace_id is required.');

  if (name === 'records-config') {
    let pipelines = await listRows('pipelines', workspaceId);
    let stages = await listRows('pipeline_stages', workspaceId);
    let sources = await listRows('record_sources', workspaceId);
    const customFields = await listRows('custom_field_definitions', workspaceId);
    const members = await listRows('workspace_members', workspaceId);

    if (pipelines.length === 0) {
      const pipelineId = newRecordId();
      const pipeline = await db.from('pipelines').insert({ id: pipelineId, workspace_id: workspaceId, entity_type: 'record', name: 'Leads', is_default: true }).select().single();
      if (pipeline.error) throw new Error(pipeline.error.message);
      pipelines = pipeline.data ? [asRow(pipeline.data)] : [];
    }
    const defaultPipeline = pipelines.find((pipeline) => pipeline.is_default) ?? pipelines[0];
    if (stages.length === 0 && defaultPipeline) {
      const stageNames = [
        ['New', '#6366F1', false],
        ['Contacted', '#0EA5E9', false],
        ['Interested', '#22C55E', false],
        ['Closed', '#64748B', true],
      ] as const;
      for (const [index, [stageName, color, isClosed]] of stageNames.entries()) {
        const stage = await db.from('pipeline_stages').insert({
          id: newRecordId(), workspace_id: workspaceId, pipeline_id: defaultPipeline.id,
          name: stageName, position: index, color, is_closed: isClosed, win_probability: isClosed ? 0 : Math.min(90, 20 + index * 20),
        }).select().single();
        if (stage.error) throw new Error(stage.error.message);
        if (stage.data) stages.push(asRow(stage.data));
      }
    }
    if (sources.length === 0) {
      for (const [sourceName, sourceType] of [['Manual', 'manual'], ['CSV Import', 'import'], ['Website Form', 'web'], ['Referral', 'referral']] as const) {
        const source = await db.from('record_sources').insert({ id: newRecordId(), workspace_id: workspaceId, name: sourceName, source_type: sourceType, is_active: true }).select().single();
        if (source.error) throw new Error(source.error.message);
        if (source.data) sources.push(asRow(source.data));
      }
    }
    const assignees = members.map((member) => ({ ...member, full_name: member.user_id === session.user.id ? session.user.name : null }));
    const config = defaultConfig(pipelines, sources, customFields, assignees);
    for (const pipeline of config.pipelines) pipeline.stages = stages.filter((stage) => String(stage.pipeline_id) === pipeline.id).map((stage) => ({
      id: rowId(stage), pipeline_id: String(stage.pipeline_id), name: String(stage.name), position: Number(stage.position ?? 0), color: stage.color ?? null, is_closed: Boolean(stage.is_closed), win_probability: stage.win_probability == null ? null : Number(stage.win_probability),
    }));
    return { handled: true, data: config };
  }

  if (name === 'records-custom-fields-list') {
    const fields = await listRows('custom_field_definitions', workspaceId);
    return { handled: true, data: { fields: defaultConfig([], [], fields, []).customFields } };
  }

  if (name === 'records-custom-fields-update') {
    const fields = Array.isArray(payload.custom_fields) ? payload.custom_fields : [];
    for (const field of fields.map(asRow)) {
      const fieldData = { ...field, workspace_id: workspaceId, entity_type: 'record', is_active: field.is_active !== false };
      const result = field.id
        ? await db.from('custom_field_definitions').update(fieldData).eq('id', field.id)
        : await db.from('custom_field_definitions').insert({ id: newRecordId(), ...fieldData });
      if (result.error) throw new Error(result.error.message);
    }
    return directCrmInvoke('records-config', session, { workspace_id: workspaceId });
  }

  if (name === 'records-list') {
    let records = await listRows('records', workspaceId);
    const search = String(payload.search ?? '').trim().toLowerCase();
    if (search) records = records.filter((record) => [record.title, record.full_name, record.company_name, record.email, record.phone].some((value) => String(value ?? '').toLowerCase().includes(search)));
    for (const [key, value] of [['stage_id', payload.stage_id], ['source_id', payload.source_id], ['assignee_user_id', payload.assignee_user_id], ['status', payload.status]] as const) {
      if (typeof value === 'string' && value) records = records.filter((record) => String(record[key] ?? '') === value);
    }
    if (!payload.include_archived) records = records.filter((record) => !record.archived_at);
    records.sort((left, right) => String(right.updated_at ?? '').localeCompare(String(left.updated_at ?? '')));
    const page = Math.max(1, Number(payload.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(payload.pageSize ?? 10)));
    const total = records.length;
    const items = records.slice((page - 1) * pageSize, page * pageSize).map((record) => ({ ...record, id: rowId(record), custom: {} })) as RecordSummary[];
    return { handled: true, data: { items, records: items, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), hasNextPage: page * pageSize < total, hasPrevPage: page > 1 } satisfies RecordListPageResult };
  }

  if (name === 'record-get') {
    const recordResult = await db.from('records').select('*').eq('id', payload.record_id).eq('workspace_id', workspaceId).single();
    if (recordResult.error || !recordResult.data) throw new Error('Record not found.');
    const [notes, tasks, activities] = await Promise.all([
      db.from('record_notes').select('*').eq('record_id', payload.record_id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      db.from('tasks').select('*').eq('record_id', payload.record_id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
      db.from('record_activities').select('*').eq('record_id', payload.record_id).eq('workspace_id', workspaceId).order('created_at', { ascending: false }),
    ]);
    if (notes.error || tasks.error || activities.error) throw new Error((notes.error || tasks.error || activities.error)!.message);
    return { handled: true, data: { record: { ...asRow(recordResult.data), id: rowId(asRow(recordResult.data)), custom: {} } as RecordSummary, custom: {}, notes: notes.data ?? [], tasks: tasks.data ?? [], activities: activities.data ?? [] } satisfies RecordDetailResponse };
  }

  if (name === 'record-create' || name === 'record-update') {
    const core = asRow(payload.core);
    const recordId = name === 'record-update' ? String(payload.record_id) : newRecordId();
    const now = new Date().toISOString();
    const data = { ...core, id: recordId, workspace_id: workspaceId, title: core.title ?? core.full_name ?? 'Untitled record', updated_at: now, ...(name === 'record-create' ? { created_at: now, created_by: session.user.id } : { updated_by: session.user.id }) };
    const result = name === 'record-create'
      ? await db.from('records').insert(data).select().single()
      : await db.from('records').update(data).eq('id', recordId).eq('workspace_id', workspaceId);
    if (result.error) throw new Error(result.error.message);
    return directCrmInvoke('record-get', session, { workspace_id: workspaceId, record_id: recordId });
  }

  if (name === 'record-move-stage') {
    const result = await db.from('records').update({ stage_id: payload.stage_id, updated_at: new Date().toISOString() }).eq('id', payload.record_id).eq('workspace_id', workspaceId);
    if (result.error) throw new Error(result.error.message);
    return directCrmInvoke('record-get', session, { workspace_id: workspaceId, record_id: payload.record_id });
  }

  if (name === 'record-add-note') {
    const result = await db.from('record_notes').insert({ id: newRecordId(), workspace_id: workspaceId, record_id: payload.record_id, body: payload.body, created_by: session.user.id, updated_by: session.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (result.error) throw new Error(result.error.message);
    return { handled: true, data: { note: result.data } };
  }

  if (name === 'record-create-task') {
    const result = await db.from('tasks').insert({ id: newRecordId(), workspace_id: workspaceId, record_id: payload.record_id, title: payload.title, description: payload.description ?? null, priority: payload.priority ?? 'medium', due_at: payload.due_at ?? null, assigned_to: payload.assigned_to ?? null, status: 'open', created_by: session.user.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single();
    if (result.error) throw new Error(result.error.message);
    return { handled: true, data: { task: result.data } };
  }

  if (name === 'records-delete') {
    const ids = Array.isArray(payload.record_ids) ? payload.record_ids : [];
    const deletedIds: string[] = [];
    for (const recordId of ids) {
      const result = await db.from('records').update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', recordId).eq('workspace_id', workspaceId);
      if (!result.error) deletedIds.push(String(recordId));
    }
    return { handled: true, data: { deleted_count: deletedIds.length, deleted_ids: deletedIds, requested_count: ids.length, skipped_ids: ids.filter((id) => !deletedIds.includes(String(id))) } };
  }

  return null;
}

async function invoke<TResponse>(name: string, session: Session, body?: unknown) {
  const direct = await directCrmInvoke(name, session, body);
  if (direct?.handled) return direct.data as TResponse;
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke<TResponse>(name, {
    body: body as Record<string, unknown> | undefined,
    headers: getAuthHeaders(session),
  });

  if (error) {
    throw new Error(await resolveInvokeErrorMessage(error));
  }

  return data as TResponse;
}

function isCacheFresh<T>(entry: CacheEntry<T> | undefined, ttlMs: number) {
  if (!entry?.data) {
    return false;
  }

  return Date.now() - entry.fetchedAt < ttlMs;
}

function createRecordsCacheKey(filters: RecordListQuery) {
  return [
    filters.workspace_id,
    filters.search,
    filters.stage_id ?? '',
    filters.source_id ?? '',
    filters.assignee_user_id ?? '',
    filters.status ?? '',
    filters.include_archived ? '1' : '0',
    String(filters.page),
    String(filters.pageSize),
  ].join('::');
}

function createRecordDetailCacheKey(workspaceId: string, recordId: string) {
  return `${workspaceId}::${recordId}`;
}

function updateListResponseItems(
  response: RecordListPageResult,
  updater: (records: RecordSummary[]) => RecordSummary[],
): RecordListPageResult {
  const nextItems = updater(response.items);

  return {
    ...response,
    items: nextItems,
    records: nextItems,
  };
}

function updateRecordAcrossListCaches(workspaceId: string, record: RecordSummary) {
  for (const [cacheKey, entry] of recordsCache.entries()) {
    if (!cacheKey.startsWith(`${workspaceId}::`) || !entry.data) {
      continue;
    }

    recordsCache.set(cacheKey, {
      ...entry,
      data: updateListResponseItems(entry.data, (current) =>
        current.map((item) => (item.id === record.id ? { ...item, ...record } : item)),
      ),
      fetchedAt: Date.now(),
    });
  }
}

function invalidateWorkspaceRecordLists(workspaceId: string) {
  for (const cacheKey of recordsCache.keys()) {
    if (cacheKey.startsWith(`${workspaceId}::`)) {
      recordsCache.delete(cacheKey);
    }
  }
}

function invalidateRecordDetail(workspaceId: string, recordId: string) {
  recordDetailCache.delete(createRecordDetailCacheKey(workspaceId, recordId));
}

function sanitizeCrmWorkspaceConfig(config: CrmWorkspaceConfig): CrmWorkspaceConfig {
  return {
    ...config,
    customFields: filterLegacyRecordFields(config.customFields ?? []),
  };
}

function sanitizeImportAnalyzeResult(result: ImportAnalyzeResult): ImportAnalyzeResult {
  const suggestions = (result.suggestions ?? []).filter(
    (item) => !isLegacyCustomTarget(item.target_type, item.target_key),
  );
  const requiredMissingTargets = (result.required_missing_targets ?? []).filter(
    (target) => !isLegacyRequiredTargetLabel(target),
  );

  return {
    ...result,
    suggestions,
    required_missing_targets: requiredMissingTargets,
    needs_confirmation_count: suggestions.filter((item) => item.status === 'needs_confirmation').length,
    new_semantic_count: suggestions.filter((item) => item.status === 'new_semantic').length,
  };
}

function sanitizeImportIntelligenceConfig(result: ImportIntelligenceConfigResult): ImportIntelligenceConfigResult {
  return {
    ...result,
    bindings: (result.bindings ?? []).filter(
      (item) => !isLegacyCustomTarget(item.target_type, item.target_key),
    ),
    transform_rules: (result.transform_rules ?? []).filter(
      (item) => !isLegacyCustomTarget(item.target_type, item.target_key),
    ),
    option_aliases: (result.option_aliases ?? []).filter(
      (item) => !isLegacyRecordFieldKey(item.field_key),
    ),
    custom_fields: (result.custom_fields ?? []).filter(
      (item) => !isLegacyRecordFieldKey(item.field_key),
    ),
  };
}

export function getCachedCrmWorkspaceConfig(workspaceId: string) {
  const cached = configCache.get(workspaceId)?.data ?? null;
  return cached ? sanitizeCrmWorkspaceConfig(cached) : null;
}

export function isCrmWorkspaceConfigCacheFresh(workspaceId: string) {
  const entry = configCache.get(workspaceId);
  return isCacheFresh(entry, CONFIG_CACHE_TTL_MS);
}

export async function fetchCrmWorkspaceConfig(session: Session, workspaceId: string) {
  const cachedEntry = configCache.get(workspaceId);

  if (cachedEntry?.promise) {
    return cachedEntry.promise;
  }

  if (isCacheFresh(cachedEntry, CONFIG_CACHE_TTL_MS)) {
    return cachedEntry!.data as CrmWorkspaceConfig;
  }

  const request = invoke<CrmWorkspaceConfig>('records-config', session, {
    workspace_id: workspaceId,
  })
    .then((config) => {
      const sanitized = sanitizeCrmWorkspaceConfig(config);
      configCache.set(workspaceId, {
        data: sanitized,
        fetchedAt: Date.now(),
      });
      return sanitized;
    })
    .catch((error) => {
      if (cachedEntry?.data) {
        configCache.set(workspaceId, cachedEntry);
      } else {
        configCache.delete(workspaceId);
      }
      throw error;
    });

  configCache.set(workspaceId, {
    data: cachedEntry?.data,
    fetchedAt: cachedEntry?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function refreshCrmWorkspaceConfig(session: Session, workspaceId: string) {
  const cachedEntry = configCache.get(workspaceId);
  const request = invoke<CrmWorkspaceConfig>('records-config', session, {
    workspace_id: workspaceId,
  })
    .then((config) => {
      const sanitized = sanitizeCrmWorkspaceConfig(config);
      configCache.set(workspaceId, {
        data: sanitized,
        fetchedAt: Date.now(),
      });
      return sanitized;
    })
    .catch((error) => {
      if (cachedEntry?.data) {
        configCache.set(workspaceId, cachedEntry);
      } else {
        configCache.delete(workspaceId);
      }
      throw error;
    });

  configCache.set(workspaceId, {
    data: cachedEntry?.data,
    fetchedAt: cachedEntry?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function updateWorkspaceCustomFields(
  session: Session,
  workspaceId: string,
  customFields: CustomFieldDefinitionInput[],
) {
  const nextConfig = await invoke<CrmWorkspaceConfig>('records-custom-fields-update', session, {
    workspace_id: workspaceId,
    custom_fields: customFields,
  });
  const sanitized = sanitizeCrmWorkspaceConfig(nextConfig);

  configCache.set(workspaceId, {
    data: sanitized,
    fetchedAt: Date.now(),
  });

  return sanitized;
}

export async function fetchWorkspaceCustomFields(session: Session, workspaceId: string) {
  const response = await invoke<{ fields: CustomFieldDefinition[] }>('records-custom-fields-list', session, {
    workspace_id: workspaceId,
  });

  return filterLegacyRecordFields(response.fields ?? []);
}

export function getCachedWorkspaceRecords(filters: RecordListQuery) {
  return recordsCache.get(createRecordsCacheKey(filters))?.data ?? null;
}

export async function listWorkspaceRecords(session: Session, filters: RecordListQuery) {
  const cacheKey = createRecordsCacheKey(filters);
  const cachedEntry = recordsCache.get(cacheKey);

  if (cachedEntry?.promise) {
    return cachedEntry.promise;
  }

  if (isCacheFresh(cachedEntry, RECORDS_CACHE_TTL_MS)) {
    return cachedEntry!.data as RecordListPageResult;
  }

  const request = invoke<RecordListPageResult>('records-list', session, filters)
    .then((response) => {
      recordsCache.set(cacheKey, {
        data: {
          ...response,
          items: response.items ?? response.records ?? [],
          records: response.records ?? response.items ?? [],
        },
        fetchedAt: Date.now(),
      });
      return recordsCache.get(cacheKey)!.data as RecordListPageResult;
    })
    .catch((error) => {
      if (cachedEntry?.data) {
        recordsCache.set(cacheKey, cachedEntry);
      } else {
        recordsCache.delete(cacheKey);
      }
      throw error;
    });

  recordsCache.set(cacheKey, {
    data: cachedEntry?.data,
    fetchedAt: cachedEntry?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export function getCachedRecordDetails(workspaceId: string, recordId: string) {
  return recordDetailCache.get(createRecordDetailCacheKey(workspaceId, recordId))?.data ?? null;
}

export async function getRecordDetails(session: Session, workspaceId: string, recordId: string) {
  const cacheKey = createRecordDetailCacheKey(workspaceId, recordId);
  const cachedEntry = recordDetailCache.get(cacheKey);

  if (cachedEntry?.promise) {
    return cachedEntry.promise;
  }

  if (isCacheFresh(cachedEntry, RECORD_DETAIL_CACHE_TTL_MS)) {
    return cachedEntry!.data as RecordDetailResponse;
  }

  const request = invoke<RecordDetailResponse>('record-get', session, {
    workspace_id: workspaceId,
    record_id: recordId,
  })
    .then((detail) => {
      recordDetailCache.set(cacheKey, {
        data: detail,
        fetchedAt: Date.now(),
      });
      updateRecordAcrossListCaches(workspaceId, detail.record);
      return detail;
    })
    .catch((error) => {
      if (cachedEntry?.data) {
        recordDetailCache.set(cacheKey, cachedEntry);
      } else {
        recordDetailCache.delete(cacheKey);
      }
      throw error;
    });

  recordDetailCache.set(cacheKey, {
    data: cachedEntry?.data,
    fetchedAt: cachedEntry?.fetchedAt ?? 0,
    promise: request,
  });

  return request;
}

export async function createRecord(session: Session, payload: RecordSaveInput) {
  const detail = await invoke<RecordDetailResponse>('record-create', session, payload);
  recordDetailCache.set(createRecordDetailCacheKey(payload.workspace_id, detail.record.id), {
    data: detail,
    fetchedAt: Date.now(),
  });
  invalidateWorkspaceRecordLists(payload.workspace_id);
  return detail;
}

export async function updateRecord(session: Session, recordId: string, payload: RecordSaveInput) {
  const detail = await invoke<RecordDetailResponse>('record-update', session, {
    ...payload,
    record_id: recordId,
  });

  recordDetailCache.set(createRecordDetailCacheKey(payload.workspace_id, recordId), {
    data: detail,
    fetchedAt: Date.now(),
  });
  updateRecordAcrossListCaches(payload.workspace_id, detail.record);
  return detail;
}

export async function moveRecordStage(session: Session, workspaceId: string, recordId: string, stageId: string) {
  const detail = await invoke<RecordDetailResponse>('record-move-stage', session, {
    workspace_id: workspaceId,
    record_id: recordId,
    stage_id: stageId,
  });

  recordDetailCache.set(createRecordDetailCacheKey(workspaceId, recordId), {
    data: detail,
    fetchedAt: Date.now(),
  });
  updateRecordAcrossListCaches(workspaceId, detail.record);
  return detail;
}

export async function addRecordNote(session: Session, workspaceId: string, recordId: string, body: string) {
  const response = await invoke<{ note: RecordNote }>('record-add-note', session, {
    workspace_id: workspaceId,
    record_id: recordId,
    body,
  });

  invalidateRecordDetail(workspaceId, recordId);
  return response.note;
}

export async function createRecordTask(
  session: Session,
  workspaceId: string,
  recordId: string,
  payload: {
    title: string;
    description: string | null;
    priority: string;
    due_at: string | null;
    assigned_to: string | null;
  },
) {
  const response = await invoke<{ task: RecordTask }>('record-create-task', session, {
    workspace_id: workspaceId,
    record_id: recordId,
    ...payload,
  });

  invalidateRecordDetail(workspaceId, recordId);
  return response.task;
}

export async function deleteWorkspaceRecords(
  session: Session,
  payload: { workspace_id: string; record_ids: string[] },
) {
  const response = await invoke<{ deleted_count: number; deleted_ids: string[]; requested_count: number; skipped_ids: string[] }>(
    'records-delete',
    session,
    payload,
  );

  for (const recordId of response.deleted_ids) {
    invalidateRecordDetail(payload.workspace_id, recordId);
  }

  if (response.deleted_count > 0) {
    invalidateWorkspaceRecordLists(payload.workspace_id);
  }

  return response;
}

export async function createImportJob(session: Session, payload: ImportJobInput) {
  const response = await invoke<ImportJobResult>('import-job-create', session, payload);

  if (response.importedCount > 0) {
    invalidateWorkspaceRecordLists(payload.workspace_id);
  }

  return response;
}

export async function analyzeImportMappings(session: Session, payload: ImportAnalyzeInput) {
  const result = await invoke<ImportAnalyzeResult>('import-analyze', session, payload);
  return sanitizeImportAnalyzeResult(result);
}

export async function approveImportMappings(session: Session, payload: ImportMappingApproveInput) {
  return invoke<ImportMappingApproveResult>('import-mapping-approve', session, payload);
}

export async function saveImportProfile(session: Session, payload: ImportProfileSaveInput) {
  return invoke<{ profile: { id: string; profile_name: string }; mappings_count: number; message: string }>(
    'import-profile-save',
    session,
    payload,
  );
}

export async function resolveImportProfile(session: Session, payload: { workspace_id: string; columns: string[] }) {
  return invoke<{
    workspace_id: string;
    crm_type: string;
    source_fingerprint: string;
    profile: ImportAnalyzeResult['profile'];
  }>('import-profile-resolve', session, payload);
}

export async function getImportIntelligenceConfig(session: Session, payload: { workspace_id: string }) {
  const result = await invoke<ImportIntelligenceConfigResult>('import-intelligence-config-get', session, payload);
  return sanitizeImportIntelligenceConfig(result);
}

export async function saveImportIntelligenceConfig(session: Session, payload: ImportIntelligenceConfigSaveInput) {
  return invoke<{
    message: string;
    counts: { aliases: number; bindings: number; transform_rules: number; option_aliases: number };
  }>('import-intelligence-config-save', session, payload);
}
