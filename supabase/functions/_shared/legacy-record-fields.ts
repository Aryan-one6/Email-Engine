export const LEGACY_RECORD_FIELD_KEYS = new Set([
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
