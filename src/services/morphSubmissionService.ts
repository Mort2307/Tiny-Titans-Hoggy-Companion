import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase/config";

export type MorphCreditMode = "name" | "social" | "anonymous";

export interface MorphSubmissionInput {
  morphName: string;
  description: string;
  observedTraits: string;
  creditMode: MorphCreditMode;
  creditName?: string;
  creditSocial?: string;
  image: File;
}

const slugify = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

async function prepareImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");

  const bitmap = await createImageBitmap(file);
  const maxDimension = 1800;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare the image.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress the image.")), "image/jpeg", 0.84);
  });
}

export async function submitMorphImage(input: MorphSubmissionInput): Promise<{ submissionId: string }> {
  const morphName = input.morphName.trim();
  const description = input.description.trim();
  const observedTraits = input.observedTraits.trim();

  if (!morphName) throw new Error("Please enter the morph name.");
  if (!description) throw new Error("Please describe the animal and why you believe it matches this morph.");
  if (!input.image) throw new Error("Please add an image for review.");

  if (input.creditMode === "name" && !input.creditName?.trim()) {
    throw new Error("Please enter the name you want displayed, or choose another credit option.");
  }
  if (input.creditMode === "social" && !input.creditSocial?.trim()) {
    throw new Error("Please enter the social handle/link you want displayed, or choose another credit option.");
  }

  const compressed = await prepareImage(input.image);
  const submissionRef = await addDoc(collection(db, "morphSubmissions"), {
    morphName,
    description,
    observedTraits,
    creditMode: input.creditMode,
    creditName: input.creditMode === "name" ? input.creditName?.trim() : null,
    creditSocial: input.creditMode === "social" ? input.creditSocial?.trim() : null,
    status: "pending",
    createdAt: serverTimestamp(),
  });

  const storageRef = ref(storage, `morph-submissions/${submissionRef.id}/${slugify(morphName) || "morph"}.jpg`);
  await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
  const imageUrl = await getDownloadURL(storageRef);

  // Keep the review record in Firestore; the image is intentionally isolated in
  // Storage so it can be removed when a submission is rejected/cleared without
  // deleting the review history.
  // The Creator review workflow can promote an approved image into the canonical
  // morph database and delete the temporary submission asset afterwards.
  const { updateDoc, doc } = await import("firebase/firestore");
  await updateDoc(doc(db, "morphSubmissions", submissionRef.id), {
    imageUrl,
    storagePath: storageRef.fullPath,
  });

  return { submissionId: submissionRef.id };
}
