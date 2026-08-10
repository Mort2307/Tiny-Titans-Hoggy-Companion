import { useState } from "react";
import type { Het, HetPercentage } from "../types/genetics";

type HetSelectorProps = {
  options: {
    name: string;
    hetPossible: boolean;
  }[];

  selected: Het[];

  setSelected: (hets: Het[]) => void;
};

function HetSelector({
  options,
  selected,
  setSelected,
}: HetSelectorProps) {

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const percentages: HetPercentage[] = [
    "100%",
    "66%",
    "50%",
    "33%",
    "25%",
  ];

  function toggleHet(
    gene: string,
    percentage: HetPercentage
  ) {

    const exists = selected.some(
      (het) =>
        het.gene === gene &&
        het.percentage === percentage
    );

    if (exists) {

      setSelected(
        selected.filter(
          (het) =>
            !(
              het.gene === gene &&
              het.percentage === percentage
            )
        )
      );

    } else {

      const newHet: Het = {
        gene,
        percentage,
      };

      setSelected([
        ...selected,
        newHet,
      ]);
    }
  }

  function removeHet(
    gene: string,
    percentage: HetPercentage
  ) {

    setSelected(
      selected.filter(
        (het) =>
          !(
            het.gene === gene &&
            het.percentage === percentage
          )
      )
    );
  }

  const available = options
    .filter(
      (item) =>
        item.hetPossible
    )
    .sort(
      (a, b) =>
        a.name.localeCompare(
          b.name
        )
    )
    .filter(
      (item) =>
        item.name
          .toLowerCase()
          .includes(
            search.toLowerCase()
          )
    );

  return (
    <div className="multi-select">

      {/* ========================= */}
      {/* SELECT HETS BUTTON */}
      {/* ========================= */}

      <button
        type="button"
        className="multi-select-button"
        onClick={() =>
          setOpen(!open)
        }
      >
        Select Hets ▼
      </button>


      {/* ========================= */}
      {/* SELECTED HETS */}
      {/* ========================= */}

      {selected.length > 0 && (

        <div className="selected-tags">

          {selected.map((het) => (

            <span
              key={
                het.gene +
                het.percentage
              }
            >

              🧬{" "}
              {het.percentage}

              {het.percentage === "100%"
                ? " Het "
                : " Possible Het "
              }

              {het.gene}

              <button
                type="button"
                onClick={() =>
                  removeHet(
                    het.gene,
                    het.percentage
                  )
                }
              >
                ❌
              </button>

            </span>

          ))}

        </div>

      )}


      {/* ========================= */}
      {/* DROPDOWN */}
      {/* ========================= */}

      {open && (

        <div className="multi-select-menu">

          {/* SEARCH */}

          <input
            type="text"
            placeholder="Search Het genes..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />


          {/* ========================= */}
          {/* OPTIONS */}
          {/* ========================= */}

          <div className="multi-select-options">

            {available.map((gene) => (

              <div
                key={gene.name}
                className="het-option"
              >

                <div className="het-gene-name">
                  {gene.name}
                </div>


                <div className="het-percentage-options">

                  {percentages.map(
                    (percentage) => {

                      const checked =
                        selected.some(
                          (het) =>
                            het.gene ===
                              gene.name &&
                            het.percentage ===
                              percentage
                        );

                      return (

                        <label
                          key={percentage}
                          className="multi-select-option"
                        >

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              toggleHet(
                                gene.name,
                                percentage
                              )
                            }
                          />

                          <span>
                            {percentage}

                            {percentage ===
                            "100%"
                              ? " Het"
                              : " Possible Het"}
                          </span>

                        </label>

                      );

                    }
                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

      )}

    </div>
  );
}

export default HetSelector;