# Tiny Titans ↔ ChatGPT Companion

Tiny Titans exposes a scoped MCP server at:

```text
https://tinytitanskeeper.web.app/mcp
```

## Architecture

The integration has three layers:

1. **Tiny Titans keeper API** — existing structured read/write functions for animals and tracker records.
2. **OAuth 2.1 account linking** — ChatGPT receives scoped, revocable access and refresh tokens. Tiny Titans never exposes Firebase credentials.
3. **MCP Streamable HTTP** — ChatGPT discovers focused Tiny Titans tools and calls them against the authenticated keeper account.

The one-time code created in Tiny Titans is a **link code**, not an API key. It:

- starts with `ttlink_`;
- contains high-entropy random data;
- is stored only as a SHA-256 hash;
- expires after 15 minutes;
- can be consumed once;
- is invalidated when the connection is rotated or revoked.

OAuth access tokens expire after 60 minutes. Refresh credentials expire after 90 days and rotate on use. Tokens are bound to the Tiny Titans MCP resource, OAuth client, scopes, current connection generation, current paid entitlement, and current revocation state.

## OAuth endpoints

- Protected resource metadata: `/.well-known/oauth-protected-resource`
- Path-specific resource metadata: `/.well-known/oauth-protected-resource/mcp`
- Authorization server metadata: `/.well-known/oauth-authorization-server`
- Authorize: `/oauth/authorize`
- Token: `/oauth/token`
- Revoke: `/oauth/revoke`
- Dynamic client registration: `/oauth/register`

ChatGPT CIMD clients and registered public clients are allow-listed against exact ChatGPT callbacks. PKCE `S256` and RFC 9207 issuer identification are required. Dynamic registration supports `token_endpoint_auth_method: none`; no client secret is needed. Link codes cannot be used as bearer credentials.

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

`undo_last_action` can only undo a reversible record created through this Companion connection in the current account context. Tracker records edited since creation are protected from undo. Feeding, weight, shed, behaviour and health writes commit the record, profile updates, reminder anchors and audit together. Reusing a tracker write key with changed data returns an explicit conflict.

There are **17 tools**. They support the advertised keeper commands, not arbitrary operations in the app. Tracker writes currently support snake records; universal animal profiles are read-only. Existing record edits, general record deletion, breeding, marketplace and administrative operations are not exposed. Each keeper authorizes their own account. This MCP connection does not configure an unrelated custom GPT's Actions schema.

## Deploy

From the project root:

```powershell
npm run deploy:chatgpt-companion
```

The Hosting deploy is required because `/mcp`, OAuth discovery, and OAuth endpoints are routed through the canonical `tinytitanskeeper.web.app` origin.

The command builds first, deploys only the six integration functions and Keeper Hosting, then runs read-only live checks. A deployment must not be called successful if `npm run check:chatgpt-live` fails. These public checks do not prove an individual keeper has completed OAuth; verify that separately with a real read in ChatGPT.

## Test in ChatGPT

1. Sign in to Tiny Titans and open **Tiny Titans Companion**.
2. Check the connection server using the in-app diagnostic.
3. Install the private Tiny Titans plugin, or use ChatGPT web's **Settings → Security and login → Developer mode** where your account permits it.
4. For manual setup, open **ChatGPT Plugins**, select **+**, and create an MCP connection using `https://tinytitanskeeper.web.app/mcp`. Select **OAuth**, not API key.
5. When the Tiny Titans authorization page opens, generate a fresh 15-minute code in Tiny Titans and paste it there. Never paste the code into the conversation. Canceling the authorization leaves the code unused.
6. Review the tools ChatGPT discovers.
7. Start a new chat, select Tiny Titans, and test reads before writes.

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

The full production build also runs this validation, including executable HTTP/callable tests for authorization, all 17 commands, account isolation, expiry, revocation, PKCE, scoped access, native writes, idempotent retries and undo. The tests use isolated in-memory Firebase fixtures; they do not replace a real hosted OAuth check or full Firestore emulator testing.

## Troubleshooting

| Symptom | Check or recovery |
| --- | --- |
| Code pasted in chat does nothing | Add/select the Tiny Titans plugin and complete OAuth in its authorization page. A chat message cannot install or authenticate tools. |
| API key rejected | Select OAuth. `ttlink_` is a single-use authorization code, not a bearer/API credential. |
| Invalid, expired or already-used code | Generate once when the authorization page is ready. Each new code replaces the previous code and connection. |
| Discovery returns HTML | Deploy Keeper Hosting and the MCP function together. Check both resource metadata paths. |
| Reminders request more permission | Reconnect and approve reminder scopes. The app now reports the scopes actually granted. |
| Commands missing after updating | Refresh the plugin's discovered tools or reconnect, then start a new chat with Tiny Titans selected. |
| Server ready but account has no access | Public discovery checks only server availability. Complete per-user authorization and verify `List my animals`. |
| A tool is unsupported | Explain the limitation and direct the user to the app. Never claim a write succeeded without its saved result. |

## Public release

Developer-mode connection is sufficient for private testing. Public directory release is a separate packaging/review step and requires the deployed HTTPS MCP endpoint, publisher verification, domain verification, and an approved plugin submission.

## Natural keeper requests

The Companion now exposes batch keeper reads and reminders so a single user sentence can contain several actions.

Examples:

```text
Set a feed reminder for Mort and Haze for Monday and tell me when Lilith, Marmalade and Nox last fed.
Which of my animals are due a feed this week?
Compare Mort and Haze: last feeding, current weight, latest shed and health notes.
Remind me once on Friday to weigh Marmalade.
Remind me every 14 days to feed Mort.
```

`get_keeper_snapshot` resolves multiple animal names in one call. `create_reminders` accepts multiple animal names and creates one-time reminders by default; recurring cadence is only created when `repeatEveryDays` is explicitly supplied. The connection captures the browser IANA timezone at link time so relative keeper requests can be converted to the correct local schedule.

Feeding logged through ChatGPT now re-anchors recurring Tiny Titans feeding reminders using the same latest-real-feeding rule as feeding logged in the app.
