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
    "25%"

  ];



  function toggleHet(
    gene: string,
    percentage: HetPercentage
  ) {


    const exists = selected.some(

      het =>
        het.gene === gene &&
        het.percentage === percentage

    );



    if(exists){


      setSelected(

        selected.filter(

          het =>
            !(
              het.gene === gene &&
              het.percentage === percentage
            )

        )

      );


    }
    else {


      const newHet: Het = {

        gene,
        percentage

      };


      setSelected([

        ...selected,
        newHet

      ]);


    }


  }




  function removeHet(
    gene:string,
    percentage:HetPercentage
  ){

    setSelected(

      selected.filter(

        het =>
          !(
            het.gene === gene &&
            het.percentage === percentage
          )

      )

    );

  }





  const available = options

    .filter(

      item =>
        item.hetPossible

    )

    .sort(

      (a,b)=>
        a.name.localeCompare(
          b.name
        )

    )

    .filter(

      item =>
        item.name
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

        onClick={()=>
          setOpen(!open)
        }

      >

        Select Hets ▼

      </button>







      {selected.length > 0 && (


        <div className="selected-tags">


          {selected.map(het => (


            <span

              key={
                het.gene +
                het.percentage
              }

            >

              🧬 {het.percentage}


              {het.percentage === "100%"

                ? " Het "

                : " Possible Het "

              }


              {het.gene}




              <button

                type="button"

                onClick={()=>
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








      {open && (


        <div className="multi-select-menu">





          <input

            placeholder="Search Het genes..."

            value={search}

            onChange={(e)=>
              setSearch(
                e.target.value
              )
            }

          />








          <div className="multi-select-options">



            {available.map(gene => (



              <div

                key={
                  gene.name
                }

              >



                <strong>

                  {gene.name}

                </strong>







                {percentages.map(percent => (



                  <label

                    key={
                      percent
                    }

                  >



                    <input

                      type="checkbox"

                      checked={

                        selected.some(

                          het =>

                            het.gene === gene.name &&

                            het.percentage === percent

                        )

                      }


                      onChange={()=>

                        toggleHet(

                          gene.name,

                          percent

                        )

                      }

                    />



                    {percent}



                    {percent === "100%"

                      ? " Het"

                      : " Possible Het"

                    }



                  </label>



                ))}



              </div>



            ))}



          </div>





        </div>



      )}



    </div>

  );

}


export default HetSelector;