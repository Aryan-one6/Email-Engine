# Email Engine

Email Engine is a standalone application extracted from `coreflow-engine` that focuses only on email marketing workflows.
It includes:

- Email provider configuration (Google, Microsoft, SMTP variants)
- Template library and visual template designer
- Send now
- Scheduled sends
- Auto sequences
- Delivery monitoring

## Stack

- React + TypeScript + Vite
- Tailwind CSS
- Framer Motion
- Lucide React
- Supabase Auth
- Supabase Postgres
- Supabase Edge Functions
- SQL migrations

## What is included

- Dedicated email-first navigation and routing
- Sign-in / sign-up / onboarding flow
- Workspace-level email sender management
- Template + campaign tooling
- Supabase SQL migrations and edge functions required by email workflows
- Legacy voice migration files are kept as compatibility placeholders only and are not part of active Email-Engine behavior

## Project structure

```text
.
|-- public/
|-- src/
|   |-- components/
|   |   |-- auth/
|   |   |-- dashboard/
|   |   |-- home/
|   |   `-- ui/
|   |-- context/
|   |-- hooks/
|   |-- lib/
|   |-- pages/
|   `-- routes/
|-- supabase/
|   |-- functions/
|   |   |-- _shared/
|   |   |-- complete-signup/
|   |   `-- get-user-workspace/
|   `-- migrations/
|-- .env.example
`-- README.md
```

## Frontend setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template and add your Supabase values:

```bash
cp .env.example .env
```

3. Start the app:

```bash
npm run dev
```

4. Build for production:

```bash
npm run build
```

## Vercel production deployment (`https://email.triadflair.com`)

1. Ensure Vercel project points to this repo root (`Email-Engine`) with:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`

2. Set frontend env vars in Vercel (Production):

```bash
VITE_SUPABASE_URL=https://<EMAIL_ENGINE_PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_ANON_KEY>
```

3. Set cron/API env vars in Vercel (Production):

```bash
SUPABASE_URL=https://<EMAIL_ENGINE_PROJECT_REF>.supabase.co
EMAIL_FOLLOWUP_CRON_SECRET=<LONG_RANDOM_SECRET>
EMAIL_MANUAL_CRON_SECRET=<LONG_RANDOM_SECRET>
```

4. In Supabase Auth settings for Email-Engine project:
   - Site URL: `https://email.triadflair.com`
   - Redirect URLs: add `https://email.triadflair.com/*`

5. Deploy production:

```bash
vercel --prod
```

6. Verify these routes return `200`/`401` (not `404`):
   - `/api/cron/email-followup-dispatch`
   - `/api/cron/email-manual-dispatch`

For local Vercel dev, mirror the same values in `.env.local` (or `vercel env pull` output).

## Supabase setup

### Required: isolate Email-Engine from CoreFlow DB

This project must use its own Supabase project and must not stay linked to CoreFlow.

1. Authenticate Supabase CLI:

```bash
supabase login --token <SUPABASE_ACCESS_TOKEN>
```

2. Create and wire a dedicated Supabase project (updates `.env`, `supabase/.env`, and `supabase/config.toml`):

```bash
npm run supabase:setup-isolated-project
```

If your org role cannot create projects, ask an owner/admin to create one and run:

```bash
npm run supabase:setup-isolated-project -- --project-ref <NEW_EMAIL_ENGINE_PROJECT_REF>
```

3. Verify the link no longer points to CoreFlow:

```bash
cat supabase/.temp/linked-project.json
cat supabase/.temp/project-ref
```

Optional flags:

- `--project-name <name>`
- `--project-ref <ref>` (reuse an existing project and skip creation)
- `--org-id <org-id>`
- `--region <region>` (default: `ap-south-1`)
- `--db-password <password>`

Example:

```bash
node scripts/setup-isolated-supabase-project.mjs --project-name email-engine-prod --region ap-south-1
```

### Apply schema and deploy functions

1. For the smoothest MVP signup flow, disable email confirmation in Auth or be prepared to confirm the user email before finishing onboarding.
2. Run migrations against the linked Email-Engine project:

```bash
supabase db push
```

Important: `supabase db push` does not accept `--project-ref`. Use `supabase link --project-ref <EMAIL_ENGINE_REF>` first, then run `supabase db push`.

3. Deploy only the email/import/records/workspace edge functions:

```bash
npm run supabase:deploy-core-functions
```

Optional (deploy to an explicit project ref instead of linked project):

```bash
npm run supabase:deploy-core-functions -- <EMAIL_ENGINE_REF>
```

4. Remove any previously deployed legacy voice functions from the Email-Engine Supabase project:

```bash
npm run supabase:delete-voice-functions -- <EMAIL_ENGINE_REF>
```

Manual equivalent:

```bash
supabase functions deploy complete-signup
supabase functions deploy get-user-workspace
supabase functions deploy accept-workspace-invite
supabase functions deploy account-settings-get
supabase functions deploy account-settings-update
supabase functions deploy account-settings-sender-add
supabase functions deploy workspace-team-get
supabase functions deploy workspace-team-invite
supabase functions deploy workspace-team-remove
supabase functions deploy records-config
supabase functions deploy records-list
supabase functions deploy record-get
supabase functions deploy record-create
supabase functions deploy record-update
supabase functions deploy records-delete
supabase functions deploy record-add-note
supabase functions deploy record-create-task
supabase functions deploy record-move-stage
supabase functions deploy records-custom-fields-list
supabase functions deploy records-custom-fields-update
supabase functions deploy import-analyze
supabase functions deploy import-profile-resolve
supabase functions deploy import-profile-save
supabase functions deploy import-job-create
supabase functions deploy import-mapping-approve
supabase functions deploy import-intelligence-config-get
supabase functions deploy import-intelligence-config-save
supabase functions deploy email-enroll-lead
supabase functions deploy email-oauth-start
supabase functions deploy email-oauth-callback
supabase functions deploy email-assets-bootstrap
supabase functions deploy email-assets-upload
supabase functions deploy email-campaign-template-options
supabase functions deploy email-campaign-enumerate-recipients
supabase functions deploy email-campaign-send-batch
supabase functions deploy email-sequence-control
supabase functions deploy email-manual-send
supabase functions deploy email-manual-schedule
supabase functions deploy email-manual-dispatch
supabase functions deploy email-followup-dispatch
```

5. Make sure the deployed functions have access to the standard Supabase function env vars:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Set Supabase function secrets (prod + localhost)

This repo includes helper commands to push all required function secrets from `supabase/.env`:

```bash
# Production redirect domain
npm run supabase:set-secrets:prod

# Local redirect domain (localhost callback to frontend)
npm run supabase:set-secrets:local
```

These commands set app/OAuth secrets (`APP_URL`, `FRONTEND_URL`, `EMAIL_OAUTH_CALLBACK_URL`, OAuth client IDs/secrets, encryption key).  
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected by Supabase automatically for Edge Functions.

Both commands call:

```bash
bash scripts/set-supabase-secrets.sh [prod|local] [project-ref] [env-file]
```

Before running, fill these in `supabase/.env`:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `EMAIL_CREDENTIALS_ENCRYPTION_KEY`
- Optional callback override: `EMAIL_OAUTH_CALLBACK_URL` (recommended prod: `https://email.triadflair.com/api/oauth/email-callback`)

Generate encryption key:

```bash
openssl rand -base64 32
```

### Email OAuth providers (Google Workspace + Microsoft 365)

Email OAuth needs additional function secrets (`GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`, `EMAIL_CREDENTIALS_ENCRYPTION_KEY`).

See full setup guide:

- `EMAIL_OAUTH_SETUP.md`
- `supabase/.env.example`

## Auth and workspace routing

### Signup flow

1. The user submits full name, email, password, workspace name, and slug.
2. The frontend creates the auth user with Supabase Auth.
3. If a session is available, the frontend invokes `complete-signup`.
4. `complete-signup` validates the payload, upserts the profile, creates the workspace, and inserts the owner membership row.
5. The frontend refreshes workspace state and redirects to `/email`.

### Signin flow

1. The user signs in with `signInWithPassword`.
2. The frontend invokes `get-user-workspace`.
3. If a workspace is found, the user is redirected to `/email`.
4. If no workspace exists yet, the user is routed to `/onboarding/complete`.

### Route protection

- Unauthenticated users are redirected to `/signin`.
- Authenticated users without a workspace are redirected to `/onboarding/complete`.
- Authenticated users with a workspace can access `/email`, `/email/templates`, `/account`, and `/team`.

## Database model

### `profiles`

- `id` references `auth.users(id)`
- `full_name`
- timestamps

### `workspaces`

- `id`
- `name`
- `slug`
- `owner_id`
- timestamps

### `workspace_members`

- `id`
- `workspace_id`
- `user_id`
- `role`
- timestamps
- unique membership per workspace/user

## RLS starter policies

- Users can read, insert, and update only their own profile row.
- Workspace members can read their workspace.
- Workspace owners/admins can update workspace rows.
- Users can read their own membership rows, and owners/admins can read related membership rows.
- Authenticated onboarding inserts are limited to owner-linked workspace creation patterns.

## Notes

- This app is scoped to email marketing and keeps compatibility redirects from `/dashboard` to `/email`.
- `Forgot password` is currently a UI link with a toast placeholder.
- If Supabase env vars are missing, auth pages show a configuration notice.
# Email-Engine
