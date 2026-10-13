#!/usr/bin/env bash
# Run once in authenticated Google Cloud Shell, not in GitHub Actions.
# Keyless GitHub Actions WIF for Tiny Titans only; never creates downloadable credentials.
set -Eeuo pipefail

readonly PROJECT_ID="tinytitans-hoggy-companion"
readonly REPOSITORY="Mort2307/Tiny-Titans-Hoggy-Companion"
readonly REPOSITORY_ID="1330308775"
readonly POOL_ID="tiny-titans-github"
readonly PROVIDER_ID="tiny-titans-master"
readonly SA_ID="tiny-titans-deploy"
readonly SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
readonly WORKFLOW_BASE="${REPOSITORY}/.github/workflows"
readonly CONDITION="assertion.repository_id == '${REPOSITORY_ID}' && assertion.repository == '${REPOSITORY}' && assertion.ref == 'refs/heads/master' && ((assertion.workflow_ref == '${WORKFLOW_BASE}/firebase-backend-deploy.yml@refs/heads/master' && assertion.event_name == 'workflow_dispatch') || (assertion.workflow_ref == '${WORKFLOW_BASE}/firebase-hosting-live.yml@refs/heads/master' && (assertion.event_name == 'workflow_dispatch' || assertion.event_name == 'push')))"
readonly MAPPING="google.subject=assertion.sub,attribute.repository_id=assertion.repository_id,attribute.repository=assertion.repository,attribute.ref=assertion.ref"

for tool in gcloud python3; do
  command -v "$tool" >/dev/null || { echo "Missing prerequisite: $tool" >&2; exit 1; }
done

echo "TINY TITANS - KEYLESS GITHUB FIREBASE DEPLOYMENT"
echo "Project: $PROJECT_ID"
echo "Repository: $REPOSITORY"
echo "Deployment service account: $SA_EMAIL"
echo "This configures Google Cloud IAM and a narrowly restricted OIDC identity."
echo "It does NOT deploy Firebase resources, modify Firestore documents or create secret keys."
read -r -p "Type TINY-TITANS to approve IAM setup: " ACK
[[ "$ACK" == "TINY-TITANS" ]] || { echo "Cancelled."; exit 1; }

gcloud projects describe "$PROJECT_ID" --format=value\(projectId\) >/dev/null
readonly PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
[[ "$PROJECT_NUMBER" =~ ^[0-9]+$ ]] || { echo "Could not resolve Google Cloud project number." >&2; exit 1; }
gcloud services enable iam.googleapis.com iamcredentials.googleapis.com sts.googleapis.com --project="$PROJECT_ID" --quiet

if ! gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SA_ID" --project="$PROJECT_ID" --display-name="Tiny Titans GitHub Firebase" --quiet
fi

if ! gcloud iam workload-identity-pools describe "$POOL_ID" --project="$PROJECT_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "$POOL_ID" --project="$PROJECT_ID" --location=global --display-name="Tiny Titans GitHub" --quiet || {
    echo "Pool create returned an error; verify whether it now exists before rerunning." >&2
    exit 1
  }
fi

POOL_PATH=""
for attempt in {1..24}; do
  POOL_PATH="$(gcloud iam workload-identity-pools describe "$POOL_ID" --project="$PROJECT_ID" --location=global --format='value(name)' 2>/dev/null)" || POOL_PATH=""
  [[ "$POOL_PATH" == projects/* ]] && break
  sleep 5
done
[[ "$POOL_PATH" == projects/* ]] || { echo "Could not resolve WIF pool." >&2; exit 1; }

if ! gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project="$PROJECT_ID" --workload-identity-pool="$POOL_ID" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --project="$PROJECT_ID" --workload-identity-pool="$POOL_ID" --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --display-name="Tiny Titans production" \
    --attribute-mapping="$MAPPING" --attribute-condition="$CONDITION" --quiet || {
    echo "Provider creation failed; inspect Cloud IAM and retry carefully." >&2
    exit 1
  }
fi

PROVIDER_JSON=""
for attempt in {1..24}; do
  PROVIDER_JSON="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" --project="$PROJECT_ID" --workload-identity-pool="$POOL_ID" --location=global --format=json 2>/dev/null)" || PROVIDER_JSON=""
  [[ -n "$PROVIDER_JSON" ]] && break
  sleep 5
done
[[ -n "$PROVIDER_JSON" ]] || { echo "WIF provider is not readable." >&2; exit 1; }
ACTUAL_CONDITION="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("attributeCondition",""))' <<< "$PROVIDER_JSON")"
ACTUAL_MAPPING="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("attributeMapping",{}).get("attribute.repository_id",""))' <<< "$PROVIDER_JSON")"
[[ "$ACTUAL_CONDITION" == "$CONDITION" && "$ACTUAL_MAPPING" == "assertion.repository_id" ]] || {
  echo "Existing provider has different security policy. Refusing to widen trust automatically." >&2
  exit 1
}

gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" --project="$PROJECT_ID" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/${POOL_PATH}/attribute.repository_id/${REPOSITORY_ID}" --quiet >/dev/null

readonly MEMBER="serviceAccount:$SA_EMAIL"
for role in \
  roles/firebasehosting.admin \
  roles/cloudfunctions.admin \
  roles/firebaserules.admin \
  roles/datastore.indexAdmin \
  roles/serviceusage.serviceUsageConsumer \
  roles/firebase.viewer; do
  echo "Granting Firebase deployment role: $role"
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="$MEMBER" --role="$role" --quiet >/dev/null
done

# Restrict actAs to existing runtime and build service accounts only.
ACCOUNTS="$(gcloud iam service-accounts list --project="$PROJECT_ID" --format='value(email)')"
for runtime in \
  "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  "${PROJECT_ID}@appspot.gserviceaccount.com" \
  "${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"; do
  if grep -Fxq "$runtime" <<< "$ACCOUNTS"; then
    gcloud iam service-accounts add-iam-policy-binding "$runtime" --project="$PROJECT_ID" \
      --role=roles/iam.serviceAccountUser --member="$MEMBER" --quiet >/dev/null
  fi
done

PROVIDER_PATH="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --project="$PROJECT_ID" --workload-identity-pool="$POOL_ID" --location=global --format='value(name)')"
echo
echo "IDENTITY SETUP COMPLETE - NO FIREBASE DEPLOYMENT WAS PERFORMED"
echo "Add these two repository-level GitHub Actions VARIABLES to Mort2307/Tiny-Titans-Hoggy-Companion:"
echo "TINY_TITANS_GCP_WIF_PROVIDER=$PROVIDER_PATH"
echo "TINY_TITANS_GCP_DEPLOY_SERVICE_ACCOUNT=$SA_EMAIL"
echo
echo "Next: Actions > Deploy Tiny Titans Firebase backend (manual) > Run workflow > auth-check"
echo "Review any special IAM requirements for existing Functions secrets separately; never put them in GitHub source."
