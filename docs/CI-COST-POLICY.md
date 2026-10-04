# Tiny Titans CI Cost Policy

Tiny Titans keeps routine hosted CI deliberately lean.

## Routine `master` push

Only **Tiny Titans CI** runs automatically for normal application changes. It performs:

- one application dependency install;
- lint;
- Rescue/Intelligence contract;
- `npm run build`, which already includes the project's application, genetics, integration, security and data contracts plus TypeScript and Vite build;
- Functions dependency install and JavaScript syntax validation when Functions dependencies are present.

## Manual specialist workflows

These are intentionally `workflow_dispatch` only:

- Genetics Engine Gate;
- Route Crawl BOT;
- Home Visual BOT;
- Universal Visual Review BOT;
- Validate Tiny Titans deep production-gate rerun;
- Creator Navigation BOT (already manual).

They remain available when their specialist evidence is useful, but a normal commit does not spend runner time reinstalling browsers and rebuilding the same app several times.

## Scheduled source monitor

Curated species source health runs weekly rather than daily. Source changes are slow enough that daily hosted CI was not a sensible use of the allowance.

## Local free-stack check

Before deployment, run:

```powershell
npm run validate:free-stack
```

This checks the £0 integration policy, Integration Hub, reviewed services, iNaturalist ecology contract and TypeScript project without using GitHub-hosted runner minutes.

A full local release check remains:

```powershell
npm run build
```

The goal is not to weaken QA. It is to avoid paying several times for the same validation.
