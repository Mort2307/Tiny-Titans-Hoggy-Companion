export type TesterEvidenceStatus = "pass" | "fail" | "blocked" | "not-tested";

export type TesterEvidence = {
  id: string;
  suite: string;
  checkId: string;
  status: TesterEvidenceStatus;
  expected: string;
  actual: string;
  evidence?: string[];
  route?: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  timestamp: string;
};

export type TesterEvidenceSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  notTested: number;
  coveragePercent: number;
  effectivePassPercent: number;
};

export function summariseTesterEvidence(evidence: TesterEvidence[]): TesterEvidenceSummary {
  const total = evidence.length;
  const passed = evidence.filter((item) => item.status === "pass").length;
  const failed = evidence.filter((item) => item.status === "fail").length;
  const blocked = evidence.filter((item) => item.status === "blocked").length;
  const notTested = evidence.filter((item) => item.status === "not-tested").length;
  const tested = passed + failed;

  return {
    total,
    passed,
    failed,
    blocked,
    notTested,
    coveragePercent: total ? Math.round((tested / total) * 100) : 0,
    effectivePassPercent: tested ? Math.round((passed / tested) * 100) : 0,
  };
}

export function formatTesterEvidence(item: TesterEvidence): string {
  const lines = [
    `${item.status.toUpperCase()} — ${item.checkId}`,
    `Expected: ${item.expected}`,
    `Actual: ${item.actual}`,
  ];

  if (item.route) lines.push(`Route: ${item.route}`);
  if (item.evidence?.length) lines.push(`Evidence: ${item.evidence.join(" | ")}`);
  return lines.join("\n");
}
