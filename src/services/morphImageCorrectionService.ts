import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MorphImageSubmission } from "../types/morphSubmission";

export async function correctMorphImageSubmission(input: {
  submissionId: string;
  correctedMorphId: string;
  correctedMorphName: string;
  correctedByUid: string;
  currentMorphId?: string;
  currentMorphName?: string;
}): Promise<void> {
  const correctedMorphId = input.correctedMorphId.trim();
  const correctedMorphName = input.correctedMorphName.trim();
  if (!input.submissionId || !correctedMorphId || !correctedMorphName || !input.correctedByUid) {
    throw new Error("A submission, corrected Morph Library entry and reviewer are required.");
  }

  const correction = {
    correctedAt: serverTimestamp(),
    correctedByUid: input.correctedByUid,
    previousMorphId: input.currentMorphId?.trim() || null,
    previousMorphName: input.currentMorphName?.trim() || null,
  };

  await updateDoc(doc(db, "morphImageSubmissions", input.submissionId), {
    morphId: correctedMorphId,
    morphName: correctedMorphName,
    correction,
    updatedAt: serverTimestamp(),
  });

  const approved = await getDocs(query(
    collection(db, "approvedMorphImages"),
    where("sourceSubmissionId", "==", input.submissionId),
  ));

  await Promise.all(approved.docs.map((item) => updateDoc(item.ref, {
    morphId: correctedMorphId,
    morphName: correctedMorphName,
    correction,
  })));
}

export function getMorphSubmissionDisplayName(submission: MorphImageSubmission): string {
  return submission.morphName?.trim() || "Unassigned morph";
}
