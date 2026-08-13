import { useState } from "react";

const geneticsAreas = ["Morph library", "Gene families", "Inheritance", "Validation", "Change history"] as const;
type GeneticsArea = (typeof geneticsAreas)[number];

export default function AdminGenetics() {
  const [area, setArea] = useState<GeneticsArea>("Morph library");

  return (
    <section className="creator-admin-genetics" aria-labelledby="admin-genetics-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-genetics-title">Genetics Control</h1>
        <p>Manage verified genetics data without allowing unverified mutations into the public calculator.</p>
      </header>
      <label>
        <span>Genetics area</span>
        <select value={area} onChange={(event) => setArea(event.target.value as GeneticsArea)}>
          {geneticsAreas.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="creator-admin-genetics__status" role="status">
        <strong>Verified genetics data layer ready for connection.</strong>
        <p>Selected area: {area}. Public genetics must only consume approved, versioned records.</p>
      </div>
    </section>
  );
}
