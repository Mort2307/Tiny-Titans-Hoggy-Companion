import { useMemo, useState } from "react";
import { masterMorphs, type MasterMorphDefinition } from "../../data/masterMorphDatabase";
import {
  normaliseMorphSearch,
  searchableMorphText,
} from "../../lib/creatorMorphLibraryEditor";

export function TargetMorphPicker({
  currentMorphId,
  onSelect,
  selectedId,
}: {
  currentMorphId: string;
  onSelect: (morph: MasterMorphDefinition) => void;
  selectedId: string;
}) {
  const [queryText, setQueryText] = useState("");
  const options = useMemo(() => {
    const needle = normaliseMorphSearch(queryText);
    return masterMorphs
      .filter(
        (entry) =>
          entry.geneId !== currentMorphId &&
          (!needle ||
            [entry.geneId, entry.name, ...(entry.aliases ?? [])]
              .map(searchableMorphText)
              .some((value) => value.includes(needle))),
      )
      .slice(0, 60);
  }, [currentMorphId, queryText]);

  return (
    <div className="creator-morph-editor-target">
      <input
        autoFocus
        value={queryText}
        onChange={(e) => setQueryText(e.target.value)}
        placeholder="Type any part of the correct morph name, alias or ID…"
        aria-label="Search target morph"
      />
      <div className="creator-morph-editor-results">
        {options.map((entry) => (
          <button
            key={entry.geneId}
            type="button"
            className={selectedId === entry.geneId ? "is-selected" : ""}
            onClick={() => onSelect(entry)}
          >
            <strong>{entry.name}</strong>
            <span>
              {entry.geneId} · {entry.kind} · {entry.inheritance}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
