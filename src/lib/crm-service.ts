import type { Session } from '@supabase/supabase-js';
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

async function invoke<TResponse>(name: string, session: Session, body?: unknown) {
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
