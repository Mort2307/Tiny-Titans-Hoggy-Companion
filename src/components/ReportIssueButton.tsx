import { useNavigate } from "react-router-dom";
import type { ReportIssueCategory, ReportIssuePriority, ReportIssueSource } from "../types/reportIssue";
import "./ReportIssueButton.css";

type ReportIssueButtonProps = {
  source?: ReportIssueSource;
  context?: string;
  defaultCategory?: ReportIssueCategory;
  defaultPriority?: ReportIssuePriority;
  metadata?: Record<string, unknown>;
  userId?: string;
  appVersion?: string;
};

/** Small global entry point into the full Feedback & Issue Report screen. */
export default function ReportIssueButton(_props: ReportIssueButtonProps) {
  const navigate = useNavigate();

  return (
    <button type="button" className="report-issue-button" onClick={() => navigate("/report-issue")} aria-label="Open feedback and issue report">
      <span aria-hidden="true">🐛</span>
      Feedback / Report Issue
    </button>
  );
}
