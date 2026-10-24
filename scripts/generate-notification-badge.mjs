/**
 * TinyTitans notification branding:
 * - Full-colour installed PWA and expanded notification: original keeper artwork.
 * - Android 24px status icon: a simplified, bold coiled-snake emblem traced
 *   from the signature coil in that same crest. Fine detail was illegible at 24px.
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

// The original SVG remains the source of the brand mark. ImageMagick 6 on
// Firebase Hosting runners does not reliably rasterize SVG masks and produced
// an invalid badge, even when ImageMagick 7 rendered it correctly. Draw the
// exact same paths natively (without SVG delegates or fonts), so both versions
// produce an opaque white coil on transparent pixels at 96x96.
const mark = join(root, "public/icons/tiny-titans-notification-mark.svg");
if (!existsSync(mark)) throw new Error("TinyTitans' coiled-snake mark is missing.");
const operations = [
  "-size", "96x96", "xc:none",
  "-stroke", "white", "-strokewidth", "11.5", "-fill", "none",
  "-draw", 'stroke-linecap round stroke-linejoin round path "M68 31C83 40 81 61 68 72C57 82 39 83 27 72C14 61 17 42 31 32C45 22 61 31 61 46C60 59 44 65 37 56C32 49 38 43 45 45"',
  "-stroke", "none", "-fill", "white",
  "-draw", 'path "M63 14C70 11 81 14 85 20C91 28 83 35 74 35C65 35 58 32 58 25C58 19 59 17 63 14Z"',
  "-fill", "black", "-draw", "circle 76,22 79,22",
  "-transparent", "black",
  "-alpha", "on", "-depth", "8", "-define", "png:color-type=6",
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
    "Cannot create TinyTitans' legible coiled-snake badge without ImageMagick. " +
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
console.log("Generated sharp, high-contrast TinyTitans coiled-snake Android notification badge.");


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
