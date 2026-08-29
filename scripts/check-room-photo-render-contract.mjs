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
  "Photo mesh is tagged",
  /userData=\{\{ vivariumFaceImage: true \}\}/.test(object),
  "Vivarium face photo meshes must be identifiable for rendering hardening.",
);
assert(
  "Build transform hardens photo depth",
  /name: "tiny-titans-room-photo-depth-fix"/.test(vite) && /depthTest=\{true\}/.test(vite) && /side=\{THREE\.FrontSide\}/.test(vite),
  "Vite must convert the legacy depth-disabled vivarium photo material into a depth-tested front-facing surface.",
);

const failed = checks.filter((check) => !check.condition);
console.table(checks.map(({ name, condition }) => ({ check: name, status: condition ? "PASS" : "FAIL" })));
if (failed.length) {
  for (const failure of failed) console.error(`FAIL: ${failure.name} — ${failure.detail}`);
  process.exit(1);
}

console.log(`Room photo render contract passed: ${checks.length} checks.`);
