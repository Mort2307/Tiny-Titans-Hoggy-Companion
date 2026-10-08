import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buildTitanKnowledgeGraph, queryTitanKnowledgeGraph, type TitanKnowledgeNode } from "../../intelligence/v50/titanKnowledgeGraph";
import TinyTitansIcon, { type TinyTitansIconName } from "../TinyTitansIcon";

const typeIcon: Record<TitanKnowledgeNode["type"], TinyTitansIconName> = {
  feature: "titan",
  route: "link",
  event: "power",
  concept: "knowledge",
};

export default function TitanKnowledgeGraphPanel() {
  const [query, setQuery] = useState("");
  const graph = useMemo(() => buildTitanKnowledgeGraph(), []);
  const result = useMemo(() => queryTitanKnowledgeGraph(query), [query]);
  const connectedFeatures = result.nodes.filter((node) => node.type === "feature");
  const events = result.nodes.filter((node) => node.type === "event");
  const concepts = result.nodes.filter((node) => node.type === "concept");

  return <section className="titan-feature-panel">
    <p className="titan-feature-kicker"><TinyTitansIcon name="titan" size={14} /> TITAN KNOWLEDGE GRAPH</p>
    <h2>Ask how Tiny Titans connects the dots</h2>
    <p>Search a feature, event, route or intelligence layer to see what it touches. This graph describes product relationships, not scientific certainty.</p>
    <label className="titan-feature-search">
      <span>Graph search</span>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try weight, genetics, feeding, Digital Twin…" />
    </label>
    {!query && <div className="titan-feature-data-grid"><article><strong>{graph.nodes.filter((node) => node.type === "feature").length}</strong><span>V50 capabilities</span></article><article><strong>{graph.nodes.filter((node) => node.type === "event").length}</strong><span>Connected events</span></article><article><strong>{graph.nodes.filter((node) => node.type === "concept").length}</strong><span>Shared layers</span></article><article><strong>{graph.edges.length}</strong><span>Relationships</span></article></div>}
    {query && connectedFeatures.length === 0 && events.length === 0 && concepts.length === 0 && <div className="titan-feature-empty"><strong>No graph match yet.</strong><p>Try a capability name, recorded event, or intelligence layer.</p></div>}
    {query && connectedFeatures.length > 0 && <div className="titan-feature-results">{connectedFeatures.slice(0, 8).map((node) => <article key={node.id}><strong><TinyTitansIcon name={typeIcon[node.type]} size={14} /> {node.label}</strong><p>{result.edges.filter((edge) => edge.from === node.id || edge.to === node.id).map((edge) => edge.relation).join(" · ") || "Connected capability"}</p></article>)}</div>}
    {query && events.length > 0 && <div className="titan-feature-note"><strong>Relevant events</strong><p>{events.map((node) => node.label).join(" · ")}</p></div>}
    {query && concepts.length > 0 && <div className="titan-feature-note"><strong>Shared intelligence layers</strong><p>{concepts.map((node) => node.label).join(" · ")}</p></div>}
    <div className="titan-feature-links"><Link to="/knowledge-base">Open Knowledge Base <TinyTitansIcon name="forward" size={13} /></Link><Link to="/titan-intelligence">Back to Titan Intelligence <TinyTitansIcon name="back" size={13} /></Link></div>
  </section>;
}
