# Retirement Manifest

Confirmed retired material is preserved here rather than destroyed.

## Confirmed entries

- `functions/stripe-temp-marker.txt` — temporary deployment marker.
- `functions/stripeInlineFix.txt` — deployment marker explicitly intended for removal after the Stripe fix.
- `src/data/masterMorphDatabase.test-note.ts` — unused test marker; its only declaration was `masterMorphDatabaseReady` and no application reference was found.
- `src/firebase/config.ts.tmp` — 1-byte temporary artifact (`x`), not application code.
- `src/utils/breedingEngine.ts` — empty placeholder; active breeding implementation is `src/services/breedingService.ts` and genetics utilities.
- `src/utils/inheritance.ts` — empty placeholder; no application reference found.
- `src/pages/CreatorHub.tsx` — superseded Creator page; active Creator area is `CreatorAdmin.tsx`.
- `src/components/CreatorCommunityGlobe.tsx` — superseded globe implementation; active globe is `CreatorCommunityGlobeV2.tsx`.
- `src/services/morphSubmissionService.ts` — superseded morph-image submission implementation; active submission flow is `src/services/morphSubmissionServiceV2.ts`, now depending directly on the canonical `MorphSubmissionCredit` type.

Retirement is evidence-based: files are moved only after their active references and replacement paths have been checked. Retired files are not imported by the active build.