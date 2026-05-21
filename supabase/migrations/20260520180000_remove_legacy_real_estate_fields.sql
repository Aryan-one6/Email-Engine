begin;

update public.custom_field_definitions
set
  is_active = false,
  is_required = false,
  updated_at = timezone('utc', now())
where entity_type = 'record'
  and field_key in (
    'property_type',
    'budget',
    'preferred_location',
    'possession_timeline',
    'financing_required',
    'move_in_target_date'
  );

delete from public.semantic_bindings
where target_type = 'custom'
  and target_key in (
    'property_type',
    'budget',
    'preferred_location',
    'possession_timeline',
    'financing_required',
    'move_in_target_date'
  );

delete from public.value_transform_rules
where target_type = 'custom'
  and target_key in (
    'property_type',
    'budget',
    'preferred_location',
    'possession_timeline',
    'financing_required',
    'move_in_target_date'
  );

delete from public.option_aliases
where field_key in (
  'property_type',
  'budget',
  'preferred_location',
  'possession_timeline',
  'financing_required',
  'move_in_target_date'
);

delete from public.import_profile_mappings
where target_type = 'custom'
  and target_key in (
    'property_type',
    'budget',
    'preferred_location',
    'possession_timeline',
    'financing_required',
    'move_in_target_date'
  );

commit;
