import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { morphs } from "../data/morphs";
import MultiSelectDropdown from "./MultiSelectDropdown";

const testMorphs = ["Albino", "Arctic", "Axanthic", "Conda"]
  .map((name) => morphs.find((morph) => morph.name === name))
  .filter((morph): morph is (typeof morphs)[number] => Boolean(morph));

describe("MultiSelectDropdown", () => {
  it("shows morphs alphabetically", () => {
    render(
      <MultiSelectDropdown
        title="Visual Morphs"
        options={[...testMorphs].reverse()}
        selected={[]}
        setSelected={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Visual Morphs/i }));

    const options = within(screen.getByRole("listbox"))
      .getAllByRole("checkbox")
      .map((checkbox) => checkbox.parentElement?.textContent?.trim());

    expect(options).toEqual(["Albino", "Arctic", "Axanthic", "Conda"]);
  });

  it("keeps Axanthic, Albino, Arctic and Conda independent", () => {
    let selected: string[] = [];
    const setSelected = vi.fn((next: string[]) => {
      selected = next;
    });

    const { rerender } = render(
      <MultiSelectDropdown
        title="Visual Morphs"
        options={testMorphs}
        selected={selected}
        setSelected={setSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Visual Morphs/i }));

    for (const name of ["Axanthic", "Albino", "Arctic", "Conda"]) {
      fireEvent.click(screen.getByRole("checkbox", { name }));
      rerender(
        <MultiSelectDropdown
          title="Visual Morphs"
          options={testMorphs}
          selected={selected}
          setSelected={setSelected}
        />
      );
    }

    expect(new Set(selected)).toEqual(
      new Set(["Axanthic", "Albino", "Arctic", "Conda"])
    );
    expect(selected).toHaveLength(4);

    expect(screen.getByRole("checkbox", { name: "Axanthic" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Albino" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Arctic" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Conda" })).toBeChecked();
  });

  it("removes only the selected gene", () => {
    let selected = ["Axanthic", "Albino", "Arctic", "Conda"];
    const setSelected = vi.fn((next: string[]) => {
      selected = next;
    });

    render(
      <MultiSelectDropdown
        title="Visual Morphs"
        options={testMorphs}
        selected={selected}
        setSelected={setSelected}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Visual Morphs/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Axanthic" }));

    expect(selected).toEqual(["Albino", "Arctic", "Conda"]);
  });

  it("keeps selected tags alphabetically ordered", () => {
    render(
      <MultiSelectDropdown
        title="Visual Morphs"
        options={testMorphs}
        selected={["Conda", "Axanthic", "Albino", "Arctic"]}
        setSelected={vi.fn()}
      />
    );

    const tags = Array.from(document.querySelectorAll(".selected-tag"))
      .map((tag) => tag.textContent?.trim());

    expect(tags).toEqual(["Albino", "Arctic", "Axanthic", "Conda"]);
  });
});
