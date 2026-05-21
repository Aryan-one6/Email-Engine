import { buildImportUpdatePlan, type ImportRecordSnapshot } from './import-upsert.ts';

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${String(expected)}\nActual: ${String(actual)}`);
  }
}

function assertDeepEquals(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    throw new Error(`${message}\nExpected: ${expectedJson}\nActual: ${actualJson}`);
  }
}

function baseSnapshot(): ImportRecordSnapshot {
  return {
    core: {
      title: 'Jane Doe',
      full_name: 'Jane Doe',
      company_name: 'Acme',
      email: 'jane@acme.com',
      phone: '5552229999',
      source_id: null,
      pipeline_id: null,
      stage_id: null,
      assignee_user_id: null,
      status: 'new',
      priority: 'medium',
    },
    custom: {
      budget: 1000,
      tags: ['vip'],
      notes: 'existing note',
    },
  };
}

Deno.test('unchanged rows produce skip plan', () => {
  const snapshot = baseSnapshot();
  const plan = buildImportUpdatePlan(
    snapshot,
    {
      full_name: 'Jane Doe',
      email: 'jane@acme.com',
    },
    {
      budget: 1000,
      tags: ['vip'],
    },
    {
      skip_empty_core_overwrite: true,
      skip_empty_custom_overwrite: true,
    },
  );

  assertEquals(plan.has_changes, false, 'Unchanged rows should be skippable.');
  assertDeepEquals(plan.core, {}, 'Core patch should be empty.');
  assertDeepEquals(plan.custom, {}, 'Custom patch should be empty.');
});

Deno.test('changed fields produce minimal update payload', () => {
  const snapshot = baseSnapshot();
  const plan = buildImportUpdatePlan(
    snapshot,
    {
      full_name: 'Jane A. Doe',
      email: 'jane@acme.com',
      phone: '5552220000',
    },
    {
      budget: 2000,
      tags: ['vip', 'renewal'],
    },
    {
      skip_empty_core_overwrite: true,
      skip_empty_custom_overwrite: true,
    },
  );

  assertEquals(plan.has_changes, true, 'Changed rows should trigger updates.');
  assertDeepEquals(
    plan.core,
    {
      full_name: 'Jane A. Doe',
      phone: '5552220000',
    },
    'Only changed core fields should be included.',
  );
  assertDeepEquals(
    plan.custom,
    {
      budget: 2000,
      tags: ['vip', 'renewal'],
    },
    'Only changed custom fields should be included.',
  );
});

Deno.test('empty values do not overwrite existing values when skip options are enabled', () => {
  const snapshot = baseSnapshot();
  const plan = buildImportUpdatePlan(
    snapshot,
    {
      company_name: '   ',
      phone: '',
    },
    {
      notes: '',
      tags: [],
    },
    {
      skip_empty_core_overwrite: true,
      skip_empty_custom_overwrite: true,
    },
  );

  assertEquals(plan.has_changes, false, 'Empty import values should be ignored by default.');
  assertDeepEquals(plan.core, {}, 'Core patch should ignore empty overwrite values.');
  assertDeepEquals(plan.custom, {}, 'Custom patch should ignore empty overwrite values.');
});

Deno.test('empty values can explicitly clear fields when overwrite protection is disabled', () => {
  const snapshot = baseSnapshot();
  const plan = buildImportUpdatePlan(
    snapshot,
    {
      company_name: '',
    },
    {
      notes: '',
    },
    {
      skip_empty_core_overwrite: false,
      skip_empty_custom_overwrite: false,
    },
  );

  assertEquals(plan.has_changes, true, 'Explicit clears should be represented as changes when allowed.');
  assertDeepEquals(
    plan.core,
    { company_name: null },
    'Core field clear should normalize to null when overwrite is enabled.',
  );
  assertDeepEquals(plan.custom, { notes: '' }, 'Custom field clear should remain explicit when overwrite is enabled.');
});
