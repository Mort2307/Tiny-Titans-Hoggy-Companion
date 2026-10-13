# Tiny Titans — Firebase release system

This repository uses a Nightjar-style **keyless GitHub Actions release system**, but only for the Tiny Titans Firebase project. Nightjar and Tiny Titans never share Firebase projects, hosting targets, service accounts or deployment workflows.

## Protected destinations

| Resource | Value |
| --- | --- |
| GitHub repository | Mort2307/Tiny-Titans-Hoggy-Companion |
| Production branch | master |
| Firebase project | tinytitans-hoggy-companion |
| Keeper Hosting site | tinytitanskeeper (https://tinytitanskeeper.web.app) |
| Legacy Hosting site | tinytitans-hoggy-companion (https://tinytitans-hoggy-companion.web.app) |
| Cloud Functions | functions/ (Node.js 22) |
| Firestore | firestore.rules, firestore.indexes.json |
| Storage | storage.rules |

The .firebaserc mappings and firebase.json are validated before every deployment. Each Firebase CLI invocation includes --project tinytitans-hoggy-companion. The existing Functions deployment is batched, retries transient failures and permits resumption from a chosen batch.

## One-time keyless setup

1. Merge the release-system pull request into master after review, or check out that branch to prepare the credentials first.
2. In a Google Cloud Shell authenticated as an administrator of **tinytitans-hoggy-companion**, check out this repository and run:

       bash scripts/setup-tiny-titans-firebase-iam.sh

   This script asks for TINY-TITANS before changing IAM. It creates a dedicated deploy service account, GitHub OIDC Workload Identity pool/provider and deployment permissions. It does not generate a service-account JSON key. It grants no IAM permissions to Nightjar.
3. Copy the two variables the script prints into this GitHub repository's **Settings → Secrets and variables → Actions → Variables** (repository variables, not the Nightjar repository):

   - TINY_TITANS_GCP_WIF_PROVIDER
   - TINY_TITANS_GCP_DEPLOY_SERVICE_ACCOUNT

4. In the Tiny Titans GitHub **Actions** tab, open **Deploy Tiny Titans Firebase backend (manual)**, select master and scope auth-check, then click **Run workflow**. This first check is read-only.
5. Only after auth-check passes, try plan (also read-only) and then a deliberately scoped deployment. If existing Cloud Functions reference Google Cloud secrets, review whether the deploy identity needs read-only metadata access to those secrets. Do not commit credentials or grant broad access to secret payloads.

Both production workflows reuse the same GitHub Actions environment name, tiny-titans-production. Configure required reviewers, approvals or branch restrictions in GitHub Settings → Environments if desired. The OIDC trust restriction additionally checks the immutable GitHub repository ID, master branch, triggering event and exact workflow path.

## GitHub Actions workflows

### Deploy Tiny Titans Firebase Hosting

- Automatically runs on relevant frontend pushes to master.
- Refuses a push that also changes backend Functions, Firestore/Storage rules, or Firebase configuration: deploy the required backend first, then **manually** rerun Hosting.
- Manually runnable from the Actions tab on master with confirmation DEPLOY-TINY-TITANS.
- Runs release safety tests, npm ci, full production build, and stamps dist/version.json with the exact Git commit.
- Publishes **both** Hosting sites in one scoped Firebase deployment.
- Verifies both public /version.json endpoints return the expected Firebase project and source commit. This is a read-only Hosting smoke test; it does not call authenticated endpoints.

### Deploy Tiny Titans Firebase backend (manual)

Run from Actions → Deploy Tiny Titans Firebase backend (manual) → Run workflow → master.

| Scope | Does it write? | Purpose |
| --- | --- | --- |
| auth-check | No | Checks keyless Firebase project authentication |
| plan | No | Shows a conservative changed-file release plan (default baseline: previous commit) |
| functions:selected | Yes | Deploys 1–20 explicitly named Firebase Function exports |
| functions:all | Yes | Deploys exported Functions in small batches with retries |
| firestore:rules | Yes | Assembles and deploys Firestore security rules |
| firestore:indexes | Yes | Deploys indexes |
| storage | Yes | Deploys Storage security rules |
| all-backend | Yes | Deploys Firestore + Storage, then all Functions in batches |

Use DEPLOY-TINY-TITANS as confirmation for any individual write scope; use ALL-BACKEND-TINY-TITANS for the full backend. Choose functions:selected whenever possible. Enter names like sendNotification,refreshCareAlerts without the functions: prefix.

The start_batch parameter defaults to 1. For functions:all or all-backend, set it to the failed batch number if an earlier run partially succeeded. The script rejects an impossible batch number; it never silently skips to the final batch. **Resuming only skips previously completed batches; it is not an automatic rollback.**

Release workflows are serialised so Hosting and backend writes cannot run at the same time. CI still builds and checks source before production writes. Any failed validation or authentication check prevents a deployment.

## Deploying a coupled frontend/backend feature

1. Merge the feature to master, review the expected Functions or rules changes, and run the backend workflow with the narrowest valid scope.
2. Verify that the backend deployment completed successfully in GitHub Actions.
3. Manually dispatch **Deploy Tiny Titans Firebase Hosting**, entering DEPLOY-TINY-TITANS. The Hosting run checks both site versions.
4. If a Functions batch fails transiently, rerun functions:all from the failed batch rather than restarting the entire release. For selected Functions, retry only the failed named Functions.

Do not use the full all-backend scope for routine CSS, screen, or UI changes; that needlessly consumes deployment quota and could alter unrelated resources.

## Troubleshooting

- **Missing WIF provider/service account:** run one-time IAM setup and add the two GitHub repository variables.
- **GitHub OIDC denied:** confirm the workflow is running from master in this exact repository, and that the one-time provider condition matches.
- **Missing permission / Function build failure:** inspect the failing resource and add only the required IAM binding to the Tiny Titans deploy account; existing Firebase Function secrets may require additional metadata-only access.
- **Hosting release blocked by backend changes:** this is intentional; deploy backend first, then manually dispatch Hosting.
- **Hosting verification failure:** check both Firebase Hosting targets and the reported commit before declaring a release successful.
- **A queued release takes time:** Firebase Functions use resumable batches; do not assume that a green Hosting run implies Functions were deployed.

Existing local npm deploy scripts remain available for authenticated developer machines. The GitHub Actions workflows are the recommended production path.
