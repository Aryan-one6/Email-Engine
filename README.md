# Email Engine

Email Engine is a React + TypeScript email workspace for templates, leads, campaigns, sender configuration, and follow-up automation.

## Runtime stack

- React + TypeScript + Vite
- Appwrite Auth
- Appwrite TablesDB
- Appwrite Storage
- Appwrite Functions for provider secrets, OAuth, sending, scheduled dispatch, and advanced imports

The checked-in `supabase/` directory is retained only as a historical schema/function source for migration and reference. The browser runtime does not use Supabase.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Required frontend variables:

```ini
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a882bdb0009b0f946b6
VITE_APPWRITE_DATABASE_ID=6a8830ba002ebb129796
```

Never put an Appwrite server API key in a `VITE_*` variable or commit it to `.env`.

## Appwrite schema

Preview the schema:

```bash
npm run appwrite:bootstrap -- --dry-run
```

Bootstrap a clean Appwrite database with a server key kept only in the shell:

```bash
export APPWRITE_API_KEY='your-server-key'
export APPWRITE_DATABASE_ID='6a8830ba002ebb129796'
npm run appwrite:bootstrap
unset APPWRITE_API_KEY
```

The default bootstrap permissions are for development. Before production, replace broad authenticated table access with row/team permissions and move privileged writes behind Appwrite Functions.

## Production deployment

Vercel should use:

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

Set these Production environment variables in Vercel:

```ini
VITE_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=6a882bdb0009b0f946b6
VITE_APPWRITE_DATABASE_ID=6a8830ba002ebb129796
```

After deploying the matching Appwrite dispatch Functions, set these server-only Vercel variables for the cron bridge:

```ini
APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a882bdb0009b0f946b6
APPWRITE_API_KEY=<server-only-key>
APPWRITE_EMAIL_MANUAL_DISPATCH_FUNCTION_ID=email-manual-dispatch
APPWRITE_EMAIL_FOLLOWUP_DISPATCH_FUNCTION_ID=email-followup-dispatch
APPWRITE_EMAIL_OAUTH_CALLBACK_FUNCTION_ID=email-oauth-callback
```

Do not prefix the server key with `VITE_`; it must never be sent to the browser.

In Appwrite, add both web platforms:

- `http://localhost:5173`
- `https://email.triadflair.com`

Provider-dependent features are not production-ready until their Appwrite Functions are deployed and configured with server-side secrets. This includes Google/Microsoft OAuth, SMTP credential encryption and testing, manual sending, scheduled dispatch, sequence dispatch, delivery tracking, and advanced import analysis.

See [APPWRITE_SETUP.md](./APPWRITE_SETUP.md) for the current migration/bootstrap details and the remaining Function deployment requirements.
