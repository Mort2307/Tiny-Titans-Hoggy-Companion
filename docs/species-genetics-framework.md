# TinyTitans Species Genetics Framework

Species genetics are deliberately species-scoped. A trait name such as `Albino`, `Axanthic`, or `Leopard` is never assumed to mean the same gene across species.

## Coverage states

- **mapped** — the species has a complete canonical genetics integration already used by the app's mature genetics stack. Western Hognose is currently the mapped reference implementation.
- **partial** — the species has a real species-specific catalogue, but the catalogue is not yet comprehensive enough to claim full genetic coverage.
- **baseline-only** — the species is registered and can be kept/tracked, but TinyTitans has not yet established a species-specific genetics catalogue.

The coverage API is intentionally measurable so the UI can explain what TinyTitans knows rather than presenting an empty selector as if no genetics exist.

## Data rules

Every catalogue entry must be species-specific and carry its inheritance model. Where available it also carries a source URL and source label. Source presence does not by itself mean a trait is scientifically settled; evidence strength and verification remain separate concepts.

Combination morphs should be represented from their underlying genes when the genetics are established. A market name must not become a new independent gene merely because breeders use it as a phenotype label.

Unknown, disputed, lineage-specific, or community-only claims should remain visibly uncertain rather than being silently promoted to confirmed genetics.

## Expansion order

The catalogue will expand species by species. High-demand snakes are prioritised first, with Ball Python now centralised as the first substantial partial catalogue alongside the existing species entries. New traits and combinations are added only with species-specific evidence and regression tests.
