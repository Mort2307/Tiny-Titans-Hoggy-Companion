import { useNavigate } from "react-router-dom";
import "./ReportIssueButton.css";

type ReportIssueButtonProps = { context?: string };

export default function ReportIssueButton(_props: ReportIssueButtonProps) {
  const navigate = useNavigate();
  return <div className="report-issue-actions">
    <button type="button" className="report-issue-button" onClick={() => navigate("/report-bug")} aria-label="Report a bug"><span aria-hidden="true">🐛</span> Report a Bug</button>
    <button type="button" className="report-issue-button" onClick={() => navigate("/feedback")} aria-label="Send feedback"><span aria-hidden="true">💡</span> Send Feedback</button>
  </div>;
}