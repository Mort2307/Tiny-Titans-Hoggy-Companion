# Tiny Titans — repository development instructions

Tiny Titans is an expert-informed reptile/exotic animal keeper companion, not a generic AI pet app. Before changing screens, interactions or copy, read `docs/HUMAN_FIRST_UX_STANDARD.md`.

## Product and visual invariants
- Preserve the existing Tiny Titans logo/brand assets and distinct reptile-keeping personality. Do not introduce abstract purple lightning icons, stock AI animals, decorative neon dashboard kits, gratuitous gradients, generic assistant chat bubbles or bland AI copy.
- Prefer real animal records and clear keeper workflows over decorative intelligence. Prioritise weight/feeding/shed/history, husbandry evidence, breeder tools, multi-species and accessibility. Keep the animal and the keeper's next useful action central.
- Species and genetics are evidence-led. Never generate an unverified morph identification, genotype/het certainty, breeding probability or temperature/health recommendation. Show source/provenance, uncertainty, region terminology and human-review boundaries. Avoid confident fabricated labels.
- Animal wellness and husbandry alerts must distinguish observations from diagnosis, use clear units and species-specific caveats and never imply veterinary approval.
- Existing optional intelligence features must honour consent, explain provenance and remain distinct from a chatty AI personality; no unapproved third-party processing or surprise API costs.
- Forms should be mobile-first, resilient to offline/stale-session conditions and clearly state whether changes synced; do not discard feeding/weight records. Show empty/error/loading/success rather than silent failure.
- Make tap targets accessible, keyboard focus visible, text scalable and motions reducible; avoid cramming an expert workflow into tiny icon-only controls.

## Engineering and release
- Reuse current Vite/React/Firebase architecture and brand assets. Do not migrate to Adalo/another builder or import a generic UI kit as a shortcut.
- Delivery work in issue #80 and PRs #79/#77/#70 has separate runner, account-linking and release gates. Do not interpret runner failures as passing tests or merge overlapping unfinished branches blindly.
- For any changed screen, document before/after, species/use-case, relevant roles, error/loading/empty/success states, offline behaviour and real-device validation. See `docs/HUMAN_FIRST_UX_STANDARD.md`.
- No deploy without full source validation, backend-first safeguards when applicable, correct Firebase project/site verification and owner-facing manual QA. Do not claim code generation proves production behaviour.
