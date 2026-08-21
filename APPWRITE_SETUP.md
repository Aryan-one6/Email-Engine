# Appwrite setup

The browser client now uses Appwrite Auth, Appwrite TablesDB, and Appwrite Storage. Core signup, workspace, CRM, team, account, template, and asset flows are Appwrite-native. Provider OAuth, email delivery, scheduled dispatch, and advanced import analysis require Appwrite Functions and provider secrets.

The local `.env` is configured for the project shown in the Appwrite Console:

```dotenv
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a882bdb0009b0f946b6
VITE_APPWRITE_DATABASE_ID=<database-id>
```

Create the database and tables in Appwrite Console, then set `VITE_APPWRITE_DATABASE_ID`. Table IDs default to the logical names used by the app, for example `records`, `email_templates`, and `email_campaigns`. If your IDs differ, add an override such as:

```dotenv
VITE_APPWRITE_TABLE_RECORDS=<table-id>
VITE_APPWRITE_TABLE_EMAIL_TEMPLATES=<table-id>
```

The current client expects these direct-access tables:

- `records`
- `email_template_categories`
- `email_templates`
- `workspace_email_brand_themes`
- `email_template_assets`
- `email_campaigns`
- `email_campaign_recipients`
- `email_campaign_stats`
- `workspace_email_unsubscribes`
- `email_manual_sends`
- `email_manual_send_recipients`

To create the complete Appwrite table schema for a clean project, use the bootstrap script. It reads the checked-in schema definitions only; it does not connect to Supabase or migrate any data:

```bash
export APPWRITE_API_KEY='your-new-Appwrite-server-key'
export APPWRITE_DATABASE_ID='6a8830ba002ebb129796'
npm run appwrite:bootstrap -- --dry-run
npm run appwrite:bootstrap
```

The default bootstrap permission mode is `authenticated` so a new account can test the app. This grants authenticated users broad table access and is suitable only for initial development; production should move sensitive operations behind Appwrite Functions and team/row permissions.

Create Appwrite Functions for provider-dependent operations such as OAuth, email delivery, scheduled dispatch, and advanced imports, or map each name with `VITE_APPWRITE_FUNCTION_<NAME>`. These operations cannot safely run in the browser because they require SMTP/OAuth/API secrets.

After bootstrapping, test the clean Appwrite flow:

1. Add `http://localhost:5173` as a Web platform in the Appwrite project.
2. Run `npm run dev`.
3. Create a new account with a password of at least 8 characters containing a number.
4. Complete the workspace name and slug steps.
5. Open Email Templates, create a template, edit it, and refresh the page.
6. Open Records and create a test record; the Appwrite-native CRM path seeds its initial pipeline and sources automatically.

For every table and storage bucket, configure explicit Appwrite permissions for authenticated users or workspace teams. Do not put an Appwrite API key in `VITE_*` variables.

## Migrate the existing Supabase database

The repository includes a server-side migration utility at `scripts/migrate-supabase-to-appwrite.mjs`. It reads the public Supabase schema and rows, creates matching Appwrite TablesDB tables, and preserves valid source `id` values as Appwrite row IDs. It refuses to overwrite an Appwrite table that already exists.

Use a local shell environment for secrets; do not commit them or add them to `.env`:

```bash
export SUPABASE_DATABASE_URL='your Supabase session-pooler connection string'
export APPWRITE_API_KEY='your Appwrite server API key'
export APPWRITE_DATABASE_ID='6a8830ba002ebb129796'
```

First run a read-only inventory:

```bash
npm run migrate:supabase-to-appwrite
```

After reviewing the table and row counts, execute the migration:

```bash
npm run migrate:supabase-to-appwrite -- --execute
```

The Appwrite API key needs server-side database, table, column, and row permissions. The default migration permission mode is `none`, which keeps imported tables inaccessible to browser users until you configure permissions. For a temporary authenticated-user test only, set `APPWRITE_MIGRATION_PERMISSIONS=authenticated`; replace this with workspace/team permissions before production.

Authentication is separate: Supabase password hashes and Appwrite users are not copied by this relational-data script. Users must be imported through a reviewed server-side auth migration or recreated/reset in Appwrite. Supabase Storage files and Edge Functions also require separate migrations.
