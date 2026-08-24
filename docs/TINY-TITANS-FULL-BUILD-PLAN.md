# Tiny Titans — Full Build Plan

## North-star

Tiny Titans should feel like a polished reptile operating system rather than a collection of forms.

The app remains **local-first, Firebase-backed, intelligence-led and progressively enhanced**. Firebase is the managed data platform, not the place where every calculation or reminder has to run.

## Design identity

The visual language is deliberately Tiny Titans:

- deep charcoal / purple-black backgrounds
- rich royal purple as the primary identity
- orange/gold for achievement, keeper and premium emphasis
- electric blue/teal for intelligence, data and interactive states
- natural green for healthy/success states
- restrained amber for warnings
- controlled red for danger
- clean cards, strong hierarchy, generous spacing and subtle depth
- mobile-first controls without making desktop feel like an enlarged phone UI

Purple is the brand identity. Orange/gold and electric blue/teal are functional accent systems, not competing themes.

## Architecture target

```text
UI / Pages
   |
   +-- Design System
   |
   +-- View Models / Hooks
          |
          +-- Domain Services
          |      |
          |      +-- Snake
          |      +-- Enclosure / Reptile Room
          |      +-- Feeding
          |      +-- Weight
          |      +-- Shed
          |      +-- Behaviour
          |      +-- Genetics / Morphs
          |      +-- Breeding
          |      +-- Marketplace
          |
          +-- Event Bus
                 |
                 +-- Intelligence Kernel
                 |      |
                 |      +-- local insights
                 |      +-- trends
                 |      +-- reminders
                 |      +-- anomaly detection
                 |      +-- achievements
                 |      +-- cross-domain observations
                 |
                 +-- Persistence Adapter
                        |
                        +-- local/browser state
                        +-- Firestore when required
                        +-- Storage when required
                        +-- server boundary only when required
```

The existing event bus is intentionally Firebase-free. The existing intelligence kernel is the correct orchestration boundary and should be expanded rather than replaced.

## Data ownership rule

### Snake owns snake facts

Morph, identity, weight history, feeding history, shed history, behaviour history, enclosure assignment and keeper notes belong to the snake/domain record.

### Enclosure owns physical-environment facts

Vivarium dimensions, equipment, maintenance state, enclosure photos and physical layout belong to the enclosure.

### Reptile Room owns presentation/layout

Room coordinates, visual grouping, presets, snap state and UI layout are presentation state.

A snake can move enclosure without losing history. An enclosure can be reassigned without rewriting snake identity. The Reptile Room must therefore reference these entities instead of duplicating their data.

## Reptile Room target

Keep the successful current room interaction model, but make it an integration layer rather than a second enclosure database.

Required behaviour:

- automatically derive vivarium dimensions from enclosure data
- automatically follow snake reassignment
- allow empty vivariums
- drag, snap, stack and group enclosures
- preserve room layout locally
- never duplicate husbandry facts
- show equipment/maintenance intelligence from the selected enclosure
- expose quick actions to the snake timeline and enclosure editor
- support room presets without destroying custom positions
- recover gracefully from malformed/stale local layout data
- eventually persist optional room layout through a lightweight Firestore document only when multi-device sync is enabled

## Local-first strategy

Classify every operation before adding or retaining backend work:

### LOCAL

Pure calculations and presentation state:

- age calculations
- weight deltas and trend calculations
- feeding interval calculations
- shed interval calculations
- equipment due-date calculations
- breeding probability calculations
- morph/genetics calculations
- achievement eligibility
- Titan Goals progress calculations
- Reptile Room coordinates
- filtering/search over already-loaded data
- dashboard summaries
- intelligence interpretation that does not require community/global data

### LOCAL + SYNC

Write the user's canonical record locally first where practical, then persist through the existing Firebase service:

- weight records
- feeding records
- shed records
- behaviour records
- enclosure metadata
- room preferences when sync is enabled
- goal progress derived from canonical records

### FIREBASE REQUIRED

Keep direct Firebase access for:

- authentication
- owner-bound canonical records
- cross-device persistence
- community records where consent permits
- marketplace records
- creator data that genuinely needs shared state
- Storage-backed photos/files

### TRUSTED SERVER REQUIRED

Retain a server boundary only where secrets, privileged credentials or authoritative external callbacks make it necessary:

- Stripe webhook/payment verification
- secret-bearing integrations
- privileged moderation/administration where rules cannot safely express the operation
- any future operation requiring a credential that must never reach the browser

### REMOVE / MIGRATE

Scheduled polling jobs that can be calculated locally should not remain Cloud Functions. The two known scheduled notification jobs have already been removed from the production export surface and should stay deleted.

## Intelligence v2

The intelligence system should stop being a collection of isolated clever widgets and become a common reasoning pipeline.

### Event ingestion

Every meaningful domain mutation emits a typed event:

- SnakeCreated
- WeightRecorded
- FeedingRecorded
- ShedRecorded
- BehaviourRecorded
- EnclosureUpdated
- MorphConfirmed
- BreedingProjectCreated
- MarketplaceListingCreated
- AchievementUnlocked
- NotificationScheduled

Add future events only when they represent meaningful domain facts. Do not emit events for every UI keystroke.

### Insight pipeline

```text
Domain event
   -> normalize
   -> update local derived state
   -> run relevant rules
   -> score confidence
   -> deduplicate
   -> explain source
   -> produce action
```

Every insight should have:

- what was observed
- why it matters
- confidence / evidence strength where appropriate
- source records/events
- a safe next action
- a route to investigate
- expiry/deduplication behaviour

The app should never present a speculative inference as a fact.

## Cross-domain intelligence

This is where Tiny Titans becomes genuinely special.

Examples:

- weight trend + feeding history -> identify a meaningful change in growth trajectory
- shed history + behaviour -> surface recurring pre-shed patterns
- enclosure changes + behaviour -> identify temporal associations without claiming causation
- enclosure temperature/humidity records + feeding -> flag keeper-review patterns
- morph/genetics + breeding project -> identify possible outcomes and missing genetic certainty
- maintenance dates + enclosure equipment -> surface upcoming service tasks
- snake age + weight + feeding cadence -> identify records worth reviewing
- multiple snakes -> compare a snake against its own history first, then optional community benchmarks only with consent

The intelligence layer must clearly distinguish:

**Observed → Calculated → Pattern → Hypothesis → Action**

That distinction is critical for trust.

## Universal search

Search should become a command centre, not just text matching.

One search surface should find:

- snakes
- records
- morphs
- genetics
- learning content
- breeding projects
- marketplace listings
- achievements
- goals
- intelligence insights

Results should be grouped by domain and support direct actions.

## Snake Timeline

Every snake gets a chronological, filterable timeline combining:

- weight
- feeding
- shed
- behaviour
- enclosure changes
- morph/genetic updates
- achievements
- notes

Timeline entries should link back to their canonical records. Never copy the source record into a second database just for display.

## Titan Goals

Goals become a first-class local intelligence feature.

A goal should have:

- id
- title
- description
- target
- progress calculator
- unit
- status
- reward/recognition
- optional date window
- source events

Progress should be derived from canonical app data rather than manually duplicated counters.

This prevents the previous regression where a new deployment could make Goals appear to disappear simply because a page/feature was not merged with the current master state.

## Achievements

Achievements use the same event stream and derived-state calculations.

Do not create independent counters for every achievement. Use a central eligibility engine with deterministic tests.

Achievement tiers remain:

Bronze -> Silver -> Gold -> Platinum -> Diamond -> Legendary

## Notifications

Replace server polling with local scheduling wherever the notification platform allows it.

The application should calculate due reminders from canonical data and maintain a local reminder queue.

Examples:

- feeding due
- weight check due
- shed observation reminder
- equipment maintenance due
- goal milestone
- marketplace follow-up

If true background push requires a trusted server or platform-specific push service, treat that as an explicit optional capability rather than forcing all users through a constantly scheduled Cloud Function.

## Marketplace

Keep the listing workflow extremely fast:

1. choose snake
2. confirm identity/morph
3. add photos
4. set price/status
5. preview
6. publish

Seller profiles should expose current stock as a separate presentation layer over canonical listings.

New seller spotlights can be eligibility-driven rather than requiring scheduled functions.

## Creator intelligence

Creator dashboards should use consent-safe aggregates and cached snapshots where appropriate.

The client must never receive:

- private identifiers
- email addresses
- exact private locations
- private health/husbandry records

Global/community intelligence remains opt-in and must continue through the central access/consent service.

## Privacy and consent

Keep the existing contract:

- core tracking always available
- basic keeper history available
- full intelligence explicitly opt-in
- community contribution explicitly opt-in
- missing consent defaults to denied
- opt-out immediately disables advanced/community intelligence

No new intelligence feature is allowed to bypass this gate.

## Performance programme

The current production bundle is approximately 4.17 MB before gzip. This is the most obvious performance target.

Priority order:

1. route-level code splitting
2. lazy-load creator-only tools
3. lazy-load marketplace/learning/advanced genetics sections
4. isolate heavy charting libraries
5. isolate globe/3D functionality
6. remove duplicate Firebase imports where possible
7. ensure dynamic imports actually produce separate chunks
8. reduce initial CSS payload
9. review PWA precache size
10. measure before/after rather than blindly optimizing

The app should load the useful keeper core first.

## Reusable page standard

Codex's Behaviour Tracker style is the baseline for implementation quality:

- one clear page purpose
- obvious snake context
- simple form
- strong validation
- save/edit/delete lifecycle
- confirmation for destructive actions
- timeline/history below
- accessible status messaging
- no unnecessary visual clutter

Then apply Tiny Titans intelligence on top.

The target is **clean first, intelligent second, flashy only where it helps**.

## Design-system implementation

Create shared primitives for:

- PageShell
- PageHeader
- TitanCard
- StatCard
- SectionHeader
- SmartInsightCard
- EmptyState
- LoadingState
- ErrorState
- ConfirmActionDialog
- Timeline
- SnakeSelector
- Metric
- StatusBadge
- ActionButton
- IntelligenceBadge

Use design tokens rather than page-specific colour values.

## Quality gates

Every architecture change should pass:

- lint
- TypeScript build
- morph validation
- source audit
- app health contracts
- route contracts
- route coverage
- encoding check
- security contracts
- intelligence consent contracts
- intelligence journey contracts
- BOT contracts
- production gate

Visual UX BOT remains a separate credentialed gate and must not be falsely reported as passed when credentials are absent.

## Regression protection

Before merging any large change:

1. compare branch against current master
2. verify Goals route/page still exists
3. verify Creator Intelligence routes/components still exist
4. verify Reptile Room route and enclosure ownership still exist
5. verify feature flags do not hide existing production functionality accidentally
6. verify Firebase exports did not reintroduce deleted scheduled jobs
7. verify no route disappeared
8. verify the PWA build contains the intended assets

## Cloud Functions exit strategy

Phase 1 — already underway:

- remove scheduled polling functions
- stop deploying functions casually
- keep Firebase Auth/Firestore/Storage/Hosting

Phase 2:

- audit every remaining function
- migrate direct-safe operations to Firestore + Rules
- move reminders/calculations local
- keep Stripe/webhook and genuinely privileged work server-side

Phase 3:

- delete unused function source and dependencies
- remove the Functions project configuration if no server function remains
- document the remaining external trusted boundaries

The desired end state is **zero Cloud Functions unless a specific feature proves that it genuinely needs one**.

## Delivery strategy

Do not perform one giant rewrite.

Use vertical slices:

### Slice A — foundation
Design tokens, page primitives, local derived-state utilities, event/intelligence contracts.

### Slice B — keeper core
Snake timeline, dashboard intelligence, goals and reminders.

### Slice C — Reptile Room
Reference-based room model, enclosure integration, layout persistence and intelligent maintenance.

### Slice D — performance
Route splitting, heavy dependency isolation and bundle measurement.

### Slice E — creator intelligence
Consent-safe aggregation, snapshots, creator dashboards.

### Slice F — marketplace
Fast listing flow, seller stock and intelligent seller presentation.

### Slice G — cloud elimination
Migrate remaining safe functions and delete the dead infrastructure.

### Slice H — polish
Accessibility, micro-interactions, responsive refinement, visual UX automation and final production hardening.

## Definition of done

Tiny Titans is not done when it compiles.

A feature is done when:

- it is discoverable
- it has a clear user journey
- it works on mobile and desktop
- its data has one canonical owner
- it does not duplicate state unnecessarily
- its intelligence is explainable
- privacy gates are respected
- it has loading/error/empty states
- destructive actions are confirmed
- it survives reload and navigation
- it has contract coverage where appropriate
- it does not unnecessarily increase cloud cost
- it does not regress existing pages
- it fits the Tiny Titans visual system

## Working principle

If a better solution is discovered during implementation, use it — provided it improves maintainability, performance, correctness, privacy or user experience without silently removing existing capability.

Never preserve a bad architectural decision simply because it already exists.
