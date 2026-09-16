# Tiny Titans Visual Review BOT

The visual review system is the browser evidence layer for TinyTitans UI work. It is deliberately separate from normal application contracts so visual defects can be inspected without turning every CI run into a browser suite.

## What it captures

`run-visual-review-bot.mjs` renders the requested routes at the responsive viewports defined by `docs/visual-design-contract.json` and writes:

- viewport screenshots
- full-page screenshots
- DOM/layout metrics
- runtime, console and request-failure evidence
- an HTML screenshot gallery
- a JSON report

`run-visual-journey-recorder.mjs` then records the same requested routes as real Playwright WebM journeys at mobile, tablet and desktop sizes.

The GitHub Actions workflow uploads everything together as the `tiny-titans-visual-review-*` artifact and links that artifact from the Actions run summary.

## Run locally

From the repository root:

```bash
node scripts/run-visual-review-bot-local.mjs
```

To inspect only selected routes:

```powershell
$env:TINY_TITANS_VISUAL_ROUTES="/,/snakes,/rescue,/rescue/animals,/rescue/qr,/weights,/feeding";
node scripts/run-visual-review-bot-local.mjs
```

The default local output directory is `artifacts/visual-review`.

## GitHub Actions

`visual-capture-bot.yml` can be started manually from Actions with a comma-separated route list and an optional review note. It also runs automatically on relevant master changes.

The artifact contains the rendered PNG evidence and WebM journeys. The current GitHub connector can inspect repository text and artifact metadata, but it does not expose the binary PNG/WebM bytes directly to the assistant's vision pipeline. For visual inspection inside the conversation, attach the relevant PNG/WebM from the artifact to the chat; the structured `report.json` remains useful for machine-readable diagnosis even before attachment.
