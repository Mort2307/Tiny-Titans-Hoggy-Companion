# Tiny Titans ChatGPT publication runbook

## Target user flow

Normal users should experience only:

```text
Tiny Titans → Link with ChatGPT → Tiny Titans plugin → Install/Connect → Tiny Titans sign-in if needed → Approve connection → ChatGPT
```

or:

```text
ChatGPT → Install Tiny Titans → Connect → Tiny Titans sign-in if needed → Approve connection → ChatGPT
```

Do not expose pairing codes, API keys, Firebase IDs, Firestore paths or MCP server addresses to normal users.

## Canonical endpoints

- MCP server: `https://tinytitanskeeper.web.app/mcp`
- OAuth issuer: `https://tinytitanskeeper.web.app`
- Protected resource metadata: `https://tinytitanskeeper.web.app/.well-known/oauth-protected-resource`
- Authorization server metadata: `https://tinytitanskeeper.web.app/.well-known/oauth-authorization-server`
- Public integration page: `https://tinytitanskeeper.web.app/chatgpt`
- Support: `https://tinytitanskeeper.web.app/support`
- Privacy: `https://tinytitanskeeper.web.app/privacy`
- Terms: `https://tinytitanskeeper.web.app/terms`

## Deploy source changes

From the project root:

```powershell
git pull --ff-only origin master
npm run build
firebase deploy --only hosting:legacy,hosting:keeper
firebase deploy --only "functions:tinyTitansMcp,functions:chatGPTCompanionApi,functions:getChatGPTCompanionStatus,functions:revokeChatGPTCompanionConnection,functions:getChatGPTCompanionActivity"
```

The full batched Functions deploy is not required for ChatGPT-only changes.

## Mobile/private test

The canonical private testing plugin is:

`plugins_6ac379fc8e1c8191b952bfbe6c5c0f15`

The old direct-MCP desktop development plugin is archived and must not be used:

`plugins_6ac2654b51e48191af9a0c921d2b8d6e`

After deployment, open Tiny Titans on mobile, allow the PWA update to install, then use Settings → ChatGPT Companion → Link with ChatGPT. Confirm the link opens the canonical plugin rather than the archived desktop test.

## Public OpenAI submission

Use the public submission ZIP prepared from the remote MCP server, not the private app-backed testing wrapper. The public package must contain `plugin.json`, `mcp.json` and branding assets, and must not contain `.app.json`.

In the OpenAI plugin submission portal:

1. Choose the verified individual or business identity that will publish Tiny Titans.
2. Upload the Tiny Titans public submission ZIP.
3. Open MCPs → Tiny Titans → Connect.
4. Confirm MCP URL `https://tinytitanskeeper.web.app/mcp`.
5. Choose the OAuth/CIMD-compatible authentication path offered by the portal.
6. Complete domain verification.
7. Complete OAuth authorization with a dedicated reviewer/test Tiny Titans account.
8. Run Scan Tools and resolve every MCP/tool finding.
9. Run the five positive and three negative review cases.
10. Add the reviewer-accessible demo recording.
11. Complete country targeting, commerce declaration and reviewer credentials.
12. Submit for review.
13. After approval, publish and replace the private testing plugin URL in Tiny Titans with the final public plugin URL.

## Domain verification

The portal will provide an exact token for:

`https://tinytitanskeeper.web.app/.well-known/openai-apps-challenge`

Set that exact value as `OPENAI_APPS_CHALLENGE` in the deployed Functions environment used by `tinyTitansMcp`, then redeploy `tinyTitansMcp`. The endpoint deliberately returns 404 when no challenge value is configured and plain text when configured.

Do not commit the temporary portal token to source control.

## Reviewer account

OpenAI review requires a fully featured account that reviewers can access without needing the owner's mailbox, phone or private network. Create a dedicated Tiny Titans reviewer account with representative sample animals and an eligible Companion tier. Do not use a real keeper's private data.

## Manual publication items still required

These cannot be truthfully completed in source code alone:

- verified OpenAI publisher identity;
- final supported-country selection;
- truthful commerce declaration for the published plugin;
- reviewer account credentials entered in the secure portal field;
- reviewer-accessible demo video URL;
- the portal-issued domain challenge token;
- final OpenAI review approval and publication;
- final public plugin URL.

## Release acceptance test

After the public plugin is published and connected:

1. `@Tiny Titans what is Haze's current weight?`
2. `@Tiny Titans when did Mort last eat?`
3. `@Tiny Titans log Haze at 54.2g today.`
4. Add a test Western Hognose with starting weight, length, previous feeding and one-time reminder in one prompt.
5. Disconnect Tiny Titans, repeat a private-data read and confirm ChatGPT asks to connect rather than fabricating a result.
6. Repeat the flow on ChatGPT mobile and desktop.

A release is not complete until the same connected account works on both supported mobile and desktop surfaces.
