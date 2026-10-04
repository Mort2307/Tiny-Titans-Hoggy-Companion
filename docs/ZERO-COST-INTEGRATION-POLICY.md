# Tiny Titans £0 Optional Integration Policy

## The rule

Tiny Titans does not adopt optional integrations that can create an external usage bill merely because people use the app.

That means:

- no optional third-party API fees;
- no paid SaaS dependency required for a keeper feature;
- no recurring connector subscription;
- no per-user/per-request integration bill hidden behind normal usage.

## Costs that do not break the rule

The policy does **not** pretend the entire app has literally zero operating cost. These remain acceptable:

1. **Core Tiny Titans infrastructure** — Firebase/GCP services already required to run the app, controlled through the project's normal quotas and billing safeguards.
2. **The keeper's own costs** — their hardware, electricity and internet connection.
3. **Payment processing** — Stripe/payment-provider fees that occur only after Tiny Titans actually receives money.

## Approved pattern

Prefer open protocols, local/user-owned systems, first-party Tiny Titans endpoints, open standards and responsibly cached free data sources.

Current approved optional stack includes:

- Tiny Titans Device Gateway/webhooks;
- Home Assistant;
- MQTT;
- ESPHome;
- Node-RED;
- Titan Automations;
- Connected Enclosures + telemetry history;
- Firebase push through the existing project;
- ICS calendar export;
- Tiny Titans reviewed specialist-services directory;
- cached/paced iNaturalist ecology context;
- Open-Meteo geocoding/context.

## Paid API decision rule

When a useful paid API is discovered, the first question is:

> Can Tiny Titans build the same useful outcome itself for effectively £0?

If yes, build the Tiny Titans version. If no, leave the paid integration disabled until Tiny Titans revenue genuinely justifies it and this policy is deliberately changed.

## Enforcement

`scripts/validate-zero-cost-integrations.mjs` is part of the production build. It checks the machine-readable policy at `config/integration-cost-policy.json`, verifies every Integration Hub provider is approved and marked free, rejects known paid/metered connector endpoints in integration code, and blocks common paid connector SDKs from runtime dependencies.

Stripe is explicitly treated as a transaction-cost exception and must never be exposed as an optional Integration Hub provider.
