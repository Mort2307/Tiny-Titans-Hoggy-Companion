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


## Universal husbandry + health layer

Every universal species record now resolves through a class-aware care pipeline. The pipeline supplies a minimum biological-care baseline and health watch points rather than pretending a generic value is a species-specific care sheet.

Resolution order is designed for future overrides: species-specific evidence can supersede genus emphasis, genus guidance can supersede class-only context, and class/general-veterinary context remains visible when more specific evidence is unavailable. Each requirement carries an evidence basis, source IDs, caveat and review date.

The current baseline intentionally avoids universal numeric targets for temperature, humidity, water chemistry, enclosure dimensions, feeding quantity/frequency or supplementation. Those values are promoted only when a scoped species evidence record exists.

The same species identity is now reusable across:
- Free and paid keeper-facing species discovery/profile pages.
- Titan Pro intelligence context as the shared canonical species foundation.
- Titan Seller and all Business tiers through marketplace listings.
- Rescue intake, individual animal records and public-safe animal passports.
- Species Incubator/submission workflows for unidentified or unsupported species.
- Creator review and research queues.

This keeps species identity, care evidence and health guidance as one canonical dataset instead of creating separate seller/rescue/keeper copies.

## Species versus individual animal architecture

Species and individual animals are separate entities.

Species record: canonical taxonomic/reference entity containing scientific identity, common names, aliases, taxonomy, ecology, risk/legal checks, care-evidence coverage, husbandry requirements and health-watch context.

Individual animal record: one real specimen owned by a keeper or managed by a Rescue. It has its own name, identifiers, sex, status, acquisition/history, notes and future tracker data. It stores a speciesId link rather than copying the species care sheet.

User flow:

Animal type -> species list -> exact species -> individual animals of that species

Examples:

Snakes -> all snake species -> Heterodon nasicus -> the keeper's individual hognoses
Frogs & toads -> all frog/toad species -> an exact accepted taxon -> the keeper's individual frog(s)
Spiders -> all spider species -> Brachypelma hamorii -> the keeper's individual tarantula(s)

Existing My Reptiles snake records remain in their established Firestore collection and are surfaced in the universal individual directory without duplicating the underlying animal records.

### Care accuracy invariant

A species can be displayed as having species-level care only when a species-scoped husbandry evidence record has been attached. A genus-level profile may be shown as genus-level. Class/ecology content is research context and must not be presented as a verified species care sheet.

Numeric husbandry ranges follow the same rule: each range carries its evidence scope and source IDs. A generic class source cannot create a species-specific numeric target.

### Individual-to-species linkage

Keeper, Rescue, Marketplace and Titan Intelligence workflows consume the same canonical speciesId. They must not maintain parallel species dictionaries.