import { useState } from "react";

const contentAreas = ["Knowledge Base", "Care guides", "Genetics notes", "Announcements", "Drafts"] as const;
type ContentArea = (typeof contentAreas)[number];

export default function AdminContent() {
  const [area, setArea] = useState<ContentArea>("Knowledge Base");

  return (
    <section className="creator-admin-content" aria-labelledby="admin-content-title">
      <header>
        <p className="creator-dashboard__eyebrow">Creator Centre</p>
        <h1 id="admin-content-title">Content Management</h1>
        <p>Prepare creator-managed educational content for review and publication.</p>
      </header>
      <label>
        <span>Content area</span>
        <select value={area} onChange={(event) => setArea(event.target.value as ContentArea)}>
          {contentAreas.map((item) => <option key={item}>{item}</option>)}
        </select>
      </label>
      <div className="creator-admin-content__status" role="status">
        <strong>Content repository is ready for connection.</strong>
        <p>Selected area: {area}. Publication should remain versioned and auditable.</p>
      </div>
    </section>
  );
}
