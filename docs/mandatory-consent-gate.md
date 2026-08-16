# Mandatory Consent Gate

## Requirement

Authenticated users must complete the app's required privacy/data-consent step before protected app content is accessible.

## Required architecture

1. Authentication hydration completes.
2. User profile/consent state is loaded.
3. If required consent is incomplete, route to the consent gate.
4. Protected routes must independently enforce the same condition; hiding navigation is not sufficient.
5. Optional permissions remain optional.
6. Browser/OS permissions must never be spoofed or treated as granted when the platform denied them.
7. Users can later review/change consent from Settings > Privacy & Permissions.

## Privacy boundary

Only the minimum coarse location needed for the agreed community analytics may be collected (country/city level). Never collect or expose exact home addresses or precise GPS location for this feature.

## UX

The gate must clearly explain what is collected, why it is collected, how it is used, and distinguish required from optional choices. The primary action is "Accept & Continue" only when all required choices have been explicitly completed.

## QA requirements

- New authenticated user with no consent cannot reach the dashboard.
- Direct navigation to protected routes cannot bypass the gate.
- Completed required consent proceeds normally.
- Optional consent can be declined without blocking normal app access.
- Existing users with a valid recorded consent state are not repeatedly prompted.
- Changing consent from settings updates the stored state and enforcement immediately.
