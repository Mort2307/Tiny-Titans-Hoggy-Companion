export type TinyTitansErrorCode =
  | "SPECIES_ID_MISSING"
  | "SPECIES_ID_INVALID"
  | "ANIMAL_NAME_MISSING"
  | "FIRESTORE_PERMISSION_DENIED"
  | "FIRESTORE_UNAUTHENTICATED"
  | "FIRESTORE_UNAVAILABLE"
  | "FIRESTORE_INVALID_DATA"
  | "FIRESTORE_INVALID_FIELD_VALUE"
  | "FIRESTORE_NOT_FOUND"
  | "FIRESTORE_FAILED"
  | "UNKNOWN";

export class TinyTitansAppError extends Error {
  readonly code: TinyTitansErrorCode;
  readonly causeError?: unknown;

  constructor(code: TinyTitansErrorCode, message: string, causeError?: unknown) {
    super(message);
    this.name = "TinyTitansAppError";
    this.code = code;
    this.causeError = causeError;
  }
}

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

const FRIENDLY_FIELD_NAMES: Record<string, string> = {
  speciesId: "Species ID",
  speciesCommonName: "Species name",
  scientificName: "Scientific name",
  animalGroup: "Animal group",
  ownerUid: "Owner information",
  name: "Animal name",
  sex: "Sex",
  status: "Status",
  morphOrColour: "Morph / colour",
  origin: "Origin",
  breederOrSource: "Breeder / source",
  acquisitionDate: "Acquisition date",
  hatchOrBirthDate: "Hatch / birth date",
  identifier: "Identifier",
  notes: "Notes",
  tags: "Tags",
};

function getFriendlyFieldName(field: string): string {
  return FRIENDLY_FIELD_NAMES[field] ?? field
    .split(".")
    .map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2"))
    .join(" → ");
}

function unsupportedFieldMessage(errorMessage: string): string | null {
  if (!/Unsupported field value:\s*undefined/i.test(errorMessage)) return null;

  const match = errorMessage.match(/field\s+([A-Za-z0-9_.-]+)/i);
  const field = match?.[1];

  if (field === "speciesId") {
    return "Species ID error: Tiny Titans could not save this animal because the Species ID is missing. Select a species from the Tiny Titans species catalogue and try again. Error code: SPECIES_ID_MISSING";
  }

  if (field) {
    const friendlyField = getFriendlyFieldName(field);
    return `Tiny Titans could not save this animal because the ${friendlyField} value is missing or invalid. Please check that field and try again. Error code: FIRESTORE_INVALID_FIELD_VALUE`;
  }

  return "Tiny Titans could not save this animal because one of its values is missing or invalid. Please check the form and try again. Error code: FIRESTORE_INVALID_FIELD_VALUE";
}

export function getTinyTitansErrorMessage(
  error: unknown,
  fallback = "Tiny Titans could not complete that action.",
): string {
  if (error instanceof TinyTitansAppError) return error.message;

  const details = getFirebaseErrorDetails(error);
  const unsupported = unsupportedFieldMessage(details.message);
  if (unsupported) return unsupported;

  switch (details.code) {
    case "permission-denied":
      return "Tiny Titans could not save this information because your account does not currently have permission to make this change. Error code: FIRESTORE_PERMISSION_DENIED";
    case "unauthenticated":
      return "Tiny Titans could not save this information because your session is no longer authenticated. Please sign in again. Error code: FIRESTORE_UNAUTHENTICATED";
    case "unavailable":
      return "Tiny Titans could not reach the database. Check your internet connection and try again. Error code: FIRESTORE_UNAVAILABLE";
    case "failed-precondition":
      return "Tiny Titans could not complete this request because a required database configuration is unavailable. Error code: FIRESTORE_FAILED";
    case "invalid-argument":
      return "Tiny Titans rejected the information because one or more values are invalid. Please check the form and try again. Error code: FIRESTORE_INVALID_DATA";
    case "deadline-exceeded":
      return "Tiny Titans took too long to reach the database. Please check your connection and try again. Error code: FIRESTORE_FAILED";
    case "resource-exhausted":
      return "Tiny Titans could not save this information because the record is too large. Please reduce any attached media and try again. Error code: FIRESTORE_FAILED";
    case "not-found":
      return "Tiny Titans could not find the record it was trying to update. Refresh the page and try again. Error code: FIRESTORE_NOT_FOUND";
    case "already-exists":
      return "Tiny Titans could not save this record because an equivalent record already exists. Error code: FIRESTORE_FAILED";
    case "aborted":
    case "cancelled":
      return "Tiny Titans could not complete the save. No changes were confirmed. Please try again. Error code: FIRESTORE_FAILED";
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
