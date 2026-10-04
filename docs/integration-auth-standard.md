# Tiny Titans Integration Authentication Standard

## Purpose

Human-facing Tiny Titans plugins and connectors must use the keeper's existing Tiny Titans account whenever an interactive browser authorization flow is possible.

The default user experience is:

```text
Install or connect → Tiny Titans sign-in → permission consent → connected
```

Copy/paste credentials are not an acceptable primary account-linking UX.

## Human-facing integrations

Use OAuth 2.1 authorization code flow with PKCE when the external platform supports OAuth.

Requirements:

- authenticate the keeper through Tiny Titans' existing Firebase Auth project;
- verify Firebase ID tokens server-side before issuing external authorization credentials;
- show the requested scopes before consent;
- bind external access to the verified Firebase UID;
- issue short-lived access tokens and rotating refresh tokens;
- support immediate revocation;
- re-check paid entitlement where a connector is tier-gated;
- never expose generic Firestore credentials or unrestricted database tools;
- never ask the keeper to copy an access token, API key, pairing secret, Firebase UID, or Firestore identifier between services.

Examples: ChatGPT, future assistant plugins, interactive partner apps, and browser-based account connectors.

## Machine and hardware integrations

Unattended devices cannot complete a browser sign-in. Revocable machine credentials are therefore permitted for:

- Home Assistant;
- MQTT bridges;
- ESPHome/Node-RED flows;
- enclosure sensors;
- other user-owned automation hardware.

Machine credentials must be:

- narrowly scoped to the relevant gateway;
- shown once;
- stored server-side only as a cryptographic hash where practical;
- individually revocable/rotatable;
- excluded from interactive account-login instructions.

A hardware gateway key is not a substitute for user OAuth and must not be reused by human-facing plugins.

## Plugin implementation rule

All new human-facing plugin work must start from the shared Tiny Titans account-authorization pattern rather than inventing a plugin-specific pairing mechanism.

If a platform supports standard OAuth, use OAuth.

If a platform cannot support OAuth, document the limitation and security model before introducing any manual credential flow.
