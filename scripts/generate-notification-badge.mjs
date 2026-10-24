/**
 * Generate TinyTitans' Android notification badge from the keeper's REAL logo.
 *
 * Previously this script embedded a lightning bolt which isn't part of the logo.
 * The expanded notification can display the full-colour original JPEG, whereas
 * Android's small status-bar icon requires white artwork + transparent pixels.
 *
 * We derive a monochrome copy directly from the original logo stored in the
 * repository, retaining its circular reptile/spider/wordmark composition.
 * Never substitute the old bolt, a stock graphic or an invented "T".
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = join(root, "public/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg");
const destination = join(root, "public/tiny-titans-notification-badge.png");
if (!existsSync(source)) throw new Error("The official TinyTitans logo is missing: " + source);

// The grayscale cutoff removes the dark purple photo background while retaining
// the light lettering, patterned reptile outlines, circular rim and spider details.
// convert/magick produces a real RGBA PNG: black becomes ALPHA=0, white=opaque.
// We deliberately use the actual logo pixels rather than guessing their design.
const operations = [
  source,
  "-resize", "96x96!",
  "-colorspace", "gray",
  "-threshold", "42%",
  "-transparent", "black",
  "-background", "none",
  "-alpha", "on",
  "-depth", "8",
  "-define", "png:color-type=6",
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
    "Cannot create TinyTitans' real-logo badge without ImageMagick. " +
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
console.log("Generated real TinyTitans logo monochrome Android badge from the repository's official artwork.");


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
