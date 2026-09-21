import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (file) =>
  fs.readFileSync(path.join(root, file), "utf8");

const results = [];
const assert = (name, condition, detail) => {
  const pass = Boolean(condition);
  results.push({ name, pass, detail: pass ? null : detail });
  console.log(`${name} — ${pass ? "PASS" : "FAIL"}`);
};

const page = read("src/pages/ReptileRoom3D.tsx");
const hook = read("src/hooks/useReptileRoom3D.ts");
const room3d = read("src/components/reptile-room-3d/Room3D.tsx");
const roomScene = read("src/components/reptile-room-3d/RoomScene.tsx");
const object = read("src/components/reptile-room-3d/RoomObject3D.tsx");
const models = read("src/components/reptile-room-3d/RoomObjectModels.tsx");
const vite = read("vite.config.ts");

assert(
  "Room photo is slot-owned",
  /const photoFor = useCallback\(\(slot: ReptileRoomSlot\) => photoPreviewUrls\[slot\.id\] \|\| slot\.photoUrl \|\| undefined/.test(hook),
  "photoFor must resolve only from the supplied room slot."
);

assert(
  "No implicit snake-photo fallback",
  !/snakeMap\.get\(slot\.snakeId\?\?""\)\?\.enclosure\?\.roomPhoto\?\.url/.test(page + hook),
  "A snake enclosure photo must not be used as an implicit renderer fallback."
);

assert(
  "3D renderer receives slot photo",
  /photoForSlot=\{photoFor\}/.test(page) &&
    /const effectivePhotoForSlot\s*=/.test(room3d) &&
    /photoForSlot=\{effectivePhotoForSlot\}/.test(room3d) &&
    /photoForSlot\?\.\(slot\)\s*\?\?\s*slot\.photoUrl/.test(roomScene) &&
    /<RoomObject3D[\s\S]*photoUrl=\{photoForSlot\?\.\(slot\)\s*\?\?\s*slot\.photoUrl\}/.test(roomScene) &&
    /photoUrl\?: string/.test(object),
  "Slot photo must flow from the page through Room3D and RoomScene into RoomObject3D."
);

assert(
  "Every vivarium has scalable glass",
  /export function VivariumModel[\s\S]*?const glassWidth\s*=\s*Math\.max[\s\S]*?const glassHeight\s*=\s*Math\.max[\s\S]*?glassWidth[\s\S]*?glassHeight/.test(models),
  "Vivarium glass must derive from scalable model dimensions."
);

assert(
  "Glass is clickable",
  /vivariumGlassHitArea/.test(models) &&
    /onSelectGlass/.test(models) &&
    /const selectGlass\s*=/.test(models) &&
    /onPointerDown=\{selectGlass\}/.test(models),
  "Vivarium glass must expose a dedicated clickable hit area."
);

assert(
  "Empty glass exposes photo action",
  /vivariumPhotoPlaceholder/.test(models) &&
    /ADD VIVARIUM PHOTO/.test(models),
  "Empty vivarium glass must display the photo action placeholder."
);

assert(
  "Photo mesh is tagged",
  /userData=\{\{ vivariumFaceImage: true \}\}/.test(models),
  "The rendered vivarium face image must carry the vivariumFaceImage tag."
);

assert(
  "Photo is depth-tested and double-sided",
  /map=\{texture\}[\s\S]*?depthTest[\s\S]*?side=\{THREE\.DoubleSide\}/.test(models),
  "The vivarium photo mesh must use depth testing and THREE.DoubleSide."
);

assert(
  "No temporary photo build transform",
  !/tiny-titans-room-photo-depth-fix/.test(vite),
  "Temporary room-photo Vite transform must not be present."
);

const failed = results.filter((item) => !item.pass);

console.log(
  JSON.stringify(
    {
      test: "room-photo-render-contract",
      status: failed.length === 0 ? "pass" : "fail",
      checks: results.length,
      passed: results.length - failed.length,
      failed: failed.length,
      findings: failed,
    },
    null,
    2
  )
);

if (failed.length > 0) {
  process.exit(1);
}
