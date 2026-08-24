# Tiny Titans Cloud Cost Reduction

## Decision

Tiny Titans should use Firebase as a managed data platform, but Cloud Functions are **not** the default application architecture.

The target is:

- Firebase Authentication for identity
- Firestore client SDK + Security Rules for user-owned data
- Firebase Storage + Storage Rules for photos/files
- Firebase Hosting for the web application
- local/browser intelligence for keeper-facing calculations and reminders where practical
- Cloud Functions only for operations that genuinely require a trusted server boundary

Firebase explicitly supports web/mobile clients using Authentication + Firestore Security Rules for access control and data validation. citehttps://firebase.google.com/docs/firestore/security/overview

## Immediate cost reduction

The always-running scheduled notification jobs have been removed from the production function export surface:

- `sendAllKeeperReminderNotifications` — previously every 5 minutes
- `sendEquipmentReplacementNotifications` — previously daily

The existing notification source files are retained temporarily as migration reference, but they are no longer exported by `functions/index.js`.

Before the next production function deployment, delete the already-deployed scheduled functions with the Firebase CLI. This is important: removing an export from source code does **not** delete an already deployed function.

## Functions that still require migration review

- creator authorization/custom claims
- creator approval workflows
- community intelligence/benchmark aggregation
- Titan Goals server operations
- creator tester invitations
- supporter/Stripe checkout and webhook
- custom support operations
- feature voting
- Titan recognition

Some of these can be moved safely to direct Firestore client operations because Firestore Security Rules already support role-based capabilities using both authenticated claims and user profile roles. Others, especially Stripe secret handling, require a trusted server boundary unless the payment architecture is changed to an external payment link/provider flow.

## Non-negotiable security rule

Do not replace a trusted server operation with an unrestricted client write merely to save money. Client-side Firebase access must remain protected by Authentication and least-privilege Security Rules. Firebase notes that Security Rules are the protection layer for client SDK access, while privileged server SDKs bypass those rules. citehttps://firebase.google.com/docs/firestore/security/overview

## Deployment rule

`firebase deploy` must not be used casually. The repository now has explicit scripts:

- `npm run deploy:hosting` — build + Hosting only
- `npm run deploy:rules` — Firestore + Storage rules only
- `npm run deploy:app` — build + Hosting + Firestore + Storage

There is intentionally no `functions` deployment script.

Firebase recommends preview channels for testing before promoting a version to live. citehttps://firebase.google.com/docs/hosting/test-preview-deploy

## Long-term target

Once the remaining server-only functions have been migrated or deliberately retained, remove the `functions/` directory and its dependencies entirely. At that point Tiny Titans can run with **zero Cloud Functions**, while still using Firebase Authentication, Firestore, Storage and Hosting.
