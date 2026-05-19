#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${1:-}"

FUNCTIONS=(
  generate-voice-assistant-config
  telnyx-voice-webhook
  voice-agent-bind-number
  voice-agent-create
  voice-agent-delete
  voice-agent-get
  voice-agent-list
  voice-agent-options
  voice-agent-set-mappings
  voice-agent-update
  voice-call-create-task
  voice-call-get
  voice-call-list
  voice-call-resolve-review
  voice-call-retry-action
  voice-call-retry-lead-create
  voice-jobs-dispatch
  voice-number-filter-options
  voice-number-list
  voice-number-purchase
  voice-number-reconcile
  voice-number-search
  voice-number-update
)

echo "Deleting legacy voice functions (${#FUNCTIONS[@]} total)..."

for fn in "${FUNCTIONS[@]}"; do
  if [[ -n "$PROJECT_REF" ]]; then
    echo "-> $fn (project: $PROJECT_REF)"
    supabase functions delete "$fn" --project-ref "$PROJECT_REF" --yes || true
  else
    echo "-> $fn (linked project)"
    supabase functions delete "$fn" --yes || true
  fi
done

echo "Done."
