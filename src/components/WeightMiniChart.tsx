import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import type { WeightRecord } from "../types/Weight";
import { useUnits } from "../context/UnitContextValue";

type WeightMiniChartProps = { history: WeightRecord[] };

function WeightMiniChart({ history }: WeightMiniChartProps) {
  const { isImperial, weightUnit } = useUnits();
  if (!history || history.length < 2) return <div className="weight-chart-empty">📈 Add more weight records<br />to see growth progress</div>;

  const data = [...history]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((record) => ({
      date: new Date(record.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
      weight: (record.unit === "kg" ? record.weight * 1000 : record.weight) / (isImperial ? 28.349523125 : 1),
    }));

  return (
    <div className="weight-chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 9 }} tickMargin={2} />
          <YAxis tick={{ fontSize: 9 }} width={34} domain={["auto", "auto"]} tickFormatter={(value) => `${Number(value).toFixed(1)}${weightUnit}`} />
          <Tooltip formatter={(value) => [`${Number(value ?? 0).toFixed(1)} ${weightUnit}`, "Weight"]} />
          <Line type="monotone" dataKey="weight" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightMiniChart;
