import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { TERMINOLOGY_GLOSSARY } from "../../data/terminologyGlossary";
import "./ExplainThis.css";

type Level = "simple" | "standard" | "advanced";

type FoundExplanation = {
  term: string;
  explanation: (typeof TERMINOLOGY_GLOSSARY)[string];
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[“”‘’]/g, "'").replace(/[^a-z0-9%+\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findExplanation(text: string): FoundExplanation | null {
  const normalized = normalize(text);
  if (!normalized) return null;
  const exact = TERMINOLOGY_GLOSSARY[normalized];
  if (exact) return { term: normalized, explanation: exact };
  const key = Object.keys(TERMINOLOGY_GLOSSARY).sort((a, b) => b.length - a.length).find((candidate) => normalized.includes(candidate));
  return key ? { term: key, explanation: TERMINOLOGY_GLOSSARY[key] } : null;
}

function wordAtPoint(clientX: number, clientY: number): string | null {
  const documentWithCaret = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let node: Node | null = null;
  let offset = 0;
  const range = documentWithCaret.caretRangeFromPoint?.(clientX, clientY);
  if (range) { node = range.startContainer; offset = range.startOffset; }
  else {
    const position = documentWithCaret.caretPositionFromPoint?.(clientX, clientY);
    if (position) { node = position.offsetNode; offset = position.offset; }
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
  return word || null;
}

export default function ExplainThis() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<FoundExplanation | null>(null);
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
      const word = wordAtPoint(event.clientX, event.clientY);
      if (!word) return;
      const result = findExplanation(word);
      setExplanation(result ?? {
        term: word,
        explanation: {
          simple: "This word is not in the Tiny Titans glossary yet. The terminology library is designed to grow as the knowledge base grows.",
          standard: "No curated Tiny Titans explanation exists for this word yet.",
          advanced: "No curated Tiny Titans glossary entry exists for this term yet."
        }
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

  return <>
    <button className={`explain-this ${open ? "explain-this--active" : ""}`} type="button" aria-label={open ? "Exit What does this mean mode" : "What does this mean?"} onClick={() => { setOpen((value) => !value); setExplanation(null); }}>
      <span className="explain-this__icon">?</span><span className="explain-this__label">{open ? "Exit help" : "What does this mean?"}</span>
    </button>
    {open && <div className="explain-this-banner" role="status"><strong>🔎 What does this mean?</strong><span>Tap any word or phrase on the page. Technical terms such as <strong>polygenic</strong>, <strong>heterozygous</strong> and <strong>genotype</strong> are included.</span></div>}
    {explanation && <div className="explain-this-backdrop" role="presentation" onClick={() => setExplanation(null)}><section className="explain-this-modal" role="dialog" aria-modal="true" aria-labelledby="explain-this-title" onClick={(event) => event.stopPropagation()}><div className="explain-this-modal__header"><div><span className="explain-this-modal__eyebrow">Tiny Titans explains</span><h2 id="explain-this-title">{explanation.term}</h2></div><button type="button" className="explain-this-modal__close" aria-label="Close explanation" onClick={() => setExplanation(null)}>×</button></div><div className="explain-this-levels" role="tablist" aria-label="Explanation level"><button type="button" className={level === "simple" ? "active" : ""} onClick={() => changeLevel("simple")}>🟢 Simple</button><button type="button" className={level === "standard" ? "active" : ""} onClick={() => changeLevel("standard")}>🟡 More detail</button><button type="button" className={level === "advanced" ? "active" : ""} onClick={() => changeLevel("advanced")}>🔬 Advanced</button></div><p className="explain-this-modal__text">{currentText}</p>{TERMINOLOGY_GLOSSARY[explanation.term] && <button type="button" className="explain-this-modal__done" onClick={() => setExplanation(null)}>Got it</button>}</section></div>}
  </>;
}
