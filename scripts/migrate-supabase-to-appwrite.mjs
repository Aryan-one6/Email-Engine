import pg from 'pg';
import {
  Client as AppwriteClient,
  ID,
  Permission,
  Role,
  TablesDB,
} from 'node-appwrite';

const { Client: PostgresClient } = pg;
const BATCH_SIZE = 250;
const MAX_STRING_SIZE = 65535;
const VALID_ROW_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,35}$/;

const args = new Set(process.argv.slice(2));
const execute = args.has('--execute');
const sourceUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL;
const appwriteEndpoint = process.env.APPWRITE_ENDPOINT ?? 'https://sgp.cloud.appwrite.io/v1';
const appwriteProjectId = process.env.APPWRITE_PROJECT_ID ?? '6a882bdb0009b0f946b6';
const appwriteDatabaseId =
  process.env.APPWRITE_DATABASE_ID ??
  process.env.VITE_APPWRITE_DATABASE_ID ??
  '6a8830ba002ebb129796';
const appwriteApiKey = process.env.APPWRITE_API_KEY;
const permissionMode = process.env.APPWRITE_MIGRATION_PERMISSIONS ?? 'none';

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error(`Unsafe PostgreSQL identifier: ${identifier}`);
  }

  return `"${identifier.replaceAll('"', '""')}"`;
}

function appwritePermissions() {
  if (permissionMode === 'none') return [];
  if (permissionMode === 'authenticated') {
    return [Permission.read(Role.users()), Permission.write(Role.users())];
  }

  throw new Error(
    'APPWRITE_MIGRATION_PERMISSIONS must be "none" or "authenticated".',
  );
}

function appwriteColumn(column) {
  const key = column.column_name;
  const isArray = column.data_type === 'ARRAY';
  const dataType = isArray ? column.udt_name.replace(/^_/, '') : column.data_type;

  if (isArray) {
    return {
      key,
      type: 'string',
      size: MAX_STRING_SIZE,
      required: false,
      array: true,
    };
  }

  if (dataType === 'boolean') return { key, type: 'boolean', required: false };
  if (['smallint', 'integer', 'bigint'].includes(dataType)) {
    return { key, type: 'integer', required: false };
  }
  if (['numeric', 'decimal', 'real', 'double precision'].includes(dataType)) {
    return { key, type: 'double', required: false };
  }
  if (['timestamp without time zone', 'timestamp with time zone'].includes(dataType)) {
    return { key, type: 'datetime', required: false };
  }

  // JSON, UUIDs, enums, dates, text, and varchar values are kept as strings.
  // This is deliberately permissive so nullable/default-heavy Supabase schemas
  // can be imported without losing rows during the initial migration.
  return {
    key,
    type: 'string',
    size: Math.min(column.character_maximum_length ?? MAX_STRING_SIZE, MAX_STRING_SIZE),
    required: false,
  };
}

function normalizeValue(value, column) {
  if (value === null || value === undefined) return undefined;
  if (column.data_type === 'ARRAY') {
    return Array.isArray(value)
      ? value.map((item) =>
          item !== null && typeof item === 'object' ? JSON.stringify(item) : String(item),
        )
      : [];
  }
  if (column.udt_name === 'json' || column.udt_name === 'jsonb') {
    return typeof value === 'string' ? value : JSON.stringify(value);
  }
  if (
    column.data_type === 'timestamp without time zone' ||
    column.data_type === 'timestamp with time zone'
  ) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
  }
  if (typeof value === 'bigint') return Number(value);
  return value;
}

function rowIdFor(row) {
  const sourceId = row.id;
  return typeof sourceId === 'string' && VALID_ROW_ID.test(sourceId) ? sourceId : ID.unique();
}

function isNotFound(error) {
  return error?.code === 404 || error?.status === 404;
}

async function getSchema(client) {
  const result = await client.query(`
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.udt_name,
      c.character_maximum_length,
      c.ordinal_position
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    ORDER BY c.table_name, c.ordinal_position
  `);

  const schema = new Map();
  for (const column of result.rows) {
    if (!schema.has(column.table_name)) schema.set(column.table_name, []);
    schema.get(column.table_name).push(column);
  }
  return schema;
}

async function migrateTable({ source, tablesDB, tableName, columns }) {
  const quotedTable = quoteIdentifier(tableName);
  const countResult = await source.query(`SELECT count(*)::bigint AS count FROM public.${quotedTable}`);
  const sourceCount = Number(countResult.rows[0].count);
  const appwriteColumns = columns.map(appwriteColumn);

  console.log(`- ${tableName}: ${sourceCount} row(s), ${columns.length} column(s)`);
  if (!execute) return { tableName, sourceCount, migratedCount: 0 };

  try {
    await tablesDB.getTable({ databaseId: appwriteDatabaseId, tableId: tableName });
    throw new Error(
      `Appwrite table "${tableName}" already exists. This migration never overwrites existing tables; use a new Appwrite database or migrate that table manually.`,
    );
  } catch (error) {
    if (!isNotFound(error)) throw error;
  }

  await tablesDB.createTable({
    databaseId: appwriteDatabaseId,
    tableId: tableName,
    name: tableName,
    permissions: appwritePermissions(),
    rowSecurity: permissionMode === 'none',
    enabled: true,
    columns: appwriteColumns,
  });

  let offset = 0;
  let migratedCount = 0;
  while (offset < sourceCount) {
    const result = await source.query(
      `SELECT * FROM public.${quotedTable} LIMIT $1 OFFSET $2`,
      [BATCH_SIZE, offset],
    );

    for (const row of result.rows) {
      const data = {};
      for (const column of columns) {
        const value = normalizeValue(row[column.column_name], column);
        if (value !== undefined && !column.column_name.startsWith('$')) {
          data[column.column_name] = value;
        }
      }

      await tablesDB.createRow({
        databaseId: appwriteDatabaseId,
        tableId: tableName,
        rowId: rowIdFor(row),
        data,
      });
      migratedCount += 1;
    }

    offset += result.rows.length;
    console.log(`  migrated ${migratedCount}/${sourceCount}`);
    if (result.rows.length === 0) break;
  }

  return { tableName, sourceCount, migratedCount };
}

async function main() {
  if (!sourceUrl) {
    throw new Error(
      'Missing SUPABASE_DATABASE_URL. Use the Supabase session pooler connection string as a local environment variable.',
    );
  }
  if (!/^postgres(?:ql)?:\/\//i.test(sourceUrl)) {
    throw new Error(
      'SUPABASE_DATABASE_URL must be a PostgreSQL connection string beginning with postgres:// or postgresql://. SUPABASE_URL (https://...) is only the Supabase API URL.',
    );
  }
  if (execute && !appwriteApiKey) {
    throw new Error(
      'Missing APPWRITE_API_KEY. Use a server API key with databases/tables/columns/rows read-write scopes; never put it in VITE_* variables.',
    );
  }

  const source = new PostgresClient({ connectionString: sourceUrl });
  await source.connect();

  try {
    const schema = await getSchema(source);
    if (schema.size === 0) throw new Error('No public Supabase tables were found.');

    console.log(`${execute ? 'EXECUTE' : 'DRY RUN'}: ${schema.size} public table(s) found.`);
    if (!execute) {
      console.log('No Appwrite resources will be changed. Re-run with --execute to migrate.');
    }

    let migrated = 0;
    for (const [tableName, columns] of schema) {
      const appwriteClient = new AppwriteClient()
        .setEndpoint(appwriteEndpoint)
        .setProject(appwriteProjectId);
      if (execute) appwriteClient.setKey(appwriteApiKey);
      const tablesDB = new TablesDB(appwriteClient);
      const result = await migrateTable({ source, tablesDB, tableName, columns });
      migrated += result.migratedCount;
    }

    if (execute) {
      console.log(`Migration complete: ${migrated} row(s) written to Appwrite database ${appwriteDatabaseId}.`);
    }
  } finally {
    await source.end();
  }
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
