import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "./ExplainThis.css";

type Level = "simple" | "standard" | "advanced";

type Explanation = {
  simple: string;
  standard?: string;
  advanced?: string;
};

const GLOSSARY: Record<string, Explanation> = {
  hognose: {
    simple: "A small snake known for its upturned nose and dramatic personality.",
    standard: "Western Hognoses are North American colubrids that commonly use their upturned snout for burrowing.",
    advanced: "Western Hognose refers to Heterodon nasicus, a rear-fanged colubrid with specialised fossorial behaviour and mildly venomous saliva used primarily in prey handling."
  },
  "western hognose": {
    simple: "The type of hognose snake Tiny Titans is mainly designed for.",
    standard: "Western Hognose is the common name for Heterodon nasicus.",
    advanced: "Heterodon nasicus is a North American colubrid species with fossorial adaptations, including an enlarged rostral scale and a specialised rear-fanged dentition."
  },
  morph: {
    simple: "A genetic trait or combination of traits that changes how a snake looks.",
    standard: "A morph is a genetically inherited phenotype that can affect colour, pattern, scale expression or other visible characteristics.",
    advanced: "Morph terminology describes inherited phenotypes produced by specific alleles, allele combinations, polygenic effects or established line-bred traits."
  },
  het: {
    simple: "Short for heterozygous. It usually means a snake carries one copy of a gene without showing the visual trait.",
    standard: "A heterozygous snake has two different alleles at a gene locus. For a recessive morph, one copy can make the snake a carrier without making it visual.",
    advanced: "Heterozygosity describes two different alleles at a locus. Recessive phenotypes generally require two copies, while inheritance depends on the specific locus and mode of inheritance."
  },
  heterozygous: {
    simple: "Having two different versions of a gene.",
    standard: "A heterozygous animal carries two different alleles at the same gene locus.",
    advanced: "Heterozygosity is the presence of non-identical alleles at a homologous locus; phenotype depends on dominance, dosage and gene interaction."
  },
  homozygous: {
    simple: "Having two matching versions of a gene.",
    standard: "A homozygous animal has two copies of the same allele at a gene locus.",
    advanced: "Homozygosity means identical alleles occupy a homologous locus, such as two copies of a recessive allele."
  },
  recessive: {
    simple: "A gene that usually needs two copies before its visual trait appears.",
    standard: "A recessive phenotype generally appears when an individual inherits two copies of the relevant recessive allele.",
    advanced: "A recessive phenotype is expressed when the genotype and molecular mechanism permit expression in the absence of a dominant masking allele."
  },
  "incomplete dominant": {
    simple: "A gene where one copy and two copies can look different.",
    standard: "An incomplete-dominant trait can produce a distinct phenotype in heterozygotes and another phenotype in homozygotes.",
    advanced: "Incomplete dominance produces an intermediate or otherwise distinct heterozygous phenotype relative to the homozygous states."
  },
  dominant: {
    simple: "A gene where one copy can be enough to show the trait.",
    standard: "A dominant allele can affect phenotype when only one copy is present, although exact expression depends on the trait.",
    advanced: "Dominance describes phenotype relationships between alleles; it does not mean an allele is biologically stronger or more common."
  },
  conda: {
    simple: "A pattern gene that reduces and changes the normal pattern of a hognose.",
    standard: "Conda is an incomplete-dominant Western Hognose pattern morph. Two copies produce Super Conda.",
    advanced: "Conda is commonly treated as an incomplete-dominant locus in Western Hognose breeding, with heterozygous Conda and homozygous Super Conda phenotypes."
  },
  "super conda": {
    simple: "A snake with two copies of the Conda gene, giving a stronger pattern reduction.",
    standard: "Super Conda is the homozygous form of the Conda trait.",
    advanced: "Super Conda represents homozygosity at the Conda locus under the established incomplete-dominant model."
  },
  arctic: {
    simple: "A colour and pattern morph that can make a hognose look lighter and more contrasty.",
    standard: "Arctic is a recognised Western Hognose morph affecting colour and pattern expression; two copies are commonly called Super Arctic.",
    advanced: "Arctic is generally treated as an incomplete-dominant morph in Western Hognose genetics, producing a distinct homozygous Super Arctic phenotype."
  },
  albino: {
    simple: "A trait that removes normal melanin, often making the snake look yellow, orange, cream or red-eyed.",
    standard: "Albino is a recessive hypomelanistic phenotype involving reduced or absent melanin production.",
    advanced: "Albinism results from disrupted melanin synthesis; inheritance is locus-specific and recessive in the established Western Hognose Albino line."
  },
  lavender: {
    simple: "A colour morph that produces lavender, grey and soft purple tones.",
    standard: "Lavender is an inherited colour morph with characteristic lavender-grey pigmentation.",
    advanced: "Lavender describes a defined inherited phenotype; exact expression and interaction with other loci depend on the genetic line and combination."
  },
  brumation: {
    simple: "A period when a reptile becomes much less active during colder conditions.",
    standard: "Brumation is a reptile's seasonal period of reduced activity, metabolism and feeding associated with cooler conditions.",
    advanced: "Brumation is a temperature-associated seasonal metabolic depression distinct from mammalian hibernation."
  },
  humidity: {
    simple: "How much water vapour is in the air.",
    standard: "Relative humidity describes how much moisture the air contains compared with the maximum it could hold at that temperature.",
    advanced: "Relative humidity is expressed as a percentage of saturation vapour pressure at a given temperature."
  },
  "thermal gradient": {
    simple: "A warm area and a cooler area so the snake can choose where it wants to be.",
    standard: "A thermal gradient gives the snake access to different temperatures within the enclosure for behavioural thermoregulation.",
    advanced: "A thermal gradient allows behavioural thermoregulation by providing spatially variable environmental temperatures."
  },
  thermostat: {
    simple: "A device that controls a heat source so it does not simply stay on.",
    standard: "A thermostat regulates a heating device against a temperature set point.",
    advanced: "A thermostat is a closed-loop control device that adjusts heat output according to measured temperature."
  },
  shed: {
    simple: "The old outer skin a snake leaves behind as it grows.",
    standard: "Ecdysis is the process of shedding the old outer skin layer.",
    advanced: "Ecdysis is the periodic replacement of the epidermal outer layer during growth and tissue renewal."
  },
  ecdysis: {
    simple: "The scientific word for shedding skin.",
    standard: "Ecdysis is the process by which a reptile sheds its old outer skin.",
    advanced: "Ecdysis involves separation and replacement of the outer epidermal layers during the reptile's shedding cycle."
  },
  regurgitation: {
    simple: "When a snake brings a meal back up after eating.",
    standard: "Regurgitation is the expulsion of recently swallowed food from the digestive tract and can have several causes.",
    advanced: "Regurgitation can be associated with husbandry, prey, handling, illness or gastrointestinal dysfunction and should be assessed in context."
  },
  baseline: {
    simple: "What is normal for this particular snake.",
    standard: "An individual baseline is a range of measurements and behaviours established from that snake's own history.",
    advanced: "Individual baselines reduce reliance on population averages by comparing new observations with the animal's longitudinal personal data."
  },
  confidence: {
    simple: "How sure the app is about a result based on the information it has.",
    standard: "A confidence indicator reflects the quantity, consistency and quality of data supporting a calculation or recommendation.",
    advanced: "Confidence is a data-quality signal, not a probability of correctness unless explicitly defined as such."
  },
  "data quality": {
    simple: "How complete and reliable the information entered into the app is.",
    standard: "Data quality considers completeness, consistency, recency and reliability of recorded observations.",
    advanced: "Data-quality scoring evaluates whether the evidence supporting an inference is sufficiently complete, consistent and appropriately measured."
  }
};

function normalize(value: string): string {
  return value.toLowerCase().replace(/[“”‘’]/g, "'").replace(/[^a-z0-9%+\-\s]/g, " ").replace(/\s+/g, " ").trim();
}

function findExplanation(text: string): { term: string; explanation: Explanation } | null {
  const normalized = normalize(text);
  if (!normalized) return null;
  const exact = GLOSSARY[normalized];
  if (exact) return { term: text.trim(), explanation: exact };
  const keys = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
  const key = keys.find((candidate) => normalized.includes(candidate));
  return key ? { term: key, explanation: GLOSSARY[key] } : null;
}

function wordAtPoint(clientX: number, clientY: number): string | null {
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
  return word || null;
}

export default function ExplainThis() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<{ term: string; explanation: Explanation } | null>(null);
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
      if (target?.closest(".explain-this, .explain-this-modal")) return;
      const word = wordAtPoint(event.clientX, event.clientY);
      if (!word) return;
      const result = findExplanation(word);
      if (result) {
        event.preventDefault();
        event.stopPropagation();
        setExplanation(result);
      } else {
        setExplanation({
          term: word,
          explanation: {
            simple: "I don't have a built-in explanation for this term yet. Try another word or phrase from the page.",
            standard: "This term is not currently in the Tiny Titans glossary. The explanation library will grow as the knowledge base grows.",
            advanced: "No curated Tiny Titans glossary entry exists for this term yet."
          }
        });
      }
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  function changeLevel(next: Level) {
    setLevel(next);
    window.localStorage.setItem("tinytitans-explain-level", next);
  }

  const currentText = explanation?.explanation[level] ?? explanation?.explanation.standard ?? explanation?.explanation.simple ?? "";

  return (
    <>
      <button className={`explain-this ${open ? "explain-this--active" : ""}`} type="button" aria-label={open ? "Exit What does this mean mode" : "What does this mean?"} onClick={() => { setOpen((value) => !value); setExplanation(null); }}>
        <span className="explain-this__icon">?</span>
        <span className="explain-this__label">{open ? "Exit help" : "What does this mean?"}</span>
      </button>

      {open && (
        <div className="explain-this-banner" role="status">
          <strong>🔎 What does this mean?</strong>
          <span>Tap a word or phrase anywhere on the page.</span>
        </div>
      )}

      {explanation && (
        <div className="explain-this-backdrop" role="presentation" onClick={() => setExplanation(null)}>
          <section className="explain-this-modal" role="dialog" aria-modal="true" aria-labelledby="explain-this-title" onClick={(event) => event.stopPropagation()}>
            <div className="explain-this-modal__header">
              <div><span className="explain-this-modal__eyebrow">Tiny Titans explains</span><h2 id="explain-this-title">{explanation.term}</h2></div>
              <button type="button" className="explain-this-modal__close" aria-label="Close explanation" onClick={() => setExplanation(null)}>×</button>
            </div>
            <div className="explain-this-levels" role="tablist" aria-label="Explanation level">
              <button type="button" className={level === "simple" ? "active" : ""} onClick={() => changeLevel("simple")}>🟢 Simple</button>
              <button type="button" className={level === "standard" ? "active" : ""} onClick={() => changeLevel("standard")}>🟡 More detail</button>
              <button type="button" className={level === "advanced" ? "active" : ""} onClick={() => changeLevel("advanced")}>🔬 Advanced</button>
            </div>
            <p className="explain-this-modal__text">{currentText}</p>
            <button type="button" className="explain-this-modal__done" onClick={() => setExplanation(null)}>Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
