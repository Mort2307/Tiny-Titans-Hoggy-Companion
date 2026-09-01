import { collection, getDocs, query, where, type DocumentData } from "firebase/firestore";
import { db } from "../firebase/config";
import type { KeeperObservation } from "../types/keeperObservation";

const observations = collection(db, "keeperObservations");

function normalise(id: string, data: DocumentData): KeeperObservation {
  return {
    id,
    userId: typeof data.userId === "string" ? data.userId : undefined,
    title: typeof data.title === "string" ? data.title : undefined,
    behaviourName: typeof data.behaviourName === "string" ? data.behaviourName : undefined,
    observationTitle: typeof data.observationTitle === "string" ? data.observationTitle : undefined,
    primaryCategory: typeof data.primaryCategory === "string" ? data.primaryCategory : undefined,
    category: typeof data.category === "string" ? data.category : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    observation: typeof data.observation === "string" ? data.observation : undefined,
    notes: typeof data.notes === "string" ? data.notes : undefined,
    context: typeof data.context === "string" ? data.context : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    createdAt: data.createdAt,
    submittedAt: data.submittedAt,
    updatedAt: data.updatedAt,
    contributorCreditMethods: Array.isArray(data.contributorCreditMethods) ? data.contributorCreditMethods.filter((value: unknown): value is string => typeof value === "string") : undefined,
    contributorCreditMethod: typeof data.contributorCreditMethod === "string" ? data.contributorCreditMethod : undefined,
    contributorCreditProfileName: typeof data.contributorCreditProfileName === "string" ? data.contributorCreditProfileName : undefined,
    contributorCreditName: typeof data.contributorCreditName === "string" ? data.contributorCreditName : undefined,
    contributorCreditSocial: typeof data.contributorCreditSocial === "string" ? data.contributorCreditSocial : undefined,
  };
}

export async function getUserKeeperObservations(uid: string): Promise<KeeperObservation[]> {
  if (!uid) return [];
  const snapshot = await getDocs(query(observations, where("userId", "==", uid)));
  return snapshot.docs
    .map((item) => normalise(item.id, item.data()))
    .sort((a, b) => {
      const aTime = typeof (a.createdAt as { toMillis?: () => number })?.toMillis === "function" ? (a.createdAt as { toMillis: () => number }).toMillis() : Date.parse(String(a.createdAt ?? a.submittedAt ?? "")) || 0;
      const bTime = typeof (b.createdAt as { toMillis?: () => number })?.toMillis === "function" ? (b.createdAt as { toMillis: () => number }).toMillis() : Date.parse(String(b.createdAt ?? b.submittedAt ?? "")) || 0;
      return bTime - aTime;
    });
}
