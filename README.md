# Tiny Titans Keeper Companion

## Final Master Build Gate

The `master` branch is the authoritative application source. The overhaul uses an audit-first merge model: keep useful behaviour, merge improvements into the canonical architecture, and retire only confirmed unused or superseded material under `retirement/`.

The final CI build gate checks:

1. `npm install --no-audit --no-fund`
2. `npm run lint` with **zero warnings** enforced
3. `npm run build`
4. Functions dependency installation
5. JavaScript syntax validation for all Functions source files

Live app: https://tinytitanskeeper.web.app\n\nThe full lint audit also uploads the exact ESLint output as a CI artifact, so a green lint gate is evidence of `0` warnings rather than hidden output.

## GitHub-to-Firebase production deployment

Tiny Titans has a **private-repository Google Cloud Shell release workflow** that avoids GitHub Actions minutes, plus Nightjar-style GitHub Actions workflows for when runners are available. Production Firebase project: `tinytitans-hoggy-companion` (Keeper + legacy sites). Cloud Shell deployments are manually approved, checked against master, and scoped to the Tiny Titans project. Hosting releases verify both live sites. GitHub Actions are retained but require an available runner. Private Cloud Shell setup, confirmation gates, release commands, optional keyless GitHub Actions setup, and the required App Check public site key are documented in [Firebase Deployment](docs/FIREBASE-DEPLOYMENT.md).
