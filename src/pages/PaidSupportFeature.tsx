import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import { createPrioritySupportTicket, getPrioritySupportTickets } from "../services/paidSupportService";
import "../styles/PaidFeatureWorkspace.css";

type Ticket = Record<string, unknown> & { id: string };

export default function PaidSupportFeature() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  async function refresh() {
    try { const result = await getPrioritySupportTickets(); setTickets(result.tickets as Ticket[]); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to load priority tickets."); }
  }
  useEffect(() => { void refresh(); }, []);
  async function submit() {
    setStatus("");
    try { await createPrioritySupportTicket(subject, message); setSubject(""); setMessage(""); setStatus("Priority support ticket created."); await refresh(); } catch (error) { setStatus(error instanceof Error ? error.message : "Unable to create support ticket."); }
  }

  return <PaidTierGate entitlement="priority_support"><section className="paid-workspace-page"><header className="paid-feature-header"><div className="paid-feature-heading"><span className="paid-feature-icon-large" aria-hidden="true">🎧</span><div><span className="paid-workspace-kicker">Business Plus · Advanced</span><h1>Priority Support</h1><p>Create a business-priority support ticket directly inside Tiny Titans. Your ordinary bug reports, feedback and existing conversations remain available separately.</p></div></div><Link className="paid-back-link" to="/paid">← Paid Feature Centre</Link></header><div className="paid-feature-content"><div className="paid-form-grid"><label><span>Subject</span><input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?"/></label><label><span>Message</span><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Give the Tiny Titans team the details they need."/></label></div><button className="paid-primary-action" type="button" disabled={!subject || !message} onClick={() => void submit()}>Create Priority Ticket</button><p className="paid-status-text" aria-live="polite">{status}</p><div className="paid-list" style={{ marginTop: 16 }}>{tickets.length === 0 ? <div className="paid-info-panel"><h2>No priority tickets</h2><p>When you need business-level support, create the ticket above and it will appear here.</p></div> : tickets.map((ticket) => <div key={ticket.id}><span><strong>{String(ticket.subject)}</strong><small>{String(ticket.status)} · {String(ticket.priority)}</small></span></div>)}</div></div></section></PaidTierGate>;
}
