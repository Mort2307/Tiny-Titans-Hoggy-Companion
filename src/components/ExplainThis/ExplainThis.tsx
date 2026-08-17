import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/useAuth";
import { TERMINOLOGY_GLOSSARY } from "../../data/terminologyGlossary";
import { morphs } from "../../data/morphs";
import { hasKnowledgeNote, type KnowledgeNote, type KnowledgeStatus } from "../../data/knowledgeStatus";
import "./ExplainThis.css";

type Level = "simple" | "standard" | "advanced";
type Explanation = { simple: string; standard?: string; advanced?: string };

type FoundExplanation = {
  term: string;
  explanation: Explanation;
  knowledgeNote?: KnowledgeNote;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9%+\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const glossaryKeys = Object.keys(TERMINOLOGY_GLOSSARY).sort((a, b) => b.length - a.length);
const morphLookup = morphs.flatMap((morph) => [morph.name, ...(morph.aliases ?? [])].map((term) => ({ term: normalize(term), morph })));

function morphKnowledgeStatus(verification: string): KnowledgeStatus {
  if (verification === "Confirmed") return "established";
  if (verification === "Recognised") return "widelyAccepted";
  if (verification === "Disputed") return "disputed";
  return "insufficientEvidence";
}

function morphExplanation(term: string): FoundExplanation | null {
  const normalized = normalize(term);
  const match = morphLookup.find((entry) => entry.term === normalized);
  if (!match) return null;

  const morph = match.morph;
  const status = morphKnowledgeStatus(morph.verification);
  const inheritance = morph.inheritance === "Unknown"
    ? "The inheritance model is not confirmed, so Tiny Titans will not invent one."
    : `Inheritance: ${morph.inheritance}.`;
  const verification = `Evidence status: ${morph.verification}.`;
  const description = morph.description ?? `${morph.name} is recorded in the Tiny Titans morph database.`;
  const notes = morph.educationalNotes ?? "Use the recorded genetics and breeding evidence rather than guessing from appearance alone.";

  const knowledgeNote: KnowledgeNote = {
    status,
    communityNote: status === "widelyAccepted"
      ? "This interpretation is recognised across the international keeper and breeding community, while individual terminology can still vary."
      : status === "disputed"
        ? "There is meaningful disagreement around this terminology or interpretation. Tiny Titans keeps the term available without presenting disputed claims as settled fact."
        : status === "insufficientEvidence"
          ? "There is not currently enough reliable evidence for Tiny Titans to present a stronger inheritance claim as established fact."
          : undefined,
    tinyTitansApproach: morph.inheritance === "Unknown"
      ? "Tiny Titans records the morph for identification and education but does not assume an inheritance model that has not been confirmed."
      : "Tiny Titans uses the recorded inheritance model while keeping the verification status visible when context is useful.",
    lastReviewed: "August 2026",
  };

  return {
    term: morph.name,
    explanation: {
      simple: description,
      standard: `${description} ${inheritance} ${verification}`,
      advanced: `${description} ${notes} ${inheritance} ${verification}`,
    },
    knowledgeNote,
  };
}

function findExplanation(text: string): FoundExplanation | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  const exact = TERMINOLOGY_GLOSSARY[normalized];
  if (exact) return { term: normalized, explanation: exact };

  const morph = morphExplanation(normalized);
  if (morph) return morph;

  const glossaryMatch = glossaryKeys.find((candidate) => normalized.includes(candidate));
  if (glossaryMatch) return { term: glossaryMatch, explanation: TERMINOLOGY_GLOSSARY[glossaryMatch] };

  const morphMatch = morphLookup.find((entry) => normalized.includes(entry.term));
  if (morphMatch) return morphExplanation(morphMatch.term);

  return null;
}

function wordAtPoint(clientX: number, clientY: number): { word: string; context: string } | null {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };

  let node: Node | null = null;
  let offset = 0;
  const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
  if (range) {
    node = range.startContainer;
    offset = range.startOffset;
  } else {
    const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
    if (position) {
      node = position.offsetNode;
      offset = position.offset;
    }
  }

  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? "";
  if (!text.trim()) return null;

  const safeOffset = Math.min(Math.max(offset, 0), text.length);
  const isWordChar = (character: string) => /[\p{L}\p{N}%+\-]/u.test(character);
  let start = safeOffset;
  let end = safeOffset;
  while (start > 0 && isWordChar(text[start - 1])) start -= 1;
  while (end < text.length && isWordChar(text[end])) end += 1;

  const word = text.slice(start, end).trim();
  if (!word) return null;

  const left = text.slice(Math.max(0, start - 42), start);
  const right = text.slice(end, Math.min(text.length, end + 42));
  return { word, context: `${left}${word}${right}` };
}

function fallbackExplanation(word: string): Explanation {
  return {
    simple: `You selected “${word}”. Tiny Titans does not have a trusted definition for this term yet, so it will not make one up. This term has been flagged for the glossary team to add a verified explanation.`,
    standard: `“${word}” is not currently in the curated Tiny Titans terminology database. The app deliberately avoids inventing definitions when a trusted explanation has not been added yet.`,
    advanced: `No curated Tiny Titans definition currently exists for “${word}”. The terminology system is evidence-aware: unknown terms are surfaced rather than assigned potentially misleading genetic or husbandry claims.`,
  };
}

export default function ExplainThis() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<FoundExplanation | null>(null);
  const [showKnowledgeNote, setShowKnowledgeNote] = useState(false);
  const [level, setLevel] = useState<Level>(() => {
    const stored = window.localStorage.getItem("tinytitans-explain-level");
    return stored === "standard" || stored === "advanced" ? stored : "simple";
  });

  const suggestedLevel = useMemo<Level>(() => {
    if (profile?.ageBand === "7-10" || profile?.ageBand === "11-14") return "simple";
    if (profile?.ageBand === "15-18") return "standard";
    if (profile?.learningLevel === "adult" || profile?.experienceLevel === "pro") return "advanced";
    return "standard";
  }, [profile]);

  useEffect(() => {
    if (!window.localStorage.getItem("tinytitans-explain-level")) setLevel(suggestedLevel);
  }, [suggestedLevel]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".explain-this, .explain-this-modal, button, a, input, select, textarea")) return;

      const selection = wordAtPoint(event.clientX, event.clientY);
      if (!selection) return;

      const phraseResult = findExplanation(selection.context);
      const wordResult = findExplanation(selection.word);
      const result = phraseResult ?? wordResult;

      setShowKnowledgeNote(false);
      setExplanation(result ?? {
        term: selection.word,
        explanation: fallbackExplanation(selection.word),
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  function changeLevel(next: Level) {
    setLevel(next);
    window.localStorage.setItem("tinytitans-explain-level", next);
  }

  const currentText = explanation?.explanation[level] ?? explanation?.explanation.standard ?? explanation?.explanation.simple ?? "";
  const isCurated = explanation ? Boolean(TERMINOLOGY_GLOSSARY[explanation.term] || morphExplanation(explanation.term)) : false;
  const knowledgeNote = explanation?.knowledgeNote;
  const showKnowledgeLink = hasKnowledgeNote(knowledgeNote);

  return <>
    <button
      className={`explain-this ${open ? "explain-this--active" : ""}`}
      type="button"
      aria-label={open ? "Exit What does this mean mode" : "What does this mean? Tap to learn"}
      title="Tap to learn"
      onClick={() => { setOpen((value) => !value); setExplanation(null); setShowKnowledgeNote(false); }}
    >
      <span className="explain-this__icon">?</span>
      <span className="explain-this__hint">Tap to learn</span>
    </button>

    {open && <div className="explain-this-banner" role="status">
      <strong>🔎 What does this mean?</strong>
      <span>Tap any word or phrase on the page. Tiny Titans checks the curated glossary and the full morph database, including genetics terms such as <strong>polygenic</strong>, <strong>heterozygous</strong>, <strong>genotype</strong> and multi-word terms such as <strong>incomplete dominant</strong>.</span>
    </div>}

    {explanation && <div className="explain-this-backdrop" role="presentation" onClick={() => setExplanation(null)}>
      <section className="explain-this-modal" role="dialog" aria-modal="true" aria-labelledby="explain-this-title" onClick={(event) => event.stopPropagation()}>
        <div className="explain-this-modal__header">
          <div>
            <span className="explain-this-modal__eyebrow">Tiny Titans explains</span>
            <h2 id="explain-this-title">{explanation.term}</h2>
          </div>
          <button type="button" className="explain-this-modal__close" aria-label="Close explanation" onClick={() => setExplanation(null)}>×</button>
        </div>

        <div className="explain-this-levels" role="tablist" aria-label="Explanation level">
          <button type="button" className={level === "simple" ? "active" : ""} onClick={() => changeLevel("simple")}>🟢 Simple</button>
          <button type="button" className={level === "standard" ? "active" : ""} onClick={() => changeLevel("standard")}>🟡 More detail</button>
          <button type="button" className={level === "advanced" ? "active" : ""} onClick={() => changeLevel("advanced")}>🔬 Advanced</button>
        </div>

        <p className="explain-this-modal__text">{currentText}</p>

        {showKnowledgeLink && !showKnowledgeNote && <button
          type="button"
          className="explain-this-modal__knowledge-link"
          onClick={() => setShowKnowledgeNote(true)}
        >
          ⓘ About this terminology
        </button>}

        {showKnowledgeNote && knowledgeNote && <div className="explain-this-knowledge" aria-label="Terminology and evidence context">
          <div className="explain-this-knowledge__header">
            <strong>ⓘ About this terminology</strong>
            <button type="button" aria-label="Close terminology context" onClick={() => setShowKnowledgeNote(false)}>×</button>
          </div>
          <p><strong>Current understanding</strong><br />{knowledgeNote.communityNote ?? "The available information is treated according to its current evidence and community understanding."}</p>
          {knowledgeNote.evidenceNote && <p><strong>Evidence</strong><br />{knowledgeNote.evidenceNote}</p>}
          {knowledgeNote.tinyTitansApproach && <p><strong>Tiny Titans approach</strong><br />{knowledgeNote.tinyTitansApproach}</p>}
          {knowledgeNote.lastReviewed && <p className="explain-this-knowledge__reviewed">Reviewed: {knowledgeNote.lastReviewed}</p>}
        </div>}

        {!isCurated && <p className="explain-this-modal__text" style={{ opacity: .7 }}>💡 This term has been surfaced but needs a verified glossary entry before Tiny Titans treats it as authoritative.</p>}
        <button type="button" className="explain-this-modal__done" onClick={() => setExplanation(null)}>Got it</button>
      </section>
    </div>}
  </>;
}
