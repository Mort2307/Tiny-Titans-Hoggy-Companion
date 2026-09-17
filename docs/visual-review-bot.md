# Tiny Titans Visual Review BOT

The Visual Review BOT is the browser-evidence layer for TinyTitans UI work. Playwright stays outside the production bundle and never edits application code.

## What one universal run does

The normal command is:

```powershell
npm run test:visual-review
```

The command now runs the purpose-built route preparation step, which reads `src/routes/AppRouter.tsx`, seeds all concrete routes plus the special layout routes, then uses an authenticated BOT browser to discover additional same-origin routes exposed by links and safe navigation controls. The resulting route set is written to `artifacts/visual-review/route-set.json` and passed directly into the capture BOT.

The capture BOT then renders every discovered route at every responsive viewport in `docs/visual-design-contract.json`:

- 320×700 — narrow mobile
- 360×780 — mobile
- 390×844 — mobile
- 414×896 — large mobile
- 834×1112 — tablet
- 1440×1000 — desktop

For each route × viewport pair it records:

- viewport screenshot
- full-page screenshot
- DOM/layout metrics
- visible controls and headings
- horizontal overflow and viewport clipping
- hidden-overflow containers
- touch-target signals
- navigation/stacking evidence
- runtime errors
- console errors
- request failures

Each viewport also receives a recorded WebM journey through the requested route set.

## Publishing model

A GitHub Actions run is the secure publication path. It runs the same universal capture and then publishes the evidence to two places:

**Creator QA viewer** — `/creator/qa` loads the current run report and screenshots from creator-only Firebase Storage. This is the in-app human review surface.

**GitHub evidence branch** — `qa-evidence/qa/latest` contains the latest PNG screenshots, report and route manifest in a browsable Markdown gallery. The workflow force-replaces this branch on each successful publication, so the branch does not become a historical screenshot dump.

The normal GitHub Actions artefact is retained for seven days as a short-lived forensic copy. Firebase evidence from the previous run is deleted when the next run is successfully published; the `qaRuns` Firestore documents remain as lightweight historical metadata so we retain the QA trail without retaining every old screenshot.

## Automatic trigger

`.github/workflows/visual-capture-bot.yml` runs automatically for relevant application/visual changes on `master`. It can also be started manually from GitHub Actions.

Leave the workflow `routes` input blank for universal router + authenticated runtime discovery. Supplying routes is supported for deliberately targeted reviews.

## PC workflow vs published workflow

`npm run test:visual-review` is the local capture command. It produces the full evidence folder under `artifacts/visual-review` and is useful for checking the BOT itself without publishing anything.

The GitHub Actions workflow is the publication workflow because the GitHub token and Firebase publication credentials remain in the Actions environment rather than being placed in the developer workstation.

In normal development, push the changed code to `master`; the visual workflow then captures the current application and publishes the latest evidence for review.

## Reviewing and fixing

Use this loop:

```text
BOT run
  ↓
route inventory + screenshots + findings
  ↓
Creator QA viewer + GitHub evidence
  ↓
human visual review
  ↓
code changes
  ↓
next BOT run
  ↓
new evidence replaces old captures
```

The BOT reports likely defects; it does not silently modify production code. Screenshot evidence remains the authoritative visual evidence rather than the automated heuristic score.

## Assistant visual inspection limitation

The GitHub connector can inspect the published `report.json`, route manifest, Markdown gallery and Actions metadata. It does not expose private PNG/WebM bytes directly to the assistant's vision pipeline. For pixel-level visual inspection inside the conversation, attach the relevant screenshot/image from the published evidence. The structured report remains available for route, viewport, DOM and runtime diagnosis without an image attachment.
