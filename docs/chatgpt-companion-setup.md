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

Write:

- `log_feeding`
- `log_weight`
- `log_shed`
- `log_behaviour`
- `log_health_observation`
- `undo_last_action`

`undo_last_action` can only undo a reversible record created through this Companion connection.

## Deploy

From the project root:

```powershell
npm run build
firebase deploy --only "functions:tinyTitansMcp,functions:getChatGPTCompanionStatus,functions:createChatGPTCompanionConnection,functions:revokeChatGPTCompanionConnection,functions:getChatGPTCompanionActivity,functions:chatGPTCompanionApi,hosting:keeper"
```

The Hosting deploy is required because `/mcp`, OAuth discovery, and OAuth endpoints are routed through the canonical `tinytitanskeeper.web.app` origin.

## Test in ChatGPT

1. Sign in to Tiny Titans and open **Tiny Titans Companion**.
2. Generate the 15-minute link code.
3. In ChatGPT web, enable **Settings → Security and login → Developer mode**.
4. Open **ChatGPT Plugins**, select **+**, and create an MCP connection using `https://tinytitanskeeper.web.app/mcp`.
5. When the Tiny Titans authorization page opens, paste the link code.
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

The full production build also runs this validation.

## Public release

Developer-mode connection is sufficient for private testing. Public directory release is a separate packaging/review step and requires the deployed HTTPS MCP endpoint, publisher verification, domain verification, and an approved plugin submission.
