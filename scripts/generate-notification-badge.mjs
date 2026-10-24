/**
 * TinyTitans notification branding:
 * - Full-colour installed PWA and expanded notification: original keeper artwork.
 * - Android 24px status icon: the user-approved FRONT-FACING hognose portrait.
 *   The official art is converted into a 96px white-on-transparent PNG and
 *   stored as a checked-in source asset; never invent a new snake-head shape.
 * Produces real transparent PNGs; NEVER substitute stock artwork or the old bolt.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "public/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg");
const destination = join(root, "public/tiny-titans-notification-badge.png");
if (!existsSync(source)) throw new Error("The official TinyTitans logo is missing: " + source);

// The owner selected a PARTICULAR generated front-on hoggy face; preserve
// that actual drawing instead of redrawing a generic side-profile snake.
// The source is a transparent monochrome 96px conversion of that exact art,
// prepared for Android's tintable 24dp notification status icon.
const approvedBadge = join(root, "public/icons/tiny-titans-front-hognose-96.png");
if (!existsSync(approvedBadge)) throw new Error("Owner-approved front-on hognose badge asset is missing.");
const approvedBytes = readFileSync(approvedBadge);
const approvedHash = "2cc704955bcd6731f868e8acdb6a68df1a7190737b0d4d6be38f629ff032991d";
if (
  approvedBytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
  approvedBytes.readUInt32BE(16) !== 96 ||
  approvedBytes.readUInt32BE(20) !== 96 ||
  approvedBytes[25] !== 6 ||
  statSync(approvedBadge).size < 1000 ||
  createHash("sha256").update(approvedBytes).digest("hex") !== approvedHash
) {
  throw new Error("Front-facing TinyTitans hognose badge is not the approved transparent 96px artwork.");
}
copyFileSync(approvedBadge, destination);
const output = readFileSync(destination);
if (
  output.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
  output.readUInt32BE(16) !== 96 ||
  output.readUInt32BE(20) !== 96 ||
  output[25] !== 6 ||
  createHash("sha256").update(output).digest("hex") !== approvedHash
) {
  throw new Error("TinyTitans notification badge must match the keeper-approved front-on hognose face.");
}
console.log("Generated approved front-on western hognose Android notification badge.");

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
