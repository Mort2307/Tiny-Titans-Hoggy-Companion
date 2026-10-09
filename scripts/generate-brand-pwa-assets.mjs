/**
 * Build genuine Tiny Titans browser/PWA icons from the keeper's existing logo.
 * The former favicon and PWA SVGs contain an unrelated purple lightning bolt.
 *
 * No image package or paid image service is needed: embed the existing JPEG
 * into standalone SVG icons so browsers never need to fetch linked artwork.
 * The original JPEG remains an independent raster fallback in the manifests.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const sourceFile = resolve(ROOT, "public/TinyTitans-Logo.jpg/TinyTitans-Logo.JPG.jpg");
const logo = readFileSync(sourceFile);

if (logo.length < 100 || logo[0] !== 0xff || logo[1] !== 0xd8 || !logo.includes(Buffer.from([0xff, 0xd9]))) {
  throw new Error("Tiny Titans original logo is missing or is not a valid JPEG.");
}

const data = `data:image/jpeg;base64,${logo.toString("base64")}`;

/** Keep extra space in maskable artwork for adaptive icon crops. */
function makeIcon(size, safeMargin = 0.06) {
  const offset = Math.round(size * safeMargin);
  const inner = size - offset * 2;
  const corner = Math.round(size * 0.16);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" rx="${corner}" fill="#140022"/>
  <image x="${offset}" y="${offset}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet" href="${data}"/>
</svg>`;
}

const icons = [
  ["public/favicon-brand.svg", 64, 0],
  ["public/icons/tiny-titans-brand-192.svg", 192, 0.04],
  ["public/icons/tiny-titans-brand-512.svg", 512, 0.04],
  ["public/icons/tiny-titans-brand-maskable-512.svg", 512, 0.16],
  // Compatibility URLs for previously cached manifests and favicons.
  ["public/favicon.svg", 64, 0],
  ["public/icons/tiny-titans-192.svg", 192, 0.04],
  ["public/icons/tiny-titans-512.svg", 512, 0.04],
];
for (const [relativePath, size, inset] of icons) {
  const file = resolve(ROOT, relativePath);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, makeIcon(size, inset));
}
console.log("Tiny Titans branding: generated favicon and 192/512/maskable PWA artwork from original keeper logo.");
