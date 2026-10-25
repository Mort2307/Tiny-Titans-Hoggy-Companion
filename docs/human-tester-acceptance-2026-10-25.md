# Tiny Titans — Human Tester Acceptance

Date: 25 October 2026  
Applies to draft PR #107; this document is not a production sign-off.

## Purpose

This pass is reviewed by actual in-app testers, not automated bot identities. Normal CI, static contracts, the genetics test suite and Firestore security emulator remain required, but do **not** replace real device acceptance.

## Tester access

1. Sign into an existing Tiny Titans account with the tester flag (`profile.isTester === true`).
2. Open **My Account → In-app testing → Tester Centre**, or navigate to `/tester` while signed in.
3. Open each relevant feature and test it as a real user. The on-screen reviewed ticks stay in the current browser session; they are not independently verified evidence.
4. Use **Report a bug** (`/report-bug`) for issues, **Send feedback** (`/feedback`) for suggestions, and **My issue reports** (`/my-issue-reports`) for submitted bug history.

Creator-only paid-tier overrides and notification delivery administration remain at `/creator/tester` and require the original Creator admin claims. Never upgrade an ordinary tester for this review.

## Device acceptance matrix

| Area | Actions | Required evidence |
| --- | --- | --- |
| Species search | Find one supported species and one provisional/unmapped species | Correct identity, uncertainty and sourced husbandry; no borrowed thresholds |
| Genetics calculator | Choose an existing parent or enter reviewed genetics; switch species; expand carrier results | Correct names/probabilities; no invented 100% Wild Type for unmapped inheritance |
| Compact mobile UI | On phone, inspect both parent selectors, species bar and offspring rows; expand/collapse genetics | Readable labels, tappable controls, no horizontal overflow or clipped content |
| Breeding history | Create/open a project; add a valid observation; close/reopen | Exact species and recorded data persist; no fabricated inheritance |
| Morph library | Search recognised and unreviewed mutations; inspect submitted photo provenance | Evidence-first labels, no downloaded web images masquerading as community submissions |
| 3D rooms | Enter rooms and select an enclosure using touch | Navigable layout, obvious selection and no overlap |
| Human reporting | Report one real issue, including steps/expected result, then open My Issue Reports | Issue submission and history display correctly; no synthetic success claims |
| Permission isolation | Ordinary tester visits the public `/tester` page and tries direct Creator URL `/creator/tester/paid-tiers` | Human checklist accessible to designated testers; restricted admin tools inaccessible |
| Account lifecycle | Sign out, sign in, revisit Tester Centre, follow feature links | Correct tester access and navigation; no forced redirects or lost account state |

## Release decision

- **Pass** only after the assigned human testers confirm expected behaviour and the known issue queue has no unresolved launch-blocking regression.
- A blocked or untested step is **not** a pass.
- Record defects with device/OS, screenshot or recording where appropriate, steps to reproduce, expected result and actual result.
- Approval to merge the broad animal-expansion PR and a separate decision to deploy production are required after these gates. Legacy bot endpoints that may still exist in deployed Firebase must be addressed during an explicitly approved backend deployment.

## Automated checks retained

- Standard application CI and production build
- Static source and route contracts, including `validate:human-tester`
- Genetics test coverage and reviewed-locus fail-closed rules
- Firestore owner/family/species isolation emulator
- Backend release candidate validation
