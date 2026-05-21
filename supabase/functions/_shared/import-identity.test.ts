import { buildImportIdentityKey } from './import-identity.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${String(expected)}\nActual: ${String(actual)}`);
  }
}

Deno.test('buildImportIdentityKey normalizes email and phone into deterministic composite identity', async () => {
  const identity = await buildImportIdentityKey(
    {
      Email: ' Jane@Acme.com ',
      phone_number: '(555) 222-9999',
    },
    {
      mappings: [
        { source_column: 'Email', target_type: 'core', target_key: 'email' },
        { source_column: 'phone_number', target_type: 'core', target_key: 'phone' },
      ],
    },
    'HubSpot Contacts',
  );

  assertEquals(identity.external_source, 'csv_import:hubspot_contacts', 'External source should be normalized.');
  assertEquals(
    identity.raw_identity,
    'email=jane@acme.com|phone=5552229999',
    'Composite identity should use normalized values.',
  );
  assert(identity.external_key.length === 64, 'Composite identity hash should be SHA-256 hex.');
});

Deno.test('buildImportIdentityKey uses source id when available', async () => {
  const identity = await buildImportIdentityKey(
    {
      ContactID: '  123-ABC ',
      email: 'someone@example.com',
    },
    {
      mappings: [{ source_column: 'email', target_type: 'core', target_key: 'email' }],
      source_id_columns: ['ContactID'],
    },
    'Salesforce',
  );

  assertEquals(identity.external_key, 'id:123-ABC', 'Source-system IDs should take priority over composite identity.');
  assertEquals(identity.raw_identity, 'id:123-ABC', 'Raw identity should reflect source-system ID mode.');
});

Deno.test('buildImportIdentityKey is deterministic across equivalent input variants', async () => {
  const first = await buildImportIdentityKey(
    {
      Email: 'Person@Example.com',
      phone: '+1 (212) 555-0000',
      company_name: '  ACME, Inc. ',
    },
    {
      mappings: [
        { source_column: 'Email', target_type: 'core', target_key: 'email' },
        { source_column: 'phone', target_type: 'core', target_key: 'phone' },
        { source_column: 'company_name', target_type: 'core', target_key: 'company_name' },
      ],
    },
    'CRM Feed',
  );
  const second = await buildImportIdentityKey(
    {
      Email: ' person@example.com ',
      phone: '12125550000',
      company_name: 'acme inc',
    },
    {
      mappings: [
        { source_column: 'Email', target_type: 'core', target_key: 'email' },
        { source_column: 'phone', target_type: 'core', target_key: 'phone' },
        { source_column: 'company_name', target_type: 'core', target_key: 'company_name' },
      ],
    },
    'CRM Feed',
  );

  assertEquals(first.external_key, second.external_key, 'Equivalent logical rows should hash to same external key.');
});

Deno.test('buildImportIdentityKey fails when identity fields are all missing', async () => {
  let errorMessage = '';

  try {
    await buildImportIdentityKey(
      { random_column: 'value' },
      {
        mappings: [{ source_column: 'random_column', target_type: 'custom', target_key: 'notes' }],
      },
      'No Identity Source',
    );
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  assertEquals(
    errorMessage,
    'Unable to generate deterministic identity key',
    'Rows without deterministic identity fields should fail clearly.',
  );
});

Deno.test('parallel identity generation stays idempotent', async () => {
  const rows = Array.from({ length: 8 }, () => ({
    email: 'Parallel@Test.com ',
    phone: '(999) 111-2222',
  }));

  const identities = await Promise.all(
    rows.map((row) =>
      buildImportIdentityKey(
        row,
        {
          mappings: [
            { source_column: 'email', target_type: 'core', target_key: 'email' },
            { source_column: 'phone', target_type: 'core', target_key: 'phone' },
          ],
        },
        'Concurrent Import',
      )
    ),
  );

  const distinctKeys = new Set(identities.map((identity) => identity.external_key));
  assertEquals(distinctKeys.size, 1, 'Concurrent processing should produce one deterministic key for the same logical row.');
});
