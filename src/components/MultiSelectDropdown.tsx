import {
  useMemo,
  useState,
} from "react";

import type {
  MorphDefinition,
} from "../data/morphs";


// ============================================================
// TYPES
// ============================================================

type MultiSelectDropdownProps = {
  title: string;

  options: MorphDefinition[];

  selected: string[];

  setSelected: (
    values: string[]
  ) => void;

  onMorphResolved?: (
    morph: MorphDefinition
  ) => void;
};


// ============================================================
// COMPONENT
// ============================================================

function MultiSelectDropdown({
  title,
  options,
  selected,
  setSelected,
  onMorphResolved,
}: MultiSelectDropdownProps) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState("");


  // ==========================================================
  // MORPH DATABASE
  // ==========================================================

  const morphOptions =
    useMemo(() => {
      return [...options]
        .filter(
          (morph) =>
            Boolean(
              morph.geneId
            )
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name
            )
        );
    }, [options]);


  // ==========================================================
  // CANONICAL LOOKUP MAP
  // ==========================================================
  //
  // IMPORTANT:
  //
  // UI identity is always geneId.
  //
  // Stored values may historically contain either:
  //
  // • geneId
  // • canonical morph name
  //
  // Aliases are deliberately NOT used for identity.
  //
  // Aliases remain available for SEARCH only.
  //
  // ==========================================================

  const morphByCanonicalValue =
    useMemo(() => {
      const map =
        new Map<
          string,
          MorphDefinition
        >();

      for (
        const morph of morphOptions
      ) {
        const geneId =
          morph.geneId
            .trim()
            .toLowerCase();

        const canonicalName =
          morph.name
            .trim()
            .toLowerCase();

        map.set(
          geneId,
          morph
        );

        map.set(
          canonicalName,
          morph
        );
      }

      return map;
    }, [morphOptions]);


  // ==========================================================
  // RESOLVE STORED VALUE
  // ==========================================================
  //
  // ONLY geneId and canonical name.
  //
  // NEVER aliases.
  //
  // ==========================================================

  function resolveStoredMorph(
    value: string
  ): MorphDefinition | undefined {
    return morphByCanonicalValue.get(
      value
        .trim()
        .toLowerCase()
    );
  }


  // ==========================================================
  // SEARCH
  // ==========================================================

  const filteredOptions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return morphOptions;
      }

      return morphOptions.filter(
        (morph) => {
          const nameMatches =
            morph.name
              .toLowerCase()
              .includes(query);

          const aliasMatches =
            morph.aliases?.some(
              (alias) =>
                alias
                  .toLowerCase()
                  .includes(query)
            ) ?? false;

          return (
            nameMatches ||
            aliasMatches
          );
        }
      );
    }, [
      morphOptions,
      search,
    ]);


  // ==========================================================
  // SELECTED GENE IDS
  // ==========================================================
  //
  // Convert whatever is currently stored in the form into
  // canonical gene IDs for comparison.
  //
  // Unknown/custom legacy values are deliberately preserved
  // in the actual selected array.
  //
  // ==========================================================

  const selectedGeneIds =
    useMemo(() => {
      const ids =
        new Set<string>();

      for (
        const value of selected
      ) {
        const morph =
          resolveStoredMorph(
            value
          );

        if (morph) {
          ids.add(
            morph.geneId
          );
        }
      }

      return ids;
    }, [
      selected,
      morphByCanonicalValue,
    ]);


  // ==========================================================
  // CHECK SELECTED
  // ==========================================================

  function isOptionSelected(
    morph: MorphDefinition
  ): boolean {
    return selectedGeneIds.has(
      morph.geneId
    );
  }


  // ==========================================================
  // TOGGLE OPTION
  // ==========================================================

  function toggleOption(
    morph: MorphDefinition
  ) {
    const alreadySelected =
      isOptionSelected(
        morph
      );


    // ========================================================
    // REMOVE
    // ========================================================

    if (
      alreadySelected
    ) {
      const updated =
        selected.filter(
          (value) => {
            const selectedMorph =
              resolveStoredMorph(
                value
              );

            // Preserve unknown/custom values.
            if (
              !selectedMorph
            ) {
              return true;
            }

            // Remove ONLY this exact gene.
            return (
              selectedMorph.geneId !==
              morph.geneId
            );
          }
        );

      setSelected(
        updated
      );

      return;
    }


    // ========================================================
    // ADD
    // ========================================================
    //
    // Store ONLY the canonical morph name.
    //
    // This prevents aliases such as:
    //
    // Arctic SuperConda
    //
    // from being stored as separate identities from:
    //
    // Platinum
    //
    // ========================================================

    const canonicalName =
      morph.name;


    // ========================================================
    // ABSOLUTE DUPLICATE PROTECTION
    // ========================================================

    const duplicate =
      selected.some(
        (value) => {
          const existing =
            resolveStoredMorph(
              value
            );

          return (
            existing?.geneId ===
            morph.geneId
          );
        }
      );


    if (
      duplicate
    ) {
      return;
    }


    // ========================================================
    // STORE CANONICAL NAME
    // ========================================================

    setSelected([
      ...selected,
      canonicalName,
    ]);


    // ========================================================
    // PASS DATABASE OBJECT
    // ========================================================

    onMorphResolved?.(
      morph
    );
  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="multi-select">


      {/* ==================================================== */}
      {/* SELECTOR BUTTON */}
      {/* ==================================================== */}

      <button
        type="button"
        className="multi-select-button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        aria-expanded={
          open
        }
        aria-haspopup="listbox"
      >
        <span>
          {title}
        </span>

        <span
          className={`multi-select-arrow ${
            open
              ? "open"
              : ""
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>


      {/* ==================================================== */}
      {/* SELECTED TAGS */}
      {/* ==================================================== */}

      {selected.length >
        0 && (
        <div className="selected-tags">

          {selected.map(
            (item) => {
              const morph =
                resolveStoredMorph(
                  item
                );

              return (
                <span
                  key={
                    morph?.geneId ??
                    item
                  }
                  className="selected-tag"
                >
                  {morph?.name ??
                    item}
                </span>
              );
            }
          )}

        </div>
      )}


      {/* ==================================================== */}
      {/* DROPDOWN */}
      {/* ==================================================== */}

      {open && (
        <div
          className="multi-select-menu"
          role="listbox"
          aria-multiselectable="true"
        >


          {/* ================================================= */}
          {/* SEARCH */}
          {/* ================================================= */}

          <input
            type="text"
            className="multi-select-search"
            placeholder="Search morphs..."
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            aria-label="Search morphs"
            autoComplete="off"
          />


          {/* ================================================= */}
          {/* OPTIONS */}
          {/* ================================================= */}

          <div className="multi-select-options">

            {filteredOptions.length >
            0 ? (

              filteredOptions.map(
                (morph) => {
                  const isSelected =
                    isOptionSelected(
                      morph
                    );

                  return (
                    <label
                      key={
                        morph.geneId
                      }
                      className={`multi-select-option ${
                        isSelected
                          ? "selected"
                          : ""
                      }`}
                    >

                      <input
                        type="checkbox"
                        checked={
                          isSelected
                        }
                        onChange={() =>
                          toggleOption(
                            morph
                          )
                        }
                      />

                      <span
                        className="multi-select-check"
                        aria-hidden="true"
                      >
                        {isSelected
                          ? "✓"
                          : ""}
                      </span>

                      <span className="multi-select-label">
                        {morph.name}
                      </span>

                    </label>
                  );
                }
              )

            ) : (

              <div className="multi-select-empty">
                No morphs found.
              </div>

            )}

          </div>

        </div>
      )}

    </div>
  );
}


export default MultiSelectDropdown;