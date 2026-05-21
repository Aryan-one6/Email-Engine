export interface ImportRecordCoreSnapshot {
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

export interface ImportRecordSnapshot {
  core: ImportRecordCoreSnapshot;
  custom: Record<string, unknown>;
}

export interface ImportUpdatePlan {
  core: Record<string, unknown>;
  custom: Record<string, unknown>;
  changed_core_fields: string[];
  changed_custom_fields: string[];
  has_changes: boolean;
}

export interface ImportUpdatePlannerOptions {
  skip_empty_core_overwrite?: boolean;
  skip_empty_custom_overwrite?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeComparableString(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeCoreComparableValue(field: string, value: unknown) {
  if (
    field === 'title' ||
    field === 'full_name' ||
    field === 'company_name' ||
    field === 'email' ||
    field === 'phone' ||
    field === 'source_id' ||
    field === 'pipeline_id' ||
    field === 'stage_id' ||
    field === 'assignee_user_id' ||
    field === 'status' ||
    field === 'priority'
  ) {
    return normalizeComparableString(value);
  }

  return value;
}

function getExistingCoreValue(core: ImportRecordCoreSnapshot, field: string): unknown {
  if (field === 'title') return core.title;
  if (field === 'full_name') return core.full_name;
  if (field === 'company_name') return core.company_name;
  if (field === 'email') return core.email;
  if (field === 'phone') return core.phone;
  if (field === 'source_id') return core.source_id;
  if (field === 'pipeline_id') return core.pipeline_id;
  if (field === 'stage_id') return core.stage_id;
  if (field === 'assignee_user_id') return core.assignee_user_id;
  if (field === 'status') return core.status;
  if (field === 'priority') return core.priority;
  return undefined;
}

function isEmptyValue(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function sortObjectKeys(input: Record<string, unknown>) {
  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(input).sort()) {
    const value = input[key];
    sorted[key] = isPlainObject(value) ? sortObjectKeys(value) : value;
  }

  return sorted;
}

function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) {
    return JSON.stringify(value.map((item) => (isPlainObject(item) ? sortObjectKeys(item) : item)));
  }

  if (isPlainObject(value)) {
    return JSON.stringify(sortObjectKeys(value));
  }

  return JSON.stringify(value);
}

function areEqual(left: unknown, right: unknown) {
  return stableSerialize(left) === stableSerialize(right);
}

export function buildImportUpdatePlan(
  existing: ImportRecordSnapshot,
  incomingCore: Record<string, unknown>,
  incomingCustom: Record<string, unknown>,
  options: ImportUpdatePlannerOptions = {},
): ImportUpdatePlan {
  const changedCore: Record<string, unknown> = {};
  const changedCustom: Record<string, unknown> = {};
  const changedCoreFields: string[] = [];
  const changedCustomFields: string[] = [];

  for (const [field, incomingRawValue] of Object.entries(incomingCore)) {
    const incomingValue = normalizeCoreComparableValue(field, incomingRawValue);
    const existingValue = normalizeCoreComparableValue(field, getExistingCoreValue(existing.core, field));

    if (options.skip_empty_core_overwrite && incomingValue === null && existingValue !== null) {
      continue;
    }

    if (!areEqual(incomingValue, existingValue)) {
      changedCore[field] = incomingValue;
      changedCoreFields.push(field);
    }
  }

  for (const [field, incomingValue] of Object.entries(incomingCustom)) {
    const existingValue = existing.custom[field];

    if (options.skip_empty_custom_overwrite && isEmptyValue(incomingValue) && !isEmptyValue(existingValue)) {
      continue;
    }

    if (!areEqual(incomingValue, existingValue)) {
      changedCustom[field] = incomingValue;
      changedCustomFields.push(field);
    }
  }

  return {
    core: changedCore,
    custom: changedCustom,
    changed_core_fields: changedCoreFields,
    changed_custom_fields: changedCustomFields,
    has_changes: changedCoreFields.length > 0 || changedCustomFields.length > 0,
  };
}
