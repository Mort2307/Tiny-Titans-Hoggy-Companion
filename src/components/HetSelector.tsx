import { useMemo, useState } from "react";
import type { Het, HetPercentage } from "../types/genetics";
import type { MorphDefinition } from "../data/morphs";
import { getHetGenes, canSelectHet, getHetSelectionConflict, type HetPercentage as GeneticHetPercentage } from "../utils/geneticsIdentity";
import { sortMorphsByGeneticFamily } from "../utils/morphSorting";

type HetSelectorProps = { options: MorphDefinition[]; selected: Het[]; setSelected: (hets: Het[]) => void };

function HetSelector({ options, selected, setSelected }: HetSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const percentages: HetPercentage[] = ["100%", "66%", "50%"];

  const availableGenes = useMemo(() => sortMorphsByGeneticFamily(getHetGenes(options)), [options]);

  const filteredGenes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return availableGenes;
    return availableGenes.filter((gene) =>
      gene.name.toLowerCase().includes(query) ||
      (gene.aliases?.some((alias) => alias.toLowerCase().includes(query)) ?? false)
    );
  }, [availableGenes, search]);

  function getSelectedGene(value: string): MorphDefinition | undefined {
    const normalised = value.trim().toLowerCase();
    return availableGenes.find((gene) => gene.geneId.trim().toLowerCase() === normalised || gene.name.trim().toLowerCase() === normalised);
  }

  function isSelected(gene: MorphDefinition, percentage: HetPercentage) {
    return selected.some((het) => {
      const selectedGene = getSelectedGene(het.gene);
      return selectedGene ? selectedGene.geneId === gene.geneId && het.percentage === percentage : het.gene === gene.name && het.percentage === percentage;
    });
  }

  function canSelect(gene: MorphDefinition, percentage: HetPercentage) {
    if (isSelected(gene, percentage)) return true;
    return canSelectHet(gene.geneId, percentage as GeneticHetPercentage, selected.map((het) => ({ gene: het.gene, percentage: het.percentage as GeneticHetPercentage })), options);
  }

  function getConflict(gene: MorphDefinition, percentage: HetPercentage) {
    if (isSelected(gene, percentage)) return undefined;
    return getHetSelectionConflict(gene.geneId, percentage as GeneticHetPercentage, selected.map((het) => ({ gene: het.gene, percentage: het.percentage as GeneticHetPercentage })), options);
  }

  function toggleHet(gene: MorphDefinition, percentage: HetPercentage) {
    if (isSelected(gene, percentage)) {
      setSelected(selected.filter((het) => {
        const selectedGene = getSelectedGene(het.gene);
        return selectedGene ? !(selectedGene.geneId === gene.geneId && het.percentage === percentage) : !(het.gene === gene.name && het.percentage === percentage);
      }));
      return;
    }
    if (!canSelect(gene, percentage)) return;
    setSelected([...selected, { gene: gene.name, percentage }]);
  }

  function removeHet(gene: string, percentage: HetPercentage) {
    const resolvedGene = getSelectedGene(gene);
    setSelected(selected.filter((het) => {
      const selectedGene = getSelectedGene(het.gene);
      if (resolvedGene && selectedGene) return !(selectedGene.geneId === resolvedGene.geneId && het.percentage === percentage);
      return !(het.gene === gene && het.percentage === percentage);
    }));
  }

  const selectedDisplay = selected.map((het) => {
    const morph = getSelectedGene(het.gene);
    return { ...het, displayName: morph?.name ?? het.gene, geneId: morph?.geneId ?? het.gene };
  });

  return (
    <div className="multi-select">
      <button type="button" className="multi-select-button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox">
        <span>Select Hets</span><span className={`multi-select-arrow ${open ? "open" : ""}`} aria-hidden="true">▼</span>
      </button>

      {selectedDisplay.length > 0 && <div className="selected-tags">
        {selectedDisplay.map((het) => <span key={`${het.geneId}-${het.percentage}`} className="selected-tag">
          🧬 {het.percentage === "100%" ? `${het.percentage} Het` : `${het.percentage} Possible Het`} {het.displayName}
          <button type="button" onClick={() => removeHet(het.gene, het.percentage)} aria-label={`Remove ${het.displayName} ${het.percentage} het`}>❌</button>
        </span>)}
      </div>}

      {open && <div className="multi-select-menu" role="listbox" aria-multiselectable="true">
        <input type="text" className="multi-select-search" placeholder="Search het genes..." value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" aria-label="Search het genes" />
        <div className="multi-select-options">
          {filteredGenes.length > 0 ? filteredGenes.map((gene) => <div key={gene.geneId} className="het-option">
            <div className="het-gene-name">{gene.name}</div>
            <div className="het-percentage-options">
              {percentages.map((percentage) => {
                const checked = isSelected(gene, percentage);
                const enabled = canSelect(gene, percentage);
                const conflict = getConflict(gene, percentage);
                return <label key={percentage} className={`multi-select-option ${checked ? "selected" : ""} ${!enabled ? "disabled" : ""}`} title={!enabled && conflict ? `${conflict.percentage} ${conflict.name} already selected` : undefined}>
                  <input type="checkbox" checked={checked} disabled={!enabled} onChange={() => toggleHet(gene, percentage)} />
                  <span className="multi-select-check" aria-hidden="true">{checked ? "✓" : ""}</span>
                  <span className="multi-select-label">{percentage}{percentage === "100%" ? " Het" : " Possible Het"}</span>
                </label>;
              })}
            </div>
          </div>) : <div className="multi-select-empty">No het genes found.</div>}
        </div>
      </div>}
    </div>
  );
}

export default HetSelector;
