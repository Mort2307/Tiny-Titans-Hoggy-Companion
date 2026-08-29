import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const checks = [];
const assert = (name, condition, detail) => checks.push({ name, condition, detail });

const page = read("src/pages/ReptileRoom3D.tsx");
const scene = read("src/components/reptile-room-3d/Room3D.tsx");
const object = read("src/components/reptile-room-3d/RoomObject3D.tsx");
const vite = read("vite.config.ts");

assert(
  "Room photo is slot-owned",
  /const photoFor = useCallback\(\(slot: ReptileRoomSlot\) => photoPreviewUrls\[slot\.id\] \|\| slot\.photoUrl \|\| undefined/.test(page),
  "photoFor must resolve from the selected room slot only.",
);
assert(
  "No implicit snake-photo fallback",
  !/snakeMap\.get\(slot\.snakeId\?\?""\)\?\.enclosure\?\.roomPhoto\?\.url/.test(page),
  "Snake enclosure photos may only be copied into the slot through the explicit Use snake's enclosure photo action.",
);
assert(
  "3D renderer receives slot photo",
  /photoForSlot=\{photoFor\}/.test(page) && /photoUrl=\{photoForSlot\?\.\(slot\) \?\? slot\.photoUrl\}/.test(scene),
  "The 3D renderer must receive the slot-scoped image URL.",
);
assert(
  "Every vivarium has scalable glass",
  /function VivariumModel\([\s\S]*?glassWidth[\s\S]*?glassHeight/.test(object),
  "Vivarium glass must be derived from each enclosure's width and height.",
);
assert(
  "Glass is clickable",
  /vivariumGlassHitArea/.test(object) && /onSelectGlass/.test(object),
  "The vivarium glass surface must be its own selectable interaction target.",
);
assert(
  "Empty glass exposes photo action",
  /vivariumPhotoPlaceholder/.test(object) && /ADD VIVARIUM PHOTO/.test(object),
  "Every vivarium without a photo must expose the scalable glass photo placeholder.",
);
assert(
  "Photo mesh is tagged",
  /userData=\{\{ vivariumFaceImage: true \}\}/.test(object),
  "Vivarium face photo meshes must be identifiable for rendering hardening.",
);
assert(
  "Photo is depth-tested and double-sided",
  /map=\{texture\}[\s\S]*?depthTest[\s\S]*?side=\{THREE\.DoubleSide\}/.test(object),
  "The photo must stay attached to the 3D glass while remaining visible from either side.",
);
assert(
  "No temporary photo build transform",
  !/tiny-titans-room-photo-depth-fix/.test(vite),
  "Photo rendering must be correct in the component source without a Vite transform hack.",
);

const failed = checks.filter((check) => !check.condition);
console.table(checks.map(({ name, condition }) => ({ check: name, status: condition ? "PASS" : "FAIL" })));
if (failed.length) {
  for (const failure of failed) console.error(`FAIL: ${failure.name} — ${failure.detail}`);
  process.exit(1);
}

console.log(`Room photo render contract passed: ${checks.length} checks.`);
