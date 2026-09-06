import { Link } from "react-router-dom";
import { buildTitanKnowledgeGraph } from "../../intelligence/v50/titanKnowledgeGraph";

export default function TitanKnowledgeGraphPanel() {
  const graph = buildTitanKnowledgeGraph();
  const concepts = graph.nodes.filter((node) => node.type === "concept");
  const featureNodes = graph.nodes.filter((node) => node.type === "feature");
  return <section className="titan-feature-panel"><p className="titan-feature-kicker">🕸️ TITAN KNOWLEDGE GRAPH</p><h2>Connected concepts, not isolated features</h2><p>{featureNodes.length} V50 capabilities currently connect through {concepts.length} shared intelligence layers and their real application destinations.</p><div className="titan-feature-data-grid">{concepts.map((concept) => <article key={concept.id}><strong>{featureNodes.filter((feature) => graph.edges.some((edge) => edge.from === feature.id && edge.to === concept.id)).length}</strong><span>{concept.label} capabilities</span></article>)}</div><Link to="/knowledge-base">Explore the Knowledge Base →</Link></section>;
}
