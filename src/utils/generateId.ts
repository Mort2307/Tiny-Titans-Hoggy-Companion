// =========================================
// TINY TITANS ID GENERATOR
// =========================================
//
// Uses crypto.randomUUID() when supported.
//
// Falls back to crypto.getRandomValues()
// for browsers/environments where
// randomUUID() is unavailable.
//
// Final fallback uses timestamp + random
// data so the app remains functional even
// in older browser environments.
// =========================================

export function generateId(): string {
  // ---------------------------------------
  // Preferred method
  // ---------------------------------------

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // ---------------------------------------
  // Compatible crypto fallback
  // ---------------------------------------

  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);

    crypto.getRandomValues(bytes);

    // UUID v4 formatting
    bytes[6] =
      (bytes[6] & 0x0f) |
      0x40;

    bytes[8] =
      (bytes[8] & 0x3f) |
      0x80;

    const hex = Array.from(bytes)
      .map(
        (byte) =>
          byte
            .toString(16)
            .padStart(2, "0")
      )
      .join("");

    return (
      `${hex.slice(0, 8)}-` +
      `${hex.slice(8, 12)}-` +
      `${hex.slice(12, 16)}-` +
      `${hex.slice(16, 20)}-` +
      `${hex.slice(20, 32)}`
    );
  }

  // ---------------------------------------
  // Final fallback
  // ---------------------------------------

  return (
    `${Date.now().toString(36)}-` +
    `${Math.random()
      .toString(36)
      .slice(2)}-` +
    `${Math.random()
      .toString(36)
      .slice(2)}`
  );
}