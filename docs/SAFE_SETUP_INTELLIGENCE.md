# TinyTitans Reptile Companion — Safe Setup Intelligence

## Status

**Planning / build-ready specification**

This feature is intentionally isolated on `feature/safe-setup-intelligence` and is **not merged into `master`**.

## Product goal

Safe Setup Intelligence helps a keeper decide whether natural and manufactured enclosure materials are appropriate for a specific reptile, how to prepare them, and how the finished enclosure should be assessed.

The feature should behave like a decision engine, not a static "safe/unsafe" list.

Core principle:

> **Identify → assess source → inspect → clean appropriately → dry/prepare → assess installation → monitor.**

The system must distinguish between **routine cleaning**, **disinfection when warranted**, and **thermal drying/heat treatment**. It must not imply that every natural item must be chemically sterilised.

## Scope

### 1. Material intelligence

Initial material classes:

- Natural wood / branches / logs
- Bark / cork
- Leaf litter
- Natural rocks and stone
- Live plants
- Dried plant material
- Artificial foliage and décor
- Manufactured hides / décor materials

Each material record should support:

- Common name(s)
- Scientific name where applicable
- Material class
- Suitable reptile groups / species rules
- Intended use: climbing, hide, cover, substrate amendment, leaf litter, enrichment, etc.
- Risk tier: `low`, `caution`, `high`, `avoid`, `unknown`
- Toxicity/irritant concerns
- Resin / volatile compound concerns
- Rot / structural failure concerns
- Pest / pathogen / contamination considerations
- Chemical-treatment risk
- Moisture requirements and drying characteristics
- Heat-treatment suitability
- Mechanical safety considerations
- Ingestion risk
- Humidity compatibility
- Notes and exceptions
- Evidence/source references
- Last-reviewed date

### 2. Collection-source assessment

For foraged natural materials, ask context questions before producing a recommendation:

- Was it collected outdoors?
- Was the area known or reasonably believed to be pesticide/herbicide/fertiliser free?
- Was it near a road, industrial site, rubbish, drainage channel, or other contamination source?
- Is the species/material positively identified?
- Is the material fresh, naturally fallen, deadwood, or cut from a live plant?
- Does it show mould, soft rot, insect galleries, frass, foul smell, chemical smell, or unexplained staining?
- Does it contain nails, wire, paint, varnish, preservative, glue, resin, or other manufactured contamination?

Unknown or questionable provenance should lower confidence and can override an otherwise favourable material classification.

### 3. Preparation workflow

The app should guide the keeper through a preparation flow rather than prescribe one universal protocol.

#### A. Inspect

Reject or flag material with:

- Chemical treatment or unknown timber treatment
- Oil/paint/varnish/glue contamination
- Severe rot or crumbly structure
- Persistent foul/chemical odour
- Active pest infestation that cannot reasonably be addressed
- Sharp splinters or dangerous edges
- Structural weakness for the intended animal
- Unknown species where the material has a meaningful toxicity/resin risk

#### B. Clean

Default natural-material workflow:

1. Remove loose soil/debris.
2. Scrub thoroughly with hot water and a suitable brush.
3. Rinse thoroughly.
4. Soak where appropriate for the material and intended use.
5. Allow complete drying before enclosure use.

The app should explain that routine cleaning is not synonymous with complete sterilisation. A stronger disinfection workflow can be presented when the context calls for it, such as second-hand décor, known contamination, disease-management protocols, or professional quarantine practice.

#### C. Dry / heat-treatment decision

Heat should be presented as an optional preparation method that depends on material, size, moisture content, species, oven type, and fire risk.

The engine must never invent a universal baking temperature.

For wood, the UI should support a **conservative drying profile** and a separate **thermal-treatment profile** where evidence supports one.

The feature must include explicit warnings:

- Never place rocks/stone in an oven as a default sanitisation method; trapped moisture/air can create a fracture/explosion hazard.
- Never heat treated, painted, varnished, glued, chemically contaminated, or unidentified timber.
- Do not heat resinous/unknown conifers merely because another wood species has a documented profile.
- Do not leave heating wood unattended.
- Treat oven use as a fire-risk activity.
- Large/thick pieces behave differently from thin branches.
- Complete internal drying cannot be inferred from surface appearance alone.

The engine should therefore return ranges and reasons, not fake precision such as "exactly 90°C for exactly 4h" when the evidence does not support that claim.

### 4. Leaf-litter intelligence

Leaf records should include:

- Tree/plant identification
- Suitable species/groups
- Toxicity or irritant concern
- Whether the leaf is commonly used dried
- Heat-treatment suitability
- Whether boiling/soaking is appropriate
- Chemical contamination risk
- Collection-season notes
- Decomposition behaviour
- Humidity impact
- Ingestion considerations

The app should distinguish:

- Safe as decorative/leaf-litter material
- Safe if incidental ingestion occurs
- Appropriate for an herbivorous reptile to deliberately consume

These are not interchangeable claims.

### 5. Enclosure installation intelligence

After material preparation, the engine should inspect how the item is actually being used.

Examples:

- Branch secure enough for the animal's weight?
- Could a branch fall onto the animal?
- Any exposed screws/wire/fasteners?
- Sharp cut ends?
- Snag/loop hazards?
- Could décor trap the animal?
- Is the item creating an escape route?
- Is it directly under a heat emitter?
- Could contact cause burns or excessive warming?
- Does the item create an unsafe climbing fall?
- Is the item appropriate for the species' locomotion and body size?
- Is leaf litter compatible with the enclosure's humidity and substrate strategy?

This is where Safe Setup Intelligence connects directly to Enclosure Intelligence.

## Intelligence architecture

### Recommended modules

`src/intelligence/v50/safeSetupIntelligence.ts`

Main orchestration layer. Consumes species context, material record, source assessment, preparation state, and enclosure placement data.

`src/intelligence/v50/materialRiskEngine.ts`

Evaluates material-specific risks and produces a structured result.

`src/intelligence/v50/materialPreparationEngine.ts`

Produces preparation recommendations and warnings. Keeps cleaning, disinfection, drying, and heat-treatment concepts separate.

`src/intelligence/v50/enclosurePlacementEngine.ts`

Evaluates structural, thermal, escape, snag, fall, and species-fit risks.

`src/data/safeSetupMaterials.ts`

Versioned source-backed material records.

`src/data/safeSetupSpeciesRules.ts`

Species/group-specific overrides and constraints.

`src/data/safeSetupSources.ts`

Evidence and source metadata.

### Integration

Do not create a second intelligence architecture. Integrate with the existing `v50` husbandry intelligence system and context snapshot patterns.

Recommended flow:

`Species Context → Material Context → Source Assessment → Preparation State → Placement Context → Risk Engine → Advice + Confidence + Evidence`

## Result model

The UI should receive structured output similar to:

```ts
export type SafeSetupRisk = 'low' | 'caution' | 'high' | 'avoid' | 'unknown';

export interface SafeSetupAssessment {
  decision: 'recommended' | 'conditional' | 'not-recommended' | 'avoid' | 'insufficient-data';
  risk: SafeSetupRisk;
  confidence: number;
  summary: string;
  reasons: string[];
  preparation: PreparationStep[];
  placementChecks: PlacementCheck[];
  overrides: string[];
  evidence: EvidenceRef[];
  reviewDate?: string;
}
```

Confidence must reflect evidence quality and identification certainty. It must not be presented as a scientific probability that the animal will be harmed.

## UX

### Entry points

1. Husbandry → **Safe Setup**
2. Enclosure Builder → **Check Décor**
3. Reptile profile → **Add Natural Material**
4. Reptile Room / Enclosure Intelligence → **Run Safety Check**
5. Optional future camera/photo workflow → **Identify Material**

### Primary screens

#### Safe Setup dashboard

Cards:

- 🪵 Wood & Branches
- 🍂 Leaves & Leaf Litter
- 🌿 Live Plants
- 🪨 Rock & Stone
- 🧰 Manufactured Décor
- 🔍 Check Something I Found

#### Material detail

Show:

- Overall assessment
- Why
- Suitable uses
- Avoided uses
- Preparation steps
- Heat/drying guidance where supported
- Species-specific warnings
- Placement checklist
- Evidence

#### "I found this" flow

Photo/identification workflow should ultimately allow:

`Photo → candidate identification → keeper confirmation → provenance questions → material safety assessment → preparation plan`

Never treat visual identification as definitive when the consequence of misidentification could be significant. Unknown material should remain `unknown` rather than being forced into a safe category.

## Evidence rules

Every non-trivial toxicology, heat-treatment, chemical, or husbandry safety claim should be source-backed.

Sources should be tiered:

1. Veterinary / professional reptile medicine sources
2. Government / poison-information / forestry / horticulture authorities
3. Peer-reviewed literature
4. Established specialist husbandry references
5. Experienced keeper sources only for low-risk practical observations, clearly labelled as such

Conflicting sources should be preserved rather than silently averaged. The intelligence layer should be able to say:

> "Sources differ on this material. Because identification/provenance is uncertain, TinyTitans recommends avoiding it."

## MVP build order

### Phase 1 — data and engine foundations

- Material schema
- Evidence schema
- Risk engine
- Preparation engine
- Initial wood + leaf records
- Species override support
- Unit-safe temperature/time handling
- Test fixtures

### Phase 2 — keeper UI

- Safe Setup dashboard
- Material detail page
- Preparation checklist
- Risk and confidence cards
- Evidence drawer

### Phase 3 — enclosure integration

- Add material to enclosure
- Placement safety checks
- Heat-zone awareness
- Structural/escape/snag warnings
- Husbandry intelligence integration

### Phase 4 — photo/identification workflow

- Photo upload
- Candidate species/material matching
- Human confirmation
- Unknown fallback
- Community submission pipeline

### Phase 5 — learning loop

With the existing intelligence contribution controls respected, use opt-in user observations to identify recurring questions and edge cases. User observations should never silently rewrite canonical safety rules.

## Initial material coverage

Start with common UK/temperate natural materials that are likely to be encountered by keepers, rather than attempting to cover every tree immediately.

Suggested first set:

### Wood / branches

- Oak
- Beech
- Hazel
- Willow
- Birch
- Hawthorn
- Apple / other known untreated fruit woods
- Alder
- Maple/sycamore family where identification rules support it
- Cork
- Manzanita
- Mopani
- Cholla
- Commercially sourced reptile-safe hardwoods

### Explicit caution/avoid set

- Cedar
- Yew
- Unknown treated timber
- Painted/varnished wood
- Pressure-treated construction timber
- Unknown resinous conifers until species and evidence rules are established

The exact classification and any temperature recommendation must be evidence-reviewed before being promoted to a canonical `safe` rule.

### Leaf litter

Begin with commonly encountered broadleaf species such as:

- Oak
- Beech
- Birch
- Hazel
- Hawthorn
- Willow
- Maple/sycamore family where species-level evidence is sufficient

Do not use a generic "all fallen leaves are safe" rule.

## Testing strategy

### Unit tests

- Known safe material + clean provenance → expected recommendation
- Same material + pesticide exposure → downgrade/avoid
- Unknown timber → unknown/avoid depending on use
- Safe wood + unsafe placement → placement warning
- Safe material + species-specific incompatibility → species override
- Heat profile requested for unsupported material → no fabricated recommendation
- Rocks routed to heating workflow → hard warning
- Toxic species entered as unknown → conservative result

### Integration tests

- Enclosure builder receives Safe Setup warnings
- Husbandry intelligence consumes assessment
- Material additions persist correctly
- Route/navigation does not loop
- Evidence links open correctly
- Offline/PWA behaviour remains graceful

## Safety language

Avoid alarmist language and avoid false reassurance.

Prefer:

> "Generally suitable when correctly identified and collected from a clean, untreated source. Inspect, scrub and dry thoroughly before use."

Over:

> "100% safe."

For uncertain material:

> "TinyTitans cannot establish that this material is safe from the available information. Avoid using it until the material and provenance can be established."

For cleaning:

> "Routine cleaning removes dirt and debris. Disinfection is a separate step used when the risk context warrants it. Follow the chosen product's label, dilution and contact-time instructions."

## Current evidence anchors for implementation

- ReptiFiles describes collecting untreated branches, scrubbing them, and thoroughly drying them; it also notes that wood treatment practices vary by species and context. citeturn881417search0turn881417search6
- ReptiFiles specifically cautions against baking rocks because trapped air/moisture can create a dangerous fracture hazard. citeturn881417search0
- ReptiFiles gives examples of species-specific wood restrictions, including avoiding pine/cedar in some reptile enclosures because of volatile compounds. citeturn881417search3turn881417search11
- ARAV/CDC veterinary guidance emphasises contamination and cross-contamination risks from reptiles, their equipment, water and materials, supporting a risk-based rather than zero-microbe framing for hygiene. citeturn881417search13

These sources are **implementation anchors, not a finished canonical database**. Each material/temperature rule should receive its own source review before entering production data.

## Definition of done for the feature branch

- No changes to `master`
- Safe Setup data schema implemented
- Risk/preparation/placement engines implemented and unit tested
- Initial material dataset source-backed
- Husbandry intelligence integration path established
- Safe Setup UI reachable from Husbandry
- Enclosure Builder integration designed behind a feature boundary
- All recommendations expose confidence/evidence metadata
- Unknown/ambiguous materials fail conservatively
- No hard-coded universal "bake everything" rule
- No hard-coded universal "disinfect everything" rule
- No unsafe oven workflow for rocks
