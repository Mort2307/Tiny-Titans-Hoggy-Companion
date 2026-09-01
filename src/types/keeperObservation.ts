export type KeeperObservationStatus = "pending" | "approved" | "rejected" | "needs-info" | "removed";

export type KeeperObservation = {
  id: string;
  userId?: string;
  title?: string;
  behaviourName?: string;
  observationTitle?: string;
  primaryCategory?: string;
  category?: string;
  description?: string;
  observation?: string;
  notes?: string;
  context?: string;
  status?: KeeperObservationStatus | string;
  createdAt?: unknown;
  submittedAt?: unknown;
  updatedAt?: unknown;
  contributorCreditMethods?: string[];
  contributorCreditMethod?: string;
  contributorCreditProfileName?: string;
  contributorCreditName?: string;
  contributorCreditSocial?: string;
};