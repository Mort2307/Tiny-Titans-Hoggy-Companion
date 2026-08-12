import { useMemo, useState } from "react";
import {
  getGenes,
  getHetPossibleGenes,
  getSuperForms,
  type MorphDefinition,
} from "../data/morphs";

import ParentSelector, {
  type ParentSelection,
} from "../components/ParentSelector";

import ResultCard, {
  type GeneticsResult,
} from "../components/ResultCard";


// ============================================================
// EMPTY PARENT
// ============================================================

const EMPTY_PARENT: ParentSelection = {
  morphs: [],
  hets: [],
};


// ============================================================
// MORPH LOOKUP
// ============================================================

function getMorphById(
  morphs: MorphDefinition[],
  geneId: string
): MorphDefinition | undefined {
  return morphs.find(
    (morph) =>
      morph.geneId === geneId
  );
}


// ============================================================
// SUPER FORM LOOKUP
// ============================================================
//
// The rebuilt MorphDefinition no longer has:
//
//   superFormId
//
// Instead supers are proper database records.
//
// Example:
//
// Super Conda
//   kind: "Super"
//   components:
//     conda × 2
//
// This helper finds the correct Super entry from
// the database rather than relying on a property
// attached to the base gene.
// ============================================================

function getSuperFormForGene(
  geneId: string,
  superForms: MorphDefinition[]
): MorphDefinition | undefined {
  return superForms.find(
    (superForm) =>
      superForm.components?.some(
        (component) =>
          component.morphId === geneId &&
          (component.copies ?? 1) === 2
      )
  );
}


// ============================================================
// SIMPLE GENETIC CALCULATOR
// ============================================================
//
// This is intentionally conservative.
//
// It currently handles:
//
//   Recessive
//   Incomplete Dominant
//
// Supers are resolved through the morph database.
//
// The larger multi-gene resolver/calculator can then replace
// this function once the database and selector are fully wired.
// ============================================================

function calculateSimpleResults(
  mother: ParentSelection,
  father: ParentSelection,
  genes: MorphDefinition[],
  superForms: MorphDefinition[]
): GeneticsResult[] {
  const results: GeneticsResult[] = [];


  // ----------------------------------------------------------
  // Collect every gene involved in either parent.
  // ----------------------------------------------------------

  const allGenes = new Set([
    ...mother.morphs,
    ...mother.hets,
    ...father.morphs,
    ...father.hets,
  ]);


  // ----------------------------------------------------------
  // Calculate each gene independently.
  // ----------------------------------------------------------

  for (const geneId of allGenes) {
    const morph =
      getMorphById(
        genes,
        geneId
      );


    if (!morph) {
      continue;
    }


    // ========================================================
    // RECESSIVE
    // ========================================================

    if (
      morph.inheritance ===
      "Recessive"
    ) {
      const motherVisual =
        mother.morphs.includes(
          geneId
        );

      const fatherVisual =
        father.morphs.includes(
          geneId
        );

      const motherHet =
        mother.hets.includes(
          geneId
        );

      const fatherHet =
        father.hets.includes(
          geneId
        );


      let visualProbability = 0;


      // Visual × Visual
      //
      // aa × aa
      //
      // 100% visual.

      if (
        motherVisual &&
        fatherVisual
      ) {
        visualProbability = 100;
      }


      // Visual × Het
      //
      // aa × Aa
      //
      // 50% visual.

      else if (
        (
          motherVisual &&
          fatherHet
        ) ||
        (
          fatherVisual &&
          motherHet
        )
      ) {
        visualProbability = 50;
      }


      // Het × Het
      //
      // Aa × Aa
      //
      // 25% visual.

      else if (
        motherHet &&
        fatherHet
      ) {
        visualProbability = 25;
      }


      if (
        visualProbability > 0
      ) {
        results.push({
          name:
            morph.name,

          percentage:
            visualProbability,

          visualMorphs: [
            geneId,
          ],

          hets: [],
        });
      }


      // ------------------------------------------------------
      // Het × Clear
      //
      // 50% het offspring.
      // ------------------------------------------------------

      if (
        visualProbability === 0 &&
        (
          (
            motherHet &&
            !fatherHet &&
            !fatherVisual &&
            !motherVisual
          ) ||
          (
            fatherHet &&
            !motherHet &&
            !motherVisual &&
            !fatherVisual
          )
        )
      ) {
        results.push({
          name:
            `50% Het ${morph.name}`,

          percentage: 50,

          visualMorphs: [],

          hets: [
            geneId,
          ],
        });
      }


      continue;
    }


    // ========================================================
    // INCOMPLETE DOMINANT
    // ========================================================

    if (
      morph.inheritance ===
      "Incomplete Dominant"
    ) {
      const motherHas =
        mother.morphs.includes(
          geneId
        );

      const fatherHas =
        father.morphs.includes(
          geneId
        );


      // ------------------------------------------------------
      // Visual × Visual
      //
      // Aa × Aa
      //
      // 25% AA
      // 50% Aa
      // 25% aa
      // ------------------------------------------------------

      if (
        motherHas &&
        fatherHas
      ) {
        const superForm =
          getSuperFormForGene(
            geneId,
            superForms
          );


        // ----------------------------------------------------
        // Super result
        // ----------------------------------------------------

        if (superForm) {
          results.push({
            name:
              superForm.name,

            percentage: 25,

            visualMorphs: [
              superForm.geneId,
            ],

            hets: [],
          });
        } else {
          // --------------------------------------------------
          // Fallback.
          //
          // If the database does not contain a confirmed
          // Super entry, do NOT invent one.
          // --------------------------------------------------

          results.push({
            name:
              `Two copies ${morph.name}`,

            percentage: 25,

            visualMorphs: [
              geneId,
            ],

            hets: [],
          });
        }


        // ----------------------------------------------------
        // Single copy
        // ----------------------------------------------------

        results.push({
          name:
            morph.name,

          percentage: 50,

          visualMorphs: [
            geneId,
          ],

          hets: [],
        });


        // ----------------------------------------------------
        // No copy
        // ----------------------------------------------------

        results.push({
          name:
            "No visual copy",

          percentage: 25,

          visualMorphs: [],

          hets: [],
        });


        continue;
      }


      // ------------------------------------------------------
      // Visual × Clear
      //
      // Aa × aa
      //
      // 50% visual
      // 50% clear
      // ------------------------------------------------------

      if (
        motherHas ||
        fatherHas
      ) {
        results.push({
          name:
            morph.name,

          percentage: 50,

          visualMorphs: [
            geneId,
          ],

          hets: [],
        });


        results.push({
          name:
            "No visual copy",

          percentage: 50,

          visualMorphs: [],

          hets: [],
        });
      }
    }
  }


  return results;
}


// ============================================================
// DUPLICATE RESULT COMBINER
// ============================================================
//
// Several independent genetic calculations can produce the
// same visible result.
//
// Combine those entries rather than displaying duplicates.
// ============================================================

function combineDuplicateResults(
  results: GeneticsResult[]
): GeneticsResult[] {
  const map =
    new Map<
      string,
      GeneticsResult
    >();


  for (const result of results) {
    const key = [
      result.name,

      result.visualMorphs
        .slice()
        .sort()
        .join(","),

      result.hets
        .slice()
        .sort()
        .join(","),
    ].join("|");


    const existing =
      map.get(key);


    if (!existing) {
      map.set(
        key,
        {
          ...result,

          visualMorphs: [
            ...result.visualMorphs,
          ],

          hets: [
            ...result.hets,
          ],
        }
      );

      continue;
    }


    existing.percentage +=
      result.percentage;
  }


  return Array.from(
    map.values()
  ).sort(
    (a, b) =>
      b.percentage -
      a.percentage
  );
}


// ============================================================
// CALCULATOR PAGE
// ============================================================

export default function Calculator() {
  const [mother, setMother] =
    useState<ParentSelection>(
      EMPTY_PARENT
    );


  const [father, setFather] =
    useState<ParentSelection>(
      EMPTY_PARENT
    );


  // ----------------------------------------------------------
  // Genuine genetic loci only.
  // ----------------------------------------------------------

  const genes = useMemo(
    () =>
      getGenes(),
    []
  );


  // ----------------------------------------------------------
  // Genes that can legitimately be entered as hets.
  // ----------------------------------------------------------

  const hetGenes = useMemo(
    () =>
      getHetPossibleGenes(),
    []
  );


  // ----------------------------------------------------------
  // Confirmed Super entries.
  // ----------------------------------------------------------

  const superForms = useMemo(
    () =>
      getSuperForms(),
    []
  );


  // ----------------------------------------------------------
  // Raw calculation.
  // ----------------------------------------------------------

  const rawResults =
    useMemo(
      () =>
        calculateSimpleResults(
          mother,
          father,
          genes,
          superForms
        ),
      [
        mother,
        father,
        genes,
        superForms,
      ]
    );


  // ----------------------------------------------------------
  // Combined results.
  // ----------------------------------------------------------

  const results =
    useMemo(
      () =>
        combineDuplicateResults(
          rawResults
        ),
      [rawResults]
    );


  // ----------------------------------------------------------
  // Clear calculator.
  // ----------------------------------------------------------

  function clearCalculator() {
    setMother({
      morphs: [],
      hets: [],
    });


    setFather({
      morphs: [],
      hets: [],
    });
  }


  // ----------------------------------------------------------
  // Determine whether anything has been selected.
  // ----------------------------------------------------------

  const hasSelection =
    mother.morphs.length > 0 ||
    mother.hets.length > 0 ||
    father.morphs.length > 0 ||
    father.hets.length > 0;


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="calculator-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="calculator-header">

        <div>
          <h1>
            Genetics Calculator
          </h1>

          <p>
            Predict possible offspring
            genetics from two Western
            Hognose parents.
          </p>
        </div>


        {hasSelection && (
          <button
            type="button"
            onClick={
              clearCalculator
            }
            className="calculator-clear-button"
          >
            Clear
          </button>
        )}

      </header>


      {/* ======================================================
          PARENT SELECTORS
          ====================================================== */}

      <div className="calculator-parents">

        <ParentSelector
          title="Female / Mother"
          parent={mother}
          morphOptions={genes}
          hetOptions={hetGenes}
          onChange={setMother}
        />


        <ParentSelector
          title="Male / Father"
          parent={father}
          morphOptions={genes}
          hetOptions={hetGenes}
          onChange={setFather}
        />

      </div>


      {/* ======================================================
          RESULTS
          ====================================================== */}

      <section className="calculator-results">

        <div className="calculator-results-header">

          <div>
            <h2>
              Possible Offspring
            </h2>

            <p>
              Results are calculated
              from the selected
              parental genetics.
            </p>
          </div>

        </div>


        {/* ----------------------------------------------------
            EMPTY STATE
            ---------------------------------------------------- */}

        {!hasSelection && (
          <div className="calculator-empty">

            <h3>
              Select both parents
            </h3>

            <p>
              Choose visual morphs and
              known hets above to begin
              the calculation.
            </p>

          </div>
        )}


        {/* ----------------------------------------------------
            NO RESULT STATE
            ---------------------------------------------------- */}

        {hasSelection &&
          results.length === 0 && (
            <div className="calculator-empty">

              <h3>
                No confirmed visual
                outcomes yet
              </h3>

              <p>
                The selected genetics do
                not currently produce a
                confirmed visual result
                in this calculation.
              </p>

            </div>
          )}


        {/* ----------------------------------------------------
            RESULTS GRID
            ---------------------------------------------------- */}

        {results.length > 0 && (
          <div className="calculator-result-grid">

            {results.map(
              (
                result,
                index
              ) => (
                <ResultCard
                  key={`${result.name}-${index}`}
                  result={result}
                  morphs={genes}
                />
              )
            )}

          </div>
        )}

      </section>

    </main>
  );
}