import { collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase/config";

export type MorphCreditMode = "name" | "social" | "anonymous";

export interface MorphSubmissionInput {
  morphName: string;
  description: string;
  observedTraits: string;
  proofDetails: string;
  proofReference?: string;
  photoRequirementsConfirmed: boolean;
  factualAccuracyConfirmed: boolean;
  creditMode: MorphCreditMode;
  creditName?: string;
  creditSocial?: string;
  image: File;
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

async function prepareImage(file: File): Promise<Blob> {
  if (!file) throw new Error("Please choose an image file.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to prepare the image.");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress the image.")), "image/jpeg", 0.84);
    });
  } catch {
    throw new Error("Tiny Titans could not read this image. Please choose a normal camera/gallery image such as JPG, PNG or WebP.");
  }
}

export async function submitMorphImage(input: MorphSubmissionInput): Promise<{ submissionId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to submit a morph image.");
  const morphName = input.morphName.trim();
  const description = input.description.trim();
  const observedTraits = input.observedTraits.trim();
  const proofDetails = input.proofDetails.trim();
  const proofReference = input.proofReference?.trim();
  if (!morphName) throw new Error("Please enter the morph name.");
  if (!description) throw new Error("Please describe the animal and why you believe it matches this morph.");
  if (!input.image) throw new Error("Please add the primary morph photograph.");
  if (!proofDetails) throw new Error("Proof of the confirmed morph is required for factual accuracy.");
  if (!input.factualAccuracyConfirmed) throw new Error("Please confirm that the morph identification is supported by factual evidence.");
  if (!input.photoRequirementsConfirmed) throw new Error("Please confirm that the primary photograph meets the Morph Library photo requirements.");
  if (input.creditMode === "name" && !input.creditName?.trim()) throw new Error("Please enter the name you want displayed, or choose another credit option.");
  if (input.creditMode === "social" && !input.creditSocial?.trim()) throw new Error("Please enter the social handle/link you want displayed, or choose another credit option.");
  const compressed = await prepareImage(input.image);
  const submissionRef = doc(collection(db, "morphImageSubmissions"));
  const storagePath = `morph-submissions/${user.uid}/${submissionRef.id}/${slugify(morphName) || "morph"}.jpg`;
  const storageRef = ref(storage, storagePath);
  let uploaded = false;
  try {
    await uploadBytes(storageRef, compressed, { contentType: "image/jpeg" });
    uploaded = true;
    const imageUrl = await getDownloadURL(storageRef);
    await setDoc(submissionRef, {
      userId: user.uid,
      morphName,
      description,
      observedTraits,
      proofDetails,
      proofReference: proofReference || null,
      photoRequirementsConfirmed: true,
      factualAccuracyConfirmed: true,
      creditType: input.creditMode,
      creditName: input.creditMode === "name" ? input.creditName?.trim() : null,
      creditSocial: input.creditMode === "social" ? input.creditSocial?.trim() : null,
      attachment: { path: storagePath, type: "image", sizeBytes: compressed.size },
      imageUrl,
      status: "Pending",
      submittedAt: serverTimestamp(),
    });
    return { submissionId: submissionRef.id };
  } catch (error) {
    if (uploaded) await deleteObject(storageRef).catch((): void => undefined);
    throw error instanceof Error ? error : new Error("We couldn't upload the morph image. Please try again.");
  }
}
