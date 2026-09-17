import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "../firebase/config";

export type RescueBrandingImageKind = "logo" | "hero";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadRescueBrandingImage(
  organisationId: string,
  kind: RescueBrandingImageKind,
  file: File,
): Promise<string> {
  if (!auth.currentUser) throw new Error("You need to be signed in to add a Rescue image.");
  if (!organisationId) throw new Error("Rescue organisation could not be identified.");
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("Choose a JPG, PNG or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Rescue branding images must be 8 MB or smaller.");

  const extension = extensionFor(file.type);
  const storagePath = `rescueBranding/${organisationId}/${kind}.${extension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: {
      organisationId,
      kind,
      uploadedBy: auth.currentUser.uid,
      purpose: "public-rescue-branding",
    },
  });
  return getDownloadURL(storageRef);
}
