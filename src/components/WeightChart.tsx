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
import { useUnits } from "../context/UnitContextValue";

type WeightChartProps = { history: WeightRecord[] };

type ChartPoint = WeightRecord & { displayWeight: number };

function WeightChart({ history }: WeightChartProps) {
  const { isImperial, weightUnit } = useUnits();

  if (!history || history.length === 0) return <p>No weight records yet.</p>;

  const sortedHistory = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const chartData: ChartPoint[] = sortedHistory.map((record) => {
    const grams = record.unit === "kg" ? record.weight * 1000 : record.weight;
    return {
      ...record,
      displayWeight: isImperial ? grams / 28.349523125 : grams,
    };
  });

  return (
    <div className="weight-chart-container weight-chart-container--detail" role="img" aria-label={`Weight trend chart with ${chartData.length} recorded points`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(value) => new Date(String(value)).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} />
          <YAxis dataKey="displayWeight" unit={weightUnit} />
          <Tooltip formatter={(value) => `${Number(value).toFixed(1)} ${weightUnit}`} />
          <Line type="monotone" dataKey="displayWeight" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeightChart;
