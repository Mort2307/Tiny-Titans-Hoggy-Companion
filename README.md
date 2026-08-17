# Tiny Titans Hoggy Companion

## Final Master Build Gate

The `master` branch is the authoritative application source. The overhaul uses an audit-first merge model: keep useful behaviour, merge improvements into the canonical architecture, and retire only confirmed unused or superseded material under `retirement/`.

The final CI build gate runs on every push to `master` and checks:

1. `npm install --no-audit --no-fund`
2. `npm run lint`

