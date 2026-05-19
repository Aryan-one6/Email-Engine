#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${1:-}"
DEPLOY_FLAGS=(--use-api)

FUNCTIONS=(
  complete-signup
  get-user-workspace
  accept-workspace-invite
  account-settings-get
  account-settings-update
  account-settings-sender-add
  workspace-team-get
  workspace-team-invite
  workspace-team-remove
  records-config
  records-list
  record-get
  record-create
  record-update
  records-delete
  record-add-note
  record-create-task
  record-move-stage
  records-custom-fields-list
  records-custom-fields-update
  import-analyze
  import-profile-resolve
  import-profile-save
  import-job-create
  import-mapping-approve
  import-intelligence-config-get
  import-intelligence-config-save
  email-enroll-lead
  email-oauth-start
  email-oauth-callback
  email-assets-bootstrap
  email-assets-upload
  email-campaign-template-options
  email-campaign-enumerate-recipients
  email-campaign-send-batch
  email-sequence-control
  email-manual-send
  email-manual-schedule
  email-manual-dispatch
  email-followup-dispatch
)

echo "Deploying Email-Engine core functions (${#FUNCTIONS[@]} total)..."

for fn in "${FUNCTIONS[@]}"; do
  if [[ -n "$PROJECT_REF" ]]; then
    echo "-> $fn (project: $PROJECT_REF)"
    supabase functions deploy "$fn" --project-ref "$PROJECT_REF" "${DEPLOY_FLAGS[@]}"
  else
    echo "-> $fn (linked project)"
    supabase functions deploy "$fn" "${DEPLOY_FLAGS[@]}"
  fi
done

echo "Done."
