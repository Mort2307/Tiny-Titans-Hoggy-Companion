# Tiny Titans Verified Services

Tiny Titans Services is the zero-paid-API alternative to a generic commercial places search.

## Trust boundary

A listing follows this lifecycle:

1. A signed-in keeper suggests a service.
2. The suggestion remains private and pending.
3. A Tiny Titans Creator reviews the submitted listing and any evidence supplied.
4. Approval publishes a sanitised service-facing record.
5. Rejection publishes nothing.

"Creator reviewed" means the directory entry was manually reviewed before publication. It does **not** by itself assert veterinary licensing, professional registration, service quality, or clinical suitability. Keepers should verify professional credentials and availability directly with the service before treatment.

## Cost model

The directory lives in Tiny Titans' existing Firebase backend and uses the same free Open-Meteo city/country geocoding already used by community location features. It does not use Google Places, paid maps APIs, Twilio, or another metered directory provider.

## Collections

- `keeperServiceSubmissions` — private moderation queue.
- `keeperServices` — published sanitised records, read through callable functions.
- `keeperServiceAudit` — Creator review audit log.

Client Firestore access is not required for these collections; they remain behind callable functions.

## Deployment functions

```powershell
firebase deploy --only "functions:listKeeperServices,functions:submitKeeperService,functions:listMyKeeperServiceSubmissions,functions:getCreatorKeeperServiceSubmissions,functions:reviewKeeperServiceSubmission"
```
