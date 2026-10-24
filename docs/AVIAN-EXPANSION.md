# TinyTitans — Bird Species Expansion (October 2026)

## Release scope

The existing twenty bird seed species remain untouched. An additional 114 bird
records are now layered into the canonical universal species registry,
targeting **134 bird species** in the overall catalogue.

The new catalogue covers Indian Ringnecks and other Asian parakeets, lovebirds,
grass parakeets, conures, macaws, Amazons, Pionus, African parrots, lorikeets,
cockatoos, Gouldian finches, munias, waxbills, canaries, doves, pigeons,
quail, gamebirds, domesticated bird ancestors, waterfowl, mynas, turacos,
toucans and hornbills.

### Keeper discovery

- The existing `Birds` universal browse route is preserved.
- `Species Explorer` filters by seven human-friendly selections: all birds,
  parrots/parakeets/cockatoos, finches/songbirds, doves/pigeons,
  quail/pheasants/poultry, ducks/waterfowl, and specialist bird families.
- The taxonomy record and individual owner record remain separate;
  individual animals continue linking to a canonical `speciesId`.
- Search aliases include `Indian Ringneck`, `Ringneck Parakeet`,
  `Quaker Parrot`, `Gouldian Finch` and other keeper terminology.
- Mutations (e.g. **Violet Cleartail**) are **not** added as separate species.

### Evidence and taxonomy

Entries are taxonomy-first and provisional until reviewed against the app's
AviList authority, supplemented by other appropriate taxonomic sources.
Naming differences between authorities (for example, `Psittacula krameri`
versus `Alexandrinus krameri`) must be recorded as aliases/synonyms and
must not produce duplicate individual species identities.

No bird-specific cage dimensions, temperature numbers, diet proportions,
supplementation schedules, flocking claims or clinical diagnoses are generated
from the species seed list. Existing class-level guidance remains correctly
labelled as such until species-specific evidence can be checked.

Legal status must be reviewed by jurisdiction and context before offering
advice on UK wildlife acquisition, CITES/Article 10, international movement,
trade, wild-caught individuals or protected species.

### Image and copyright policy — mandatory

**Do not import, scrape, hotlink, auto-fetch, embed or generate thumbnails from
internet image searches or third-party bird catalogues.**

- Use only TinyTitans-owned graphics, original self-created assets,
  original in-app illustrations with documented rights, or standard icons.
- Bird species without a rights-cleared reference image receive the existing
  bird icon/neutral placeholder, never a random online photograph.
- For future user-contributed image galleries, the uploader must confirm
  ownership or permission sufficient for TinyTitans display; record
  attribution, license scope, uploader consent, reporting and takedown controls.
- Preserve attribution and withdrawal/takedown procedures for any approved
  community image.
- Never use a bird's genetic mutation name as a warrant to copy a breeder's
  photo from a shop, social profile or search result.
- This release contains **no imported online bird images**.

### Follow-on work (not part of this catalogue PR)

1. Dedicated avian profile tab: species/sex/age, ring identifier, lineage,
   photo with rights check, weight and body condition history.
2. Bird care journal: diet and food variety, water, enrichment, flight/activity,
   feather condition/moulting, sleep, droppings observations and veterinary care.
3. Safety checklists: air quality, PTFE/non-stick fumes, aerosols,
   perches, safe room flight, household hazards and emergency planning.
4. Avian genetics/colour-mutation library with **species-scoped, source-backed**
   inheritance; Violet, Cleartail and Violet Cleartail ringneck entries should
   not be given breeding probabilities until inheritance evidence is reviewed.
5. If/when breeding is enabled: responsible breeding readiness, identity,
   compatible pairing, egg/incubation/chick records, welfare and provenance.
6. Staged specialist review of husbandry and conservation records before
   publishing quantitative requirements or regulatory conclusions.

## Release gates

- `npm run validate:universal-species`
- `npm run validate:universal-care`
- `npm run validate:universal-integrations`
- `npm run lint`
- `npm run build`
- Confirm the bird filters and search aliases on mobile and desktop.
- Confirm zero unintended changes to existing reptile/hognose data.
- Merge only after review; production deploy is a separate, verified operation.

## 24 October 2026 — keeper workflow continuation (PR pending)

- Universal animal species selection now offers **both free-text search and a browsable dropdown**, with a taxonomic class filter, full catalogue pagination and keyboard handling.
- Each canonical species has a Wild Type / Unclassified morph/variation baseline and a clearly signposted contribution tile. Hognose keeps its specialised library and also highlights image/evidence contributions.
- A first dedicated **Bird Care Journal** is connected to individually registered birds, with date-stamped weight (grams), food/water, moult/feathers, droppings, enrichment/flight and keeper welfare observations; users can review and confirm deletion of their own entries.
- Bird entry fields support rings/individual identifiers and hatch dates. Users can navigate from individual animal profiles to species-scoped mutation libraries.
- Indian Ringneck has researched Violet, Cleartail and Violet Cleartail records with source links. **Avian genetics calculation remains disabled** until sex-linked and combination modelling is separately vetted.
- No stock/scraped online images were introduced; only already-approved user contributions may appear in morph libraries.

### Still outstanding — not represented as complete
- Specialist-reviewed, source-cited mutation inheritance for every bird species and all other animals; many species will appropriately remain baseline-only until reviewed.
- Full avian hatchling/incubation, body-condition scoring, vet records, detailed diet and environmental logs, charts/export, family access and multi-device offline conflict policy.
- Taxonomic authority and species-specific husbandry verification for each avian catalogue entry.
- Full hognose evidence and nomenclature reconciliation, especially uncertain or debated inheritance claims.
- Real-device Android/iOS accessibility and keeper workflow acceptance testing.

These tasks require separate research/QA and cannot safely be completed by fabricating all genetic variants or copying reference photographs.
