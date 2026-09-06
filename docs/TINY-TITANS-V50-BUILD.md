# Tiny Titans Reptile Companion — Full 50 Build

## Mission

Build Tiny Titans as a fast, keeper-first reptile operating system: every important workflow is complete, every internal destination resolves, every complex feature opens as a real route/page, and intelligence connects records rather than creating isolated gimmicks.

The existing architecture already establishes the right direction: Experience → Intelligence → Domain → Data, an event bus for meaningful keeper actions, and a shared intelligence kernel. This build turns that direction into a concrete product contract.

## Non-negotiable product rules

1. **No dead destinations.** Every internal navigation target must resolve to a declared route and render a useful page or an explicit protected/empty state.
2. **No doom-scroll navigation.** A tile, tab or action that represents a distinct destination navigates to a distinct route/page. Long content is split with tabs/sections rather than forcing users to hunt through one giant screen.
3. **Crisp by default.** Progressive disclosure hides complexity until it is useful. The first viewport should answer what matters and what to do next.
4. **Intelligence is explainable.** Every non-trivial insight can expose why it appeared, its evidence, confidence, freshness and suggested next observation/action.
5. **Never invent certainty.** Unknown genetics, inferred phenotype, population statistics and keeper observations remain explicitly separated.
6. **The app anticipates useful next actions.** Suggestions are derived from state, recency, user habits and incomplete workflows, not random nudges.
7. **Performance is a feature.** Lazy-load heavy pages and 3D/visual modules, avoid repeated collection reads, keep list rendering bounded, cache stable domain data and prefer aggregated intelligence snapshots.
8. **Private by default.** Individual keeper data is never silently promoted into public/community intelligence.
9. **Health boundaries stay clear.** Pattern detection can flag changes and recommend a record/review; it does not diagnose or replace veterinary care.
10. **Desktop and mobile are first-class.** Navigation, touch targets, route transitions, loading states and empty states must remain usable on both.

## The 50 feature target

### A. Core keeper intelligence

1. **Titan Memory** — durable keeper observations tied to an animal and date.
2. **Life Timeline** — unified weight, feeding, shedding, health, behaviour, enclosure and breeding history.
3. **Growth Curve** — individual historical trend plus transparent projection ranges.
4. **Pattern Engine** — finds repeat rhythms across keeper records.
5. **Change Detector** — highlights meaningful deviations from an animal's own baseline.
6. **Next Best Action** — suggests the most useful next keeper action from current state.
7. **Why This? panel** — explains why an insight, reminder or recommendation appeared.
8. **Data Coverage** — shows what the app knows and what is missing without turning missing data into a negative conclusion.
9. **Time Capsule** — annual keeper archive and collection summary.
10. **Keeper Journal** — readable narrative summaries generated only from recorded data.

### B. Genetics intelligence

11. **Genetics Detective** — resolves morph names, aliases, combinations and evidence.
12. **Morph Evidence Ladder** — established / supported / reported / uncertain / disputed status.
13. **Genetics Conflict Detector** — flags parentage/genotype contradictions.
14. **Impossible Baby Detector** — flags offspring outcomes not explained by current records.
15. **Genetic Breadcrumbs** — follows inherited traits through lineage.
16. **Living Genetic Family Tree** — visual lineage across generations.
17. **Trait Relationship Graph** — connected graph of traits, combos, aliases and evidence.
18. **Genetic What-If Sandbox** — change assumptions and recompute outcomes.
19. **Genetic Time Machine** — project lineage scenarios across generations.
20. **Morph Terminology Resolver** — search any accepted/common name and land on the canonical record.

### C. Breeding and lifecycle

21. **Breeding Project Workspace** — persistent project containing animals, goals, pairings and outcomes.
22. **Breeding Outcome Simulator** — expected genetic outcomes with confidence and assumptions.
23. **Hatchling Mode** — egg → hatch → weight → first feed → first shed → genetic outcome.
24. **Prediction vs Outcome** — compare predicted and observed litter outcomes.
25. **Lineage Archive** — preserve completed breeding projects as historical records.
26. **Breeding Readiness Intelligence** — combines configured goals and keeper-entered records into a readiness checklist.
27. **Offspring Auto-Provisioning** — approved hatchling outcomes create linked animal records without re-entering known data.
28. **Genetic Anomaly Review** — route unexpected outcomes into an evidence/review workflow.

### D. Husbandry and enclosure intelligence

29. **Husbandry Anomaly Engine** — detects unusual changes in logged routines without diagnosing.
30. **Microclimate Logger** — sensor-ready temperature/humidity history with thresholds and alerts.
31. **Vivarium Digital Twin** — structured digital enclosure representation.
32. **Bioactive Ecosystem Tracker** — plants, cleanup crew, substrate, maintenance and observations.
33. **Plant Intelligence** — species-aware enclosure compatibility and care references.
34. **Emergency Mode** — structured emergency guidance and veterinary escalation prompts.
35. **Escape Mode** — elapsed timer, last-known-location workflow and species-aware search checklist.
36. **Shed Detective** — structured shed photo/observation records and historical comparison.

### E. Community, learning and platform intelligence

37. **Global Titan Map** — privacy-preserving regional community presence.
38. **Global Reptile Census** — aggregate, eligibility-controlled population statistics.
39. **Keeper vs Community** — transparent comparison against eligible aggregate data.
40. **Keeper Reputation** — contribution quality and verified knowledge signals, not follower count.
41. **Morph Court** — evidence-led community review of disputed identification/submissions.
42. **Adaptive Learning Paths** — dynamically prioritised learning topics based on user progress.
43. **Species Mastery** — domain-specific learning progress across husbandry, behaviour, genetics and breeding.
44. **Explain Like I'm High / Keeper / Breeder / Nerd** — presentation modes that change explanation depth, not underlying facts.
45. **Titan Wrapped** — annual visual summary of the keeper's recorded activity and achievements.

### F. Product-scale intelligence

46. **Universal Search** — one search surface across animals, records, morphs, species, projects and learning.
47. **Titan Knowledge Graph** — connected domain model powering cross-feature retrieval and recommendations.
48. **Proactive Intelligence Feed** — the app surfaces useful observations before the user asks.
49. **Vet/Transfer Report Generator** — clean export of relevant individual history for professional review or transfer.
50. **HOLY SHIT Mode** — occasional, deterministic, data-backed discoveries from the user's own collection and history.

## Intelligent anticipation model

The proactive layer should reason from **current state + historical pattern + recent user intent + unfinished workflow + configured preferences**.

Examples:

- A user records a weight and normally feeds around the same interval → surface the feeding workflow as a contextual next action, without creating a noisy notification.
- A breeding project gains a new confirmed genetic record → offer the affected outcome recalculation immediately.
- A shed is marked partial/problematic → suggest the appropriate follow-up record rather than a generic reminder.
- A user opens a snake repeatedly and always then opens the same tracker → promote that destination as a quick action for that snake.
- A morph is searched under a synonym → remember the canonical record for future navigation and show the relationship.
- A keeper starts a new enclosure → proactively offer the species-appropriate enclosure workflow before unrelated tools.

These behaviours must remain explainable and user-controllable.

## Navigation contract

Use route-first navigation. A distinct conceptual destination gets a distinct route.

- Home is a command centre, not a dumping ground.
- Feature hubs use compact tiles/cards to open dedicated pages.
- Dedicated pages use local tabs where they reduce repeated navigation inside the same domain.
- Back/close behaviour returns to the initiating context.
- Deep links must render directly after refresh.
- Any missing destination must fail closed to a useful not-found/unsupported state, never a blank page.
- Navigation labels and routes come from a single registry where practical to reduce drift.

## Performance contract

- Lazy-load heavyweight routes and visual modules.
- Prevent duplicate reads caused by parent + child components fetching identical data.
- Prefer pre-aggregated intelligence snapshots for dashboards.
- Cache stable species/morph reference data locally where safe.
- Virtualise or paginate genuinely large collections.
- Compress uploaded media and render responsive image sizes.
- Keep 3D/Globe code off the critical Home path where possible.
- Avoid unnecessary global event listeners and clean all subscriptions on unmount.
- Keep loading/empty/error states visually stable to minimise layout shift.

## Quality gates

The production gate must continue to validate:

- TypeScript/build
- route contracts and route coverage
- morph integrity/taxonomy/source audits
- species database/husbandry/genetics integrity
- security/privacy contracts
- intelligence consent/journey contracts
- notifications
- UI hardening
- encoding/copy quality
- visual/route bot coverage

Any new intelligence capability should add a deterministic contract test where practical.

## Delivery order

### Phase 1 — Stabilise

Navigation registry, page shells, route audit, dead-link audit, common loading/empty/error states, data access consolidation and performance profiling.

### Phase 2 — Intelligence spine

Event taxonomy, durable intelligence records, recommendation engine, explainability contract, confidence/evidence/freshness model and proactive action selection.

### Phase 3 — Genetics graph

Canonical morph resolver, evidence ladder, aliases, conflicts, lineage graph, what-if engine and breeding feedback.

### Phase 4 — Husbandry intelligence

Digital twin, microclimate-ready data model, anomaly detection, escape/emergency workflows and bioactive/plant modules.

### Phase 5 — Community and learning

Knowledge graph, census/benchmarks, contribution reputation, adaptive learning and annual summaries.

### Phase 6 — Polish

Mobile optimisation, bundle splitting, visual consistency, accessibility, offline room workflows, telemetry-free deterministic performance diagnostics and the final HOLY SHIT moments.

## Definition of done

A feature is not complete because its component renders. It is complete when its route, loading state, empty state, error state, permissions, persistence, navigation, responsive layout, intelligence integration, tests/contracts and performance behaviour are all accounted for.
