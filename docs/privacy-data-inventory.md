# Tiny Titans — Privacy & Data Inventory

Audit date: 19 September 2026

This inventory is derived from the current application code and Firebase configuration. It is a release-engineering inventory, not legal advice.

| Data area | Examples observed in code | Purpose | Optional / required | Main store or processor |
| --- | --- | --- | --- | --- |
| Account identity | Firebase Auth identity, email, display name, profile fields | Sign-in, account/profile, access control | Required for account features | Firebase Authentication / Firestore |
| Reptile records | Species, names, sex, morph/genetics, weights, feeding, sheds, health, behaviour, husbandry and breeding records | Keeper record-keeping and feature operation | User-created | Firestore |
| Uploaded media | Reptile photos, vivarium/room assets, submission evidence, observation media, rescue branding | Profiles, records, submissions and workspaces | Feature-dependent | Firebase Storage |
| Community contribution | Species/morph submissions, observations, showcase submissions, feedback, issue reports and conversations | Community content, moderation and improvement | User-initiated | Firestore / Storage |
| Intelligence contribution | Eligible husbandry data used by Titan Intelligence and community intelligence | Advanced intelligence and approved community knowledge | Opt-in | Firestore / server-side functions |
| Product analytics | Anonymous/aggregated product usage and feature performance | Product improvement | Opt-in | Application analytics path; verify final provider before Play declaration |
| Approximate community location | Coarse city/country-style location fields | Community map/context | Opt-in | Firestore |
| Notifications | Reminder preferences, notification events and product updates | Reminders, messaging and release communication | Feature-dependent / optional marketing | Firestore / browser or device notification services |
| Billing and entitlements | Stripe customer/subscription identifiers, subscription status, current period end, paid entitlement state | Subscription access and billing management | Only for paid customers | Stripe + Firestore |
| Workspace data | Business/rescue/seller workspace settings, team members, listings, automations, API-key metadata | Paid workspaces | Tier/feature-dependent | Firestore |
| Technical metadata | Platform, app version, timezone, activity timestamps | Service compatibility and operational telemetry | Service operation | Firestore |

## Account deletion

The release branch now provides an in-app permanent deletion path under Security and a public `/delete-account` web resource. The backend requires recent authentication for self-service deletion and attempts to remove the user's personal Firestore data, paid workspace data and personal storage before deleting the Firebase Auth account.

Rescue organisation ownership is intentionally blocked from self-service deletion until ownership is transferred, preventing a shared operational workspace from being destroyed accidentally.

## Retention / exceptions

Some operational, security, financial or legal records may require limited retention. The final privacy policy and Google Play Data Safety answers must match the production implementation and the actual third-party processor configuration.

## Release verification items

- Confirm the exact analytics provider, if any, before completing Play Data Safety.
- Confirm every Firebase Storage path created by production features is covered by deletion cleanup.
- Confirm public/community content policy: delete, anonymise, or retain each contribution type consistently when the contributor account is deleted.
- Confirm Stripe retention/account deletion handling separately from Tiny Titans Firestore deletion.