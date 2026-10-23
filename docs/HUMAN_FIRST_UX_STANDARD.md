# Tiny Titans: human-first product and interaction standard

Status: **design/engineering standard only; no production UI is changed by this document**. Applies to new and revised screens, whether built manually or with Mobile App Builder guidance.

## Positioning and visual identity
Tiny Titans should feel like a thoughtful keeper's field notebook with professional-grade tools—not an AI-generated pet dashboard. Use the established Tiny Titans brand and actual logo assets; avoid the previously rejected purple lightning symbol, unrelated stock snake portraits, generic pastel-gradient templates, oversized floating chat widgets, endlessly repeating cards, fake gauges and artificial enthusiasm. An animal's own record is the hero.

Use authentic, owner-controlled animal images with predictable cropping. Keep care records readable, recent history visible and the next meaningful action obvious. Quick actions should not crowd out existing data.

## Keeper voice and evidence
- Say what happened: "Fed 1 fuzzy", "Weight saved", "Shed logged", "Next planned check"; provide units, dates and context. Never disguise a projection as a measurement.
- Species care values are husbandry guidance, not a veterinary diagnosis. Show evidence date, cited provenance and relevant variation; mark disputed or incomplete data clearly.
- Morph and breeding predictions require correct genetics, uncertainty/probability labels and documented aliases for UK/US/EU/Australian terminology. Never upgrade `possible het` to confirmed or conflate line-bred names with alleles.
- If the application analyses trends, distinguish the observed pattern from a suggestion. Users should always be able to inspect and correct the underlying log entries.
- Don't insert automated health claims, sentiment-heavy animal narration, fabricated expert endorsements or commercial AI features without a specific approved need.

## Functional interaction standards
1. The Home/Animals workspace should prioritise animal selection, latest feed/weight/shed, urgent legitimate reminders and one thumb-reachable log action. More advanced modules are discoverable without interrupting daily care.
2. Feeding, weight, shedding and health forms need visible validation, correct species-relevant units, timezone-aware dates, duplicate submission prevention and confirmation only when data persisted.
3. Installed PWA and Android update prompts should preserve unsaved animal records and offline continuity. Do not force a reload while a keeper is completing a form. Do not conflate an offline release-check error with a confirmed new version.
4. Show loading, empty, error, offline/pending-sync and success separately. Empty records must not mask a backend permissions or connectivity failure.
5. User photos and enclosure images: full preview, suitable crop controls when needed, no silent aspect-ratio loss or media rehosting outside established permissions.
6. Breeding planner must surface pair-specific maturity/condition cautions and genetics as probabilities—not an automatic clearance to breed.
7. Species Explorer, morph library and care cards: consistent terminology, sources, uncertainty and accessible filtering. Filters, tags, lists and timeline events should be tappable wherever the label indicates navigation.
8. Contrast, 44×44 CSS px touch affordances, text enlargement, clear focus, screen reader names and reduced motion are default requirements. Avoid icon-only mysteries.

## First QA journeys (not presumed complete)
| Journey | Evidence |
| --- | --- |
| Keeper records a meal, taps save twice | One event, one reminder update, clear syncing result |
| Keeper logs weight while offline | Record retained, sync/pending badge truthful, restored after reconnection |
| User opens stale PWA before care logging | Update-state check is understandable; no update loop or lost unsaved form |
| Keeper switches animals | History, species, weight units and active animal consistent across views |
| Breeder explores Arctic/Conda and uncertain hets | Correct genetic labels and probabilistic outcomes; no false certainty |
| User checks regional morph synonym | Canonical identity + provenance shown, unresolved alias not treated as verified |
| Keeper adjusts portrait/banner artwork | Preview matches display and original is not destroyed |
| User on Android, desktop and iOS PWA | Actions, keyboard/focus, text scale and offline behaviour usable |
| Paid/unpaid viewer opens gated tool | Accurate entitlement messaging without deceptive paywall or data leakage |

Record device, viewport, logged-in role, current branch SHA, steps, expected vs observed, failed connectivity case and screenshot evidence where safe. Mark untested cases **NOT RUN**.

## Safe implementation order
1. Stabilise the current private-repository CI and deployment workflow (issue #80) before trusting new release gates.
2. Fix proven defects in keeper logging, updates, critical navigation or inaccessible controls, in small PRs.
3. Refine visual consistency from existing tokens and components instead of importing a new UI framework.
4. Validate code/build/test contracts; review on a real device and distinguish preview from live Firebase release.
5. No new paid dependencies, external animal-photo training, surprise speech AI, unapproved backend or shared Nightjar credentials.

## PR UX acceptance checklist
- [ ] Existing brand assets retained; no unsolicited generic AI visual motifs
- [ ] Realistic active/empty/loading/error/offline/saved states inspected
- [ ] Appropriate species/genetics accuracy and uncertainty evaluated
- [ ] Mobile + desktop + accessible interaction checked where possible
- [ ] Auth, consent, costs and permission boundaries unchanged unless separately approved
- [ ] CI and live-device outcomes recorded accurately; no premature "deployed" claims
