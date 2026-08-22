import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebase/config";

const MAX_MEDIA_BYTES = 20 * 1024 * 1024;

function extensionFor(file: File): string {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension) return extension;
  return file.type.startsWith("video/") ? "mp4" : "jpg";
}

export async function uploadCommunityMedia(uid: string, file: File): Promise<{ url: string; type: "image" | "video"; storagePath: string }> {
  if (!file) throw new Error("Choose an image or video first.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("That media file is too large. Maximum allowed is 20 MB.");
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) throw new Error("Only image and video files are supported.");

  const type = file.type.startsWith("video/") ? "video" : "image";
  const storagePath = `communityMedia/${uid}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file, {
    contentType: file.type,
    customMetadata: { uploadedBy: uid, source: "community-manager", mediaType: type },
  });

  return { url: await getDownloadURL(storageRef), type, storagePath };
}
