/**
 * TinyTitans notification branding:
 * - Full-colour installed PWA and expanded notification: original keeper artwork.
 * - Android 24px status icon: a bold gecko head, eye and splayed foot inspired
 *   by the gecko in that crest. The previous spiral resembled a snail at 24px.
 * Produces real transparent PNGs; NEVER substitute stock artwork or the old bolt.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "public/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg");
const destination = join(root, "public/tiny-titans-notification-badge.png");
if (!existsSync(source)) throw new Error("The official TinyTitans logo is missing: " + source);

// The gecko-head SVG is the reference mark. ImageMagick 6 cannot reliably
// rasterise SVG masks on Firebase Hosting runners, so render exactly the same
// paths as native ImageMagick primitives; no font or SVG delegate required.
// The transparent 96px image downscales to a clear 24px reptile silhouette.
const mark = join(root, "public/icons/tiny-titans-notification-mark.svg");
if (!existsSync(mark)) throw new Error("TinyTitans' gecko-head mark is missing.");
const operations = [
  "-size", "96x96", "xc:none",
  "-stroke", "none", "-fill", "white",
  "-draw", 'path "M11 77 C18 67 22 58 19 49 C13 36 19 29 30 24 C38 20 47 19 53 23 C58 17 66 16 73 23 C76 27 78 30 85 33 C91 36 94 41 89 47 C84 53 74 54 64 51 C58 49 54 47 50 47 C44 53 41 64 38 77 L25 80 C28 69 29 61 25 55 C26 68 23 75 19 81 Z"',
  "-draw", 'path "M22 66 C15 64 12 66 7 70 C4 72 4 75 7 76 C10 77 15 73 17 72 L13 79 C11 83 15 86 18 82 L24 75 L25 82 C25 86 30 86 31 82 L31 70 Z"',
  "-fill", "black", "-draw", "circle 60,32 67.5,32",
  "-fill", "white", "-draw", "circle 62,29 64.2,29",
  "-fill", "black", "-draw", "circle 82,39 83.8,39",
  "-stroke", "black", "-strokewidth", "3", "-fill", "none",
  "-draw", 'path "M68 45 Q77 49 86 44"',
  "-transparent", "black", "-alpha", "on",
  "-depth", "8", "-define", "png:color-type=6",
  destination,
];
const binaries = [
  { command: "magick", args: operations },
  { command: "convert", args: operations },
];
let complete = false;
const errors = [];
for (const bin of binaries) {
  const proc = spawnSync(bin.command, bin.args, { cwd: root, encoding: "utf8" });
  if (!proc.error && proc.status === 0) {
    complete = true;
    break;
  }
  errors.push(bin.command + ": " + (proc.error?.message || proc.stderr || "failed"));
}
if (!complete) {
  throw new Error(
    "Cannot create TinyTitans' legible gecko-head badge without ImageMagick. " +
    "Install 'magick' or 'convert'; do not publish the old lightning-bolt badge.\n" +
    errors.join("\n"),
  );
}
const output = readFileSync(destination);
if (
  output.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
  output.readUInt32BE(16) !== 96 ||
  output.readUInt32BE(20) !== 96 ||
  output[25] !== 6 ||
  statSync(destination).size < 650
) {
  throw new Error("TinyTitans logo badge is not a non-empty, transparent 96×96 RGBA PNG.");
}
console.log("Generated sharp, high-contrast TinyTitans gecko-head Android notification badge.");


// Android may source the small status-bar icon from the INSTALLED PWA's
// favicon/manifest identity rather than webpush.notification.badge.
// Those legacy PWA assets were still lightning bolts. Replace every one,
// including the fallbacks that older installs and backend senders request.
function convertOfficialLogo(target, dimension, contentDimension) {
  const args = [
    source,
    "-auto-orient",
    // The original JPEG already contains the complete branded icon. Don't
    // shrink it into another coloured square (which looks like two logos).
    "-resize", String(dimension) + "x" + String(dimension) + "^",
    "-gravity", "center",
    "-crop", String(dimension) + "x" + String(dimension) + "+0+0",
    "+repage",
    "-strip",
    "-depth", "8",
    "-define", "png:color-type=2",
    target,
  ];
  const failures = [];
  for (const binary of ["magick", "convert"]) {
    const out = spawnSync(binary, args, { cwd: root, encoding: "utf8" });
    if (!out.error && out.status === 0) return;
    failures.push(binary + ": " + (out.error?.message || out.stderr || "failed"));
  }
  throw new Error("Couldn't build the official TinyTitans PWA icons.\n" + failures.join("\n"));
}
const identityAssets = [
  [join(root, "public/icons/tiny-titans-official-192.png"), 192, 192],
  [join(root, "public/icons/tiny-titans-official-512.png"), 512, 512],
];
for (const [file, dimension, contentDimension] of identityAssets) {
  convertOfficialLogo(file, dimension, contentDimension);
  const bytes = readFileSync(file);
  if (bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
      bytes.readUInt32BE(16) !== dimension ||
      bytes.readUInt32BE(20) !== dimension ||
      statSync(file).size < 2000) {
    throw new Error("Invalid official TinyTitans PWA PNG: " + file);
  }
}
// Preserve the old URLs used by older installed PWAs and push backends.
// Embed the keeper's ORIGINAL image so SVGs work without external fetches.
const jpeg = readFileSync(source).toString("base64");
const svgLogo = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice" href="data:image/jpeg;base64,' + jpeg + '"/></svg>\n';
for (const oldPath of [
  "public/favicon.svg",
  "public/icons/tiny-titans-192.svg",
  "public/icons/tiny-titans-512.svg",
]) {
  writeFileSync(join(root, oldPath), svgLogo);
}
console.log("Generated official TinyTitans PWA icons and replaced all built legacy bolt graphics.");
