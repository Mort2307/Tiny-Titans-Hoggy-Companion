# Tiny Titans Hoggy Companion

## Final Master Build Gate

The `master` branch is the authoritative application source. The overhaul uses an audit-first merge model: keep useful behaviour, merge improvements into the canonical architecture, and retire only confirmed unused or superseded material under `retirement/`.

The final CI build gate checks:

1. `npm install --no-audit --no-fund`
2. `npm run lint` with **zero warnings** enforced
3. `npm run build`
4. Functions dependency installation
5. JavaScript syntax validation for all Functions source files

The full lint audit also uploads the exact ESLint output as a CI artifact, so a green lint gate is evidence of `0` warnings rather than hidden output.
