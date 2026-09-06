import { useMemo, useState } from "react";

interface Props { summary: string }

type Mode = "standard" | "sofa" | "deep";

export default function TitanExplanationModes({ summary }: Props) {
  const [mode, setMode] = useState<Mode>("standard");
  const text = useMemo(() => {
    if (mode === "sofa") return `The simple version: ${summary} Nothing extra is being assumed.`;
    if (mode === "deep") return `Detailed version: ${summary} Tiny Titans keeps the underlying evidence and uncertainty unchanged; only the explanation style changes.`;
    return summary;
  }, [mode, summary]);
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🛋️ EXPLANATION MODE</p><h2>Same facts. Different way of explaining them.</h2><div className="titan-feature-links"><button type="button" onClick={() => setMode("standard")}>Standard</button><button type="button" onClick={() => setMode("sofa")}>Sofa mode</button><button type="button" onClick={() => setMode("deep")}>Deep dive</button></div><div className="titan-feature-note"><p>{text}</p></div></section>;
}
