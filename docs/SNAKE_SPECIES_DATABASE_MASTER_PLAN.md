# Tiny Titans — Snake Species Intelligence Database

## Goal

Turn the existing Tiny Titans keeper platform into a species-first snake management system. Every individual snake stores a stable `speciesId`, and all species-sensitive intelligence resolves from that animal's species profile.

## Non-negotiable accuracy rules

1. **Taxonomy is separate from husbandry.** A recognised species can exist in the taxonomy registry even when Tiny Titans has not yet approved species-specific husbandry values.
2. **No invented numbers.** Temperature, humidity, enclosure, feeding, breeding or other quantitative keeper guidance must have explicit provenance and an evidence level.
3. **No generic inheritance across species.** Similar common names, genera or families do not automatically make husbandry equivalent.
4. **Taxonomy is versioned.** Current accepted names, synonyms, former combinations and source release/access dates must be retained so user records survive taxonomic change.
5. **Common names are search aliases, never the canonical identity.** Scientific taxon identity is the stable key used by the app.
6. **Evidence is visible.** Users should be able to see why a recommendation exists, its evidence level, source references and review date.
7. **Safety class is species-aware.** Companion, specialist and venomous/high-risk taxa must not receive the same handling or operational content.

## Architecture

```text
User account
  └── Individual snakes
        └── speciesId
              ├── Taxonomy record
              ├── Species knowledge profile
              │     ├── Husbandry
              │     ├── Feeding
              │     ├── Behaviour
              │     ├── Reproduction
              │     ├── Seasonality
              │     └── Safety
              └── Evidence/source registry
```

## Add Snake behaviour

The Species control should support search by:

- common name
- scientific name
- historic/synonym name
- recognised keeper abbreviation/trade name

The saved value must be the canonical `speciesId`, with the selected name and scientific name displayed back to the keeper.

## Primary Species

A user-level Primary Species can drive dashboard defaults, learning suggestions, onboarding and discovery. It must **not** override the species context of an individual animal.

## Species-aware application surfaces

Every feature capable of giving biological guidance should resolve context from the selected snake's `speciesId`, including:

- Home/dashboard insights
- Feeding
- Weight and body-condition interpretation
- Shed tracking
- Husbandry/environment records
- Reminders
- Breeding
- Genetics where species-specific genetics exist
- Behaviour
- Learning
- Intelligence/AI answers
- Alerts and anomaly detection

## Data coverage strategy

The long-term target is comprehensive coverage of snake taxa encountered in legitimate captivity and/or relevant to snake identification and husbandry, rather than limiting Tiny Titans to hognoses.

The taxonomy baseline should follow a current authoritative reptile taxonomy source. The Reptile Database currently provides living reptile classification, synonyms, distribution and literature references and publishes downloadable structured checklists. Its own documentation notes that taxonomy is continuously revised, so Tiny Titans must treat taxonomy as versioned data rather than permanent truth.

The knowledge layer should then be populated species-by-species using a source hierarchy such as:

1. peer-reviewed species-specific primary literature
2. veterinary references and zoological veterinary guidance
3. recognised institutional/zoological sources
4. authoritative conservation/taxonomic databases
5. carefully screened specialist husbandry literature
6. keeper/community observations only as lower-level evidence, clearly labelled

## Evidence model

Each species-sensitive value should carry:

```text
value
unit
context
sourceIds[]
evidenceLevel
reviewedOn
notes
```

Where evidence conflicts, Tiny Titans should display the disagreement rather than fabricate a single definitive value.

## Initial proof-of-architecture taxa

The seed registry intentionally demonstrates different biological and taxonomic cases:

- Western Hognose — *Heterodon nasicus*
- Eastern Hognose — *Heterodon platirhinos*
- Malagasy Golden Hognose — *Leioheterodon modestus*
- Tricolour Hognose — *Xenodon pulcher*
- Ball Python — *Python regius*
- Corn Snake — *Pantherophis guttatus*
- Mexican Black Kingsnake — *Lampropeltis nigrita*
- Green Anaconda — *Eunectes murinus*
- Western Diamond-backed Rattlesnake — *Crotalus atrox*
- Gaboon Viper — *Bitis gabonica*

These are a **seed**, not a claim of complete coverage. Species with insufficient validated keeper-facing data deliberately retain unknown/limited fields until research is completed.

## Future expansion

The same model can support other reptile groups without changing the individual-animal architecture. The immediate roadmap remains snake-first so that the platform can reach deep, high-quality coverage before broadening further.
