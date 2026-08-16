import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getGenes, morphs } from "../data/morphs";
import type { TesterCheck } from "./testerBotService";

const VALID_VERIFICATION = new Set(["Confirmed", "Recognised", "Unverified", "Disputed"]);

export function createMorphLibraryChecks(): TesterCheck[] {
  return [
    {
      checkId: "morph-library-ids-unique",
      name: "Morph database uses unique stable gene IDs",
      category: "morphs",
      severity: "critical",
      run: async () => {
        const seen = new Set<string>();
        const duplicates: string[] = [];
        for (const morph of morphs) {
          if (!morph.geneId || !morph.name) duplicates.push("missing-id-or-name");
          else if (seen.has(morph.geneId)) duplicates.push(morph.geneId);
          seen.add(morph.geneId);
        }
        return duplicates.length === 0
          ? { status: "pass", message: `Validated ${morphs.length} morph definitions with unique stable IDs.` }
          : { status: "fail", message: `Found ${duplicates.length} duplicate or incomplete morph definition(s): ${duplicates.slice(0, 8).join(", ")}` };
      },
    },
    {
      checkId: "morph-gene-classification",
      name: "Morph database gene classifications are internally consistent",
      category: "morphs",
      severity: "high",
      run: async () => {
        const invalid = morphs.filter((morph) => morph.isGene !== (morph.kind === "Gene"));
        return invalid.length === 0
          ? { status: "pass", message: `Validated ${getGenes().length} selectable gene definition(s) against their kind classification.` }
          : { status: "fail", message: `${invalid.length} morph definitions have an inconsistent isGene/kind classification.` };
      },
    },
    {
      checkId: "morph-verification-values",
      name: "Morph verification states are explicit",
      category: "genetics",
      severity: "critical",
      run: async () => {
        const invalid = morphs.filter((morph) => !VALID_VERIFICATION.has(morph.verification));
        return invalid.length === 0
          ? { status: "pass", message: "Every morph definition has an explicit recognised verification state." }
          : { status: "fail", message: `${invalid.length} morph definition(s) have an invalid or missing verification state.` };
      },
    },
  ];
}

export async function createGeneticsJourneyChecks(uid: string): Promise<TesterCheck[]> {
  if (!uid) throw new Error("Genetics suite requires an authenticated UID.");

  return [
    ...createMorphLibraryChecks(),
    {
      checkId: "genetics-events-readable",
      name: "Persisted genetics calculation events are structurally valid",
      category: "genetics",
      severity: "high",
      run: async () => {
        const snapshot = await getDocs(collection(db, "geneticsCalculations"));
        const invalid: string[] = [];
        for (const calculation of snapshot.docs) {
          const data = calculation.data() as Record<string, unknown>;
          if (typeof data.uid !== "string" || !Array.isArray(data.femaleMorphIds) || !Array.isArray(data.femaleHetGenes) || !Array.isArray(data.maleMorphIds) || !Array.isArray(data.maleHetGenes) || typeof data.outcomeCount !== "number") invalid.push(calculation.id);
        }
        return invalid.length === 0
          ? { status: snapshot.size === 0 ? "blocked" : "pass", message: snapshot.size === 0 ? "No genetics calculation events exist yet; use the calculator once to seed the QA data source." : `Validated ${snapshot.size} persisted genetics calculation event(s).` }
          : { status: "fail", message: `${invalid.length} genetics calculation event(s) have an invalid structure.` };
      },
    },
    {
      checkId: "genetics-owner-identity",
      name: "Persisted genetics events have valid owner identities",
      category: "genetics",
      severity: "high",
      run: async () => {
        const snapshot = await getDocs(collection(db, "geneticsCalculations"));
        const invalid = snapshot.docs.filter((item) => typeof item.data().uid !== "string" || !String(item.data().uid).trim());
        const currentUserEvents = snapshot.docs.filter((item) => item.data().uid === uid).length;
        return invalid.length === 0
          ? { status: "pass", message: `All ${snapshot.size} persisted genetics events have explicit owners; current user has ${currentUserEvents}.` }
          : { status: "fail", message: `${invalid.length} genetics event(s) have a missing or invalid owner UID.` };
      },
    },
  ];
}
