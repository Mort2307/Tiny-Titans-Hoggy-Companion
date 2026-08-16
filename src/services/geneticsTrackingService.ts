import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

export type GeneticsCalculationTrackingInput = {
  uid: string;
  femaleMorphIds: string[];
  femaleHetGenes: string[];
  maleMorphIds: string[];
  maleHetGenes: string[];
  outcomeCount: number;
  unresolved: boolean;
};

export async function recordGeneticsCalculation(input: GeneticsCalculationTrackingInput): Promise<string> {
  if (!input.uid) throw new Error("Cannot track a genetics calculation without a user ID.");

  const document = await addDoc(collection(db, "geneticsCalculations"), {
    uid: input.uid,
    source: "breeding-calculator",
    femaleMorphIds: [...input.femaleMorphIds].sort(),
    femaleHetGenes: [...input.femaleHetGenes].sort(),
    maleMorphIds: [...input.maleMorphIds].sort(),
    maleHetGenes: [...input.maleHetGenes].sort(),
    outcomeCount: Number.isFinite(input.outcomeCount) ? input.outcomeCount : 0,
    unresolved: Boolean(input.unresolved),
    createdAt: serverTimestamp(),
  });

  return document.id;
}
