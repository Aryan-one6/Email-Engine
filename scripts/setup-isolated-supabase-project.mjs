#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const siblingCoreflowRoot = path.resolve(repoRoot, '..', 'coreflow-engine');
const supabaseDir = path.join(repoRoot, 'supabase');
const tempDir = path.join(supabaseDir, '.temp');
const rootEnvPath = path.join(repoRoot, '.env');
const rootEnvExamplePath = path.join(repoRoot, '.env.example');
const functionsEnvPath = path.join(supabaseDir, '.env');
const functionsEnvExamplePath = path.join(supabaseDir, '.env.example');
const configPath = path.join(supabaseDir, 'config.toml');

const DEFAULT_REGION = 'ap-south-1';
const DEFAULT_PROJECT_PREFIX = 'email-engine';

function usage() {
  console.log(
    [
      'Create and wire a dedicated Supabase project for Email-Engine (separate from CoreFlow).',
      '',
      'Usage:',
      '  node scripts/setup-isolated-supabase-project.mjs [options]',
      '',
      'Options:',
      '  --project-ref <ref>      Use an existing Supabase project ref (skips project creation)',
      '  --project-name <name>    Supabase project name (default: email-engine-<timestamp>)',
      `  --region <region>        Supabase region (default: ${DEFAULT_REGION})`,
      '  --org-id <org-id>        Supabase organization id (optional if auto-detect succeeds)',
      '  --db-password <pwd>      Postgres database password for new project (auto-generated if omitted)',
      '  -h, --help               Show this help',
      '',
      'Prerequisites:',
      '  1) Supabase CLI installed',
      '  2) Logged in via `supabase login --token <SUPABASE_ACCESS_TOKEN>`',
      '',
      'Environment safety:',
      '  - Updates local `.env` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
      '  - Creates/updates `supabase/.env` with SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY',
      '  - Updates `supabase/config.toml` project_id',
      '',
      'Note: This script does not deploy migrations/functions automatically.',
    ].join('\n'),
  );
}

function parseArgs(argv) {
  const opts = {
    projectRef: '',
    projectName: '',
    region: DEFAULT_REGION,
    orgId: '',
    dbPassword: '',
    help: false,
  };

  const readValue = (i, flag) => {
    const next = argv[i + 1];
    if (!next || next.startsWith('-')) {
      throw new Error(`Missing value for ${flag}`);
    }
    return next;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '-h' || arg === '--help') {
      opts.help = true;
      continue;
    }
    if (arg === '--project-name') {
      opts.projectName = readValue(i, arg);
      i += 1;
      continue;
    }
    if (arg === '--project-ref') {
      opts.projectRef = readValue(i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith('--project-ref=')) {
      opts.projectRef = arg.slice('--project-ref='.length);
      continue;
    }
    if (arg.startsWith('--project-name=')) {
      opts.projectName = arg.slice('--project-name='.length);
      continue;
    }
    if (arg === '--region') {
      opts.region = readValue(i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith('--region=')) {
      opts.region = arg.slice('--region='.length);
      continue;
    }
    if (arg === '--org-id') {
      opts.orgId = readValue(i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith('--org-id=')) {
      opts.orgId = arg.slice('--org-id='.length);
      continue;
    }
    if (arg === '--db-password') {
      opts.dbPassword = readValue(i, arg);
      i += 1;
      continue;
    }
    if (arg.startsWith('--db-password=')) {
      opts.dbPassword = arg.slice('--db-password='.length);
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return opts;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function runChecked(command, args, options = {}) {
  const result = run(command, args, options);
  if (result.status !== 0) {
    const output = [result.stdout || '', result.stderr || ''].join('\n').trim();
    throw new Error(output || `${command} ${args.join(' ')} failed with exit code ${result.status}`);
  }
  return result;
}

function runSupabase(args, options = {}) {
  return run('supabase', args, options);
}

function runSupabaseChecked(args, options = {}) {
  return runChecked('supabase', args, options);
}

function runSupabaseJson(args) {
  const jsonArgs = [...args, '-o', 'json'];
  const result = runSupabaseChecked(jsonArgs);
  const payload = result.stdout?.trim();
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Failed to parse JSON from: supabase ${jsonArgs.join(' ')}\n${payload}`);
  }
}

function mask(value, visible = 6) {
  if (!value) {
    return '';
  }
  if (value.length <= visible * 2) {
    return `${value.slice(0, visible)}...`;
  }
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function timestamp() {
  const now = new Date();
  const p = (n) => `${n}`.padStart(2, '0');
  return `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}${p(now.getUTCHours())}${p(now.getUTCMinutes())}`;
}

function generatePassword() {
  return crypto
    .randomBytes(24)
    .toString('base64url')
    .replace(/[^A-Za-z0-9]/g, '')
    .slice(0, 32);
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function readTextIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function extractProjectIdFromConfig(configText) {
  const match = configText.match(/^project_id\s*=\s*"([a-z0-9]+)"\s*$/m);
  return match?.[1]?.trim() || '';
}

function extractProjectRefFromUrl(envText) {
  const match = envText.match(/VITE_SUPABASE_URL\s*=\s*"?https:\/\/([a-z0-9]+)\.supabase\.co"?/);
  return match?.[1]?.trim() || '';
}

function detectSiblingCoreflowRefs() {
  if (!fs.existsSync(siblingCoreflowRoot)) {
    return [];
  }

  const refs = new Set();
  const configText = readTextIfExists(path.join(siblingCoreflowRoot, 'supabase', 'config.toml'));
  const configProjectId = extractProjectIdFromConfig(configText);
  if (configProjectId) {
    refs.add(configProjectId);
  }

  const envText = readTextIfExists(path.join(siblingCoreflowRoot, '.env'));
  const envProjectRef = extractProjectRefFromUrl(envText);
  if (envProjectRef) {
    refs.add(envProjectRef);
  }

  const linkedProject = readJsonIfExists(path.join(siblingCoreflowRoot, 'supabase', '.temp', 'linked-project.json'));
  const linkedProjectRef = String(linkedProject?.project_ref || linkedProject?.ref || '').trim();
  if (linkedProjectRef) {
    refs.add(linkedProjectRef);
  }

  const projectRefFile = readTextIfExists(path.join(siblingCoreflowRoot, 'supabase', '.temp', 'project-ref')).trim();
  if (projectRefFile) {
    refs.add(projectRefFile);
  }

  return [...refs];
}

function assertNotCollidingWithCoreflow(projectRef) {
  const coreflowRefs = detectSiblingCoreflowRefs();
  if (coreflowRefs.length === 0) {
    return;
  }

  if (coreflowRefs.includes(projectRef)) {
    throw new Error(
      [
        `Collision detected: Email-Engine project ref (${projectRef}) matches coreflow-engine Supabase project ref.`,
        'Use a different Supabase project for Email-Engine to keep both apps isolated.',
        'Example:',
        '  npm run supabase:setup-isolated-project -- --project-ref <EMAIL_ENGINE_PROJECT_REF>',
      ].join('\n'),
    );
  }
}

function pickOrgIdFromLinkedProject() {
  const linked = readJsonIfExists(path.join(tempDir, 'linked-project.json'));
  if (!linked || typeof linked !== 'object') {
    return '';
  }
  return String(linked.organization_id || linked.organizationId || '').trim();
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    const values = Object.values(payload).find((value) => Array.isArray(value));
    if (Array.isArray(values)) {
      return values;
    }
  }
  return [];
}

function detectOrgId(payload) {
  const organizations = normalizeArray(payload);
  if (organizations.length === 1) {
    const org = organizations[0];
    return String(org.id || org.organization_id || org.slug || org.name || '').trim();
  }
  return '';
}

function findProjectRef(payload) {
  const tryObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return '';
    }
    const direct =
      obj.ref ||
      obj.project_ref ||
      obj.projectRef ||
      obj.reference ||
      obj.reference_id ||
      obj.project_id;
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
    return '';
  };

  if (Array.isArray(payload)) {
    for (const item of payload) {
      const ref = tryObject(item);
      if (ref) {
        return ref;
      }
    }
  } else {
    const ref = tryObject(payload);
    if (ref) {
      return ref;
    }
  }

  const raw = JSON.stringify(payload);
  const regex = /[a-z0-9]{20}/g;
  const matches = raw.match(regex) || [];
  return matches[0] || '';
}

function findApiKey(payload, matcher) {
  const keys = normalizeArray(payload);
  for (const key of keys) {
    if (!key || typeof key !== 'object') {
      continue;
    }
    const text = [
      key.name,
      key.type,
      key.role,
      key.description,
      key.key_type,
      key.keyType,
      key.tag,
      key.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (!matcher(text, key)) {
      continue;
    }

    const value =
      key.api_key ||
      key.key ||
      key.value ||
      key.token ||
      key.secret ||
      key.apiKey;
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function upsertQuotedKey(content, key, value) {
  const line = `${key}="${value}"`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }

  const normalized = content.trimEnd();
  if (!normalized) {
    return `${line}\n`;
  }
  return `${normalized}\n${line}\n`;
}

function updateEnvFile(filePath, updates) {
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const next = Object.entries(updates).reduce((acc, [key, value]) => upsertQuotedKey(acc, key, value), current);
  fs.writeFileSync(filePath, next, 'utf8');
}

function ensureFunctionsEnvTemplate() {
  if (fs.existsSync(functionsEnvPath)) {
    return;
  }
  if (fs.existsSync(functionsEnvExamplePath)) {
    fs.copyFileSync(functionsEnvExamplePath, functionsEnvPath);
    return;
  }
  fs.writeFileSync(functionsEnvPath, '', 'utf8');
}

function updateConfigProjectId(projectRef) {
  if (!fs.existsSync(configPath)) {
    return;
  }
  const current = fs.readFileSync(configPath, 'utf8');
  const next = current.match(/^project_id\s*=\s*".*"$/m)
    ? current.replace(/^project_id\s*=\s*".*"$/m, `project_id = "${projectRef}"`)
    : `project_id = "${projectRef}"\n${current}`;
  fs.writeFileSync(configPath, next, 'utf8');
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    return;
  }

  runSupabaseChecked(['--version']);

  const probe = runSupabase(['projects', 'list', '-o', 'json']);
  if (probe.status !== 0) {
    const output = [probe.stdout || '', probe.stderr || ''].join('\n').trim();
    if (/access token not provided/i.test(output)) {
      throw new Error(
        [
          'Supabase CLI is not authenticated.',
          'Run one of the following and retry:',
          '  supabase login',
          '  supabase login --token <SUPABASE_ACCESS_TOKEN>',
        ].join('\n'),
      );
    }
    throw new Error(output || 'Unable to verify Supabase authentication.');
  }

  const explicitProjectRef = (opts.projectRef || '').trim();
  const dbPassword = (opts.dbPassword || generatePassword()).trim();

  let projectRef = explicitProjectRef;

  if (!projectRef) {
    let orgId = (opts.orgId || '').trim();
    if (!orgId) {
      orgId = pickOrgIdFromLinkedProject();
    }
    if (!orgId) {
      const orgsPayload = runSupabaseJson(['orgs', 'list']);
      orgId = detectOrgId(orgsPayload);
      if (!orgId) {
        throw new Error(
          'Could not auto-detect Supabase org id. Re-run with --org-id <your-org-id>. Use `supabase orgs list -o json` to inspect available orgs.',
        );
      }
    }

    const projectName = (opts.projectName || `${DEFAULT_PROJECT_PREFIX}-${timestamp()}`).trim();
    const region = (opts.region || DEFAULT_REGION).trim();

    console.log(`Creating Supabase project "${projectName}" in org "${orgId}" (${region})...`);
    const createResult = runSupabase(['projects', 'create', projectName, '--org-id', orgId, '--region', region, '--db-password', dbPassword, '-o', 'json']);
    if (createResult.status !== 0) {
      const output = [createResult.stdout || '', createResult.stderr || ''].join('\n').trim();
      if (/necessary privileges|access-control/i.test(output)) {
        throw new Error(
          [
            output,
            '',
            'Your Supabase role cannot create projects in this organization.',
            'Use a project created by an org owner/admin and rerun:',
            '  npm run supabase:setup-isolated-project -- --project-ref <NEW_EMAIL_ENGINE_PROJECT_REF>',
          ].join('\n'),
        );
      }
      throw new Error(output || 'Failed to create Supabase project.');
    }
    const createdPayload = JSON.parse(createResult.stdout || '{}');
    projectRef = findProjectRef(createdPayload);
    if (!projectRef) {
      throw new Error(
        `Project creation succeeded but project ref could not be detected. Inspect response manually: ${JSON.stringify(createdPayload)}`,
      );
    }

    console.log(`New Supabase project ref: ${projectRef}`);
  } else {
    console.log(`Using existing Supabase project ref: ${projectRef}`);
  }

  assertNotCollidingWithCoreflow(projectRef);

  console.log('Linking local Supabase config to the selected project...');
  if ((opts.dbPassword || '').trim()) {
    runSupabaseChecked(['link', '--project-ref', projectRef, '--password', dbPassword], { stdio: 'inherit' });
  } else {
    runSupabaseChecked(['link', '--project-ref', projectRef], { stdio: 'inherit' });
  }

  console.log('Fetching API keys from the selected project...');
  const apiKeysPayload = runSupabaseJson(['projects', 'api-keys', '--project-ref', projectRef]);
  const anonKey =
    findApiKey(
      apiKeysPayload,
      (text) => (text.includes('anon') || text.includes('publishable')) && !text.includes('service'),
    ) || '';
  const serviceRoleKey = findApiKey(apiKeysPayload, (text) => text.includes('service') && text.includes('role')) || '';

  if (!anonKey) {
    throw new Error('Could not detect anon/publishable API key from `supabase projects api-keys` output.');
  }
  if (!serviceRoleKey) {
    throw new Error('Could not detect service-role API key from `supabase projects api-keys` output.');
  }

  const supabaseUrl = `https://${projectRef}.supabase.co`;
  updateEnvFile(rootEnvPath, {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
  });

  if (!fs.existsSync(rootEnvExamplePath)) {
    fs.writeFileSync(
      rootEnvExamplePath,
      ['VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"', 'VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLISHABLE_ANON_KEY"', ''].join(
        '\n',
      ),
      'utf8',
    );
  }

  ensureFunctionsEnvTemplate();
  updateEnvFile(functionsEnvPath, {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  });

  updateConfigProjectId(projectRef);

  console.log('\nSetup complete.');
  console.log(`- Project ref: ${projectRef}`);
  console.log(`- Project URL: ${supabaseUrl}`);
  console.log(`- Root .env updated: ${rootEnvPath}`);
  console.log(`- Functions .env updated: ${functionsEnvPath}`);
  console.log(`- Service role key: ${mask(serviceRoleKey)}`);
  console.log('\nNext steps:');
  console.log('1) Run migrations: supabase db push');
  console.log('2) Deploy required functions: supabase functions deploy <function-name>');
  console.log('3) Set corresponding env vars in Vercel (if cron/API routes are deployed there).');
}

try {
  main();
} catch (error) {
  console.error('\nFailed to setup isolated Supabase project.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
