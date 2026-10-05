# Tiny Titans ↔ ChatGPT Companion

Tiny Titans exposes a scoped MCP server at:

```text
https://tinytitanskeeper.web.app/mcp
```

## Architecture

The integration has three layers:

1. **Tiny Titans keeper API** — existing structured read/write functions for animals and tracker records.
2. **OAuth 2.1 account authorization** — ChatGPT receives scoped, revocable access and refresh tokens after the keeper signs into their normal Tiny Titans Firebase account and approves access.
3. **MCP Streamable HTTP** — ChatGPT discovers focused Tiny Titans tools and calls them against the authenticated keeper account.

There is no pairing code in the normal user flow.

The authorization sequence is:

```text
ChatGPT → Tiny Titans OAuth authorize page
        → existing Firebase session OR Tiny Titans sign-in
        → permission review
        → Allow
        → short-lived OAuth authorization code
        → PKCE token exchange
        → scoped Tiny Titans access
```

The Firebase ID token is verified server-side with Firebase Admin before an OAuth authorization code is created. ChatGPT never receives the keeper's Firebase password, Firebase ID token, or generic Firestore credentials.

OAuth access tokens expire after 60 minutes. Refresh credentials expire after 90 days and rotate on use. Tokens are bound to the Tiny Titans MCP resource, OAuth client, scopes, current connection generation, current paid entitlement, and current revocation state.

Legacy `ttlink_` code support may remain temporarily in backend code only for rollout compatibility with stale clients. It is not part of the supported user experience and must not be presented in the app or plugin instructions.

## OAuth endpoints

- Protected resource metadata: `/.well-known/oauth-protected-resource`
- Authorization server metadata: `/.well-known/oauth-authorization-server`
- Authorize: `/oauth/authorize`
- Token: `/oauth/token`
- Revoke: `/oauth/revoke`

ChatGPT CIMD clients are allow-listed. PKCE `S256` and RFC 9207 issuer identification are required.

## MCP compatibility

The endpoint supports:

- modern MCP `2026-07-28` discovery through `server/discover`;
- legacy `initialize` negotiation for 2025-era clients;
- `tools/list`;
- `tools/call`;
- authenticated `get_profile` with the OpenAI profile marker.

Keeper tools remain deliberately narrow. There is no generic Firestore read/write/delete surface.

## Tools

Read:

- `get_profile`
- `list_animals`
- `resolve_animal`
- `get_animal_summary`
- `get_feeding_history`
- `get_weight_history`
- `get_shed_history`
- `get_recent_activity`
- `get_keeper_snapshot`
- `list_reminders`

Write:

- `log_feeding`
- `log_weight`
- `log_shed`
- `log_behaviour`
- `log_health_observation`
- `create_reminders`
- `undo_last_action`

`undo_last_action` can only undo a reversible record created through this Companion connection.

## Deploy

From the project root:

```powershell
npm run build
firebase deploy --only "functions:tinyTitansMcp,functions:getChatGPTCompanionStatus,functions:revokeChatGPTCompanionConnection,functions:getChatGPTCompanionActivity,functions:chatGPTCompanionApi,hosting:legacy,hosting:keeper"
```

The Hosting deploy is required because the user-facing Tiny Titans Companion page changed and because `/mcp`, OAuth discovery, and OAuth endpoints are routed through the canonical `tinytitanskeeper.web.app` origin.

## Test in ChatGPT

1. Open **ChatGPT Plugins** and choose **Tiny Titans**.
2. During private testing, enable Developer mode and add `https://tinytitanskeeper.web.app/mcp` if the private plugin is not already installed.
3. Press **Connect**.
4. ChatGPT opens the Tiny Titans authorization page.
5. If the browser already has a Tiny Titans Firebase session, confirm that account; otherwise sign in with Google or Tiny Titans email/password.
6. Review the requested scopes and press **Allow and connect**.
7. ChatGPT completes the PKCE exchange and returns to the connected plugin.
8. Start a new chat and test reads before writes.

Representative tests:

```text
List my animals.
What was Haze's last feeding?
Haze ate a 7g Fuzzy Mouse today, Tongs, Accepted.
Mort weighs 96.4g today.
Marmalade had a Complete Perfect shed today with no retained eye caps.
Undo the last Tiny Titans record I added.
```

## Local contract test

```powershell
npm run validate:chatgpt-companion
```

The full production build also runs this validation.

## Public release

Developer-mode connection is sufficient for private testing. Public directory release is a separate packaging/review step and requires the deployed HTTPS MCP endpoint, publisher verification, domain verification, and an approved plugin submission.

Normal users should experience only:

```text
Tiny Titans app → Link with ChatGPT → Tiny Titans plugin → Connect → Sign in → Allow → Use
```

or:

```text
ChatGPT → Install Tiny Titans → Connect → Sign in → Allow → Use
```

The app's Link with ChatGPT button points directly at the Tiny Titans plugin page. Users must never be asked to copy an MCP URL, OAuth token, API key, pairing code, Firebase UID, or Firestore identifier.

## Natural keeper requests

The Companion exposes batch keeper reads and reminders so a single user sentence can contain several actions.

Examples:

```text
Set a feed reminder for Mort and Haze for Monday and tell me when Lilith, Marmalade and Nox last fed.
Which of my animals are due a feed this week?
Compare Mort and Haze: last feeding, current weight, latest shed and health notes.
Remind me once on Friday to weigh Marmalade.
Remind me every 14 days to feed Mort.
```

`get_keeper_snapshot` resolves multiple animal names in one call. `create_reminders` accepts multiple animal names and creates one-time reminders by default; recurring cadence is only created when `repeatEveryDays` is explicitly supplied. The OAuth consent page captures the browser IANA timezone so relative keeper requests can be converted to the correct local schedule.

Feeding logged through ChatGPT re-anchors recurring Tiny Titans feeding reminders using the same latest-real-feeding rule as feeding logged in the app.


## Hosting consistency

Tiny Titans currently has two Firebase Hosting sites attached to the same project:

- legacy: `tinytitans-hoggy-companion`
- keeper: `tinytitanskeeper`

Installed PWAs keep the origin they were originally installed from. Deploying only one hosting target can therefore leave an installed app on the other origin running an older bundle.

Use `npm run deploy:keeper` for frontend releases. It deliberately builds once and deploys the same `dist` output to both hosting targets.
