# Tiny Titans Hoggy Companion — Retirement Manifest

This folder contains files deliberately removed from the active MASTER build after an evidence-based audit.

## Rules

- `master` is the authoritative source.
- A file is retired only after its active references are checked.
- Retirement is archival, not destructive deletion.
- Historical code is retained here so it can be recovered if required.
- Do not add active imports from `retirement/`.

## Confirmed retired

| Original path | Reason | Evidence |
|---|---|---|
| `functions/stripe-temp-marker.txt` | Temporary deployment marker; contained only `temporary`. | File content explicitly identifies it as temporary. |
| `functions/stripeInlineFix.txt` | Temporary deployment marker explicitly stating it should be removed after the Stripe fix. | File content explicitly identifies it as a deployment marker. |
| `src/pages/CreatorHub.tsx` | Superseded Creator UI; `CreatorAdmin.tsx` is the active Creator Centre route. | Active source path is absent from MASTER and archived copy exists here. |
| `src/components/CreatorCommunityGlobe.tsx` | Superseded by the active Creator Community Globe V2 implementation. | Archived copy exists here; V2 remains in active MASTER. |
| `src/components/.gitkeep` | Empty placeholder in an already-populated active components directory. | Zero-byte placeholder; no runtime purpose. |
| `src/pages/.gitkeep` | Empty placeholder in an already-populated active pages directory. | Zero-byte placeholder; no runtime purpose. |

## Not yet retired

Suspicious-looking files remain in MASTER until reference and build audits prove they are obsolete. Filename appearance alone is not sufficient evidence for retirement.
