import "../styles/tiny-titans-evidence.css";

export default function TinyTitansEvidenceNotice({ home = false }: { home?: boolean }) {
  return (
    <aside className={`tt-evidence-notice ${home ? "tt-evidence-notice--home" : ""}`} aria-label="Tiny Titans information notice">
      <div>
        <strong>📚 Tiny Titans information & safety notice</strong>
        <p>
          Tiny Titans presents species information using named references where available and clearly marks the confidence or evidence level. It is a keeper-support and record-keeping tool, <strong>not a veterinarian, clinician, diagnostician or substitute for professional advice</strong>.
        </p>
        <p>
          There is no single source that is infallible. Published guidance, veterinary references, taxonomic records and keeper evidence can conflict, become outdated or contain errors. Tiny Titans may therefore be wrong. Where an error is identified, the aim is to review the evidence, correct the record and make the correction visible rather than silently pretending certainty.
        </p>
        <p>
          Species selection matters. Do not apply one species' temperature, humidity, diet, enclosure, breeding, medication or handling guidance to another species. For illness, injury, suspected poisoning/envenomation, medication decisions or urgent welfare concerns, contact an appropriately qualified reptile/exotic veterinarian.
        </p>
      </div>
      <small>Sources are provided as supporting references, not guarantees of correctness. Local law, licensing and welfare requirements remain the keeper's responsibility.</small>
    </aside>
  );
}
