# Tiny Titans Overhaul — Test Readiness

The overhaul is considered ready for user testing only when the following gates are green.

## Architecture
- [ ] master has been updated/reconciled from the overhaul branch
- [ ] no feature has been removed without equivalent replacement behaviour
- [ ] snake/enclosure ownership remains canonical
- [ ] Reptile Room remains presentation/layout state, not a duplicate snake database

## Intelligence
- [x] local intelligence primitives exist
- [x] confidence is bounded
- [x] evidence can accompany derived insights
- [x] local intelligence has an automated contract
- [ ] event handlers cover all intended production domain events
- [ ] Snake Timeline consumes canonical domain records
- [ ] Home consumes deduplicated intelligence
- [ ] goals/achievements consume canonical events rather than page-specific counters

## Cost
- [x] unnecessary scheduled reminder functions removed
- [ ] remaining functions audited individually
- [ ] no new Cloud Function added without architectural justification
- [ ] Firebase usage and reads reviewed for avoidable polling

## UX/design
- [x] royal-purple/orange-gold/electric-blue-teal identity retained
- [ ] shared tracker primitives standardised
- [ ] Reptile Room remains clean and touch-friendly
- [ ] loading/empty/error states reviewed
- [ ] mobile journeys manually tested

## Performance
- [ ] route-level lazy loading completed for heavy feature areas
- [ ] initial JavaScript bundle reduced materially
- [ ] Firebase Storage import duplication resolved
- [ ] PWA startup/cache behaviour verified

## Automated gates
- [ ] npm run lint
- [ ] npm run build
- [ ] npm run test:production-gate
- [ ] npm run test:bot:contracts
- [ ] npm run test:visual-ux with valid credentials

A missing Visual UX BOT credential means that gate is **not executed**. It must not be reported as a pass.

## Manual acceptance
- [ ] Goals visible and functional
- [ ] Creator Intelligence visible and functional for authorised users
- [ ] Reptile Room persists layout and follows snake/enclosure ownership correctly
- [ ] snake selection works across mobile/desktop
- [ ] weight/feeding/shed/behaviour records remain intact
- [ ] intelligence respects privacy/consent transitions
- [ ] no unexpected cloud function invocation for local-only intelligence
- [ ] install/PWA update does not regress navigation or cached assets
