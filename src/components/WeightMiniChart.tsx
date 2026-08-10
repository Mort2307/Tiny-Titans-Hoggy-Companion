import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";

import type { WeightRecord } from "../types/Weight";

type WeightMiniChartProps = {
  history: WeightRecord[];
};

function WeightMiniChart({
  history,
}: WeightMiniChartProps) {

  if (!history || history.length < 2) {
    return (
      <div className="weight-chart-empty">
        📈 Add more weight records
        <br />
        to see growth progress
      </div>
    );
  }

  const data = [...history]
    .sort(
      (a, b) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    )
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
        }
      ),

      weight:
        record.unit === "kg"
          ? record.weight * 1000
          : record.weight,
    }));

  return (
    <div className="weight-chart-container">
      <ResponsiveContainer
        width="100%"
        height={180}
      >
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 5,
            bottom: 5,
          }}
        >

          <CartesianGrid
            strokeDasharray="3 3"
          />

          <XAxis
            dataKey="date"
            tick={{
              fontSize: 10,
            }}
          />

          <YAxis
            tick={{
              fontSize: 10,
            }}
            width={40}
            domain={[
              "auto",
              "auto",
            ]}
            tickFormatter={(value) =>
              `${value}g`
            }
          />

          <Tooltip
            formatter={(value) => [
              `${value ?? 0}g`,
              "Weight",
            ]}
          />

          <Line
            type="monotone"
            dataKey="weight"
            strokeWidth={3}
            dot={{
              r: 3,
            }}
            activeDot={{
              r: 5,
            }}
          />

        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightMiniChart;