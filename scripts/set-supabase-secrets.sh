#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-prod}"              # prod | local
PROJECT_REF="${2:-}"           # optional, auto-derived from SUPABASE_URL when omitted
ENV_FILE="${3:-supabase/.env}" # optional custom env file

if [[ "$MODE" != "prod" && "$MODE" != "local" ]]; then
  echo "Usage: bash scripts/set-supabase-secrets.sh [prod|local] [project-ref] [env-file]"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

trim() {
  local value="${1:-}"
  # shellcheck disable=SC2001
  echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

SUPABASE_URL="$(trim "${SUPABASE_URL:-}")"
GOOGLE_OAUTH_CLIENT_ID="$(trim "${GOOGLE_OAUTH_CLIENT_ID:-}")"
GOOGLE_OAUTH_CLIENT_SECRET="$(trim "${GOOGLE_OAUTH_CLIENT_SECRET:-}")"
MICROSOFT_OAUTH_CLIENT_ID="$(trim "${MICROSOFT_OAUTH_CLIENT_ID:-}")"
MICROSOFT_OAUTH_CLIENT_SECRET="$(trim "${MICROSOFT_OAUTH_CLIENT_SECRET:-}")"
EMAIL_CREDENTIALS_ENCRYPTION_KEY="$(trim "${EMAIL_CREDENTIALS_ENCRYPTION_KEY:-}")"
EMAIL_OAUTH_CALLBACK_URL="$(trim "${EMAIL_OAUTH_CALLBACK_URL:-}")"

if [[ -z "$SUPABASE_URL" ]]; then
  echo "SUPABASE_URL must be set in $ENV_FILE."
  exit 1
fi

if [[ -z "$PROJECT_REF" ]]; then
  PROJECT_REF="$(echo "$SUPABASE_URL" | sed -E 's#^https?://([^.]+)\..*#\1#')"
fi

if [[ -z "$PROJECT_REF" ]]; then
  echo "Unable to derive project ref. Pass it explicitly as argument 2."
  exit 1
fi

if [[ "$MODE" == "prod" ]]; then
  APP_URL_VALUE="https://email.triadflair.com"
  FRONTEND_URL_VALUE="https://email.triadflair.com"
else
  APP_URL_VALUE="http://localhost:5173"
  FRONTEND_URL_VALUE="http://localhost:5173"
fi

if [[ -z "$EMAIL_OAUTH_CALLBACK_URL" && "$MODE" == "prod" ]]; then
  EMAIL_OAUTH_CALLBACK_URL="${APP_URL_VALUE%/}/api/oauth/email-callback"
fi

TMP_ENV="$(mktemp)"
trap 'rm -f "$TMP_ENV"' EXIT

cat > "$TMP_ENV" <<EOF
APP_URL=$APP_URL_VALUE
FRONTEND_URL=$FRONTEND_URL_VALUE
EOF

append_if_set() {
  local key="$1"
  local value="$2"
  if [[ -n "$value" ]]; then
    echo "${key}=${value}" >> "$TMP_ENV"
  fi
}

append_if_set "EMAIL_OAUTH_CALLBACK_URL" "$EMAIL_OAUTH_CALLBACK_URL"
append_if_set "GOOGLE_OAUTH_CLIENT_ID" "$GOOGLE_OAUTH_CLIENT_ID"
append_if_set "GOOGLE_OAUTH_CLIENT_SECRET" "$GOOGLE_OAUTH_CLIENT_SECRET"
append_if_set "MICROSOFT_OAUTH_CLIENT_ID" "$MICROSOFT_OAUTH_CLIENT_ID"
append_if_set "MICROSOFT_OAUTH_CLIENT_SECRET" "$MICROSOFT_OAUTH_CLIENT_SECRET"
append_if_set "EMAIL_CREDENTIALS_ENCRYPTION_KEY" "$EMAIL_CREDENTIALS_ENCRYPTION_KEY"

echo "Setting Supabase secrets for project: $PROJECT_REF (mode: $MODE)"
supabase secrets set --env-file "$TMP_ENV" --project-ref "$PROJECT_REF"
echo "Done."
