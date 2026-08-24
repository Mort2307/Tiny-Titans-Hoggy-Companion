# Tiny Titans Architecture Direction

## Product principle

Tiny Titans is a keeper-first reptile platform, not a collection of disconnected pages. Features should share a common domain model and expose useful intelligence without forcing users to understand the underlying complexity.

## Four layers

1. **Experience** — pages, navigation, responsive UI, reusable design-system components and progressive disclosure.
2. **Intelligence** — insights, trends, confidence, correlations, recommendations, reminders and explainable decisions.
3. **Domain** — snakes, genetics, feeding, weight, shedding, enclosures, breeding, marketplace, learning, community and achievements.
4. **Data** — Firebase Auth, Firestore, Storage and Cloud Functions.

## Event-driven direction

Meaningful domain actions should produce typed events such as `WeightRecorded`, `FeedingRecorded`, `ShedRecorded`, `MorphConfirmed` and `BreedingProjectCreated`. Intelligence consumes these events rather than embedding cross-feature behaviour inside individual screens.

The first shared event bus lives in `src/services/tinyTitansEventBus.ts`. The common presentation/orchestration boundary lives in `src/services/tinyTitansIntelligenceKernel.ts`. Existing specialist intelligence services remain authoritative domain experts and can be migrated behind this boundary incrementally.

## User experience rules

- Home answers **what matters now**, rather than presenting a wall of navigation tiles.
- Every snake should have a coherent living history/timeline.
- Complex genetics and intelligence use progressive disclosure: simple first, advanced detail on demand.
- Empty states explain what is missing and offer a useful next action.
- Important actions are forgiving and should support undo where technically safe.
- Search should eventually operate across snakes, genetics, records, projects and marketplace content.
- Private keeper data and public creator/marketplace data remain explicitly separated.
- Offline-capable record entry is a target for room-level husbandry workflows.
- Notifications should be contextual and user-controlled, not noisy.

## Intelligence rules

- Prefer evidence-backed observations over unsupported claims.
- Surface confidence and relevant evidence when a conclusion is non-trivial.
- Do not silently turn missing data into a negative conclusion.
- Keep health/veterinary boundaries clear: intelligence can flag patterns and prompt records, but does not replace professional veterinary assessment.
- Store durable intelligence through the existing Firebase-backed intelligence services; the in-memory kernel is orchestration only.

## Feature rollout

Experimental capabilities are gated through `src/config/featureFlags.ts`. This allows staged rollout to testers before wider release.

Current strategic flags:

- intelligentHome
- universalSearch
- snakeTimeline
- breedingProjects
- smartMarketplaceListing
- adaptiveNotifications
- offlineRecords
- intelligenceEventPipeline

## Design system

Tiny Titans uses a dark, rich royal-purple foundation with semantic accents:

- **Purple** — brand identity, structure and navigation.
- **Orange/gold** — action, achievement and emphasis.
- **Electric blue** — intelligence, calculated insight and interactive information.
- **Teal** — data, ecosystem and live state.
- **Green** — success/healthy state.
- **Amber** — warning.
- **Red** — danger/error.

The canonical v2 token layer is `src/styles/tiny-titans-design-system.css`. Legacy CSS remains in place while this layer progressively standardises the application.

## Delivery strategy

GitHub remains the source of truth. Production stays on the existing React + TypeScript + Vite + Firebase foundation while architecture is progressively cleaned up. Native packaging can be introduced later without coupling domain logic to a particular UI runtime.

Every push to `master` and every pull request targeting `master` is now checked by the Tiny Titans Quality Gate workflow for linting and the full production build.
