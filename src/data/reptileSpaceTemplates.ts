import type { ReptileSpaceTemplate, SpatialObjectBase } from "../types/ReptileSpace";
import { rackCapacity } from "../services/spatialEngine";

const object = (
  kind: SpatialObjectBase["kind"],
  name: string,
  width: number,
  depth: number,
  height: number,
  x: number,
  y: number,
  z = 0,
  metadata?: SpatialObjectBase["metadata"],
): Omit<SpatialObjectBase, "id"> => ({
  kind,
  name,
  dimensions: { width, depth, height },
  position: { x, y, z, rotationDeg: 0 },
  metadata,
});

export const REPTILE_SPACE_TEMPLATES: ReptileSpaceTemplate[] = [
  {
    id: "blank-room",
    name: "Blank Room",
    description: "A clean empty space. Add your walls, enclosures, racks and equipment yourself.",
    icon: "🧱",
    category: "blank",
    defaultDimensions: { width: 3000, depth: 2500, height: 2400 },
    objects: [],
    tags: ["blank", "custom", "build-your-own"],
  },
  {
    id: "scaled-room",
    name: "Scaled Room",
    description: "Enter your real room dimensions and start with an accurate, empty floor plan.",
    icon: "📐",
    category: "preset",
    defaultDimensions: { width: 3000, depth: 2500, height: 2400 },
    objects: [],
    tags: ["scaled", "accurate", "floor-plan"],
  },
  {
    id: "hatchling-room",
    name: "Hatchling Room",
    description: "A compact starting layout for tubs, preparation and storage.",
    icon: "🐣",
    category: "preset",
    defaultDimensions: { width: 3000, depth: 2500, height: 2400 },
    objects: [
      object("rack", "Hatchling Rack 01", 1200, 600, 1800, 150, 150, 0, {
        capacity: rackCapacity(5, 6, 5),
        columns: 5,
        rows: 6,
        levels: 5,
      }),
      object("workbench", "Preparation Bench", 1200, 600, 900, 1500, 150, 0),
      object("storage", "Storage", 800, 500, 1800, 150, 950, 0),
    ],
    tags: ["hatchling", "tubs", "rack", "prep"],
  },
  {
    id: "breeding-room",
    name: "Breeding Room",
    description: "A flexible breeder layout with rack space, work area and storage.",
    icon: "🧬",
    category: "preset",
    defaultDimensions: { width: 3600, depth: 3000, height: 2400 },
    objects: [
      object("rack", "Breeder Rack 01", 1500, 600, 1800, 150, 150, 0, {
        capacity: rackCapacity(5, 6, 5),
        columns: 5,
        rows: 6,
        levels: 5,
      }),
      object("rack", "Breeder Rack 02", 1500, 600, 1800, 1750, 150, 0, {
        capacity: rackCapacity(5, 6, 5),
        columns: 5,
        rows: 6,
        levels: 5,
      }),
      object("workbench", "Pairing / Preparation Bench", 1200, 600, 900, 150, 900, 0),
      object("storage", "Breeding Storage", 800, 500, 1800, 1750, 900, 0),
    ],
    tags: ["breeding", "rack", "storage", "workbench"],
  },
  {
    id: "quarantine-room",
    name: "Medical / Quarantine",
    description: "A simple separated space for quarantine organisation and monitoring equipment.",
    icon: "🩺",
    category: "preset",
    defaultDimensions: { width: 2400, depth: 2000, height: 2400 },
    objects: [
      object("rack", "Quarantine Rack", 1200, 600, 1500, 150, 150, 0, {
        capacity: rackCapacity(4, 4, 4),
        columns: 4,
        rows: 4,
        levels: 4,
      }),
      object("workbench", "Observation / Work Surface", 1000, 600, 900, 150, 950, 0),
      object("storage", "Dedicated Storage", 600, 500, 1500, 1500, 950, 0),
    ],
    tags: ["quarantine", "isolation", "monitoring", "storage"],
  },
  {
    id: "brumation-room",
    name: "Brumation Room",
    description: "A clean seasonal-storage layout with enclosure positions and monitoring space.",
    icon: "❄️",
    category: "preset",
    defaultDimensions: { width: 3000, depth: 2500, height: 2400 },
    objects: [
      object("rack", "Seasonal Rack", 1500, 600, 1500, 150, 150, 0, {
        capacity: rackCapacity(5, 5, 4),
        columns: 5,
        rows: 5,
        levels: 4,
      }),
      object("equipment", "Monitoring Station", 700, 500, 900, 1800, 150, 0),
      object("storage", "Seasonal Storage", 800, 500, 1500, 150, 1000, 0),
    ],
    tags: ["brumation", "seasonal", "monitoring"],
  },
  {
    id: "bioactive-room",
    name: "Bioactive Collection",
    description: "A presentation-friendly room with room for larger vivariums and plant work.",
    icon: "🌱",
    category: "preset",
    defaultDimensions: { width: 4200, depth: 3000, height: 2400 },
    objects: [
      object("vivarium", "Vivarium 01", 1200, 600, 600, 150, 150),
      object("vivarium", "Vivarium 02", 1200, 600, 600, 1500, 150),
      object("vivarium", "Vivarium 03", 1200, 600, 600, 2850, 150),
      object("workbench", "Plant / Preparation Bench", 1400, 700, 900, 150, 1000),
      object("storage", "Substrate / Equipment Storage", 900, 600, 1800, 2850, 1000),
    ],
    tags: ["bioactive", "vivarium", "plants", "display"],
  },
];

export function getReptileSpaceTemplate(id: string): ReptileSpaceTemplate | undefined {
  return REPTILE_SPACE_TEMPLATES.find((template) => template.id === id);
}
