# TinyTitans Spatial Habitat Builder

**Branch:** `feature/spatial-habitat-builder`  
**Master status:** untouched; this branch is not merged or deployed.

## Purpose

The builder uses one centimetre-based spatial model for both:

1. a complete reptile room; and
2. any vivarium/enclosure placed inside that room.

A vivarium is therefore a nested spatial container rather than a separate editor implementation.

## Current architecture

```
SpatialHabitatScene
├── root room dimensions (cm)
└── SpatialNode[]
    ├── furniture / storage
    ├── vivarium containers
    │   └── enclosure contents
    ├── heating / lighting
    ├── power / control
    ├── environmental sensors
    └── enrichment / water
```

Three.js renders centimetres as metres (`1 cm = 0.01 world units`). The same geometry values drive the numeric inspector, placement, validation and persistence.

## Editor capabilities

- Real-world room dimensions.
- Real-world vivarium dimensions.
- 3D orbit, zoom and pan.
- Select and transform objects.
- 5 cm snap grid.
- Exact X/Y/Z positioning.
- Exact width/depth/height editing.
- Rotation controls.
- Nested room → vivarium navigation.
- Snake-linked vivarium creation.
- Duplicate/delete operations.
- Undo/redo.
- Responsive desktop/tablet/mobile UI.
- Mobile bottom-sheet library and inspector.
- Local draft recovery.
- Dedicated Firestore spatial scene persistence.
- Compatibility projection into the existing reptile-room model.

## Spatial intelligence

The first validation layer detects:

- objects outside their parent container;
- overlapping objects;
- configured electrical planning limits;
- heating without a sensor inside the same vivarium;
- empty vivariums.

These are planning checks, not veterinary or electrical certification.

## Asset strategy

The builder reuses the existing TinyTitans reptile-room asset catalogue and adds structural builder-only presets for:

- room doors, windows and vents;
- vivarium background panels;
- vivarium partitions;
- enclosure vents.

This keeps the asset model reusable as the catalogue grows toward real GLB/GLTF assets and manufacturer-specific components.

## Persistence

Durable spatial data is stored separately from the legacy room document:

`users/{uid}/spatialHabitats/{roomId}`

The legacy room projection remains useful for existing room features and compatibility, while the spatial document preserves nested enclosure geometry.

## Verification

Run:

```bash
npm run validate:spatial-habitat
npm run typecheck
```

The first command checks architectural contracts. The second is the authoritative TypeScript check and should be run locally/CI before this branch is merged.

