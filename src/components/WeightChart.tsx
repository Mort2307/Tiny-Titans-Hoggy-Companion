import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import type { WeightRecord } from "../types/Weight";


type WeightChartProps = {

  history: WeightRecord[];

};



function WeightChart({

  history

}: WeightChartProps) {



  if (!history || history.length === 0) {

    return (

      <p>
        No weight records yet.
      </p>

    );

  }





  const sortedHistory =

    [...history].sort(

      (a,b) =>

        new Date(a.date).getTime()

        -

        new Date(b.date).getTime()

    );







  return (

    <div

      style={{

        width:"100%",

        height:300

      }}

    >



      <ResponsiveContainer

        width="100%"

        height="100%"

      >



        <LineChart

          data={sortedHistory}

        >



          <CartesianGrid

            strokeDasharray="3 3"

          />





          <XAxis

            dataKey="date"

          />





          <YAxis

            dataKey="weight"

            unit="g"

          />





          <Tooltip

            formatter={(value) =>

              `${value}g`

            }

          />





          <Line

            type="monotone"

            dataKey="weight"

            strokeWidth={2}

            dot

          />





        </LineChart>



      </ResponsiveContainer>



    </div>

  );


}



export default WeightChart;