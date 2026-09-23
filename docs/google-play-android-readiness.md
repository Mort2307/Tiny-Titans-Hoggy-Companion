# Tiny Titans — Google Play Android Release Readiness

Audit date: 19 September 2026

## Current state

The repository is currently a responsive Vite PWA/Firebase web application. No Android Gradle, Capacitor or Bubblewrap project is currently present in the repository.

That means the web app hardening work is ready to feed an Android package, but the Play package itself is not yet represented in this repository.

## Current Google Play requirements relevant to this project

- As of 31 August 2026, new Google Play apps and updates must target Android 16 / API 36 or higher. Google documents an extension path to 1 November 2026. See the official target API requirement before submission.
- Apps that create accounts need both an in-app account-deletion path and an external web deletion resource. The release branch now supplies both.
- Digital subscriptions and app functionality sold inside a Play-distributed app generally require Google Play Billing unless an applicable programme exception applies.
- Google Play Billing Library 9.1.0 is currently available; the Android package should use a supported Play Billing version when native billing is implemented.

## Recommended Android architecture

Use a Bubblewrap-generated Trusted Web Activity around the production PWA if the goal is a thin Android shell with the existing web application as the product surface. Digital Asset Links must be configured so the TWA is verified. The Android package must then expose Play Billing through the supported Digital Goods / Payment Request path rather than sending Play users through the existing Stripe web subscription checkout.

## Launch blockers before Play production

1. Generate and commit the Android/TWA project.
2. Choose and register the final Android package/application ID.
3. Set target API 36+ and verify the generated AAB.
4. Configure signing and the release key strategy.
5. Publish to an internal testing track and verify Digital Asset Links.
6. Implement/verify Play Billing for digital subscriptions and connect verified Play purchase tokens to the existing server-side entitlement model.
7. Complete Play Data Safety and provide the `/delete-account` URL plus the final privacy-policy URL.

## Important billing boundary

The existing Stripe subscription flow remains appropriate for the web application. It should not be assumed to be acceptable as the purchase mechanism for digital workspace subscriptions inside the Play-distributed application. Keep billing provider selection at the platform boundary and keep entitlement authority server-side.