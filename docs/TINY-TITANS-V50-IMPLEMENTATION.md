# Tiny Titans V50 — Implementation Contract

V50 implements all 50 product capabilities as one connected system. This document is the delivery contract, not a promise that every capability is complete in the first commit.

## Non-negotiable UX

- Tiles and tabs are navigation surfaces. Opening a feature must navigate to a dedicated destination; never make users hunt through a giant scrolling page.
- Every destination has loading, empty, error and success states.
- Every internal destination must resolve through the route contract.
- Back navigation must preserve useful context.
- Mobile is first-class: touch targets, compact cards and no horizontal overflow.
- Progressive disclosure: simple by default, advanced detail one tap away.
- Intelligence must be explainable: users can ask “Why am I seeing this?”
- Proactive suggestions must use real recorded context and may not invent user data.

## Intelligence layers

1. Animal intelligence — individual life history, behaviour, growth and records.
2. Genetics intelligence — traits, aliases, inheritance, evidence, conflicts and lineage.
3. Husbandry intelligence — enclosure, environment, feeding, shedding and anomaly signals.
4. Community intelligence — contributions, reputation, aggregated anonymous trends and verification.
5. Titan intelligence — orchestration across all four layers.

## Feature delivery rule

Each V50 capability must have:

- a canonical feature ID in `titanV50FeatureMatrix.ts`;
- a real data contract where data is required;
- a dedicated route or an explicitly documented existing destination;
- loading/empty/error states;
- validation coverage;
- mobile-safe UI;
- privacy/permission handling;
- explainable intelligence where recommendations are involved;
- no dead links or placeholder destinations.

## Performance rule

Do not solve intelligence by fetching the entire database into the browser. Prefer scoped queries, cached/reference data, derived snapshots and event-driven updates. Expensive visualisations and AI-assisted work must be lazy-loaded. A feature that makes the dashboard slower is not considered complete.

## Safety and trust

- Phenotype recognition never becomes genetic confirmation by appearance alone.
- Reported breeder claims retain their evidence status.
- Conflicting parentage or phenotype data produces an explicit conflict signal rather than silent correction.
- Health/emergency features provide appropriate professional escalation and do not diagnose.
- Community analytics are aggregated and privacy-preserving.

## Delivery order

### Phase A — Foundation and navigation

1. Canonical route/page registry.
2. Command navigation.
3. Page-shell standardisation.
4. Loading/error/empty-state primitives.
5. Intelligence contracts and signal model.
6. Performance budgets and route validation.

### Phase B — Keeper intelligence

7. Titan Memory.
8. Snake Life Graph.
9. Growth Curve Predictor.
10. Something Changed Detector.
11. Husbandry Anomaly Engine.
12. Personality System.
13. Automatic Keeper Journal.
14. Snake Passport and Vet Mode.
15. Shed Detective.
16. Escape and Emergency modes.

### Phase C — Genetics intelligence

17. Genetics Detective.
18. Morph Discovery Engine.
19. Evidence Ladder.
20. Genetic Confidence.
21. Genetics Conflict Detector.
22. Impossible Baby Detector.
23. Genetic Breadcrumbs.
24. Living Family Tree.
25. Genetic Time Machine.
26. What-If Sandbox.
27. Breeding Dragon Builder.
28. Hatchling Mode.
29. Genetic Outcome Feedback.
30. Morph Court.

### Phase D — Environment intelligence

31. Vivarium Digital Twin.
32. Microclimate Logger and Alerts.
33. Bioactive Ecosystem Tracker.
34. Plant Intelligence.
35. Enclosure recommendations and explainability.

### Phase E — Learning/community intelligence

36. Adaptive Learning.
37. Species Mastery.
38. Explain Like I'm High / Keeper / Breeder modes.
39. Keeper Reputation.
40. Titan Earth.
41. Reptile Census.
42. Research Archive.
43. Community verification.

### Phase F — Titanverse

44. Titan Knowledge Graph.
45. Titan Intelligence orchestration.
46. Proactive recommendations.
47. “Why am I seeing this?” transparency.
48. Annual Titan Time Capsule.
49. Global/collection insights.
50. HOLY SHIT Mode — the surface that finds useful, interesting connections the keeper did not ask for.

## Definition of “done”

V50 is not complete when all 50 names exist in the UI. It is complete when the capabilities are connected, validated, performant, explainable and useful in real keeper workflows.
