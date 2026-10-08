import { useNavigate } from "react-router-dom";
import "./ReportIssueButton.css";
import TinyTitansIcon from "./TinyTitansIcon";

type ReportIssueButtonProps = { context?: string };

export default function ReportIssueButton(props: ReportIssueButtonProps) {
  const navigate = useNavigate();
  return <div className="report-issue-actions" data-context={props.context}>
    <button type="button" className="report-issue-button" onClick={() => navigate("/report-bug")} aria-label="Report a bug"><TinyTitansIcon name="testing" size={16} /> Report a Bug</button>
    <button type="button" className="report-issue-button" onClick={() => navigate("/feedback")} aria-label="Send feedback"><TinyTitansIcon name="info" size={16} /> Send Feedback</button>
  </div>;
}