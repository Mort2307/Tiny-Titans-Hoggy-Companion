# Tiny Titans — connected build and release workflow

Tiny Titans follows the same overall source-to-release model as NightJar:
GitHub pull requests -> automated validation -> protected production branch -> Firebase deployment -> verification.
This document is the operator's starting point. The existing [Firebase deployment guide](FIREBASE-DEPLOYMENT.md)
remains authoritative for identities, confirmation phrases, Cloud Shell commands, and backend recovery.

## Projects and isolation

| Resource | Tiny Titans | NightJar |
| --- | --- | --- |
| GitHub | `Mort2307/Tiny-Titans-Hoggy-Companion` (private) | `Mort2307/NightJar-Audio` |
| Production branch | `master` | `main` |
| Firebase project | `tinytitans-hoggy-companion` | `nightjar-audio` |
| Web delivery | Keeper + legacy Hosting targets | NightJar Hosting |
| Web + install | Responsive PWA on desktop, Android and iOS | Web/PWA + separate Android builds |

**Shared method does not mean shared infrastructure.** Do not reuse NightJar service accounts,
OAuth clients, tokens, Firebase projects, credentials, membership tables or user data.
Nothing in this change creates cross-app sign-in or transfers personal information.

## Standard change -> release

1. **Develop in a feature branch.** Open a PR against `master`. Do not merge stale historical
   branches as a shortcut: inspect their diffs and reconcile functionality first.
2. **Run CI:** `.github/workflows/tiny-titans-build.yml` validates workflow YAML, the exact
   Firebase targets and release guards, lint, application contracts/build, and Functions syntax.
   `release-gate.yml` independently runs the manual/deep production-gate suite on PRs.
   Backend changes also receive a read-only release plan in `firebase-backend-plan.yml`.
   A PR is not proven safe merely because one workflow is green.
3. **Frontend-only merge:** `firebase-hosting-live.yml` attempts an automatic deployment
   of BOTH Tiny Titans Hosting sites and checks that both return the expected commit stamp.
   A runner, correct App Check site key and properly configured keyless Google identity are required.
4. **Coupled backend/frontend merge:** the Hosting push guard deliberately refuses to deploy
   when Firebase config, Functions, or Firestore/Storage rules changed. Use the backend manual
   workflow to release the smallest required scope, verify it, then manually dispatch Hosting.
   Never respond to a blocked Hosting gate by disabling the check.
5. **Record verification:** confirm workflow success, the exact source commit on each
   `/version.json` endpoint, and device-level smoke tests for real keeper actions.

**Live sites:** [Keeper](https://tinytitanskeeper.web.app) and
[Legacy](https://tinytitans-hoggy-companion.web.app).

**Actions:** [Tiny Titans workflows](https://github.com/Mort2307/Tiny-Titans-Hoggy-Companion/actions).
**Repo:** [Tiny Titans](https://github.com/Mort2307/Tiny-Titans-Hoggy-Companion).

## If private GitHub runners are unavailable

The repository's private-runner allocation has previously blocked automated execution.
A workflow committed to GitHub is **configured**, not proof that an execution succeeded.
Never treat queued/skipped jobs, or a green build that did not deploy, as a live release.

Use the documented keyless/manual [Cloud Shell deployment path](FIREBASE-DEPLOYMENT.md)
to validate and deploy from up-to-date `master`. Cloud Shell does not need your PC online
for Firebase Hosting to continue serving users. A self-hosted runner *would* need its host
machine running; GitHub-hosted runners do not need your PC, but depend on Actions entitlement.

## Android test APK

The manually triggered `.github/workflows/android-test-apk.yml` follows NightJar's
temporary Capacitor build approach but is deliberately separate from Firebase deployment.
It installs pinned tools without changing the site's lockfile, compiles the web bundle,
generates the Android project, builds a debug APK, and uploads a 7-day GitHub Actions artifact.

- Select **Actions -> Tiny Titans Android test APK -> Run workflow** on `master` after merge.
- Download the `tiny-titans-android-debug-apk` artifact from the completed run.
- It is a **test/debug build only**, not a signed Google Play or production Android release.
- `com.tinytitans.keeper` is a provisional debug app ID; decide the permanent package ID
  *before* a signed, published application.
- WebView origin handling, Firebase Auth, App Check, push messaging, permissions, update flow,
  back navigation, offline records and device performance **must be real-device tested**.
  A compiled APK alone does not demonstrate that web reCAPTCHA App Check supports the native
  origin. Production native distribution may need platform-specific Firebase configuration.
- No Android build is required for users of the existing Android/iOS/desktop PWA.
  Native iOS builds require a macOS/Xcode signing pipeline and are not established here.

The APK workflow is **manual only** to avoid spending scarce private Actions minutes on
every PR. Its creation does not install it on devices or publish it to any app store.

## ChatGPT / Keeper Companion connection

Tiny Titans already has Firebase Hosting routes for its MCP/OAuth integration, but
the separate [account-linking repair PR #70](https://github.com/Mort2307/Tiny-Titans-Hoggy-Companion/pull/70)
was open and not mergeable when this documentation was written. That work must be
reviewed/reconciled, deployed and tested with a genuine linked account before describing
ChatGPT account linking and keeper commands as operational. This build-pipeline PR does
**not** merge PR #70 or alter user permissions, OAuth or Firestore data.

## Release safety rules

- Use the smallest approved backend scope. Do not deploy the entire Functions inventory
  for visual changes, and do not run Firebase deploy with NightJar's project ID.
- Keep production credentials out of repository files, Actions artifacts and chat.
- Keep unfinished Reptile Room branches and other historical PRs isolated.
- Never bypass App Check, required checks, scoped deployment controls or release verification.
- If CI fails or runners do not execute, fix the failure or use the documented manual
  verified release; do not label the release successful without evidence.
