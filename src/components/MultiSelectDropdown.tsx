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
        option
      ]);

    }

  }




  const sortedOptions = [...options]
    .sort((a, b) =>
      a.localeCompare(b)
    );



  const filteredOptions = sortedOptions.filter(
    (option) =>
      option
        .toLowerCase()
        .includes(
          search.toLowerCase()
        )
  );




  return (

    <div className="multi-select">


      <button

        type="button"

        className="multi-select-button"

        onClick={() =>
          setOpen(!open)
        }

      >

        {title} ▼

      </button>





      {selected.length > 0 && (

        <div className="selected-tags">

          {selected.map((item)=>(

            <span key={item}>
              {item}
            </span>

          ))}

        </div>

      )}







      {open && (

        <div className="multi-select-menu">


          <input

            placeholder="Search..."

            value={search}

            onChange={(e)=>
              setSearch(
                e.target.value
              )
            }

          />





          <div className="multi-select-options">


            {filteredOptions.map((option)=>(


              <label key={option}>


                <input

                  type="checkbox"

                  checked={
                    selected.includes(option)
                  }

                  onChange={() =>
                    toggleOption(option)
                  }

                />


                {option}


              </label>


            ))}


          </div>


        </div>

      )}


    </div>

  );

}


export default MultiSelectDropdown;