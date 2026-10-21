# Tiny Titans mandatory PWA release rollout

## Purpose

Tiny Titans must not expose an outdated keeper workspace on a normal online **cold launch**. Its old update button may appear well after the user has logged a feeding or weight. This rollout introduces an independent, uncached server-side release manifest and verifies it before mounting the workspace.

## Release contract

- Each `npm run build` produces a new unique `tt-* ` build ID (without the whitespace) embedded in JavaScript and `dist/release.json`. Both Firebase Hosting targets deploy the **same** dist directory.
- `/release.json` is served `Cache-Control: no-store`. It is excluded from Workbox precache and fetched using `cache: no-store` with a changing query parameter.
- On each cold online launch, only the release shell is displayed until a manifest check succeeds or a **5-second** timeout occurs. Offline and unreachable-server conditions fall back to the existing app so vital animal records stay accessible.
- On a **normal online cold launch**, the app shows a visible version-check screen. If the server ID differs from the running JS, the workspace stays **unmounted** and a blocking **Update Tiny Titans** button is displayed. There is no Later/Continue option for a known newer release.
- After the user taps **Update Tiny Titans**, the gate shows an installation spinner/progress indicator, tries to activate the current `/sw.js` worker, then navigates to the original route with the new release identifier. It may unregister the app-shell SW as a recovery route, but never deletes Firestore, Cache Storage or the messaging worker.
- A running session checks again on focus, reconnect, visibility and every 45 seconds. It **does not automatically discard unsaved form state**. Instead, a persistent update notice appears; clicking update requires a second explicit restart confirmation.
- Repeated unsuccessful attempts are recorded for error messaging. When a *new* online version is confirmed, the gate stays blocked until the user explicitly updates successfully. If the release server cannot be reached or the device is offline, the last installed app remains accessible so keepers can still retrieve care records; the check repeats on reconnect.
- An older deployed PWA cannot execute code that did not exist when it was installed. `skipWaiting: true`, `clientsClaim: false` provides a bridge after its existing updater checks for the new worker; it can then load the new release on a subsequent navigation/relaunch without interrupting an active old page.

## Release checklist

1. Ensure GitHub Actions jobs are actually **executing steps**. A run that immediately fails with an empty steps list is **not** evidence of a failed application build or a passing build. Investigate GitHub Actions runner/account status.
2. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run build` and `npm run validate:release-update` in a clean clone. Do **not** deploy on a failing check.
3. Verify that `dist/release.json` exists and matches the build ID in the generated JavaScript. Check `dist/sw.js` has no release manifest precache entry.
4. On a test Hosting target, check `curl -I https://<test-host>/release.json` returns `Cache-Control: no-store` and check a normal GET returns JSON rather than `index.html`.
5. Browser without service worker: load preview release A, deploy preview release B, then cold reload old tab → visible **Update required** gate → tap **Update Tiny Titans** → installation progress → release B opens.
6. Browser with old controlled service worker: load preview release A, deploy release B, then first cold reopen → mandatory update button before workspace. Test worker migration, not just a fresh tab already on B. Watch for a stuck reload loop.
7. Installed Android PWA: same test with app closed/reopened; test swipe-away, poor network, network restoration, and notification worker separately.
8. Installed iOS/iPadOS PWA: test cold reopen and background/foreground resume; iOS may preserve a running page rather than starting a new JS session. The existing-session banner must be visible without erasing forms.
9. With a feeding or weight form partly filled in, deploy another test release: verify **no automatic mid-form refresh** and that the restart confirmation explicitly warns about unsaved work. New cold sessions should block entry until the required update button has been clicked.
10. Confirm the account, family access, feeding and weight data, offline availability, and Firebase push registrations still work after updating.
11. Only then deploy both production Hosting targets using `npm run deploy:keeper` or a deployment command that runs the release manifest validation. Monitor requests, version transitions, and client failures.

## Rollback and recovery

Rollback must deploy the previously verified **complete dist artifact** with a matching `release.json`; never publish old JS with a newer manifest or vice versa. If the release checker is broken, deliver a repaired build with a new build ID, preserve Firestore data, and do not remotely wipe device storage. Keep a public support route for users whose installed PWA cannot update. Do not silently disable mandatory checks for security-critical migrations.

## Visibility and limitations

This release checker verifies the **current device**, not population-wide update adoption. A reliable administrator adoption dashboard needs a separate privacy-aware version heartbeat, aggregation, retention policy, and opt-in/notice where required. Neither the release checker nor a Firebase Hosting deployment can instantaneously wake an offline or indefinitely unopened installed PWA.
\n## Interpreting preview behaviour\n\nThe mandatory prompt is deliberately **not** shown on a device already running the same build ID as the server. Only the brief version-check animation appears. To prove mandatory updates, first **open release A** on a device, deploy **release B** to the *same* preview channel, and then reopen the **old** installation. A brand-new preview tab opened only after B is deployed will already run B and has nothing to update.\n