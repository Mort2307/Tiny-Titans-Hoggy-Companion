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
import { existsSync, readFileSync, statSync } from "node:fs";
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
