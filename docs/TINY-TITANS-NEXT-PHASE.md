# Tiny Titans Next Phase — Local-First Intelligence Architecture

This is the implementation plan for the next architecture pass. GitHub `master` remains the production source of truth; this branch is deliberately isolated until the gates pass.

## Goals

- Keep the existing React + TypeScript + Vite + Firebase foundation.
- Preserve existing features and data contracts while improving architecture incrementally.
- Make Tiny Titans feel like one intelligent keeper platform rather than disconnected trackers.
- Reduce recurring Firebase/Cloud Functions cost without weakening useful functionality.
- Reduce initial JavaScript payload and improve PWA/mobile startup.
- Keep the dark rich royal-purple / orange-gold / electric-blue / teal identity.

## Non-negotiable architecture rules

1. Existing domain services remain authoritative until a replacement has equivalent behaviour and tests.
2. A feature is not removed merely because a cleaner implementation exists; migrate first, delete second.
3. User records belong to the snake/domain model, not to individual pages.
4. Derived intelligence should be calculated locally whenever it does not require trusted server-side aggregation or multi-user data.
5. Cloud Functions are reserved for operations that genuinely require trusted server execution, scheduled backend work, privileged aggregation, or external integration.
6. Community and creator intelligence remains consent-gated and privacy-safe.
7. Every architectural change must pass the existing production gate before it is considered mergeable.

## Target layers

### Experience

Reusable Tiny Titans components, responsive layouts, progressive disclosure, accessible controls, loading/empty/error states and the canonical design system.

### Intelligence

The existing event bus and intelligence kernel become the common orchestration boundary. Specialist services remain domain experts. Insights should expose evidence, confidence and a useful next action where appropriate.

### Domain

Snakes, enclosures, feeding, weight, shedding, behaviour, genetics, breeding, goals, achievements, learning, community, mentorship and marketplace.

### Data

Firebase Auth, Firestore and Storage remain available. Cloud Functions become an exception rather than the default execution layer.

## Local-first decision matrix

### Prefer browser/device execution

- Calculations and derived statistics from already-loaded user records.
- Breeding probability calculations using the local genetics database.
- Goal progress calculations.
- Behaviour/feeding/weight trend interpretation using the user's own data.
- Reptile Room layout and visual state.
- Equipment due-date calculations.
- Search across locally loaded records.
- Draft/temporary form state.
- Offline room and husbandry record entry where safe.

### Keep on Firebase

- Authentication.
- Cross-device persistence of user records.
- Firestore security-bound data.
- Community records that must be shared between users.
- Marketplace records requiring shared state.
- Creator aggregation that genuinely requires consented multi-user data.
- Storage of user/morph/enclosure images.

### Require explicit justification before adding a Cloud Function

A new function must answer:

- Why cannot the client safely perform this operation?
- Does it require privileged credentials?
- Does it require trusted scheduled execution?
- Does it aggregate data that must not be exposed to the client?
- What recurring cost does it introduce?
- What happens if it is unavailable?

## Performance pass

The current production build is healthy but reports a very large initial JavaScript bundle and an ineffective Firebase Storage dynamic import. The next performance pass should identify route-level boundaries and lazy-load heavy feature modules, especially creator tools, globe/3D visualisation, marketplace and other specialist experiences.

The goal is not to blindly split every component. The goal is to keep the core shell small while loading expensive capabilities only when a user enters them.

## Reptile Room rule

The Reptile Room remains a visual representation of enclosure state. Enclosure assignment belongs to the snake/enclosure relationship. Moving a snake between vivariums must never move or duplicate the snake's historical weight, feeding, shedding, behaviour, goals or intelligence records.

Room layout is a presentation concern and can remain local-first. Enclosure husbandry data remains the authoritative domain record.

## Intelligence direction

A meaningful domain event should be able to feed the intelligence layer without requiring pages to know about unrelated features.

Example:

`WeightRecorded -> event bus -> intelligence handlers -> trend/goal insight -> keeper UI`

The kernel is orchestration, not a second database. Durable intelligence belongs in the existing persistence layer when required.

## Quality gates

Every phase must finish with:

```text
npm run lint
npm run build
npm run test:production-gate
npm run test:bot:contracts
```

Visual UX BOT remains a separate browser credentialed gate. A missing visual BOT credential is not equivalent to an application test failure; it means the visual journey was not executed.

## Delivery order

1. Stabilise current warnings.
2. Audit and reduce initial bundle size.
3. Audit Firebase/Cloud Function usage and remove unnecessary backend execution.
4. Expand event-driven intelligence behind the existing kernel.
5. Consolidate shared UX components around the Tiny Titans design system.
6. Add richer keeper intelligence without duplicating domain logic.
7. Only then consider deeper packaging/native-runtime work.
