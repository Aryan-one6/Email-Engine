import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { buildImportIdentityKey } from '../_shared/import-identity.ts';
import {
  buildSourceFingerprint,
  getWorkspaceCrmType,
  loadTransformContext,
  transformMappedValue,
} from '../_shared/import-intelligence.ts';
import { buildImportUpdatePlan, type ImportRecordSnapshot } from '../_shared/import-upsert.ts';
import { isLegacyRecordFieldKey } from '../_shared/legacy-record-fields.ts';
import { createRecordForWorkspace, updateRecordForWorkspace } from '../_shared/records.ts';
import { authenticateRequest, ensureWorkspaceMembership } from '../_shared/server.ts';

const allowedEntityTypes = new Set(['record']);
const allowedTargetTypes = new Set(['core', 'custom']);
const allowedCoreTargetKeys = new Set([
  'title',
  'full_name',
  'company_name',
  'email',
  'phone',
  'status',
  'priority',
]);
const requiredLeadTargets = new Set(['core:full_name', 'core:email']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_RECORD_STATUSES = new Set([
  'new',
  'email_sent',
  'mobile_contacted',
  'replied',
  'interested',
  'not_interested',
]);
const ALLOWED_RECORD_PRIORITIES = new Set(['low', 'medium', 'high']);
const RECORD_STATUS_ALIASES: Record<string, string> = {
  open: 'new',
  qualified: 'new',
  nurturing: 'email_sent',
  closed: 'not_interested',
  not_interested: 'not_interested',
  notinterested: 'not_interested',
  emailsent: 'email_sent',
  emailed: 'email_sent',
  email_sent: 'email_sent',
  mobile_contacted: 'mobile_contacted',
  mobilecontacted: 'mobile_contacted',
  called: 'mobile_contacted',
  replied: 'replied',
  response: 'replied',
  responded: 'replied',
  interested: 'interested',
  warm: 'interested',
  new: 'new',
};
const RECORD_PRIORITY_ALIASES: Record<string, string> = {
  urgent: 'high',
  highest: 'high',
  high: 'high',
  medium: 'medium',
  normal: 'medium',
  standard: 'medium',
  low: 'low',
};

interface ImportMappingPayload {
  source_column: string;
  semantic_id?: string | null;
  target_type: 'core' | 'custom';
  target_key: string;
  confidence?: number | null;
  status?: 'auto_mapped' | 'needs_confirmation' | 'new_semantic' | 'ignored' | 'confirmed';
  mapping_source?: 'profile' | 'exact' | 'alias' | 'heuristic' | 'manual' | 'none';
  notes?: string | null;
}

interface ImportRowPayload {
  id: string;
  row_index: number;
  raw_data: Record<string, unknown>;
}

interface CustomFieldDefinitionRow {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  is_required: boolean;
  options: unknown;
}

interface ExistingRecordRow {
  id: string;
  external_source: string | null;
  external_key: string | null;
  title: string | null;
  full_name: string | null;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  source_id: string | null;
  pipeline_id: string | null;
  stage_id: string | null;
  assignee_user_id: string | null;
  status: string | null;
  priority: string | null;
}

interface CustomFieldValueRow {
  entity_id: string;
  field_definition_id: string;
  value_text: string | null;
  value_number: number | string | null;
  value_boolean: boolean | null;
  value_date: string | null;
  value_datetime: string | null;
  value_json: unknown;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getTrimmedString(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeEmail(value: unknown) {
  const nextValue = getTrimmedString(value).toLowerCase();

  if (!nextValue) {
    return '';
  }

  return EMAIL_REGEX.test(nextValue) ? nextValue : '';
}

function normalizeEnumToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function sanitizeImportStatus(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeEnumToken(value);

  if (!normalized) {
    return null;
  }

  const mapped = RECORD_STATUS_ALIASES[normalized] ?? normalized;
  return ALLOWED_RECORD_STATUSES.has(mapped) ? mapped : null;
}

function sanitizeImportPriority(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = normalizeEnumToken(value);

  if (!normalized) {
    return null;
  }

  const mapped = RECORD_PRIORITY_ALIASES[normalized] ?? normalized;
  return ALLOWED_RECORD_PRIORITIES.has(mapped) ? mapped : null;
}

function coerceCustomValue(value: unknown, definition: CustomFieldDefinitionRow) {
  const normalized = getTrimmedString(value);

  if (!normalized) {
    return null;
  }

  switch (definition.field_type) {
    case 'text':
    case 'textarea':
    case 'select':
      return normalized;
    case 'number': {
      const numericValue = Number(normalized.replace(/,/g, ''));

      if (Number.isNaN(numericValue)) {
        throw new Error(`${definition.label} expects a numeric value.`);
      }

      return numericValue;
    }
    case 'boolean': {
      const lower = normalized.toLowerCase();

      if (['true', '1', 'yes', 'y'].includes(lower)) {
        return true;
      }

      if (['false', '0', 'no', 'n'].includes(lower)) {
        return false;
      }

      throw new Error(`${definition.label} expects true/false or yes/no.`);
    }
    case 'date': {
      if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        return normalized;
      }

      const parsed = new Date(normalized);

      if (Number.isNaN(parsed.getTime())) {
        throw new Error(`${definition.label} expects a valid date.`);
      }

      return parsed.toISOString().slice(0, 10);
    }
    case 'multi_select':
      return normalized
        .split(/[|;,]/)
        .map((item) => item.trim())
        .filter(Boolean);
    default:
      return normalized;
  }
}

function serializeCustomFieldValue(row: CustomFieldValueRow) {
  if (row.value_json !== null && row.value_json !== undefined) return row.value_json;
  if (row.value_boolean !== null) return row.value_boolean;
  if (row.value_number !== null) return Number(row.value_number);
  if (row.value_datetime !== null) return row.value_datetime;
  if (row.value_date !== null) return row.value_date;
  return row.value_text;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function getExternalLookupKey(source: string, key: string) {
  return `${source}::${key}`;
}

function toRecordSnapshot(record: ExistingRecordRow, custom: Record<string, unknown>): ImportRecordSnapshot {
  return {
    core: {
      title: record.title,
      full_name: record.full_name,
      company_name: record.company_name,
      email: record.email,
      phone: record.phone,
      source_id: record.source_id,
      pipeline_id: record.pipeline_id,
      stage_id: record.stage_id,
      assignee_user_id: record.assignee_user_id,
      status: record.status,
      priority: record.priority,
    },
    custom,
  };
}

function buildImportPayload(
  row: Record<string, unknown>,
  mappings: ImportMappingPayload[],
  customFieldByKey: Map<string, CustomFieldDefinitionRow>,
  transformContext: {
    rules: Array<{ target_type: string; target_key: string; rule_type: string; rule_config: Record<string, unknown> | null }>;
    optionAliases: Array<{ field_key: string; alias_value: string; canonical_value: string }>;
  },
  rowIndex: number,
) {
  const core: Record<string, string | null> = {};
  const custom: Record<string, unknown> = {};
  const transformed: Record<string, unknown> = {};
  const lineage: Array<{
    source_column: string;
    target_type: 'core' | 'custom';
    target_key: string;
    raw_value: unknown;
    normalized_value: unknown;
  }> = [];

  for (const mapping of mappings) {
    const rawValue = row[mapping.source_column];

    if (mapping.target_type === 'core') {
      const normalizedCoreValue = transformMappedValue({
        value: rawValue,
        targetType: 'core',
        targetKey: mapping.target_key,
        rules: transformContext.rules,
        optionAliases: transformContext.optionAliases,
      });
      const asString = normalizedCoreValue === null || normalizedCoreValue === undefined
        ? null
        : getTrimmedString(normalizedCoreValue) || null;
      core[mapping.target_key] = asString;
      transformed[mapping.source_column] = asString;
      lineage.push({
        source_column: mapping.source_column,
        target_type: mapping.target_type,
        target_key: mapping.target_key,
        raw_value: rawValue,
        normalized_value: asString,
      });
      continue;
    }

    const definition = customFieldByKey.get(mapping.target_key);

    if (!definition) {
      throw new Error(`Unknown custom field: ${mapping.target_key}`);
    }

    const normalizedCustomValue = transformMappedValue({
      value: rawValue,
      targetType: 'custom',
      targetKey: mapping.target_key,
      customFieldType: definition.field_type,
      rules: transformContext.rules,
      customOptions: Array.isArray(definition.options)
        ? definition.options.map((option) => getTrimmedString(option)).filter(Boolean)
        : [],
      optionAliases: transformContext.optionAliases,
    });
    custom[mapping.target_key] = normalizedCustomValue === null ? null : coerceCustomValue(normalizedCustomValue, definition);
    transformed[mapping.source_column] = custom[mapping.target_key];
    lineage.push({
      source_column: mapping.source_column,
      target_type: mapping.target_type,
      target_key: mapping.target_key,
      raw_value: rawValue,
      normalized_value: custom[mapping.target_key],
    });
  }

  core.title = core.title || core.full_name || core.company_name || core.email || core.phone || `Imported row ${rowIndex + 1}`;

  return { core, custom, transformed, lineage };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authContext = await authenticateRequest(request);

    if (authContext instanceof Response) {
      return authContext;
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const workspaceId = typeof payload.workspace_id === 'string' ? payload.workspace_id : '';
    const fileName = typeof payload.file_name === 'string' ? payload.file_name.trim() : '';
    const entityType = typeof payload.entity_type === 'string' ? payload.entity_type : 'record';
    const sourceFingerprint = typeof payload.source_fingerprint === 'string' && payload.source_fingerprint.trim()
      ? payload.source_fingerprint.trim()
      : '';
    const importSourceName = typeof payload.import_source_name === 'string' && payload.import_source_name.trim()
      ? payload.import_source_name.trim()
      : fileName;
    const allowEmptyOverwrite = payload.allow_empty_overwrite === true;
    const identitySourceIdColumns = Array.isArray(payload.identity_source_id_columns)
      ? payload.identity_source_id_columns
        .map((column) => getTrimmedString(column))
        .filter(Boolean)
      : [];
    const profileId = typeof payload.profile_id === 'string' ? payload.profile_id.trim() : null;
    const inputRows = Array.isArray(payload.rows)
      ? payload.rows
      : Array.isArray(payload.preview_rows)
        ? payload.preview_rows
        : [];
    const mappings = Array.isArray(payload.mappings) ? payload.mappings : [];

    if (!workspaceId || !fileName) {
      return jsonResponse({ error: 'workspace_id and file_name are required.' }, 400);
    }

    if (!allowedEntityTypes.has(entityType)) {
      return jsonResponse({ error: 'entity_type is invalid.' }, 400);
    }

    await ensureWorkspaceMembership(authContext.serviceClient, workspaceId, authContext.user.id);

    const importRows = inputRows
      .filter((row) => isPlainObject(row))
      .map((row) => row as Record<string, unknown>);

    if (importRows.length === 0) {
      return jsonResponse({ error: 'At least one CSV data row is required.' }, 400);
    }

    const mappingRows = mappings
      .filter(
        (mapping) =>
          typeof (mapping as Record<string, unknown>).source_column === 'string' &&
          typeof (mapping as Record<string, unknown>).target_type === 'string' &&
          typeof (mapping as Record<string, unknown>).target_key === 'string',
      )
      .map((mapping) => {
        const next = mapping as Record<string, string>;

        return {
          source_column: next.source_column.trim(),
          semantic_id: typeof next.semantic_id === 'string' ? next.semantic_id.trim() : null,
          target_type: next.target_type as 'core' | 'custom',
          target_key: next.target_key.trim(),
          confidence: typeof (mapping as Record<string, unknown>).confidence === 'number'
            ? ((mapping as Record<string, unknown>).confidence as number)
            : null,
          status: typeof next.status === 'string'
            ? next.status as 'auto_mapped' | 'needs_confirmation' | 'new_semantic' | 'ignored' | 'confirmed'
            : 'confirmed',
          mapping_source: typeof next.mapping_source === 'string'
            ? next.mapping_source as 'profile' | 'exact' | 'alias' | 'heuristic' | 'manual' | 'none'
            : 'manual',
          notes: typeof next.notes === 'string' ? next.notes : null,
        };
      })
      .filter((mapping) => mapping.source_column && mapping.target_key);

    if (mappingRows.length === 0) {
      return jsonResponse({ error: 'Map at least one CSV column before importing.' }, 400);
    }

    const hasInvalidTargetType = mappingRows.some((mapping) => !allowedTargetTypes.has(mapping.target_type));

    if (hasInvalidTargetType) {
      return jsonResponse({ error: 'One or more import mappings use an invalid target_type.' }, 400);
    }

    const effectiveMappings = mappingRows.filter((mapping) => mapping.status !== 'ignored');
    const mappedCoreTargetKeys = new Set(
      effectiveMappings
        .filter((mapping) => mapping.target_type === 'core')
        .map((mapping) => mapping.target_key),
    );

    if (effectiveMappings.length === 0) {
      return jsonResponse({ error: 'All mappings are ignored. Map at least one CSV column before importing.' }, 400);
    }

    const sourceColumns = new Set<string>();
    const targetPairs = new Set<string>();
    const mappedTargetLabels = new Set<string>();

    for (const mapping of effectiveMappings) {
      if (sourceColumns.has(mapping.source_column)) {
        return jsonResponse({ error: 'Each source column can only be mapped once per import job.' }, 400);
      }

      const targetKey = `${mapping.target_type}::${mapping.target_key}`;

      if (targetPairs.has(targetKey)) {
        return jsonResponse({ error: 'Each import target can only be mapped once per import job.' }, 400);
      }

      if (mapping.target_type === 'core' && !allowedCoreTargetKeys.has(mapping.target_key)) {
        return jsonResponse({ error: `Unsupported core import target: ${mapping.target_key}` }, 400);
      }

      sourceColumns.add(mapping.source_column);
      targetPairs.add(targetKey);
      mappedTargetLabels.add(`${mapping.target_type}:${mapping.target_key}`);
    }

    const crmType = await getWorkspaceCrmType(authContext.serviceClient, workspaceId);
    const missingLeadTargets = [...requiredLeadTargets].filter((target) => !mappedTargetLabels.has(target));
    const missingAllRequiredTargets = [...new Set(missingLeadTargets)];

    if (missingAllRequiredTargets.length > 0) {
      return jsonResponse({
        error: `Required import targets are missing: ${missingAllRequiredTargets.join(', ')}`,
        missing_required_targets: missingAllRequiredTargets,
      }, 400);
    }

    const { data: customFieldDefinitions, error: customFieldError } = await authContext.serviceClient
      .from('custom_field_definitions')
      .select('id, field_key, label, field_type, is_required, options')
      .eq('workspace_id', workspaceId)
      .eq('entity_type', 'record')
      .eq('is_active', true);

    if (customFieldError) {
      return jsonResponse({ error: customFieldError.message }, 500);
    }

    const customFieldByKey = new Map(
      ((customFieldDefinitions ?? []) as CustomFieldDefinitionRow[])
        .filter((field) => !isLegacyRecordFieldKey(field.field_key))
        .map((field) => [field.field_key, field]),
    );

    for (const mapping of effectiveMappings) {
      if (mapping.target_type === 'custom' && !customFieldByKey.has(mapping.target_key)) {
        return jsonResponse({ error: `Unknown custom import target: ${mapping.target_key}` }, 400);
      }
    }

    const { data: job, error: jobError } = await authContext.serviceClient
      .from('import_jobs')
      .insert({
        workspace_id: workspaceId,
        entity_type: entityType,
        file_name: fileName,
        status: 'pending',
        phase: 'ingest',
        source_fingerprint: sourceFingerprint || buildSourceFingerprint(Object.keys(importRows[0] ?? {})),
        profile_id: profileId,
        approval_status: 'approved',
        stats_json: {
          needs_confirmation_count: mappingRows.filter((mapping) => mapping.status === 'needs_confirmation').length,
          new_semantic_count: mappingRows.filter((mapping) => mapping.status === 'new_semantic').length,
          ignored_count: mappingRows.filter((mapping) => mapping.status === 'ignored').length,
        },
        total_rows: importRows.length,
        success_rows: 0,
        failed_rows: 0,
        created_by: authContext.user.id,
      })
      .select('id, workspace_id, entity_type, file_name, status, total_rows, success_rows, failed_rows, created_at, updated_at')
      .single();

    if (jobError || !job) {
      return jsonResponse({ error: jobError?.message || 'Unable to create import job.' }, 500);
    }

    const { error: mappingError } = await authContext.serviceClient.from('import_mappings').insert(
      mappingRows.map((mapping) => ({
        import_job_id: job.id,
        source_column: mapping.source_column,
        semantic_id: mapping.semantic_id ?? null,
        target_type: mapping.target_type,
        target_key: mapping.target_key,
        confidence: mapping.confidence ?? null,
        status: mapping.status ?? 'confirmed',
        mapping_source: mapping.mapping_source ?? 'manual',
        notes: mapping.notes ?? null,
      })),
    );

    if (mappingError) {
      await authContext.serviceClient
        .from('import_jobs')
        .update({ status: 'failed', failed_rows: importRows.length })
        .eq('id', job.id);
      return jsonResponse({ error: mappingError.message }, 500);
    }

    const { data: persistedImportRows, error: rowsError } = await authContext.serviceClient
      .from('import_rows')
      .insert(
        importRows.map((row, index) => ({
          import_job_id: job.id,
          row_index: index,
          raw_data: row,
          status: 'pending',
        })),
      )
      .select('id, row_index, raw_data');

    if (rowsError || !persistedImportRows) {
      await authContext.serviceClient
        .from('import_jobs')
        .update({ status: 'failed', failed_rows: importRows.length })
        .eq('id', job.id);
      return jsonResponse({ error: rowsError?.message || 'Unable to store import rows.' }, 500);
    }

    await authContext.serviceClient
      .from('import_jobs')
      .update({ status: 'processing', phase: 'execute' })
      .eq('id', job.id);

    const transformContext = await loadTransformContext(authContext.serviceClient, workspaceId, crmType);
    let createdRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;
    const rowFailures: Array<{ rowIndex: number; error: string }> = [];
    const sortedRows = (persistedImportRows as ImportRowPayload[]).sort((left, right) => left.row_index - right.row_index);
    const preparedRows: Array<{
      row: ImportRowPayload;
      importPayload: ReturnType<typeof buildImportPayload>;
      coreForUpdate: Record<string, unknown>;
      identity: Awaited<ReturnType<typeof buildImportIdentityKey>>;
    }> = [];

    for (const row of sortedRows) {
      try {
        const importPayload = buildImportPayload(row.raw_data, effectiveMappings, customFieldByKey, transformContext, row.row_index);
        const leadName = getTrimmedString(importPayload.core.full_name) || getTrimmedString(importPayload.core.title);
        const leadEmail = normalizeEmail(importPayload.core.email);

        if (!leadName) {
          throw new Error('Lead name is required for each row.');
        }

        importPayload.core.full_name = leadName;
        importPayload.core.title = getTrimmedString(importPayload.core.title) || leadName;
        importPayload.core.status = sanitizeImportStatus(importPayload.core.status);
        importPayload.core.priority = sanitizeImportPriority(importPayload.core.priority);
        const coreForUpdate: Record<string, unknown> = { ...importPayload.core };

        if (!mappedCoreTargetKeys.has('title')) {
          delete coreForUpdate.title;
        }

        const identity = await buildImportIdentityKey(
          row.raw_data,
          {
            mappings: effectiveMappings,
            source_id_columns: identitySourceIdColumns,
            core_overrides: {
              email: importPayload.core.email,
              phone: importPayload.core.phone,
              company_name: importPayload.core.company_name,
            },
          },
          importSourceName,
        );

        if (!leadEmail) {
          throw new Error('Lead email is required and must be valid for each row.');
        }

        importPayload.core.email = leadEmail;
        coreForUpdate.email = leadEmail;

        preparedRows.push({
          row,
          importPayload,
          coreForUpdate,
          identity,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to import row.';

        await authContext.serviceClient
          .from('import_rows')
          .update({
            status: 'failed',
            error_message: message,
            transformed_data: null,
            validation_errors: [{ message }],
            lineage: null,
            created_record_id: null,
          })
          .eq('id', row.id);

        failedRows += 1;
        rowFailures.push({
          rowIndex: row.row_index,
          error: message,
        });
      }
    }

    const existingByIdentity = new Map<
      string,
      {
        record: ExistingRecordRow;
        snapshot: ImportRecordSnapshot;
      }
    >();

    if (preparedRows.length > 0) {
      const uniqueLookupKeys = new Set<string>();
      const uniqueExternalKeys: string[] = [];
      const externalSource = preparedRows[0].identity.external_source;

      for (const prepared of preparedRows) {
        const lookupKey = getExternalLookupKey(prepared.identity.external_source, prepared.identity.external_key);

        if (uniqueLookupKeys.has(lookupKey)) {
          continue;
        }

        uniqueLookupKeys.add(lookupKey);
        uniqueExternalKeys.push(prepared.identity.external_key);
      }

      const existingRows: ExistingRecordRow[] = [];

      for (const keyChunk of chunkArray(uniqueExternalKeys, 500)) {
        if (keyChunk.length === 0) {
          continue;
        }

        const { data, error } = await authContext.serviceClient
          .from('records')
          .select(
            'id, external_source, external_key, title, full_name, company_name, email, phone, source_id, pipeline_id, stage_id, assignee_user_id, status, priority',
          )
          .eq('workspace_id', workspaceId)
          .eq('external_source', externalSource)
          .in('external_key', keyChunk);

        if (error) {
          throw new Error(error.message);
        }

        existingRows.push(...((data ?? []) as ExistingRecordRow[]));
      }

      const recordIds = [...new Set(existingRows.map((record) => record.id))];
      const customByRecordId = new Map<string, Record<string, unknown>>();
      const definitionKeyById = new Map(
        ((customFieldDefinitions ?? []) as CustomFieldDefinitionRow[]).map((definition) => [definition.id, definition.field_key]),
      );

      if (recordIds.length > 0) {
        for (const idChunk of chunkArray(recordIds, 500)) {
          const { data, error } = await authContext.serviceClient
            .from('custom_field_values')
            .select('entity_id, field_definition_id, value_text, value_number, value_boolean, value_date, value_datetime, value_json')
            .eq('workspace_id', workspaceId)
            .eq('entity_type', 'record')
            .in('entity_id', idChunk);

          if (error) {
            throw new Error(error.message);
          }

          for (const row of (data ?? []) as CustomFieldValueRow[]) {
            const fieldKey = definitionKeyById.get(row.field_definition_id);

            if (!fieldKey) {
              continue;
            }

            const current = customByRecordId.get(row.entity_id) ?? {};
            current[fieldKey] = serializeCustomFieldValue(row);
            customByRecordId.set(row.entity_id, current);
          }
        }
      }

      for (const record of existingRows) {
        if (!record.external_source || !record.external_key) {
          continue;
        }

        const lookupKey = getExternalLookupKey(record.external_source, record.external_key);
        const custom = customByRecordId.get(record.id) ?? {};

        existingByIdentity.set(lookupKey, {
          record,
          snapshot: toRecordSnapshot(record, custom),
        });
      }
    }

    for (const prepared of preparedRows) {
      const row = prepared.row;
      try {
        const lookupKey = getExternalLookupKey(prepared.identity.external_source, prepared.identity.external_key);
        const existingMatch = existingByIdentity.get(lookupKey);

        if (existingMatch) {
          const updatePlan = buildImportUpdatePlan(
            existingMatch.snapshot,
            prepared.coreForUpdate,
            prepared.importPayload.custom,
            {
              skip_empty_core_overwrite: !allowEmptyOverwrite,
              skip_empty_custom_overwrite: !allowEmptyOverwrite,
            },
          );

          if (!updatePlan.has_changes) {
            const { error: rowUpdateError } = await authContext.serviceClient
              .from('import_rows')
              .update({
                status: 'processed',
                error_message: null,
                transformed_data: prepared.importPayload.transformed,
                validation_errors: null,
                lineage: prepared.importPayload.lineage,
                created_record_id: existingMatch.record.id,
              })
              .eq('id', row.id);

            if (rowUpdateError) {
              throw new Error(rowUpdateError.message);
            }

            skippedRows += 1;
            continue;
          }

          const updated = await updateRecordForWorkspace(
            authContext.serviceClient,
            authContext.user.id,
            existingMatch.record.id,
            {
              workspace_id: workspaceId,
              core: updatePlan.core,
              custom: updatePlan.custom,
            },
          );

          const { error: updateImportedFromError } = await authContext.serviceClient
            .from('records')
            .update({
              imported_from: job.id,
              updated_by: authContext.user.id,
            })
            .eq('workspace_id', workspaceId)
            .eq('id', updated.record.id);

          if (updateImportedFromError) {
            throw new Error(updateImportedFromError.message);
          }

          const { error: rowUpdateError } = await authContext.serviceClient
            .from('import_rows')
            .update({
              status: 'processed',
              error_message: null,
              transformed_data: prepared.importPayload.transformed,
              validation_errors: null,
              lineage: prepared.importPayload.lineage,
              created_record_id: updated.record.id,
            })
            .eq('id', row.id);

          if (rowUpdateError) {
            throw new Error(rowUpdateError.message);
          }

          updatedRows += 1;
          existingByIdentity.set(lookupKey, {
            record: {
              ...existingMatch.record,
              title: updated.record.title,
              full_name: updated.record.full_name,
              company_name: updated.record.company_name,
              email: updated.record.email,
              phone: updated.record.phone,
              source_id: updated.record.source_id,
              pipeline_id: updated.record.pipeline_id,
              stage_id: updated.record.stage_id,
              assignee_user_id: updated.record.assignee_user_id,
              status: updated.record.status,
              priority: updated.record.priority,
            },
            snapshot: {
              core: {
                title: updated.record.title,
                full_name: updated.record.full_name,
                company_name: updated.record.company_name,
                email: updated.record.email,
                phone: updated.record.phone,
                source_id: updated.record.source_id,
                pipeline_id: updated.record.pipeline_id,
                stage_id: updated.record.stage_id,
                assignee_user_id: updated.record.assignee_user_id,
                status: updated.record.status,
                priority: updated.record.priority,
              },
              custom: updated.custom ?? {},
            },
          });
          continue;
        }

        const created = await createRecordForWorkspace(authContext.serviceClient, authContext.user.id, {
          workspace_id: workspaceId,
          core: prepared.importPayload.core,
          custom: prepared.importPayload.custom,
          external_source: prepared.identity.external_source,
          external_key: prepared.identity.external_key,
        });

        const wasExistingOnConflict = (created as Record<string, unknown>)._write_action === 'existing';

        if (wasExistingOnConflict) {
          const conflictSnapshot: ImportRecordSnapshot = {
            core: {
              title: created.record.title,
              full_name: created.record.full_name,
              company_name: created.record.company_name,
              email: created.record.email,
              phone: created.record.phone,
              source_id: created.record.source_id,
              pipeline_id: created.record.pipeline_id,
              stage_id: created.record.stage_id,
              assignee_user_id: created.record.assignee_user_id,
              status: created.record.status,
              priority: created.record.priority,
            },
            custom: created.custom ?? {},
          };

          const updatePlan = buildImportUpdatePlan(
            conflictSnapshot,
            prepared.coreForUpdate,
            prepared.importPayload.custom,
            {
              skip_empty_core_overwrite: !allowEmptyOverwrite,
              skip_empty_custom_overwrite: !allowEmptyOverwrite,
            },
          );

          if (updatePlan.has_changes) {
            const conflictUpdated = await updateRecordForWorkspace(
              authContext.serviceClient,
              authContext.user.id,
              created.record.id,
              {
                workspace_id: workspaceId,
                core: updatePlan.core,
                custom: updatePlan.custom,
              },
            );

            const { error: updateImportedFromError } = await authContext.serviceClient
              .from('records')
              .update({
                imported_from: job.id,
                updated_by: authContext.user.id,
              })
              .eq('workspace_id', workspaceId)
              .eq('id', conflictUpdated.record.id);

            if (updateImportedFromError) {
              throw new Error(updateImportedFromError.message);
            }

            const { error: rowUpdateError } = await authContext.serviceClient
              .from('import_rows')
              .update({
                status: 'processed',
                error_message: null,
                transformed_data: prepared.importPayload.transformed,
                validation_errors: null,
                lineage: prepared.importPayload.lineage,
                created_record_id: conflictUpdated.record.id,
              })
              .eq('id', row.id);

            if (rowUpdateError) {
              throw new Error(rowUpdateError.message);
            }

            updatedRows += 1;
            existingByIdentity.set(lookupKey, {
              record: {
                id: conflictUpdated.record.id,
                external_source: prepared.identity.external_source,
                external_key: prepared.identity.external_key,
                title: conflictUpdated.record.title,
                full_name: conflictUpdated.record.full_name,
                company_name: conflictUpdated.record.company_name,
                email: conflictUpdated.record.email,
                phone: conflictUpdated.record.phone,
                source_id: conflictUpdated.record.source_id,
                pipeline_id: conflictUpdated.record.pipeline_id,
                stage_id: conflictUpdated.record.stage_id,
                assignee_user_id: conflictUpdated.record.assignee_user_id,
                status: conflictUpdated.record.status,
                priority: conflictUpdated.record.priority,
              },
              snapshot: {
                core: {
                  title: conflictUpdated.record.title,
                  full_name: conflictUpdated.record.full_name,
                  company_name: conflictUpdated.record.company_name,
                  email: conflictUpdated.record.email,
                  phone: conflictUpdated.record.phone,
                  source_id: conflictUpdated.record.source_id,
                  pipeline_id: conflictUpdated.record.pipeline_id,
                  stage_id: conflictUpdated.record.stage_id,
                  assignee_user_id: conflictUpdated.record.assignee_user_id,
                  status: conflictUpdated.record.status,
                  priority: conflictUpdated.record.priority,
                },
                custom: conflictUpdated.custom ?? {},
              },
            });
            continue;
          }

          const { error: rowUpdateError } = await authContext.serviceClient
            .from('import_rows')
            .update({
              status: 'processed',
              error_message: null,
              transformed_data: prepared.importPayload.transformed,
              validation_errors: null,
              lineage: prepared.importPayload.lineage,
              created_record_id: created.record.id,
            })
            .eq('id', row.id);

          if (rowUpdateError) {
            throw new Error(rowUpdateError.message);
          }

          skippedRows += 1;
          existingByIdentity.set(lookupKey, {
            record: {
              id: created.record.id,
              external_source: prepared.identity.external_source,
              external_key: prepared.identity.external_key,
              title: created.record.title,
              full_name: created.record.full_name,
              company_name: created.record.company_name,
              email: created.record.email,
              phone: created.record.phone,
              source_id: created.record.source_id,
              pipeline_id: created.record.pipeline_id,
              stage_id: created.record.stage_id,
              assignee_user_id: created.record.assignee_user_id,
              status: created.record.status,
              priority: created.record.priority,
            },
            snapshot: {
              core: {
                title: created.record.title,
                full_name: created.record.full_name,
                company_name: created.record.company_name,
                email: created.record.email,
                phone: created.record.phone,
                source_id: created.record.source_id,
                pipeline_id: created.record.pipeline_id,
                stage_id: created.record.stage_id,
                assignee_user_id: created.record.assignee_user_id,
                status: created.record.status,
                priority: created.record.priority,
              },
              custom: created.custom ?? {},
            },
          });
          continue;
        }

        const { error: rowUpdateError } = await authContext.serviceClient
          .from('import_rows')
          .update({
            status: 'processed',
            error_message: null,
            transformed_data: prepared.importPayload.transformed,
            validation_errors: null,
            lineage: prepared.importPayload.lineage,
            created_record_id: created.record.id,
          })
          .eq('id', row.id);

        if (rowUpdateError) {
          throw new Error(rowUpdateError.message);
        }

        const { error: updateImportedFromError } = await authContext.serviceClient
          .from('records')
          .update({
            imported_from: job.id,
            updated_by: authContext.user.id,
          })
          .eq('workspace_id', workspaceId)
          .eq('id', created.record.id);

        if (updateImportedFromError) {
          throw new Error(updateImportedFromError.message);
        }

        createdRows += 1;
        existingByIdentity.set(lookupKey, {
          record: {
            id: created.record.id,
            external_source: prepared.identity.external_source,
            external_key: prepared.identity.external_key,
            title: created.record.title,
            full_name: created.record.full_name,
            company_name: created.record.company_name,
            email: created.record.email,
            phone: created.record.phone,
            source_id: created.record.source_id,
            pipeline_id: created.record.pipeline_id,
            stage_id: created.record.stage_id,
            assignee_user_id: created.record.assignee_user_id,
            status: created.record.status,
            priority: created.record.priority,
          },
          snapshot: {
            core: {
              title: created.record.title,
              full_name: created.record.full_name,
              company_name: created.record.company_name,
              email: created.record.email,
              phone: created.record.phone,
              source_id: created.record.source_id,
              pipeline_id: created.record.pipeline_id,
              stage_id: created.record.stage_id,
              assignee_user_id: created.record.assignee_user_id,
              status: created.record.status,
              priority: created.record.priority,
            },
            custom: created.custom ?? {},
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to import row.';

        await authContext.serviceClient
          .from('import_rows')
          .update({
            status: 'failed',
            error_message: message,
            transformed_data: null,
            validation_errors: [{ message }],
            lineage: null,
            created_record_id: null,
          })
          .eq('id', row.id);

        failedRows += 1;
        rowFailures.push({
          rowIndex: row.row_index,
          error: message,
        });
      }
    }

    const successRows = createdRows + updatedRows + skippedRows;
    const finalStatus = failedRows < importRows.length ? 'completed' : 'failed';
    const { data: completedJob, error: jobUpdateError } = await authContext.serviceClient
      .from('import_jobs')
      .update({
        status: finalStatus,
        phase: 'completed',
        success_rows: successRows,
        failed_rows: failedRows,
        stats_json: {
          total_rows: importRows.length,
          created_rows: createdRows,
          updated_rows: updatedRows,
          skipped_rows: skippedRows,
          success_rows: successRows,
          failed_rows: failedRows,
          missing_required_targets: missingAllRequiredTargets,
        },
      })
      .eq('id', job.id)
      .select('id, workspace_id, entity_type, file_name, status, total_rows, success_rows, failed_rows, created_at, updated_at')
      .single();

    if (jobUpdateError || !completedJob) {
      return jsonResponse({ error: jobUpdateError?.message || 'Unable to finalize import job.' }, 500);
    }

    const changedRows = createdRows + updatedRows;
    const summaryMessage = failedRows > 0
      ? `Created ${createdRows}, updated ${updatedRows}, skipped ${skippedRows}, failed ${failedRows}.`
      : `Created ${createdRows}, updated ${updatedRows}, skipped ${skippedRows}.`;

    return jsonResponse({
      job: completedJob,
      importExecutionImplemented: true,
      totalRows: importRows.length,
      importedCount: changedRows,
      createdCount: createdRows,
      updatedCount: updatedRows,
      skippedCount: skippedRows,
      failedCount: failedRows,
      failures: rowFailures.slice(0, 10),
      message: summaryMessage,
    }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.';
    return jsonResponse({ error: message }, 400);
  }
});
