import { useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import { masterMorphs, type MasterMorphDefinition } from "../data/masterMorphDatabase";
import {
  loadCreatorMorphEditorImages,
  moveCreatorMorphImage,
  removeCreatorMorphImage,
  saveCreatorMorphImageCredit,
  saveCroppedMorphImage,
  swapCreatorMorphImages,
  undoCreatorMorphImageEdit,
} from "../services/creatorMorphLibraryEditorService";
import type { ApprovedMorphImage } from "../types/morphSubmission";
import type { EditorImage } from "../types/creatorMorphLibraryEditor";
import { normaliseMorphSearch, searchableMorphText } from "../lib/creatorMorphLibraryEditor";

export function useCreatorMorphLibraryEditor() {
  const { user, profile } = useAuth();
  const [queryText, setQueryText] = useState("");
  const [selectedMorphId, setSelectedMorphId] = useState("");
  const [images, setImages] = useState<EditorImage[]>([]);
  const [allImages, setAllImages] = useState<EditorImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [cropImage, setCropImage] = useState<EditorImage | null>(null);
  const [swapImage, setSwapImage] = useState<EditorImage | null>(null);
  const [moveImage, setMoveImage] = useState<EditorImage | null>(null);
  const [creditImage, setCreditImage] = useState<EditorImage | null>(null);

  const morphOptions = useMemo(() => {
    const needle = normaliseMorphSearch(queryText);
    return masterMorphs
      .filter(
        (entry) =>
          !needle ||
          [entry.geneId, entry.name, ...(entry.aliases ?? [])]
            .map(searchableMorphText)
            .some((value) => value.includes(needle)),
      )
      .slice(0, 60);
  }, [queryText]);

  const selectedMorph =
    masterMorphs.find((entry) => entry.geneId === selectedMorphId) ?? null;

  function updateImageCollections(updater: (image: EditorImage) => EditorImage) {
    setAllImages((current) => current.map(updater));
    setImages((current) => current.map(updater));
  }

  async function loadMorph(morphId: string) {
    setSelectedMorphId(morphId);
    setNotice("");
    setError("");
    setLoading(true);

    try {
      const hydrated = await loadCreatorMorphEditorImages();
      setAllImages(hydrated);
      setImages(hydrated.filter((item) => item.morphId === morphId));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load approved morph imagery.",
      );
      setAllImages([]);
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function replaceImage(blob: Blob, image: EditorImage) {
    if (!user) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const next = await saveCroppedMorphImage(user.uid, image, blob);
      updateImageCollections((item) => (item.id === image.id ? next : item));
      setCropImage(null);
      setNotice(
        `Cropped image saved for ${image.morphName}. The previous version is available via Undo.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to save the cropped image.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function undoImageEdit(image: EditorImage) {
    if (!user || !image.editHistory?.length) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const next = await undoCreatorMorphImageEdit(user.uid, image);
      updateImageCollections((item) => (item.id === image.id ? next : item));
      setNotice(
        `Undo complete for ${image.morphName}. Restored the previous image version.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to undo the image edit.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function swapImages(replacement: EditorImage) {
    if (!swapImage || !user) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const result = await swapCreatorMorphImages(
        user.uid,
        swapImage,
        replacement,
      );
      updateImageCollections((item) => {
        if (item.id === result.image.id) return result.image;
        if (item.id === result.replacement.id) return result.replacement;
        return item;
      });
      setSwapImage(null);
      setNotice(
        `${swapImage.morphName} and ${replacement.morphName} image assignments swapped successfully.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to swap the image assignments.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function moveImageTo(target: MasterMorphDefinition) {
    if (!moveImage || !user) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const oldMorphName = moveImage.morphName;
      const next = await moveCreatorMorphImage(user.uid, moveImage, target);
      setAllImages((current) =>
        current.map((item) => (item.id === moveImage.id ? next : item)),
      );
      setImages((current) =>
        current.filter((item) => item.id !== moveImage.id),
      );
      setMoveImage(null);
      setNotice(`${oldMorphName} image moved to ${target.name}.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to move the image.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function saveCredit(
    type: ApprovedMorphImage["creditType"],
    name: string,
    social: string,
  ) {
    if (!creditImage || !user) return;
    setWorking(true);
    setError("");
    setNotice("");

    try {
      const next = await saveCreatorMorphImageCredit(
        user.uid,
        creditImage,
        type,
        name,
        social,
      );
      updateImageCollections((item) =>
        item.id === creditImage.id ? next : item,
      );
      setCreditImage(null);
      setNotice(`Credit updated for ${creditImage.morphName}.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to update the credit.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function removeImage(image: EditorImage) {
    if (!user) return;

    const confirmed = window.confirm(
      `Remove the approved ${image.morphName} image from the public Morph Library? This cannot be undone from the editor.`,
    );
    if (!confirmed) return;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await removeCreatorMorphImage(image);
      setImages((current) =>
        current.filter((item) => item.id !== image.id),
      );
      setAllImages((current) =>
        current.filter((item) => item.id !== image.id),
      );
      setNotice(`Removed the approved ${image.morphName} image.`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove the approved image.",
      );
    } finally {
      setWorking(false);
    }
  }

  return {
    user,
    profile,
    queryText,
    setQueryText,
    selectedMorphId,
    morphOptions,
    selectedMorph,
    images,
    allImages,
    loading,
    working,
    notice,
    error,
    cropImage,
    setCropImage,
    swapImage,
    setSwapImage,
    moveImage,
    setMoveImage,
    creditImage,
    setCreditImage,
    loadMorph,
    replaceImage,
    undoImageEdit,
    swapImages,
    moveImageTo,
    saveCredit,
    removeImage,
  };
}
