# ADR-001 — Local-first intelligence

## Status

Accepted for the architecture/performance-local-first branch.

## Context

Tiny Titans currently has Firebase services, Cloud Functions, an event bus and an intelligence kernel. Some calculations and reminders do not require a trusted server, yet server-side scheduling creates unnecessary cost and operational complexity.

The existing event bus is deliberately Firebase-free and the intelligence kernel is a thin event-to-insight orchestration layer. This gives the app a suitable boundary for moving deterministic intelligence into the client without coupling UI components directly to persistence.

## Decision

Make the browser/client the default execution environment for deterministic keeper intelligence.

Use Firebase for persistence, authentication, shared/community data and file storage. Use Cloud Functions only when a trusted server boundary is actually required.

## Consequences

### Positive

- lower Cloud Functions cost
- faster local feedback
- less server polling
- better offline/PWA behaviour
- easier deterministic testing
- simpler intelligence architecture
- less coupling between UI and backend jobs

### Negative

- background execution cannot be assumed on every browser/platform
- local state needs careful persistence and invalidation
- multi-device synchronisation still needs Firebase
- secret-bearing operations remain server-side

## Rules

1. Never replace a privileged server operation with an unrestricted client write.
2. Every client write remains protected by Authentication and Security Rules.
3. Derived intelligence must be deterministic where possible.
4. Community/global intelligence must continue to respect explicit consent.
5. Persistent canonical data must have one domain owner.
6. The client may calculate an insight without persisting it unless persistence adds real value.
7. Any new Cloud Function requires an explicit architectural justification.

## Migration pattern

```text
Existing feature
    |
    +-- Can browser calculate it safely?
    |       |
    |       +-- yes -> local intelligence
    |
    +-- Does it need shared persistence?
    |       |
    |       +-- yes -> Firestore client SDK + Rules
    |
    +-- Does it require a secret/trusted callback/privilege?
            |
            +-- yes -> Cloud Function / trusted service
```

## Review trigger

Review this ADR whenever a new scheduled function, background worker or privileged backend endpoint is proposed.
