export function getFirebaseErrorDetails(error: unknown): { code: string; message: string } {
  if (error && typeof error === "object") {
    const firebaseError = error as { code?: unknown; message?: unknown };
    const code = typeof firebaseError.code === "string" ? firebaseError.code : "unknown";
    const message = typeof firebaseError.message === "string" ? firebaseError.message : "Unknown Firebase error.";
    return { code, message };
  }
  if (error instanceof Error) return { code: "unknown", message: error.message };
  return { code: "unknown", message: String(error) };
}