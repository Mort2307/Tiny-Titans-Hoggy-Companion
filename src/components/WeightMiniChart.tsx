import type { WeightRecord } from "../types/Weight";


type WeightMiniChartProps = {

  history: WeightRecord[];

};



function WeightMiniChart({

  history

}:WeightMiniChartProps){


  if(!history.length){

    return (

      <div>

        No weight data

      </div>

    );

  }



  const sorted =

    [...history].sort(

      (a,b)=>

        new Date(a.date).getTime()

        -

        new Date(b.date).getTime()

    );



  return (

    <div className="weight-mini-chart">


      {

        sorted.map(record=>(


          <div

            key={record.id}

            className="weight-point"

          >

            {record.weight}g


          </div>


        ))

      }


    </div>

  );


}



export default WeightMiniChart;