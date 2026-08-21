import { ExecutionMethod, Functions, ID, Query, Storage, TablesDB } from 'appwrite';
import { account as appwriteAccount, client as appwriteClient } from './appwrite';

const appwriteDatabaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID?.trim();

export const isAppwriteConfigured = true;

export interface AppUser {
  id: string;
  email: string;
  name: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
}

export interface AppSession {
  id: string;
  user: AppUser;
  user_id: string;
  access_token: string;
  expires_at?: number;
}

function mapUser(user: { $id: string; email: string; name: string; prefs?: Record<string, unknown>; emailVerification?: boolean; accessedAt?: string }): AppUser {
  return { id: user.$id, email: user.email, name: user.name, user_metadata: user.prefs ?? {}, app_metadata: {}, email_confirmed_at: user.emailVerification ? user.accessedAt ?? new Date().toISOString() : null, last_sign_in_at: user.accessedAt ?? null };
}

async function toAppSession(session: { $id: string; userId: string; expire?: string }): Promise<AppSession> {
  return { id: session.$id, user_id: session.userId, user: mapUser(await getAppwriteAccount().get()), access_token: '', expires_at: session.expire ? Math.floor(new Date(session.expire).getTime() / 1000) : undefined };
}

const client = appwriteClient;
const account = appwriteAccount;
const functions = new Functions(client);
const tablesDb = new TablesDB(client);
const storage = new Storage(client);

function getAppwriteAccount() {
  return account;
}

function getAppwriteFunctions() {
  return functions;
}

function getAppwriteTablesDb() {
  if (!appwriteDatabaseId) throw new Error('Missing Appwrite database configuration. Add VITE_APPWRITE_DATABASE_ID.');
  return tablesDb;
}

function getAppwriteStorage() {
  return storage;
}

const JSON_FIELDS = new Set([
  'layout_json',
  'theme_overrides',
  'preview_meta',
  'metadata',
  'recipient_filter',
  'details',
  'custom_values',
  'settings',
]);

function serializeRow(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      JSON_FIELDS.has(key) && value !== null && typeof value === 'object' ? JSON.stringify(value) : value,
    ]),
  );
}

function deserializeRow<T extends Record<string, unknown>>(row: T) {
  const result = { ...row } as Record<string, unknown>;
  if (result.id === undefined && typeof result.$id === 'string') result.id = result.$id;
  for (const key of JSON_FIELDS) {
    if (typeof result[key] !== 'string') continue;
    try { result[key] = JSON.parse(result[key] as string); } catch { /* preserve malformed legacy text */ }
  }
  return result as T;
}

function envKeyPart(value: string) { return value.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase(); }
function getFunctionId(name: string) { return import.meta.env[`VITE_APPWRITE_FUNCTION_${envKeyPart(name)}`]?.trim() || name; }
function getTableId(name: string) { return import.meta.env[`VITE_APPWRITE_TABLE_${envKeyPart(name)}`]?.trim() || name; }
function asError(error: unknown) {
  const appwriteError = error as { message?: string; code?: number; type?: string };
  return {
    message: appwriteError?.message || (error instanceof Error ? error.message : 'Appwrite request failed.'),
    code: appwriteError?.code,
    type: appwriteError?.type,
  };
}

export const appwrite = {
  account: {
    async getSession() {
      try {
        const session = await getAppwriteAccount().getSession({ sessionId: 'current' });
        return { data: { session: await toAppSession(session) }, error: null };
      } catch (error) { return { data: { session: null }, error: asError(error) }; }
    },
    async getUser() {
      try { return { data: { user: mapUser(await getAppwriteAccount().get()) }, error: null }; }
      catch (error) { return { data: { user: null }, error: asError(error) }; }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const session = await getAppwriteAccount().createEmailPasswordSession({ email, password });
        const mapped = await toAppSession(session);
        return { data: { session: mapped, user: mapped.user }, error: null };
      } catch (error) { return { data: { session: null, user: null }, error: asError(error) }; }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const user = await getAppwriteAccount().create({ userId: ID.unique(), email, password, name: String(options?.data?.full_name ?? '') });
        const session = await getAppwriteAccount().createEmailPasswordSession({ email, password });
        if (options?.data) await getAppwriteAccount().updatePrefs({ prefs: options.data });
        const mapped = await toAppSession(session);
        return { data: { user: { ...mapped.user, id: user.$id }, session: mapped }, error: null };
      } catch (error) { return { data: { user: null, session: null }, error: asError(error) }; }
    },
    async updateUser({ data, password }: { data?: Record<string, unknown>; password?: string }) {
      try {
        if (data) await getAppwriteAccount().updatePrefs({ prefs: data });
        if (password) await getAppwriteAccount().updatePassword({ password });
        return { data: { user: mapUser(await getAppwriteAccount().get()) }, error: null };
      } catch (error) { return { data: { user: null }, error: asError(error) }; }
    },
    async signOut() {
      try { await getAppwriteAccount().deleteSession({ sessionId: 'current' }); return { error: null }; }
      catch (error) { return { error: asError(error) }; }
    },
  },
  functions: {
    async invoke<TResponse>(name: string, options: { body?: unknown; headers?: Record<string, string> } = {}): Promise<{ data: TResponse | null; error: { message: string } | null }> {
      try {
        const body = options.body instanceof FormData ? JSON.stringify({ error: 'Multipart uploads must use Appwrite Storage.' }) : JSON.stringify(options.body ?? {});
        const execution = await getAppwriteFunctions().createExecution({ functionId: getFunctionId(name), body, method: ExecutionMethod.POST });
        let data: TResponse | null = null;
        if (execution.responseBody) {
          try { data = JSON.parse(execution.responseBody) as TResponse; } catch { data = execution.responseBody as TResponse; }
        }
        return { data, error: null };
      } catch (error) { return { data: null, error: asError(error) }; }
    },
  },
  storage: {
    from(bucketId: string) {
      return {
        async upload(file: File) {
          try {
            const uploaded = await getAppwriteStorage().createFile({ bucketId, fileId: ID.unique(), file });
            return {
              data: {
                id: uploaded.$id,
                path: uploaded.$id,
                public_url: getAppwriteStorage().getFileView({ bucketId, fileId: uploaded.$id }).toString(),
              },
              error: null,
            };
          } catch (error) { return { data: null, error: asError(error) }; }
        },
        async remove(fileIds: string[]) {
          try { await Promise.all(fileIds.map((fileId) => getAppwriteStorage().deleteFile({ bucketId, fileId }))); return { error: null }; }
          catch (error) { return { error: asError(error) }; }
        },
      };
    },
  },
};

type QueryState = { equal: Array<{ field: string; value: unknown }>; isNull: string[]; notNull: string[]; order?: { field: string; ascending: boolean }; limit?: number };
type QueryResult = { data: any; error: { message: string } | null };

class AppwriteTableQuery<T extends Record<string, unknown> = Record<string, unknown>> implements PromiseLike<QueryResult> {
  private readonly state: QueryState = { equal: [], isNull: [], notNull: [] };
  private singleResult = false;
  private maybeSingleResult = false;
  private readonly tableName: string;
  private readonly action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  private readonly payload?: unknown;
  constructor(tableName: string, action: 'select' | 'insert' | 'update' | 'upsert' | 'delete', payload?: unknown) { this.tableName = tableName; this.action = action; this.payload = payload; }
  select(_columns = '*') { return this; }
  insert(payload: unknown) { return new AppwriteTableQuery<T>(this.tableName, 'insert', payload); }
  update(payload: unknown) { return new AppwriteTableQuery<T>(this.tableName, 'update', payload); }
  upsert(payload: unknown, _options?: unknown) { return new AppwriteTableQuery<T>(this.tableName, 'upsert', payload); }
  delete() { return new AppwriteTableQuery<T>(this.tableName, 'delete'); }
  eq(field: string, value: unknown) { this.state.equal.push({ field, value }); return this; }
  is(field: string, operator: string | null, value: unknown = null) { if ((operator === 'null' || operator === null) && value === null) this.state.isNull.push(field); return this; }
  not(field: string, operator: string, value: unknown = null) { if (operator === 'is' && value === null) this.state.notNull.push(field); return this; }
  order(field: string, options?: { ascending?: boolean }) { this.state.order = { field, ascending: options?.ascending !== false }; return this; }
  limit(value: number) { this.state.limit = value; return this; }
  single() { this.singleResult = true; return this; }
  maybeSingle() { this.maybeSingleResult = true; return this; }
  private queries() {
    const queries = [
      ...this.state.equal.map(({ field, value }) => Query.equal(field, value as string | number | boolean | Array<string | number | boolean>)),
      ...this.state.isNull.map((field) => Query.isNull(field)),
      ...this.state.notNull.map((field) => Query.isNotNull(field)),
    ];
    if (this.state.order) queries.push(this.state.order.ascending ? Query.orderAsc(this.state.order.field) : Query.orderDesc(this.state.order.field));
    if (this.state.limit !== undefined) queries.push(Query.limit(this.state.limit));
    return queries;
  }
  async execute() {
    try {
      const invalidQuery = this.state.equal.find(({ value }) => value === null || value === undefined || value === '');
      if (invalidQuery) {
        return { data: null, error: { message: `Invalid Appwrite query value for attribute "${invalidQuery.field}".` } };
      }
      const db = getAppwriteTablesDb();
      const databaseId = appwriteDatabaseId!;
      const tableId = getTableId(this.tableName);
      let matches = await db.listRows({ databaseId, tableId, queries: this.queries() });
      const idFilter = this.state.equal.find(({ field, value }) => field === 'id' && typeof value === 'string' && value.length > 0);
      if (matches.rows.length === 0 && idFilter) {
        try {
          const row = await db.getRow({ databaseId, tableId, rowId: idFilter.value as string });
          const matchesOtherFilters = this.state.equal.every(({ field, value }) => field === 'id' || (row as Record<string, unknown>)[field] === value);
          if (matchesOtherFilters) matches = { total: 1, rows: [row] };
        } catch {
          // The value may be a custom `id` column rather than Appwrite's `$id`.
        }
      }
      if (this.action === 'select') {
        const rows = matches.rows.map((row) => deserializeRow(row as unknown as T));
        return { data: this.singleResult || this.maybeSingleResult ? (rows[0] ?? null) : rows, error: null };
      }
      if (this.action === 'delete') {
        await Promise.all(matches.rows.map((row) => db.deleteRow({ databaseId, tableId, rowId: row.$id })));
        return { data: null, error: null };
      }
      const input = serializeRow((this.payload ?? {}) as Record<string, unknown>);
      if (this.action === 'insert') return { data: deserializeRow(await db.createRow({ databaseId, tableId, rowId: ID.unique(), data: input }) as unknown as T), error: null };
      if (matches.rows.length > 0) {
        const updated = await Promise.all(matches.rows.map((row) => db.updateRow({ databaseId, tableId, rowId: row.$id, data: input })));
        const normalized = updated.map((row) => deserializeRow(row as unknown as T));
        return { data: (this.singleResult ? (normalized[0] ?? null) : normalized) as unknown as T | T[] | null, error: null };
      }
      if (this.action === 'upsert') return { data: deserializeRow(await db.createRow({ databaseId, tableId, rowId: ID.unique(), data: input }) as unknown as T), error: null };
      return { data: null, error: null };
    } catch (error) { return { data: null, error: asError(error) }; }
  }
  then<TResult1 = QueryResult, TResult2 = never>(onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null) { return this.execute().then(onfulfilled, onrejected); }
}

export const supabase = { auth: appwrite.account, functions: appwrite.functions, storage: appwrite.storage, from<T extends Record<string, unknown> = Record<string, unknown>>(tableName: string) { return new AppwriteTableQuery<T>(tableName, 'select'); } };

export function getSupabaseClient() {
  if (!isAppwriteConfigured) throw new Error('Missing Appwrite configuration. Add VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID.');
  return supabase;
}

export function getConfiguredSupabaseProjectRef() { return '6a882bdb0009b0f946b6'; }
