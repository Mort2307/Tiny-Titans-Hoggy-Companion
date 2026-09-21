# Tiny Titans Universal Species Expansion

## Scope

This branch converts the species layer from a snake-first catalogue into a universal animal catalogue without replacing the established snake genetics/husbandry architecture.

The existing canonical snake registry remains authoritative for snake-specific features. The universal layer bridges those records and adds a taxonomy-first expansion for:

- Reptiles: additional snakes, lizards, turtles/tortoises and crocodilians
- Amphibians: frogs, toads, salamanders, newts and caecilians
- Arachnids: spiders, scorpions, whip scorpions and tailless whip scorpions
- Insects: mantids, phasmids, beetles, roaches, crickets, locusts and moths
- Myriapods: millipedes and centipedes
- Molluscs: terrestrial gastropods
- Crustaceans: hermit crabs, shrimp, crayfish and vampire crabs
- Mammals, birds and fish commonly encountered in specialist/exotic keeping
- Cephalopods for specialist marine keeping

## Current expansion size

The branch contains 485 curated universal seed records. Static ID comparison found 46 overlaps with the existing 113-species snake registry; the runtime registry therefore targets 552 unique universal records before any future additions.

The new records are intentionally taxonomy-first / research-needed. This is a feature, not a missing field: Tiny Titans must never invent species-specific numeric husbandry values simply because a record exists.

## Taxonomy sources

| Animal group | Primary source |
|---|---|
| Reptiles | The Reptile Database |
| Amphibians | Amphibian Species of the World 6.2 (AMNH) |
| Spiders | World Spider Catalog v27 (NHM Bern), authority/reference only |
| Mammals | Mammal Diversity Database v2.5 (ASM) |
| Birds | AviList unified world checklist |
| Broad fallback taxa | Catalogue of Life 2026 |

## Legal / regulatory source trail

Universal records carry explicit links for current verification rather than hard-coded legal conclusions:

- Species+ / CITES for Appendix status and international trade checks
- GOV.UK CITES guidance for Great Britain import/export requirements
- GOV.UK Dangerous Wild Animals licensing guidance
- GOV.UK invasive non-native animal controls for England and Wales

The app deliberately labels these as checks because legal status depends on jurisdiction, taxon, specimen, activity and current law.

## Evidence boundary

`taxonomy-first` records have no species-specific numeric temperature, humidity, enclosure or breeding targets.

Promotion into keeper-facing husbandry requires:

1. explicit species-specific source evidence;
2. dated review metadata;
3. evidence scope attached to every numeric range;
4. appropriate veterinary / specialist review for higher-risk taxa;
5. separate legal/conservation checks where relevant.

Existing snake profiles continue through the established Tiny Titans husbandry/evidence pipeline.

## World Spider Catalog restriction

The World Spider Catalog is used here as an authority/reference source only. Its site states that use is limited to research, educational and non-commercial fair use and that material may not be copied into other databases without permission. Tiny Titans therefore does not bulk-copy WSC records or reproduce its catalogue.

## Expansion roadmap

The universal layer is deliberately designed so later passes can promote high-priority species in controlled waves:

- Tier 1: common captive reptiles and amphibians with strong husbandry literature
- Tier 2: common invert keepers' species and feeder colonies
- Tier 3: specialist mammals/birds/fish
- Tier 4: high-risk, venomous or legally constrained taxa as taxonomy/safety records first
- Tier 5: locality-sensitive and poorly documented species after specialist evidence review

Each promoted species should receive its own evidence packet rather than inheriting numeric values from a related taxon.
