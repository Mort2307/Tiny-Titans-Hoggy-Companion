import { addDoc, collection, getDocs, limit, query, serverTimestamp, updateDoc, where, doc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, db, storage } from "../firebase/config";
import { findSnakeSpecies } from "../data/species/speciesRegistry";
import type { VivariumCreditMode, VivariumMedia, VivariumMediaType, VivariumShowcaseSubmission } from "../types/vivariumShowcase";

const MAX_MEDIA = 6;
const MAX_VIDEOS = 2;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 75 * 1024 * 1024;

const clean = (value: string | undefined | null, max = 4000) => {
  const trimmed = (value ?? "").trim();
  if (trimmed.length > max) throw new Error(`A showcase field is too long (maximum ${max} characters).`);
  return trimmed;
};

function extensionFor(file: File, type: VivariumMediaType, index: number) {
  const raw = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || (type === "image" ? "jpg" : "mp4");
  const allowed = type === "image" ? ["jpg", "jpeg", "png", "webp"] : ["mp4", "webm", "mov", "m4v"];
  return allowed.includes(raw) ? raw : `${type}-${index}`;
}

async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 2000;
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
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to compress the image.")), "image/jpeg", 0.86));
  } catch (error) {
    if (error instanceof Error && error.message === "Unable to prepare the image.") throw error;
    throw new Error("Tiny Titans could not read this image. Please choose a normal JPG, PNG or WebP image.", { cause: error });
  }
}

function classify(file: File): VivariumMediaType {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  throw new Error("Vivarium Showcase media must be an image or video file.");
}

async function uploadMedia(userId: string, submissionId: string, file: File, index: number): Promise<VivariumMedia> {
  const type = classify(file);
  const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) throw new Error(`${type === "image" ? "Images" : "Videos"} must be ${type === "image" ? "10 MB" : "75 MB"} or smaller.`);

  const blob = type === "image" ? await prepareImage(file) : file;
  const extension = extensionFor(file, type, index);
  const storagePath = `keeper-observations/${userId}/${submissionId}/vivarium-${index + 1}.${extension === "jpeg" ? "jpg" : extension}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, blob, {
    contentType: type === "image" ? "image/jpeg" : (file.type || "video/mp4"),
    customMetadata: { uploadedBy: userId, evidenceType: `vivarium-${type}` },
  });
  return {
    id: crypto.randomUUID(),
    type,
    path: storagePath,
    url: await getDownloadURL(storageRef),
    name: file.name,
    sizeBytes: blob.size,
    contentType: type === "image" ? "image/jpeg" : (file.type || "video/mp4"),
  };
}

export async function submitVivariumShowcase(input: {
  speciesId: string;
  individualName?: string;
  title: string;
  description: string;
  whatWorks: string;
  whatChanged: string;
  lessonsLearned: string;
  enclosureType: string;
  dimensions: string;
  setupAge: string;
  substrate: string;
  heating: string;
  thermostat: string;
  lighting: string;
  humidity: string;
  temperature: string;
  ventilation: string;
  hidesAndEnrichment: string;
  plantsAndBioactive: string;
  waterAndFeeding: string;
  publicConsent?: boolean;
  creditMode: VivariumCreditMode;
  creditName?: string;
  creditSocial?: string;
  media: File[];
}): Promise<{ submissionId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to share a vivarium setup.");
  const species = findSnakeSpecies(input.speciesId);
  if (!species) throw new Error("Please select a recognised snake species.");
  if (input.publicConsent === false) throw new Error("Please confirm that you want this setup shared with the Tiny Titans community.");
  if (!input.title.trim() || !input.description.trim()) throw new Error("Please provide a setup title and description.");
  if (!input.media.length) throw new Error("Add at least one enclosure image or video.");
  if (input.media.length > MAX_MEDIA) throw new Error(`You can share up to ${MAX_MEDIA} images or videos per setup.`);
  const videoCount = input.media.filter((file) => file.type.startsWith("video/")).length;
  if (videoCount > MAX_VIDEOS) throw new Error(`You can share up to ${MAX_VIDEOS} videos per setup.`);
  if (input.creditMode === "name" && !input.creditName?.trim()) throw new Error("Enter the name you want displayed, or choose another credit option.");
  if (input.creditMode === "social" && !input.creditSocial?.trim()) throw new Error("Enter the social handle/link you want displayed, or choose another credit option.");

  const payload = {
    userId: user.uid,
    speciesId: species.id,
    speciesName: species.acceptedScientificName,
    individualName: clean(input.individualName, 120) || null,
    title: clean(input.title, 160),
    description: clean(input.description),
    whatWorks: clean(input.whatWorks),
    whatChanged: clean(input.whatChanged),
    lessonsLearned: clean(input.lessonsLearned),
    enclosureType: clean(input.enclosureType, 120),
    dimensions: clean(input.dimensions, 120),
    setupAge: clean(input.setupAge, 120),
    substrate: clean(input.substrate, 1200),
    heating: clean(input.heating, 1200),
    thermostat: clean(input.thermostat, 600),
    lighting: clean(input.lighting, 1200),
    humidity: clean(input.humidity, 600),
    temperature: clean(input.temperature, 600),
    ventilation: clean(input.ventilation, 1200),
    hidesAndEnrichment: clean(input.hidesAndEnrichment, 1600),
    plantsAndBioactive: clean(input.plantsAndBioactive, 1600),
    waterAndFeeding: clean(input.waterAndFeeding, 1200),
    publicConsent: input.publicConsent !== false,
    creditMode: input.creditMode,
    creditName: input.creditMode === "name" ? clean(input.creditName, 120) : null,
    creditSocial: input.creditMode === "social" ? clean(input.creditSocial, 240) : null,
    status: "Pending" as const,
    submittedAt: serverTimestamp(),
  };

  const submissionRef = await addDoc(collection(db, "vivariumShowcaseSubmissions"), payload);
  const uploaded: VivariumMedia[] = [];
  try {
    for (let index = 0; index < input.media.length; index += 1) uploaded.push(await uploadMedia(user.uid, submissionRef.id, input.media[index], index));
    await updateDoc(submissionRef, { media: uploaded });
    return { submissionId: submissionRef.id };
  } catch (error) {
    await Promise.all(uploaded.map((media) => deleteObject(ref(storage, media.path)).catch(() => undefined)));
    await updateDoc(submissionRef, { status: "Rejected", rejectionReason: "Upload failed during submission." }).catch(() => undefined);
    throw error instanceof Error ? error : new Error("Unable to upload the vivarium showcase.", { cause: error });
  }
}

function mapSubmission(id: string, data: Record<string, unknown>): VivariumShowcaseSubmission {
  return { id, ...(data as Omit<VivariumShowcaseSubmission, "id">) };
}

export async function getApprovedVivariumShowcases(): Promise<VivariumShowcaseSubmission[]> {
  const snapshot = await getDocs(query(collection(db, "vivariumShowcaseSubmissions"), where("status", "==", "Approved"), where("publicConsent", "==", true), limit(60)));
  return snapshot.docs.map((item) => mapSubmission(item.id, item.data() as Record<string, unknown>)).sort((a, b) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
}

export async function getCreatorVivariumShowcases(): Promise<VivariumShowcaseSubmission[]> {
  const snapshot = await getDocs(query(collection(db, "vivariumShowcaseSubmissions"), limit(250)));
  return snapshot.docs.map((item) => mapSubmission(item.id, item.data() as Record<string, unknown>)).sort((a, b) => String(b.submittedAt ?? "").localeCompare(String(a.submittedAt ?? "")));
}

export async function reviewVivariumShowcase(submissionId: string, status: "Approved" | "Rejected" | "NeedsInfo", reviewerUid: string, rejectionReason?: string) {
  await updateDoc(doc(db, "vivariumShowcaseSubmissions", submissionId), { status, reviewedAt: serverTimestamp(), reviewedBy: reviewerUid, rejectionReason: rejectionReason?.trim() || null });
}
