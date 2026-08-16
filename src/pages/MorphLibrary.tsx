import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import BackHomeButton from "../components/BackHomeButton";
import {
  masterMorphs,
  type MasterMorphDefinition,
} from "../data/masterMorphDatabase";
import { reptifitMorphCatalog } from "../data/reptifitMorphCatalog";
import type { MorphReferenceEntry } from "../data/hognoseMorphCatalog";
import {
  submitMorphImage,
  type MorphCreditMode,
} from "../services/morphSubmissionService";
import "../styles/morphLibrary.css";

function MorphDetail({
  morph,
  onClose,
}: {
  morph: MorphReferenceEntry;
  onClose: () => void;
}) {
  const contains =
    morph.contains ??
    morph.components?.map((component) => component.morphId) ??
    [];

  return (
    <div
      className="morph-detail-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <article
        className="morph-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="morph-detail-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="morph-detail__close"
          type="button"
          onClick={onClose}
          aria-label="Close morph details"
        >
          ×
        </button>

        <div className="morph-detail__eyebrow">
          TINY TITANS · MORPH DATABASE
        </div>

        <h2 id="morph-detail-title">{morph.name}</h2>

        <div className="morph-detail__badges">
          <span>{morph.kind}</span>
          <span>{morph.inheritance}</span>
          <span>{morph.verification}</span>
        </div>

        <p className="morph-detail__description">
          {morph.description ?? "No description has been added yet."}
        </p>

        {contains.length > 0 && (
          <section className="morph-detail__section">
            <h3>Contains</h3>

            <div className="morph-detail__contains">
              {contains.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </section>
        )}

        {morph.components && morph.components.length > 0 && (
          <section className="morph-detail__section">
            <h3>Genetic components</h3>

            <ul>
              {morph.components.map((component) => (
                <li
                  key={`${component.morphId}-${component.copies ?? 1}`}
                >
                  <strong>{component.morphId}</strong>
                  {component.copies
                    ? ` ×${component.copies}`
                    : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="morph-detail__section">
          <h3>Genetics notes</h3>

          <p>
            {morph.educationalNotes ??
              "No additional genetics notes have been published for this entry yet."}
          </p>
        </section>

        <section className="morph-detail__section morph-detail__source">
          <strong>Reference</strong>

          <span>
            {morph.sourceLabel ?? "Tiny Titans"}
          </span>

          <a
            href={
              morph.sourceUrl ??
              "https://hognose-morphs.com/"
            }
            target="_blank"
            rel="noreferrer"
          >
            Open source reference ↗
          </a>
        </section>
      </article>
    </div>
  );
}

const normalise = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

function asReferenceEntry(
  entry: MasterMorphDefinition
): MorphReferenceEntry {
  return entry as MorphReferenceEntry;
}

type SubmissionStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "finalising";

function MorphSubmissionDialog({
  onClose,
}: {
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [morphName, setMorphName] = useState("");
  const [description, setDescription] = useState("");
  const [observedTraits, setObservedTraits] =
    useState("");
  const [proofDetails, setProofDetails] =
    useState("");
  const [proofReference, setProofReference] =
    useState("");

  const [photoRequirementsConfirmed, setPhotoRequirementsConfirmed] =
    useState(false);

  const [factualAccuracyConfirmed, setFactualAccuracyConfirmed] =
    useState(false);

  const [creditMode, setCreditMode] =
    useState<MorphCreditMode>("anonymous");

  const [creditName, setCreditName] = useState("");
  const [creditSocial, setCreditSocial] = useState("");

  const [image, setImage] = useState<File | null>(null);

  const [stage, setStage] =
    useState<SubmissionStage>("idle");

  const [error, setError] = useState("");
  const [submissionId, setSubmissionId] =
    useState<string | null>(null);

  const busy = stage !== "idle";
  const sent = Boolean(submissionId);

  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const selectedFile =
      event.target.files?.[0] ?? null;

    if (!selectedFile) {
      setImage(null);
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setImage(null);

      if (fileRef.current) {
        fileRef.current.value = "";
      }

      setError(
        "Please choose a valid image file."
      );

      return;
    }

    setImage(selectedFile);
  }

  function resetForm() {
    setMorphName("");
    setDescription("");
    setObservedTraits("");
    setProofDetails("");
    setProofReference("");

    setPhotoRequirementsConfirmed(false);
    setFactualAccuracyConfirmed(false);

    setCreditMode("anonymous");
    setCreditName("");
    setCreditSocial("");

    setImage(null);
    setError("");
    setSubmissionId(null);
    setStage("idle");

    if (fileRef.current) {
      fileRef.current.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    /*
     * Hard guard against duplicate submissions.
     *
     * Even if React fires another submit event while the first
     * request is still running, nothing else is allowed through.
     */
    if (busy || sent) {
      return;
    }

    setError("");

    const trimmedMorphName =
      morphName.trim();

    const trimmedDescription =
      description.trim();

    const trimmedProofDetails =
      proofDetails.trim();

    if (!trimmedMorphName) {
      setError("Please enter the morph name.");
      return;
    }

    if (!trimmedDescription) {
      setError(
        "Please describe the animal and why you believe it matches this morph."
      );
      return;
    }

    if (!image) {
      setError(
        "Please add the required primary photograph."
      );
      return;
    }

    if (!photoRequirementsConfirmed) {
      setError(
        "Please confirm that your photo meets all Morph Library requirements."
      );
      return;
    }

    if (!trimmedProofDetails) {
      setError(
        "Please provide the evidence supporting the confirmed morph identification."
      );
      return;
    }

    if (!factualAccuracyConfirmed) {
      setError(
        "Please confirm that you have provided proof supporting the confirmed morph identification."
      );
      return;
    }

    if (
      creditMode === "name" &&
      !creditName.trim()
    ) {
      setError(
        "Please enter the name you want displayed."
      );
      return;
    }

    if (
      creditMode === "social" &&
      !creditSocial.trim()
    ) {
      setError(
        "Please enter the social handle or link you want displayed."
      );
      return;
    }

    try {
      /*
       * The service performs image preparation internally.
       * We expose the stages here so the user doesn't see a
       * frozen "Submitting..." screen during a large mobile photo.
       */
      setStage("preparing");

      /*
       * Small yield allows React to render the preparing state
       * before expensive image processing begins.
       */
      await new Promise<void>((resolve) =>
        window.setTimeout(resolve, 0)
      );

      setStage("uploading");

      const result =
        await submitMorphImage({
          morphName: trimmedMorphName,
          description: trimmedDescription,
          observedTraits:
            observedTraits.trim(),
          proofDetails: trimmedProofDetails,
          proofReference:
            proofReference.trim(),
          photoRequirementsConfirmed: true,
          factualAccuracyConfirmed: true,
          creditMode,
          creditName:
            creditName.trim(),
          creditSocial:
            creditSocial.trim(),
          image,
        });

      setStage("finalising");

      /*
       * The service only returns after the Firestore record has
       * successfully been marked as submitted.
       */
      setSubmissionId(result.submissionId);
      setStage("idle");
    } catch (submitError) {
      setStage("idle");

      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't submit the morph image. Please try again."
      );
    }
  }

  function handleClose() {
    /*
     * Never allow an in-flight submission to be interrupted.
     */
    if (busy) {
      return;
    }

    onClose();
  }

  function getProgressMessage() {
    switch (stage) {
      case "preparing":
        return "Preparing your photograph…";

      case "uploading":
        return "Uploading your photograph…";

      case "finalising":
        return "Finalising your submission…";

      default:
        return "Submitting for review…";
    }
  }

  return (
    <div
      className="morph-detail-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <article
        className="morph-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="morph-submit-title"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <button
          className="morph-detail__close"
          type="button"
          onClick={handleClose}
          disabled={busy}
          aria-label="Close morph submission"
        >
          ×
        </button>

        {sent ? (
          <>
            <div className="morph-detail__eyebrow">
              🐍 TINY TITANS · SUBMISSION RECEIVED
            </div>

            <h2>
              Thanks — it is in review.
            </h2>

            <p className="morph-detail__description">
              Your photograph and morph evidence
              have been successfully submitted for
              Creator review.
            </p>

            <section className="morph-detail__section">
              <h3>Submission received</h3>

              <p>
                Nothing is added to the confirmed
                Morph Library automatically. Every
                submission is reviewed before it can
                become a published reference.
              </p>

              <p>
                <strong>
                  Submission ID:
                </strong>{" "}
                <code>{submissionId}</code>
              </p>
            </section>

            <button
              type="button"
              onClick={handleClose}
            >
              Done
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="morph-detail__eyebrow">
              🐍 TINY TITANS · MORPH SUBMISSION
            </div>

            <h2 id="morph-submit-title">
              Submit a morph image
            </h2>

            <p className="morph-detail__description">
              We need reference-quality
              photographs and factual evidence.
              This protects the accuracy of the
              Tiny Titans Morph Library.
            </p>

            <section className="morph-detail__section">
              <h3>
                📸 Primary photo requirements —
                please read
              </h3>

              <p>
                The primary photograph must show
                the <strong>full snake body</strong>,
                be <strong>properly in focus</strong>,
                clearly lit and large enough to
                assess the phenotype.
              </p>

              <p>
                Use a{" "}
                <strong>
                  neutral white, grey or black
                  background
                </strong>
                .
              </p>

              <p>
                Please use a clean,
                staged/reference-style photograph
                rather than a snake hanging out of a
                bush, hidden in a vivarium or
                surrounded by distracting decor.
              </p>

              <p>
                Do not use heavy filters, colour
                grading or edits that could alter the
                snake's true appearance.
              </p>

              <label className="morph-submit-check">
                <input
                  type="checkbox"
                  checked={
                    photoRequirementsConfirmed
                  }
                  disabled={busy}
                  onChange={(event) =>
                    setPhotoRequirementsConfirmed(
                      event.target.checked
                    )
                  }
                />

                <span>
                  I confirm my primary photo meets{" "}
                  <strong>
                    all of these requirements.
                  </strong>
                </span>
              </label>
            </section>

            <label>
              Morph name

              <input
                value={morphName}
                disabled={busy}
                onChange={(event) =>
                  setMorphName(
                    event.target.value
                  )
                }
                placeholder="e.g. Lavender, Super Arctic, combination…"
                autoComplete="off"
                required
              />
            </label>

            <label>
              What are we looking at?

              <textarea
                value={description}
                disabled={busy}
                onChange={(event) =>
                  setDescription(
                    event.target.value
                  )
                }
                placeholder="Describe the animal, visual traits and why you believe this is the morph."
                rows={4}
                required
              />
            </label>

            <label>
              Known genetic information{" "}
              <span>(optional)</span>

              <textarea
                value={observedTraits}
                disabled={busy}
                onChange={(event) =>
                  setObservedTraits(
                    event.target.value
                  )
                }
                placeholder="Parent genetics, hets, pairing, breeder information, etc."
                rows={3}
              />
            </label>

            <section className="morph-detail__section">
              <h3>
                🧬 Confirmed morph proof —
                required
              </h3>

              <p>
                <strong>
                  A visual guess is not sufficient.
                </strong>{" "}
                For factual accuracy, provide
                evidence supporting the stated morph.
              </p>

              <p>
                Examples include breeder
                documentation, original
                breeder/seller records, parent
                genetics/provenance, verified
                breeding records or other credible
                evidence.
              </p>

              <label>
                What proof are you providing?

                <textarea
                  value={proofDetails}
                  disabled={busy}
                  onChange={(event) =>
                    setProofDetails(
                      event.target.value
                    )
                  }
                  placeholder="Explain the evidence: breeder record, parent pairing, original listing, documentation, etc."
                  rows={4}
                  required
                />
              </label>

              <label>
                Proof reference{" "}
                <span>(optional)</span>

                <input
                  value={proofReference}
                  disabled={busy}
                  onChange={(event) =>
                    setProofReference(
                      event.target.value
                    )
                  }
                  placeholder="Source link, breeder name, document reference, etc."
                />
              </label>

              <label className="morph-submit-check">
                <input
                  type="checkbox"
                  checked={
                    factualAccuracyConfirmed
                  }
                  disabled={busy}
                  onChange={(event) =>
                    setFactualAccuracyConfirmed(
                      event.target.checked
                    )
                  }
                />

                <span>
                  I confirm that the morph
                  identification is supported by the
                  evidence provided and that I am
                  submitting it for factual review.
                </span>
              </label>
            </section>

            <section className="morph-detail__section">
              <h3>
                📷 Primary photograph
              </h3>

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture={false}
                disabled={busy}
                onChange={handleImageChange}
                required
              />

              {image && (
                <small>
                  Selected:{" "}
                  <strong>
                    {image.name}
                  </strong>
                  {" · "}
                  {Math.max(
                    1,
                    Math.round(
                      image.size / 1024
                    )
                  )}
                  KB
                </small>
              )}

              <p>
                Your image is resized and
                compressed before upload. The
                original photograph is not published
                automatically.
              </p>
            </section>

            <section className="morph-detail__section">
              <h3>Credit</h3>

              <p>
                Credit is optional if your
                submission is accepted.
              </p>

              <div
                className="morph-detail__badges"
                role="group"
                aria-label="Submission credit preference"
              >
                {(
                  [
                    "name",
                    "social",
                    "anonymous",
                  ] as MorphCreditMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={
                      creditMode === mode
                        ? "is-active"
                        : ""
                    }
                    disabled={busy}
                    onClick={() =>
                      setCreditMode(mode)
                    }
                  >
                    {mode === "name"
                      ? "My name"
                      : mode === "social"
                        ? "Social media"
                        : "Anonymous"}
                  </button>
                ))}
              </div>

              {creditMode === "name" && (
                <input
                  value={creditName}
                  disabled={busy}
                  onChange={(event) =>
                    setCreditName(
                      event.target.value
                    )
                  }
                  placeholder="Name to display"
                  autoComplete="name"
                  required
                />
              )}

              {creditMode === "social" && (
                <input
                  value={creditSocial}
                  disabled={busy}
                  onChange={(event) =>
                    setCreditSocial(
                      event.target.value
                    )
                  }
                  placeholder="@handle or social link"
                  autoComplete="url"
                  required
                />
              )}
            </section>

            {error && (
              <p
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}

            {busy && (
              <section
                className="morph-detail__section"
                aria-live="polite"
                aria-busy="true"
              >
                <h3>
                  🐍 {getProgressMessage()}
                </h3>

                <p>
                  Please keep this window open while
                  Tiny Titans processes the
                  submission.
                </p>
              </section>
            )}

            <button
              type="submit"
              disabled={busy}
            >
              {busy
                ? getProgressMessage()
                : "Submit for review"}
            </button>

            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
            >
              Cancel
            </button>
          </form>
        )}
      </article>
    </div>
  );
}

export default function MorphLibrary() {
  const [query, setQuery] = useState("");

  const [filter, setFilter] = useState<
    | "all"
    | "gene"
    | "combination"
    | "polygenic"
    | "line-bred"
  >("all");

  const [selected, setSelected] =
    useState<MorphReferenceEntry | null>(null);

  const [showSubmission, setShowSubmission] =
    useState(false);

  const entries = useMemo<
    MorphReferenceEntry[]
  >(() => {
    const byName = new Map<
      string,
      MorphReferenceEntry
    >();

    [
      ...masterMorphs,
      ...reptifitMorphCatalog,
    ].forEach((entry) => {
      const key = normalise(entry.name);

      if (!byName.has(key)) {
        byName.set(
          key,
          asReferenceEntry(entry)
        );
      }
    });

    return Array.from(
      byName.values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, []);

  const filtered = useMemo(() => {
    const needle = normalise(query);

    const exactMatches = needle
      ? entries.filter(
          (entry) =>
            normalise(entry.name) ===
              needle ||
            (entry.aliases ?? []).some(
              (alias) =>
                normalise(alias) === needle
            )
        )
      : [];

    const searchPool =
      exactMatches.length > 0
        ? exactMatches
        : entries.filter((entry) => {
            if (!needle) {
              return true;
            }

            const searchable = [
              entry.name,
              ...(entry.aliases ?? []),
              ...(entry.contains ?? []),
            ].map(normalise);

            return searchable.some((value) =>
              value.includes(needle)
            );
          });

    return searchPool.filter(
      (entry) =>
        filter === "all" ||
        (filter === "gene" &&
          (entry.kind === "Gene" ||
            entry.kind === "Super")) ||
        (filter === "combination" &&
          entry.kind === "Combination") ||
        (filter === "polygenic" &&
          entry.inheritance === "Polygenic") ||
        (filter === "line-bred" &&
          entry.inheritance === "Line-bred")
    );
  }, [entries, filter, query]);

  return (
    <main className="page-container morph-library-page">
      <BackHomeButton />

      <header className="morph-library__header">
        <div className="morph-library__eyebrow">
          🐍 TINY TITANS · WESTERN HOGNOSE
        </div>

        <h1>Morph Library</h1>

        <p>
          Explore genes, super forms and recognised
          combinations. Tap any entry to open its
          full genetics record.
        </p>

        <button
          type="button"
          onClick={() =>
            setShowSubmission(true)
          }
        >
          📷 Submit a morph image
        </button>

        <small>
          Reference-quality photographs and
          confirmed morph evidence are required.
          Every submission is reviewed.
        </small>
      </header>

      <div className="morph-library__controls">
        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Search morphs, aliases or components…"
          aria-label="Search morph library"
        />

        <div
          className="morph-library__filters"
          role="group"
          aria-label="Morph type filters"
        >
          {(
            [
              "all",
              "gene",
              "combination",
              "polygenic",
              "line-bred",
            ] as const
          ).map((value) => (
            <button
              key={value}
              type="button"
              className={
                filter === value
                  ? "is-active"
                  : ""
              }
              onClick={() =>
                setFilter(value)
              }
            >
              {value === "all"
                ? "All"
                : value.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="morph-library__count">
        Showing{" "}
        <strong>{filtered.length}</strong>{" "}
        of{" "}
        <strong>{entries.length}</strong>{" "}
        records
      </div>

      <div className="morph-grid morph-library__grid">
        {filtered.map((morph) => (
          <button
            className="morph-card morph-card--interactive"
            key={morph.geneId}
            type="button"
            onClick={() =>
              setSelected(morph)
            }
          >
            <div className="morph-card__topline">
              <span>{morph.kind}</span>
              <span>{morph.verification}</span>
            </div>

            <h2>{morph.name}</h2>

            <p className="morph-card__inheritance">
              {morph.inheritance}
            </p>

            {morph.contains &&
            morph.contains.length > 0 ? (
              <p className="morph-card__contains">
                Contains:{" "}
                {morph.contains.join(" + ")}
              </p>
            ) : (
              <p>
                {morph.description ??
                  "Reference entry"}
              </p>
            )}

            <span className="morph-card__open">
              Open details →
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="welcome-card">
          <h2>No matching morphs</h2>

          <p>
            Try a different name, alias or
            category.
          </p>
        </div>
      )}

      {selected && (
        <MorphDetail
          morph={selected}
          onClose={() =>
            setSelected(null)
          }
        />
      )}

      {showSubmission && (
        <MorphSubmissionDialog
          onClose={() =>
            setShowSubmission(false)
          }
        />
      )}
    </main>
  );
}