import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase/config";

const functions = getFunctions(app, "europe-west2");

export type INaturalistObservation = {
  id: number;
  observedOn: string;
  placeGuess: string;
  qualityGrade: string;
  uri: string;
};

export type INaturalistEcologyContext = {
  scientificName: string;
  taxonId: number | null;
  matchedName: string;
  commonName: string;
  rank: string;
  iconicTaxon: string;
  totalResearchGradeObservations: number;
  recentObservations: INaturalistObservation[];
  sourceUrl: string;
  fetchedAtMs: number;
  stale: boolean;
  boundary: string;
};

const contextCall = httpsCallable<{ scientificName: string }, INaturalistEcologyContext>(functions, "getINaturalistEcologyContext");

export async function getINaturalistEcologyContext(scientificName: string): Promise<INaturalistEcologyContext> {
  return (await contextCall({ scientificName })).data;
}
