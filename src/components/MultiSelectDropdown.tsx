import { useState } from "react";

type MultiSelectDropdownProps = {
  title: string;
  options: string[];
  selected: string[];
  setSelected: (values: string[]) => void;
};

function MultiSelectDropdown({
  title,
  options,
  selected,
  setSelected,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      setSelected(
        selected.filter(
          (item) => item !== option
        )
      );
    } else {
      setSelected([
        ...selected,
        option,
      ]);
    }
  }

  const sortedOptions = [...options].sort(
    (a, b) => a.localeCompare(b)
  );

  const filteredOptions =
    sortedOptions.filter((option) =>
      option
        .toLowerCase()
        .includes(search.toLowerCase())
    );

  return (
    <div className="multi-select">
      {/* ============================= */}
      {/* SELECTOR BUTTON */}
      {/* ============================= */}

      <button
        type="button"
        className="multi-select-button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>
          {title}
        </span>

        <span
          className={`multi-select-arrow ${
            open ? "open" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {/* ============================= */}
      {/* SELECTED MORPHS */}
      {/* ============================= */}

      {selected.length > 0 && (
        <div className="selected-tags">
          {selected.map((item) => (
            <span
              key={item}
              className="selected-tag"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {/* ============================= */}
      {/* DROPDOWN */}
      {/* ============================= */}

      {open && (
        <div className="multi-select-menu">
          {/* SEARCH */}

          <input
            type="text"
            className="multi-select-search"
            placeholder="Search morphs..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {/* OPTIONS */}

          <div className="multi-select-options">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(
                (option) => {
                  const isSelected =
                    selected.includes(
                      option
                    );

                  return (
                    <label
                      key={option}
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
                            option
                          )
                        }
                      />

                      <span className="multi-select-check">
                        {isSelected
                          ? "✓"
                          : ""}
                      </span>

                      <span className="multi-select-label">
                        {option}
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