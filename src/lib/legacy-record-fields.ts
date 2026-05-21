import type { CustomFieldDefinition } from './crm-types';

const LEGACY_RECORD_FIELD_KEYS = new Set([
  'property_type',
  'budget',
  'preferred_location',
  'possession_timeline',
  'financing_required',
  'move_in_target_date',
]);

export function isLegacyRecordFieldKey(fieldKey: string | null | undefined) {
  if (typeof fieldKey !== 'string') {
    return false;
  }

  return LEGACY_RECORD_FIELD_KEYS.has(fieldKey.trim().toLowerCase());
}

export function filterLegacyRecordFields(fields: CustomFieldDefinition[]) {
  return fields.filter((field) => !isLegacyRecordFieldKey(field.field_key));
}

export function isLegacyCustomTarget(targetType: 'core' | 'custom' | null, targetKey: string | null) {
  return targetType === 'custom' && isLegacyRecordFieldKey(targetKey);
}

export function isLegacyRequiredTargetLabel(targetLabel: string) {
  if (!targetLabel.startsWith('custom:')) {
    return false;
  }

  return isLegacyRecordFieldKey(targetLabel.slice('custom:'.length));
}
