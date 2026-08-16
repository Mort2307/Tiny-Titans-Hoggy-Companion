import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import { getGenes, morphs } from "../data/morphs";
import type { TesterCheck } from "./testerBotService";

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
        const invalid = morphs.filter((morph) => morph.isGene && morph.kind !== "Gene");
        return invalid.length === 0
          ? { status: "pass", message: `All ${getGenes().length} selectable gene definitions have a valid Gene classification.` }
          : { status: "fail", message: `${invalid.length} morph definitions are marked as genes but are not classified as kind=Gene.` };
      },
    },
    {
      checkId: "morph-verification-guard",
      name: "Unverified/disputed morphs are not silently treated as confirmed",
      category: "genetics",
      severity: "critical",
      run: async () => {
        const invalid = morphs.filter((morph) => (morph.verification === "Unverified" || morph.verification === "Disputed") && morph.isGene);
        return invalid.length === 0
          ? { status: "pass", message: "No unverified/disputed gene definition is incorrectly presented as a confirmed gene by the database contract." }
          : { status: "fail", message: `${invalid.length} unverified/disputed gene definitions require review before calculator use.` };
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
          if (typeof data.uid !== "string" || !Array.isArray(data.femaleMorphIds) || !Array.isArray(data.maleMorphIds) || typeof data.outcomeCount !== "number") invalid.push(calculation.id);
        }
        return invalid.length === 0
          ? { status: snapshot.size === 0 ? "blocked" : "pass", message: snapshot.size === 0 ? "No genetics calculation events exist yet; use the calculator once to seed the QA data source." : `Validated ${snapshot.size} persisted genetics calculation event(s).` }
          : { status: "fail", message: `${invalid.length} genetics calculation event(s) have an invalid structure.` };
      },
    },
    {
      checkId: "genetics-current-user-events",
      name: "Current user's genetics events retain owner identity",
      category: "genetics",
      severity: "high",
      run: async () => {
        const snapshot = await getDocs(collection(db, "geneticsCalculations"));
        const currentUserEvents = snapshot.docs.filter((item) => item.data().uid === uid);
        const foreign = currentUserEvents.filter((item) => item.data().uid !== uid);
        return foreign.length === 0
          ? { status: "pass", message: `Current user has ${currentUserEvents.length} tracked genetics event(s); ownership field is explicit.` }
          : { status: "fail", message: "A genetics event was found with an inconsistent ownership field." };
      },
    },
  ];
}
