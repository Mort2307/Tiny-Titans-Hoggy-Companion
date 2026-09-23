import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { db, storage } from "../firebase/config";
import {
  deleteApprovedMorphImage,
  getApprovedMorphImages,
} from "./creatorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import type { EditorImage, MorphImageEditVersion } from "../types/creatorMorphLibraryEditor";

export async function loadCreatorMorphEditorImages(): Promise<EditorImage[]> {
  const results = (await getApprovedMorphImages()) as ApprovedMorphImage[];

  return Promise.all(
    results.map(async (item) => ({
      ...item,
      imageUrl:
        item.imageUrl ||
        (await getDownloadURL(ref(storage, item.storagePath))),
    })),
  ) as Promise<EditorImage[]>;
}

export async function saveCroppedMorphImage(
  userId: string,
  image: EditorImage,
  blob: Blob,
): Promise<EditorImage> {
  const newPath = `morphLibrary/${image.morphId}/community/${image.id}-edited-${Date.now()}.jpg`;
  const newRef = ref(storage, newPath);
  const previousVersion: MorphImageEditVersion = {
    storagePath: image.storagePath,
    imageUrl: image.imageUrl,
    editAction: "before-crop",
  };
  const nextHistory = [...(image.editHistory ?? []), previousVersion];

  try {
    await uploadBytes(newRef, blob, { contentType: "image/jpeg" });
    const newUrl = await getDownloadURL(newRef);

    await updateDoc(doc(db, "approvedMorphImages", image.id), {
      storagePath: newPath,
      imageUrl: newUrl,
      editedAt: serverTimestamp(),
      editedBy: userId,
      editAction: "crop",
      editHistory: nextHistory,
    });

    return {
      ...image,
      storagePath: newPath,
      imageUrl: newUrl,
      editHistory: nextHistory,
    };
  } catch (error) {
    await deleteObject(newRef).catch(() => undefined);
    throw error;
  }
}

export async function undoCreatorMorphImageEdit(
  userId: string,
  image: EditorImage,
): Promise<EditorImage> {
  if (!image.editHistory?.length) return image;

  const previous = image.editHistory[image.editHistory.length - 1];
  const nextHistory = image.editHistory.slice(0, -1);
  const currentPath = image.storagePath;

  await updateDoc(doc(db, "approvedMorphImages", image.id), {
    storagePath: previous.storagePath,
    imageUrl: previous.imageUrl,
    editedAt: serverTimestamp(),
    editedBy: userId,
    editAction: "undo",
    editHistory: nextHistory,
  });

  await deleteObject(ref(storage, currentPath)).catch(() => undefined);

  return {
    ...image,
    storagePath: previous.storagePath,
    imageUrl: previous.imageUrl,
    editHistory: nextHistory,
  };
}

export async function swapCreatorMorphImages(
  userId: string,
  image: EditorImage,
  replacement: EditorImage,
): Promise<{ image: EditorImage; replacement: EditorImage }> {
  const oldMorph = { morphId: image.morphId, morphName: image.morphName };
  const newMorph = {
    morphId: replacement.morphId,
    morphName: replacement.morphName,
  };

  await updateDoc(doc(db, "approvedMorphImages", image.id), {
    ...newMorph,
    swappedAt: serverTimestamp(),
    swappedBy: userId,
    swappedWithImageId: replacement.id,
  });

  await updateDoc(doc(db, "approvedMorphImages", replacement.id), {
    ...oldMorph,
    swappedAt: serverTimestamp(),
    swappedBy: userId,
    swappedWithImageId: image.id,
  });

  return {
    image: { ...image, ...newMorph },
    replacement: { ...replacement, ...oldMorph },
  };
}

export async function moveCreatorMorphImage(
  userId: string,
  image: EditorImage,
  target: { geneId: string; name: string },
): Promise<EditorImage> {
  const nextMorph = {
    morphId: target.geneId,
    morphName: target.name,
  };

  await updateDoc(doc(db, "approvedMorphImages", image.id), {
    ...nextMorph,
    movedAt: serverTimestamp(),
    movedBy: userId,
  });

  return { ...image, ...nextMorph };
}

export async function saveCreatorMorphImageCredit(
  userId: string,
  image: EditorImage,
  creditType: ApprovedMorphImage["creditType"],
  name: string,
  social: string,
): Promise<EditorImage> {
  const next = {
    ...image,
    creditType,
    creditName: creditType === "name" ? name.trim() : undefined,
    creditSocial: creditType === "social" ? social.trim() : undefined,
  };

  await updateDoc(doc(db, "approvedMorphImages", image.id), {
    creditType,
    creditName: creditType === "name" ? name.trim() : null,
    creditSocial: creditType === "social" ? social.trim() : null,
    creditEditedAt: serverTimestamp(),
    creditEditedBy: userId,
  });

  return next;
}

export async function removeCreatorMorphImage(
  image: EditorImage,
): Promise<void> {
  await deleteApprovedMorphImage(
    image.id,
    "Creator removed the approved Morph Library image from the editor.",
  );
}
