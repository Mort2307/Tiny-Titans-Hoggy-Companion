import type { Snake } from "../types/Snake";
import type { Het } from "../types/genetics";
import type { WeightRecord } from "../types/Weight";

import MultiSelectDropdown from "./MultiSelectDropdown";
import HetSelector from "./HetSelector";

import { morphs } from "../data/morphs";


type SnakeFormProps = {

  form: {

    name: string;

    species: string;

    photo: string;

    sex: Snake["sex"];

    morphs: string[];

    customMorph: string;

    hets: Het[];

    customHets: string;

    startingWeight: number | null;

    startingWeightDate: string;

    weight: number | null;

    lastWeighedDate: string;

    weightHistory: WeightRecord[];

    hatchDate: string;

    arrivalDate: string;

    notes: string;

  };


  updateField: (

    field: string,

    value: any

  ) => void;


  onSave: () => void;


  editing: boolean;

};





function SnakeForm({

  form,

  updateField,

  onSave,

  editing

}: SnakeFormProps) {





  const sortedMorphs = morphs

    .map(morph => morph.name)

    .sort((a,b)=>

      a.localeCompare(b)

    );






  return (

    <div className="tracker-card">



      <h2>

        {editing

          ? "✏️ Edit Snake"

          : "🐍 Add Snake"

        }

      </h2>





      <label>

        Snake Name

      </label>


      <input

        value={form.name}

        onChange={(e)=>

          updateField(

            "name",

            e.target.value

          )

        }

      />






      <label>

        Species

      </label>


      <input

        value={form.species}

        onChange={(e)=>

          updateField(

            "species",

            e.target.value

          )

        }

      />






      <label>

        Photo

      </label>


      <input

        type="file"

        accept="image/*"

        onChange={(e)=>{


          const file =

            e.target.files?.[0];


          if(!file)

            return;



          const reader =

            new FileReader();



          reader.onloadend = ()=>{


            updateField(

              "photo",

              reader.result as string

            );


          };



          reader.readAsDataURL(file);


        }}

      />





      {form.photo && (

        <img

          src={form.photo}

          alt={form.name}

          style={{

            width:"120px",

            borderRadius:"10px",

            margin:"10px"

          }}

        />

      )}






      <label>

        Sex

      </label>


      <select

        value={form.sex}

        onChange={(e)=>

          updateField(

            "sex",

            e.target.value

          )

        }

      >


        <option value="Unknown">

          Unknown

        </option>


        <option value="Male">

          Male

        </option>


        <option value="Female">

          Female

        </option>


      </select>









      <h3>

        ⚖️ Weight Tracking

      </h3>





      <label>

        Starting Weight (g)

      </label>


      <input

        type="number"

        value={form.startingWeight ?? ""}

        onChange={(e)=>{


          const value =

            e.target.value

              ? Number(e.target.value)

              : null;



          updateField(

            "startingWeight",

            value

          );



          if(

            value !== null &&

            !form.startingWeightDate

          ){

            updateField(

              "startingWeightDate",

              new Date()

                .toISOString()

                .split("T")[0]

            );

          }


        }}

      />





      <label>

        Starting Weight Date

      </label>


      <input

        type="date"

        value={form.startingWeightDate}

        onChange={(e)=>

          updateField(

            "startingWeightDate",

            e.target.value

          )

        }

      />






      <label>

        Current Weight (g)

      </label>


      <input

        type="number"

        value={form.weight ?? ""}

        onChange={(e)=>

          updateField(

            "weight",

            e.target.value

              ? Number(e.target.value)

              : null

          )

        }

      />






      <label>

        Last Weighed Date

      </label>


      <input

        type="date"

        value={form.lastWeighedDate}

        onChange={(e)=>

          updateField(

            "lastWeighedDate",

            e.target.value

          )

        }

      />









      <h3>

        🧬 Visual Morphs

      </h3>





      <MultiSelectDropdown


        title="Select Morphs"


        options={sortedMorphs}


        selected={form.morphs}


        setSelected={(value)=>

          updateField(

            "morphs",

            value

          )

        }


      />






      <label>

        Custom Morph

      </label>


      <input

        value={form.customMorph}

        onChange={(e)=>

          updateField(

            "customMorph",

            e.target.value

          )

        }

      />








      <h3>

        🧬 Hets

      </h3>





      <HetSelector


        options={morphs}


        selected={form.hets}


        setSelected={(value)=>

          updateField(

            "hets",

            value

          )

        }


      />






      <label>

        Additional Genetics Notes

      </label>


      <textarea

        value={form.customHets}

        onChange={(e)=>

          updateField(

            "customHets",

            e.target.value

          )

        }

      />









      <h3>

        📅 Dates

      </h3>





      <label>

        Hatch Date

      </label>


      <input

        type="date"

        value={form.hatchDate}

        onChange={(e)=>

          updateField(

            "hatchDate",

            e.target.value

          )

        }

      />






      <label>

        Arrival Date

      </label>


      <input

        type="date"

        value={form.arrivalDate}

        onChange={(e)=>

          updateField(

            "arrivalDate",

            e.target.value

          )

        }

      />







      <label>

        Notes

      </label>


      <textarea

        value={form.notes}

        onChange={(e)=>

          updateField(

            "notes",

            e.target.value

          )

        }

      />






      <button

        onClick={onSave}

      >

        💾 Save Snake

      </button>



    </div>

  );

}



export default SnakeForm;