import { useState } from "react";

const actions = ["All actions", "Login", "User change", "Genetics change", "Content change", "Security"] as const;
type Action = (typeof actions)[number];

export default function AdminAuditLog() {
  const [action, setAction] = useState<Action>("All actions");

  return (
    <section className="creator-admin-audit" aria-labelledby="admin-audit-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-audit-title">Audit Log</h1>
        <p>Immutable records of privileged changes, with actor, timestamp and action metadata.</p>
      </header>
      <label>
        <span>Action</span>
        <select value={action} onChange={(event) => setAction(event.target.value as Action)}>
          {actions.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="creator-admin-audit__status" role="status">
        <strong>Audit stream is not connected yet.</strong>
        <p>Selected filter: {action}. Privileged changes must be written server-side before appearing here.</p>
      </div>
    </section>
  );
}
