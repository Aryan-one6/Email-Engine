import fs from 'node:fs/promises';
import path from 'node:path';
import {
  Client,
  Permission,
  Role,
  Storage,
  TablesDB,
} from 'node-appwrite';

const root = process.cwd();
const databaseId = process.env.APPWRITE_DATABASE_ID ?? process.env.VITE_APPWRITE_DATABASE_ID ?? '6a8830ba002ebb129796';
const endpoint = process.env.APPWRITE_ENDPOINT ?? 'https://sgp.cloud.appwrite.io/v1';
const projectId = process.env.APPWRITE_PROJECT_ID ?? '6a882bdb0009b0f946b6';
const apiKey = process.env.APPWRITE_API_KEY;
const dryRun = process.argv.includes('--dry-run');
const permissionMode = process.env.APPWRITE_BOOTSTRAP_PERMISSIONS ?? 'authenticated';

function splitSql(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (quote) {
      if (char === quote && value[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  const last = value.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function findClosingParen(source, openingIndex) {
  let depth = 1;
  let quote = null;
  for (let index = openingIndex + 1; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote && source[index - 1] !== '\\') quote = null;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')' && --depth === 0) return index;
  }
  return -1;
}

function columnFromSql(definition) {
  const cleaned = definition.replace(/\s+/g, ' ').trim();
  if (/^(constraint|primary key|unique|foreign key|check|exclude)\b/i.test(cleaned)) return null;
  const match = cleaned.match(/^([a-zA-Z_][a-zA-Z0-9_$]*)\s+(.+?)(?=\s+(?:not\s+null|null|default|primary\s+key|unique|references|check|collate)\b|$)/i);
  if (!match) return null;
  const key = match[1];
  const rawType = match[2].trim().toLowerCase();
  const array = rawType.endsWith('[]');
  const type = rawType.replace(/\[\]$/, '').trim();

  if (array) return { key, type: 'string', size: 65535, required: false, array: true };
  if (type === 'boolean') return { key, type: 'boolean', required: false };
  if (/^(smallint|integer|bigint|serial|bigserial)$/i.test(type)) return { key, type: 'integer', required: false };
  if (/^(numeric|decimal|real|double precision|float|money)$/i.test(type)) return { key, type: 'double', required: false };
  if (/^(timestamp|timestamp with time zone|timestamp without time zone)$/i.test(type)) return { key, type: 'datetime', required: false };
  if (/^date$/i.test(type)) return { key, type: 'string', size: 32, required: false };
  if (/^uuid$/i.test(type)) return { key, type: 'string', size: 36, required: false };
  if (/^(json|jsonb|text|citext|bytea|vector|inet|point|tsvector)$/i.test(type)) return { key, type: 'string', size: 65535, required: false };
  if (/^(varchar|character varying|char|character)/i.test(type)) return { key, type: 'string', size: 65535, required: false };
  return { key, type: 'string', size: 65535, required: false };
}

async function readSchema() {
  const migrationDir = path.join(root, 'supabase', 'migrations');
  const files = (await fs.readdir(migrationDir)).filter((file) => file.endsWith('.sql')).sort();
  const tables = new Map();
  for (const file of files) {
    const source = await fs.readFile(path.join(migrationDir, file), 'utf8');
    const createPattern = /create\s+table\s+if\s+not\s+exists\s+public\.([a-zA-Z0-9_]+)\s*\(/gi;
    for (const match of source.matchAll(createPattern)) {
      const opening = match.index + match[0].lastIndexOf('(');
      const closing = findClosingParen(source, opening);
      if (closing < 0) continue;
      const columns = splitSql(source.slice(opening + 1, closing)).map(columnFromSql).filter(Boolean);
      const existing = tables.get(match[1]) ?? new Map();
      for (const column of columns) existing.set(column.key, column);
      tables.set(match[1], existing);
    }
  }
  return new Map([...tables.entries()].map(([name, columns]) => [name, [...columns.values()]]));
}

function permissions() {
  if (permissionMode === 'none') return [];
  if (permissionMode === 'authenticated') return [Permission.read(Role.users()), Permission.write(Role.users())];
  throw new Error('APPWRITE_BOOTSTRAP_PERMISSIONS must be none or authenticated.');
}

function storagePermissions() {
  if (permissionMode === 'none') return [];
  return [
    Permission.read(Role.users()),
    Permission.create(Role.users()),
    Permission.update(Role.users()),
    Permission.delete(Role.users()),
  ];
}

async function main() {
  const schema = await readSchema();
  console.log(`${dryRun ? 'DRY RUN' : 'BOOTSTRAP'}: ${schema.size} Appwrite table(s) from Supabase migrations.`);
  for (const [tableId, columns] of schema) console.log(`- ${tableId}: ${columns.length} column(s)`);
  if (dryRun) return;
  if (!apiKey) throw new Error('Missing APPWRITE_API_KEY. Create a server key with databases/tables/columns/rows write scopes.');

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);
  for (const [tableId, columns] of schema) {
    try {
      const existing = await tablesDB.getTable({ databaseId, tableId });
      const existingKeys = new Set(existing.columns.map((column) => column.key));
      console.log(`Keeping existing table ${tableId}; ${existing.columns.length} column(s) already present.`);
      for (const column of columns.filter((item) => !existingKeys.has(item.key))) {
        const params = { databaseId, tableId, key: column.key, required: false, ...(column.size ? { size: column.size } : {}), ...(column.array ? { array: true } : {}) };
        const method = {
          string: 'createStringColumn',
          boolean: 'createBooleanColumn',
          integer: 'createIntegerColumn',
          double: 'createFloatColumn',
          datetime: 'createDatetimeColumn',
        }[column.type];
        if (!method) throw new Error(`Unsupported Appwrite column type ${column.type}`);
        await tablesDB[method](params);
      }
      continue;
    } catch (error) {
      if (error?.code !== 404 && error?.status !== 404) throw error;
    }
    await tablesDB.createTable({
      databaseId,
      tableId,
      name: tableId,
      permissions: permissions(),
      rowSecurity: permissionMode === 'none',
      enabled: true,
      columns,
    });
    console.log(`Created ${tableId}.`);
  }
  try {
    await storage.getBucket({ bucketId: 'email-assets' });
    console.log('Keeping existing storage bucket email-assets.');
  } catch (error) {
    if (error?.code !== 404 && error?.status !== 404) throw error;
    await storage.createBucket({
      bucketId: 'email-assets',
      name: 'Email assets',
      permissions: storagePermissions(),
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 50 * 1024 * 1024,
    });
    console.log('Created storage bucket email-assets.');
  }
  console.log(`Appwrite schema bootstrap complete for database ${databaseId}.`);
}

main().catch((error) => {
  console.error(`Appwrite bootstrap failed: ${error.message}`);
  process.exitCode = 1;
});
