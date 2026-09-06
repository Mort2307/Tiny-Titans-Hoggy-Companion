# Tiny Titans Species Genetics Expansion

The species catalogue and genetics catalogue are intentionally separate layers.

## Required state for every species

- **baseline-only** — species exists, but no reviewed genetic trait set is published yet.
- **partial** — one or more species-specific traits are mapped, but the catalogue is incomplete.
- **mapped** — the species has a sufficiently reviewed Mendelian/non-Mendelian genetics model for calculator use.

## Required trait record

Each genetic trait should have a stable identity, canonical display name, aliases, inheritance model, het capability where applicable, evidence/source metadata, and explicit composition relationships when it is a combination or super form.

## Expansion order

1. Finish Western Hognose normalization and regression tests.
2. Complete the highest-demand captive snake species first: Ball Python, Corn Snake, Boa imperator/constrictor, Kingsnake/Milk Snake, Carpet Python, Burmese Python, Reticulated Python, Sand Boa, Rainbow Boa and similar commonly kept species already in the registry.
3. Add specialist species only when species-specific genetics sources are strong enough to avoid inventing inheritance.
4. Keep uncommon, uncertain or disputed traits visible as unresolved records rather than guessing.

## Non-negotiable behaviour

A combination name never becomes a gene. A super form never becomes a new locus when it is simply a two-copy state. Polygenic and line-bred traits never receive artificial Mendelian probabilities. Alias input resolves to one canonical identity.
