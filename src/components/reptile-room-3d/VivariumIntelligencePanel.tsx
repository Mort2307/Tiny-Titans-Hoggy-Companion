import type { VivariumDigitalTwin } from "../../types/vivariumTwin";

type Props = {
  twin: VivariumDigitalTwin;
  intelligence: VivariumDigitalTwin["intelligence"];
  linked: boolean;
};

export default function VivariumIntelligencePanel({ twin, intelligence, linked }: Props) {
  const heatingAssets = twin.assets.filter((asset) => asset.category === "heating").length;
  const monitoringAssets = twin.assets.filter((asset) => asset.category === "monitoring").length;
  const lightingAssets = twin.assets.filter((asset) => asset.category === "lighting").length;

  return (
    <div className="vtb-scroll">
      <div className="vtb-score"><span>Completeness</span><strong>{intelligence.completenessScore}%</strong></div>
      <div className="vtb-card">
        <h3>Missing records</h3>
        {intelligence.missing.length
          ? intelligence.missing.map((item) => <div className="vtb-alert" key={item}>{item}</div>)
          : <div className="vtb-good">Core enclosure records are complete.</div>}
      </div>
      <div className="vtb-card">
        <h3>Warnings</h3>
        {intelligence.warnings.length
          ? intelligence.warnings.map((item) => <div className="vtb-warning" key={item}>{item}</div>)
          : <div className="vtb-good">No current enclosure warnings.</div>}
      </div>
      <div className="vtb-card">
        <h3>Linked intelligence</h3>
        <div className="vtb-stat">{linked ? "Linked snake" : "Unlinked enclosure"}</div>
        <div className="vtb-stat">{heatingAssets} heating assets</div>
        <div className="vtb-stat">{monitoringAssets} monitoring assets</div>
        <div className="vtb-stat">{lightingAssets} lighting assets</div>
      </div>
    </div>
  );
}
