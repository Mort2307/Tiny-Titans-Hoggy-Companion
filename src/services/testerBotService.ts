import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase/config";
import { hasCreatorTesterClaim } from "./creatorTesterAuthService";
import { createPaidTierRegressionChecks } from "./paidTierRegressionSuites";

export type TesterStatus = "pass" | "fail" | "blocked" | "not-tested";
export type TesterSeverity = "info" | "low" | "medium" | "high" | "critical";
export type TesterCategory =
  | "auth" | "account" | "firebase" | "snakes" | "weights" | "feeding" | "sheds"
  | "genetics" | "morphs" | "community" | "mobile" | "creator" | "feedback"
  | "notifications" | "application" | "learning" | "trackers" | "breeding"
  | "permissions" | "visual" | "paid-tiers" | "stripe";

export type TesterCheck = {
  checkId: string;
  name: string;
  category: TesterCategory;
  severity: TesterSeverity;
  run: () => Promise<{ status: TesterStatus; message: string }>;
};

export type TesterResult = {
  checkId: string;
  name: string;
  suite: string;
  category: TesterCategory;
  status: TesterStatus;
  severity: TesterSeverity;
  message: string;
  durationMs: number;
  timestamp: string;
};

export type TesterRun = {
  id: string;
  ownerUid: string;
  suite: string;
  status: "passed" | "failed" | "blocked" | "incomplete";
  startedAt: string;
  completedAt: string;
  durationMs: number;
  results: TesterResult[];
};

function makeRunId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getResultStatus(results: TesterResult[]): TesterRun["status"] {
  if (results.some((result) => result.status === "fail")) return "failed";
  if (results.some((result) => result.status === "blocked" || result.status === "not-tested")) return "incomplete";
  return "passed";
}
